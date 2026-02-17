// =============================================================================
// WEB CRYPTO API HELPERS
// =============================================================================

// Helper: Base64 String to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
}

// Helper: ArrayBuffer to Base64 String
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
}

// Helper: Convert PEM to ArrayBuffer (skips headers)
function pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64 = pem
        .replace(/-----BEGIN [^-]+-----/, '')
        .replace(/-----END [^-]+-----/, '')
        .replace(/[\n\r]/g, '')
    return base64ToArrayBuffer(b64)
}

// =============================================================================
// KEY MANAGEMENT
// =============================================================================

export async function generateAesKey(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    )
}

export async function importPublicKey(pem: string): Promise<CryptoKey> {
    const binaryDer = pemToArrayBuffer(pem)
    return window.crypto.subtle.importKey(
        "spki",
        binaryDer,
        {
            name: "RSA-OAEP",
            hash: "SHA-256"
        },
        true,
        ["encrypt"]
    )
}

export async function importPrivateKey(pem: string): Promise<CryptoKey> {
    const binaryDer = pemToArrayBuffer(pem)
    return window.crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        {
            name: "RSA-OAEP",
            hash: "SHA-256"
        },
        true, // must be extractable if we want to export it later, or false if only used here
        ["decrypt"]
    )
}

// =============================================================================
// HYBRID ENCRYPTION (V1 - DEPRECATED)
// =============================================================================

export interface EncryptedMessagePacket {
    v: string           // Version "1"
    data: string        // Base64 AES encrypted content
    iv: string          // Base64 AES IV (12 bytes)
    key: string         // Base64 RSA encrypted AES key
}

/** 
 * @deprecated Use encryptMessage (V2) instead. This uses V1 Hybrid Encryption.
 */
export async function encryptHybrid(
    content: string,
    publicKey: CryptoKey
): Promise<EncryptedMessagePacket> {
    // 1. Generate ephemeral AES key
    const aesKey = await generateAesKey()
    const iv = window.crypto.getRandomValues(new Uint8Array(12))

    // 2. Encrypt Content with AES
    const encoder = new TextEncoder()
    const encodedContent = encoder.encode(content)

    const encryptedContent = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        aesKey,
        encodedContent
    )

    // 3. Export AES key to raw bytes
    const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey)

    // 4. Encrypt AES key with RSA Public Key
    const encryptedAesKey = await window.crypto.subtle.encrypt(
        {
            name: "RSA-OAEP"
        },
        publicKey,
        rawAesKey
    )

    // 5. Construct Packet
    return {
        v: "1",
        data: arrayBufferToBase64(encryptedContent),
        iv: arrayBufferToBase64(iv.buffer),
        key: arrayBufferToBase64(encryptedAesKey)
    }
}

/** 
 * @deprecated Use decryptMessage (V2) instead. This supports V1 messages.
 */
export async function decryptHybrid(
    packet: EncryptedMessagePacket,
    privateKey: CryptoKey
): Promise<string> {
    if (packet.v !== "1") {
        throw new Error(`Unsupported encryption version: ${packet.v}`)
    }

    try {
        // 1. Decrypt AES Key using RSA Private Key
        const encryptedAesKey = base64ToArrayBuffer(packet.key)
        const rawAesKey = await window.crypto.subtle.decrypt(
            {
                name: "RSA-OAEP"
            },
            privateKey,
            encryptedAesKey
        )

        // 2. Import decrypted AES Key
        const aesKey = await window.crypto.subtle.importKey(
            "raw",
            rawAesKey,
            {
                name: "AES-GCM",
                length: 256
            },
            false,
            ["decrypt"]
        )

        // 3. Decrypt Content
        const encryptedContent = base64ToArrayBuffer(packet.data)
        const iv = base64ToArrayBuffer(packet.iv)

        const decryptedContent = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            aesKey,
            encryptedContent
        )

        const decoder = new TextDecoder()
        return decoder.decode(decryptedContent)

    } catch (e) {
        throw new Error("Failed to decrypt message")
    }
}

/** 
 * @deprecated Supports V1 decryption fallback.
 */
export async function decryptWithFallback(
    packet: EncryptedMessagePacket,
    privateKeys: CryptoKey[]
): Promise<string> {
    if (!privateKeys || privateKeys.length === 0) {
        throw new Error("No private keys provided")
    }

    let lastError: any
    for (const key of privateKeys) {
        try {
            return await decryptHybrid(packet, key)
        } catch (e) {
            lastError = e
            continue
        }
    }
    throw lastError || new Error("Decryption failed with all provided keys")
}

// =============================================================================
// PASSWORD BASED ENCRYPTION (PBKDF2)
// =============================================================================

/**
 * Derive an AES-GCM key from a password and salt using PBKDF2
 */
export async function deriveKeyFromPassword(password: string, salt: string): Promise<CryptoKey> {
    const enc = new TextEncoder()
    const passwordBuffer = enc.encode(password)
    const saltBuffer = base64ToArrayBuffer(salt)

    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    )

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: saltBuffer,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    )
}

