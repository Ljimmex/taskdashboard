import React, { createContext, useContext, useEffect, useState } from 'react'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { 
    generateRsaKeyPair, 
    exportPublicKey, 
    exportPrivateKey, 
    encryptPrivateKeyWithPassword, 
    decryptPrivateKeyWithPassword,
    importPrivateKey,
    importPublicKey
} from '@/lib/crypto'

interface EncryptionContextType {
    publicKey: CryptoKey | null
    privateKey: CryptoKey | null
    isLoading: boolean
}

const EncryptionContext = createContext<EncryptionContextType | null>(null)

// In a real app, this should be a strong user password or a key derived from a master secret
// Since we want this transparent in the background without user prompt, we use a deterministic derived key
const getDerivedPassword = (userId: string) => `auto-generated-secret-${userId}-v1`

export function EncryptionProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession()
    const [publicKey, setPublicKey] = useState<CryptoKey | null>(null)
    const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Reset state when user changes
    useEffect(() => {
        if (!session?.user) {
            setPublicKey(null)
            setPrivateKey(null)
            setIsLoading(false)
            return
        }

        const initKeys = async () => {
            setIsLoading(true)
            try {
                const user = await apiFetchJson<any>('/api/users/me')
                const derivedPassword = getDerivedPassword(session.user.id)

                if (user.publicKey && user.encryptedPrivateKey && user.keySalt && user.keyIv) {
                    // Keys exist - Unlock them automatically
                    try {
                        const pubKey = await importPublicKey(user.publicKey)
                        setPublicKey(pubKey)

                        const privateKeyPem = await decryptPrivateKeyWithPassword(
                            user.encryptedPrivateKey,
                            derivedPassword,
                            user.keySalt,
                            user.keyIv
                        )
                        const privKey = await importPrivateKey(privateKeyPem)
                        setPrivateKey(privKey)
                    } catch (err) {
                        console.error("Failed to unlock existing keys", err)
                        // If unlock fails (maybe old password?), we might need to reset? 
                        // For now, just leave as null private key (read-only mode?)
                    }
                } else {
                    // Keys missing - Generate them automatically
                    console.log("Generating new encryption keys for user...")
                    
                    // 1. Generate RSA Pair
                    const keyPair = await generateRsaKeyPair()
                    
                    // 2. Export Keys
                    const publicKeyPem = await exportPublicKey(keyPair.publicKey)
                    const privateKeyPem = await exportPrivateKey(keyPair.privateKey)

                    // 3. Encrypt Private Key with derived password
                    const { encryptedPrivateKey, salt, iv } = await encryptPrivateKeyWithPassword(privateKeyPem, derivedPassword)

                    // 4. Send to Backend
                    await apiFetchJson('/api/users/me', {
                        method: 'PATCH',
                        body: JSON.stringify({
                            publicKey: publicKeyPem,
                            encryptedPrivateKey,
                            keySalt: salt,
                            keyIv: iv
                        })
                    })

                    // 5. Update State
                    setPublicKey(keyPair.publicKey)
                    setPrivateKey(keyPair.privateKey)
                }
            } catch (error) {
                console.error("Failed to initialize encryption keys", error)
            } finally {
                setIsLoading(false)
            }
        }

        initKeys()
    }, [session?.user?.id])

    return (
        <EncryptionContext.Provider value={{
            publicKey,
            privateKey,
            isLoading
        }}>
            {children}
        </EncryptionContext.Provider>
    )
}

export function useEncryption() {
    const context = useContext(EncryptionContext)
    if (!context) {
        throw new Error('useEncryption must be used within an EncryptionProvider')
    }
    return context
}
