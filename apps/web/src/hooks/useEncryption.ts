import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/auth'
import { importPublicKey, importPrivateKey } from '@/lib/crypto'
import { apiFetchJson } from '@/lib/api'


export interface EncryptionKeys {
    publicKey: CryptoKey
    privateKey: CryptoKey
}

export function useEncryption(workspaceId: string) {
    const { data: session } = useSession()

    const { data, isLoading, error } = useQuery({
        queryKey: ['encryptionKeys', workspaceId],
        queryFn: async () => {
            if (!workspaceId) throw new Error('Workspace ID is required')

            // Always fetch from server — server is the single source of truth
            const apiData = await apiFetchJson<any>(`/api/workspaces/${workspaceId}/keys`, {
                headers: {
                    'x-user-id': session?.user?.id || ''
                }
            })

            if (!apiData?.data?.publicKey || !apiData?.data?.privateKey) {
                throw new Error('Server returned no encryption keys')
            }

            // Import PEM strings to CryptoKey objects
            const publicKey = await importPublicKey(apiData.data.publicKey)
            const privateKey = await importPrivateKey(apiData.data.privateKey)

            // Import history keys (for decrypting old messages after key rotation)
            const historyKeys = await Promise.all(
                (apiData.data.history || []).map(async (h: any) => {
                    try {
                        return {
                            publicKey: await importPublicKey(h.publicKey),
                            privateKey: await importPrivateKey(h.privateKey),
                        }
                    } catch {
                        return null
                    }
                })
            )

            return {
                current: { publicKey, privateKey },
                history: historyKeys.filter(Boolean) as EncryptionKeys[]
            }
        },
        enabled: !!workspaceId && !!session?.user?.id,
        staleTime: 1000 * 60 * 10, // 10 minutes — keys are stable, no need to refetch often
        gcTime: 1000 * 60 * 60,    // 1 hour in memory
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000)
    })

    return {
        keys: data?.current,
        historyKeys: data?.history || [],
        isLoading,
        error
    }
}
