import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT = 'zadano-2fa-encryption-salt-v1'
const PREFIX = 'enc:'

function getEncryptionKey(): Buffer {
  const key = process.env.TWO_FACTOR_ENCRYPTION_KEY
  if (!key) {
    throw new Error('TWO_FACTOR_ENCRYPTION_KEY is not set. It must be at least 32 characters long.')
  }
  return crypto.scryptSync(key, SALT, 32)
}

function encrypt(value: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

function decrypt(value: string): string {
  if (!value.startsWith(PREFIX)) {
    throw new Error('Value is not encrypted with the expected prefix')
  }
  const parts = value.slice(PREFIX.length).split(':')
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted value')
  }
  const [ivB64, authTagB64, dataB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const encrypted = Buffer.from(dataB64, 'base64')
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

/**
 * Encrypt a 2FA secret before storing it in the database.
 */
export function encryptTwoFactor(value: string): string {
  return encrypt(value)
}

/**
 * Decrypt a 2FA secret from the database.
 * Falls back to returning the raw value if it was stored before encryption
 * was introduced (backward-compatible migration path).
 */
export function decryptTwoFactor(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return decrypt(value)
  } catch {
    // Not encrypted yet — return plaintext and let the next write re-encrypt it.
    return value
  }
}