/**
 * Encrypt a string (e.g. PEM private key) with a password
 */
export async function encryptPrivateKeyWithPassword(privateKeyPem: string, password: string): Promise<{
    encryptedPrivateKey: string
    salt: string
    iv: string
}> {
    const salt = window.crypto.getRandomValues(new Uint8Array(16))
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const saltB64 = arrayBufferToBase64(salt.buffer)
    const ivB64 = arrayBufferToBase64(iv.buffer)

    const derivedKey = await deriveKeyFromPassword(password, saltB64)

    const enc = new TextEncoder()
    const data = enc.encode(privateKeyPem)

    const encryptedContent = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        derivedKey,
        data
    )

    return {
        encryptedPrivateKey: arrayBufferToBase64(encryptedContent),
        salt: saltB64,
        iv: ivB64
    }
}

/**
 * Decrypt a string (e.g. PEM private key) with a password
 */
export async function decryptPrivateKeyWithPassword(
    encryptedPrivateKey: string,
    password: string,
    salt: string,
    iv: string
): Promise<string> {
    const derivedKey = await deriveKeyFromPassword(password, salt)
    
    const encryptedData = base64ToArrayBuffer(encryptedPrivateKey)
    const ivData = base64ToArrayBuffer(iv)

    const decryptedContent = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: ivData
        },
        derivedKey,
        encryptedData
    )

    const dec = new TextDecoder()
    return dec.decode(decryptedContent)
}

// =============================================================================
// KEY EXPORT HELPERS
// =============================================================================

export async function exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("spki", key)
    const exportedAsString = arrayBufferToBase64(exported)
    return `-----BEGIN PUBLIC KEY-----\n${exportedAsString}\n-----END PUBLIC KEY-----`
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("pkcs8", key)
    const exportedAsString = arrayBufferToBase64(exported)
    return `-----BEGIN PRIVATE KEY-----\n${exportedAsString}\n-----END PRIVATE KEY-----`
}

export async function generateRsaKeyPair(): Promise<CryptoKeyPair> {
    return window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    )
}

// =============================================================================
// V2 ENCRYPTION (Multi-Recipient)
// =============================================================================

export interface MessageEnvelope {
    v: number
    ct: string // Ciphertext
    iv: string // IV
    tag: string // Auth Tag
    keys: Record<string, string> // userId -> Encrypted DEK
}

export async function encryptMessage(
    content: string,
    recipientKeys: Record<string, CryptoKey> // userId -> PublicKey
): Promise<MessageEnvelope> {
    // 1. Generate DEK (AES-256)
    const dek = await generateAesKey()
    
    // 2. Encrypt Content
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const enc = new TextEncoder()
    const encoded = enc.encode(content)
    
    const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        dek,
        encoded
    )
    
    // Extract Tag (last 16 bytes)
    const tagLength = 16
    const ciphertext = encryptedBuffer.slice(0, encryptedBuffer.byteLength - tagLength)
    const tag = encryptedBuffer.slice(encryptedBuffer.byteLength - tagLength)
    
    // 3. Encrypt DEK for each recipient
    const rawDek = await window.crypto.subtle.exportKey("raw", dek)
    const encryptedKeys: Record<string, string> = {}
    
    for (const [userId, pubKey] of Object.entries(recipientKeys)) {
        const encryptedDek = await window.crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            pubKey,
            rawDek
        )
        encryptedKeys[userId] = arrayBufferToBase64(encryptedDek)
    }
    
    return {
        v: 2,
        ct: arrayBufferToBase64(ciphertext),
        iv: arrayBufferToBase64(iv.buffer),
        tag: arrayBufferToBase64(tag),
        keys: encryptedKeys
    }
}

export async function decryptMessage(
    envelope: MessageEnvelope,
    userId: string,
    privateKey: CryptoKey
): Promise<string> {
    if (envelope.v !== 2) {
        throw new Error(`Unsupported version: ${envelope.v}`)
    }
    
    const encryptedDekB64 = envelope.keys[userId]
    if (!encryptedDekB64) {
        throw new Error("No key for this user")
    }
    
    // 1. Decrypt DEK
    const encryptedDek = base64ToArrayBuffer(encryptedDekB64)
    const rawDek = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        encryptedDek
    )
    
    const dek = await window.crypto.subtle.importKey(
        "raw",
        rawDek,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
    )
    
    // 2. Decrypt Content
    const ciphertext = base64ToArrayBuffer(envelope.ct)
    const tag = base64ToArrayBuffer(envelope.tag)
    const iv = base64ToArrayBuffer(envelope.iv)
    
    // Reconstruct encrypted buffer (Ciphertext + Tag)
    const encryptedBuffer = new Uint8Array(ciphertext.byteLength + tag.byteLength)
    encryptedBuffer.set(new Uint8Array(ciphertext), 0)
    encryptedBuffer.set(new Uint8Array(tag), ciphertext.byteLength)
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        dek,
        encryptedBuffer
    )
    
    const dec = new TextDecoder()
    return dec.decode(decryptedBuffer)
}
