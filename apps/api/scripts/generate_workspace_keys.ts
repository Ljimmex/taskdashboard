import { db } from '../src/db'
import { workspaces, encryptionKeys } from '../src/db/schema'
import { eq } from 'drizzle-orm'
import { generateKeyPairSync, randomBytes, createCipheriv, scryptSync } from 'node:crypto'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const SECRET = process.env.BETTER_AUTH_SECRET || 'default-secret-do-not-use-in-production'
const ALGORITHM = 'aes-256-gcm'
const KEY_EXPIRATION_DAYS = 90 // Policy: Rotate keys every 90 days

/**
 * Derives a 32-byte key from the master secret using Scrypt
 */
function getMasterKey() {
    return scryptSync(SECRET, 'salt', 32)
}

/**
 * Encrypts data using AES-256-GCM
 */
function encryptPrivateKey(privateKeyParam: string): string {
    const key = getMasterKey()
    const iv = randomBytes(16)
    const cipher = createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(privateKeyParam, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag().toString('hex')

    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

function getExpirationDate(): Date {
    const date = new Date()
    date.setDate(date.getDate() + KEY_EXPIRATION_DAYS)
    return date
}

async function main() {
    console.log(`🔐 Starting workspace encryption key generation (Policy: ${KEY_EXPIRATION_DAYS} days expiration)...`)

    try {
        // 1. Get all workspaces
        const allWorkspaces = await db.select().from(workspaces)
        console.log(`Found ${allWorkspaces.length} workspaces.`)

        let generatedCount = 0
        let updatedCount = 0

        for (const workspace of allWorkspaces) {
            // 2. Check if key already exists
            const existingKeys = await db.select()
                .from(encryptionKeys)
                .where(eq(encryptionKeys.workspaceId, workspace.id))
                .limit(1)

            const existingKey = existingKeys[0]

            if (existingKey) {
                // Check if expiration is missing and update it
                if (!existingKey.expiresAt) {
                    console.log(`Updating expiration policy for workspace: ${workspace.name}...`)
                    await db.update(encryptionKeys)
                        .set({ expiresAt: getExpirationDate() })
                        .where(eq(encryptionKeys.id, existingKey.id))
                    updatedCount++
                }
                continue
            }

            console.log(`Generating keys for workspace: ${workspace.name} (${workspace.id})...`)

            // 3. Generate RSA Key Pair
            const { publicKey, privateKey } = generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem'
                }
            })

            // 4. Encrypt Private Key
            const encryptedPrivateKey = encryptPrivateKey(privateKey)

            // 5. Save to database with expiration
            await db.insert(encryptionKeys).values({
                workspaceId: workspace.id,
                publicKey: publicKey,
                encryptedPrivateKey: encryptedPrivateKey,
                createdAt: new Date(),
                expiresAt: getExpirationDate()
            })

            generatedCount++
        }

        console.log('\n✅ Key generation & policy enforcement complete!')
        console.log(`Generated new keys: ${generatedCount}`)
        console.log(`Updated expiration policies: ${updatedCount}`)

    } catch (error) {
        console.error('❌ Error generating keys:', error)
        process.exit(1)
    }

    process.exit(0)
}

main()
