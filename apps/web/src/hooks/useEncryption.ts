import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/auth'
import { keyStorage } from '@/lib/keyStorage'
import { importPublicKey, importPrivateKey } from '@/lib/crypto'
import { apiFetchJson } from '@/lib/api'


export interface EncryptionKeys {
    publicKey: CryptoKey
    privateKey: CryptoKey
}

export function useEncryption(workspaceId: string) {
    const { data: session } = useSession()

    const { data: keys, isLoading, error } = useQuery({
        queryKey: ['encryptionKeys', workspaceId, session?.user?.id],
        queryFn: async (): Promise<EncryptionKeys> => {
            if (!workspaceId) throw new Error('Workspace ID is required')

            // 1. Try to load from secure storage (IndexedDB)
            const stored = await keyStorage.getKeys(workspaceId)
            if (stored) {
                // Check if keys verify? No easy way, assume valid. 
                // Could check expiration logic here (Phase 3).
                return {
                    publicKey: stored.publicKey,
                    privateKey: stored.privateKey
                }
            }

            // 2. Fetch from API if not in storage
            const data = await apiFetchJson<any>(`/api/workspaces/${workspaceId}/keys`, {
                headers: {
                    'x-user-id': session?.user?.id || ''
                }
            })

            if (!data?.data) {
                throw new Error('Invalid key response from server')
            }

            // 3. Import PEM keys to CryptoKey objects
            const publicKey = await importPublicKey(data.data.publicKey)
            const privateKey = await importPrivateKey(data.data.privateKey)

            // 4. Save to secure storage
            await keyStorage.saveKeys(workspaceId, publicKey, privateKey)

            return { publicKey, privateKey }
        },
        enabled: !!workspaceId,
        staleTime: Infinity, // Keys don't change often (until rotation)
        gcTime: 1000 * 60 * 60 * 24, // Keep in memory cache for 24h
        retry: 2
    })

    return {
        keys,
        isLoading,
        error
    }
}
