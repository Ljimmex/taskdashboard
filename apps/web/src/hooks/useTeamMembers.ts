import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'

export interface TeamMember {
    id: string
    name: string
    email: string
    avatar?: string
    position?: string
    isOnline?: boolean
    lastActiveAt?: string
}

export function useTeamMembers(workspaceSlug: string) {
    const { data: session } = useSession()

    // 1. Fetch workspace ID
    const { data: workspaces } = useQuery({
        queryKey: ['workspaces', session?.user?.id],
        queryFn: async () => {
            const json = await apiFetchJson<any>('/api/workspaces', {
                headers: {
                    'x-user-id': session?.user?.id || ''
                }
            })
            return json.data
        },
        enabled: !!session?.user?.id
    })

    const currentWorkspace = workspaces?.find((w: any) => w.slug === workspaceSlug)

    // 2. Fetch all WORKSPACE members (not just team members)
    const { data: membersData, isLoading } = useQuery({
        queryKey: ['workspace-members', currentWorkspace?.id, session?.user?.id],
        queryFn: async () => {
            if (!currentWorkspace?.id) return []
            const json = await apiFetchJson<any>(`/api/workspaces/${currentWorkspace.id}/members`, {
                headers: {
                    'x-user-id': session?.user?.id || ''
                }
            })
            return json.data || []
        },
        enabled: !!currentWorkspace?.id && !!session?.user?.id,
        refetchInterval: 10000 // Poll every 10s for online status updates
    })

    // 3. Map workspace members to TeamMember format, excluding current user
    const members: TeamMember[] = []

    if (membersData) {
        for (const m of membersData) {
            const userId = m.user?.id
            // Skip current user and suspended members
            if (userId === session?.user?.id || m.status === 'suspended') {
                continue
            }

            members.push({
                id: userId,
                name: m.user?.name || 'Unknown',
                email: m.user?.email || '',
                avatar: m.user?.image,
                position: m.user?.position,
                isOnline: m.user?.lastActiveAt
                    ? (new Date().getTime() - new Date(m.user.lastActiveAt).getTime()) < 5 * 60 * 1000
                    : false,
                lastActiveAt: m.user?.lastActiveAt
            })
        }
    }

    return {
        members,
        isLoading
    }
}
