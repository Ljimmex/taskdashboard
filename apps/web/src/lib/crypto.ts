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
// HYBRID ENCRYPTION
// =============================================================================

export interface EncryptedMessagePacket {
    v: string           // Version "1"
    data: string        // Base64 AES encrypted content
    iv: string          // Base64 AES IV (12 bytes)
    key: string         // Base64 RSA encrypted AES key
}

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
