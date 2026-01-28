import { createDecipheriv, scryptSync } from 'node:crypto'

const SECRET = process.env.BETTER_AUTH_SECRET || 'default-secret-do-not-use-in-production'
const ALGORITHM = 'aes-256-gcm'

/**
 * Derives a 32-byte key from the master secret using Scrypt
 * Must match the logic in generate_workspace_keys.ts
 */
function getMasterKey() {
    return scryptSync(SECRET, 'salt', 32)
}

/**
 * Decrypts a private key string stored in the database
 * @param encryptedString Format: "iv:authTag:encryptedData" (hex encoded)
 */
export function decryptPrivateKey(encryptedString: string): string {
    const parts = encryptedString.split(':')
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted private key format')
    }

    const [ivHex, authTagHex, encryptedHex] = parts

    const key = getMasterKey()
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
}
