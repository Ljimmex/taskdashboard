import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/auth'
import { keyStorage } from '@/lib/keyStorage'
import { importPublicKey, importPrivateKey } from '@/lib/crypto'
import { apiFetchJson } from '@/lib/api'


export interface EncryptionKeys {
    publicKey: CryptoKey
    privateKey: CryptoKey
}

export interface EncryptionState {
    current: EncryptionKeys
    history: EncryptionKeys[]
}

export function useEncryption(workspaceId: string) {
    const { data: session } = useSession()

    const { data, isLoading, error } = useQuery({
        queryKey: ['encryptionKeys', workspaceId, session?.user?.id],
        queryFn: async (): Promise<EncryptionState> => {
            if (!workspaceId) throw new Error('Workspace ID is required')

            // Fetch history first (it's local and fast)
            const historyStore = await keyStorage.getKeyHistory(workspaceId)
            const history = historyStore.map(h => ({
                publicKey: h.publicKey,
                privateKey: h.privateKey
            }))

            // 1. Try to fetch from API first (Network First)
            try {
                const apiData = await apiFetchJson<any>(`/api/workspaces/${workspaceId}/keys`, {
                    headers: {
                        'x-user-id': session?.user?.id || ''
                    }
                })

                if (apiData?.data) {
                    // Import PEM keys to CryptoKey objects
                    const publicKey = await importPublicKey(apiData.data.publicKey)
                    const privateKey = await importPrivateKey(apiData.data.privateKey)

                    // Import history keys if present
                    const apiHistory = apiData.data.history || []
                    const historyKeys = await Promise.all(apiHistory.map(async (h: any) => ({
                        publicKey: await importPublicKey(h.publicKey),
                        privateKey: await importPrivateKey(h.privateKey),
                        rotatedAt: h.rotatedAt
                    })))

                    // Update secure storage
                    await keyStorage.saveKeys(workspaceId, publicKey, privateKey)

                    // For the hook return, we merge local and API history
                    const localHistory = await keyStorage.getKeyHistory(workspaceId)
                    const mergedHistory = [...historyKeys]

                    // Add local keys that aren't in API history (to be safe)
                    for (const local of localHistory) {
                        const exists = mergedHistory.some(m => m.publicKey === local.publicKey) // Simplified comparison
                        if (!exists) mergedHistory.push(local as any)
                    }

                    return {
                        current: { publicKey, privateKey },
                        history: mergedHistory as any
                    }
                }
            } catch (err) {
                console.warn('Failed to fetch keys from API, trying local storage', err)
            }

            // 2. Fallback to secure storage (IndexedDB) if API fails
            const stored = await keyStorage.getKeys(workspaceId)
            if (stored) {
                return {
                    current: {
                        publicKey: stored.publicKey,
                        privateKey: stored.privateKey
                    },
                    history
                }
            }

            throw new Error('Encryption keys not found (neither on server nor locally)')
        },
        enabled: !!workspaceId,
        staleTime: Infinity, // Keys don't change often (until rotation)
        gcTime: 1000 * 60 * 60 * 24, // Keep in memory cache for 24h
        retry: 2
    })

    return {
        keys: data?.current,
        historyKeys: data?.history || [],
        isLoading,
        error
    }
}
