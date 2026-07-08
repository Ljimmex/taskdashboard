import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'

export interface TeamMember {
  id: string
  userId: string
  name: string
  email: string
  avatar?: string
  position?: string
  teamLevel?: string
  isOnline?: boolean
  lastActiveAt?: string
}

export interface Team {
  id: string
  name: string
  slug: string
  color?: string
  description?: string
  members: TeamMember[]
}

export function useTeams(workspaceSlug?: string) {
  const { data: session } = useSession()

  return useQuery({
    queryKey: ['teams', workspaceSlug, session?.user?.id],
    queryFn: async () => {
      if (!workspaceSlug) return []
      const json = await apiFetchJson<any>(
        `/api/teams?workspaceSlug=${encodeURIComponent(workspaceSlug)}`,
        {
          headers: {
            'x-user-id': session?.user?.id || '',
          },
        }
      )
      const teams: Team[] = (json.data || []).map((team: any) => ({
        id: team.id,
        name: team.name,
        slug: team.slug,
        color: team.color,
        description: team.description,
        members: (team.members || []).map((m: any) => {
          const user = m.user || {}
          const lastActiveAt = user.lastActiveAt
          return {
            id: user.id || m.userId,
            userId: m.userId,
            name: user.name || 'Unknown',
            email: user.email || '',
            avatar: user.image,
            position: user.position,
            teamLevel: m.teamLevel,
            isOnline: lastActiveAt
              ? new Date().getTime() - new Date(lastActiveAt).getTime() < 5 * 60 * 1000
              : false,
            lastActiveAt,
          }
        }),
      }))
      return teams
    },
    enabled: !!workspaceSlug && !!session?.user?.id,
  })
}
