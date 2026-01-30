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

    // 2. Fetch all teams and their members
    const { data: teamsData, isLoading } = useQuery({
        queryKey: ['teams', currentWorkspace?.id, session?.user?.id],
        queryFn: async () => {
            if (!currentWorkspace?.id) return []
            const json = await apiFetchJson<any>(`/api/teams?workspaceId=${currentWorkspace.id}`, {
                headers: {
                    'x-user-id': session?.user?.id || ''
                }
            })
            return json.data
        },
        enabled: !!currentWorkspace?.id && !!session?.user?.id
    })

    // 3. Extract unique members from all teams
    const members: TeamMember[] = []
    const seenIds = new Set<string>()

    if (teamsData) {
        for (const team of teamsData) {
            if (team.members) {
                for (const m of team.members) {
                    // Skip current user and duplicates
                    if (m.userId === session?.user?.id || seenIds.has(m.userId)) {
                        continue
                    }
                    seenIds.add(m.userId)

                    members.push({
                        id: m.userId,
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
        }
    }

    return {
        members,
        isLoading
    }
}
