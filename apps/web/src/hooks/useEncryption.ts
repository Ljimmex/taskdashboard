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

            // 1. Try to fetch from API first (Network First)
            try {
                const apiData = await apiFetchJson<any>(`/api/workspaces/${workspaceId}/keys`, {
                    headers: {
                        'x-user-id': session?.user?.id || ''
                    }
                })

                if (apiData?.data) {
                    // If server regenerated keys, clear all stale local keys
                    if (apiData.data.regenerated) {
                        console.warn('🔑 Server regenerated encryption keys for workspace', workspaceId, '— clearing stale local keys')
                        await keyStorage.deleteKeys(workspaceId)
                    }

                    // Import PEM keys to CryptoKey objects
                    const publicKey = await importPublicKey(apiData.data.publicKey)
                    const privateKey = await importPrivateKey(apiData.data.privateKey)

                    // Import history keys if present
                    const apiHistory = apiData.data.history || []
                    const historyKeys = await Promise.all(apiHistory.map(async (h: any) => {
                        try {
                            return {
                                publicKey: await importPublicKey(h.publicKey),
                                privateKey: await importPrivateKey(h.privateKey),
                                rotatedAt: h.rotatedAt
                            }
                        } catch (e) {
                            console.warn('Failed to import historical key, skipping', e)
                            return null
                        }
                    }))
                    const validHistoryKeys = historyKeys.filter(Boolean)

                    // Save current keys to IndexedDB for offline/fallback use
                    await keyStorage.saveKeys(workspaceId, publicKey, privateKey)

                    // Merge: API history keys + any local-only history keys
                    const localHistory = await keyStorage.getKeyHistory(workspaceId)
                    const mergedHistory = [...validHistoryKeys]

                    for (const local of localHistory) {
                        // Only add local keys not already in API history (rough dedup)
                        const exists = mergedHistory.some(m => m !== null)
                        if (!exists || localHistory.length > mergedHistory.length) {
                            mergedHistory.push(local as any)
                        }
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
                const history = await keyStorage.getKeyHistory(workspaceId)
                return {
                    current: {
                        publicKey: stored.publicKey,
                        privateKey: stored.privateKey
                    },
                    history: history.map(h => ({
                        publicKey: h.publicKey,
                        privateKey: h.privateKey
                    }))
                }
            }

            throw new Error('Encryption keys not found (neither on server nor locally)')
        },
        enabled: !!workspaceId && !!session?.user?.id,
        staleTime: 1000 * 60 * 5, // Refresh keys every 5 minutes to pick up regeneration
        gcTime: 1000 * 60 * 60 * 24, // Keep in memory cache for 24h
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
    })

    return {
        keys: data?.current,
        historyKeys: data?.history || [],
        isLoading,
        error
    }
}

