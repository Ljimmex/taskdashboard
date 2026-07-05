export interface TeamData {
    id: string
    ownerId: string
    members?: {
        userId: string
        teamLevel: string
        user?: {
            id?: string
            name?: string
            image?: string
            email?: string
        }
    }[]
}

export interface AssigneeMember {
    id: string
    name: string
    avatar?: string
    email?: string
    role?: string
}

export function getAssignableMembers(
    teamsData: TeamData[] | undefined,
    currentUserId: string | undefined,
    options?: { projectTeamId?: string; fallbackToAll?: boolean }
): AssigneeMember[] {
    if (!teamsData || !currentUserId) return []

    const projectTeamId = options?.projectTeamId
    const projectTeam = projectTeamId ? teamsData.find(t => t.id === projectTeamId) : undefined

    const allowedTeamIds = new Set<string>()
    if (projectTeam) allowedTeamIds.add(projectTeam.id)

    teamsData.forEach(team => {
        const isOwner = team.ownerId === currentUserId
        const isLead = team.members?.some(
            m => m.userId === currentUserId && m.teamLevel === 'team_lead'
        )
        if (isOwner || isLead) {
            allowedTeamIds.add(team.id)
        }
    })

    const isLeadingAnyTeam = allowedTeamIds.size > (projectTeam ? 1 : 0)
    const sourceTeams = isLeadingAnyTeam || !options?.fallbackToAll
        ? teamsData.filter(t => allowedTeamIds.has(t.id))
        : teamsData

    const map = new Map<string, AssigneeMember>()
    sourceTeams.forEach(team => {
        team.members?.forEach(m => {
            if (!m.user) return
            const id = m.userId || m.user.id
            if (!id || map.has(id)) return
            map.set(id, {
                id,
                name: m.user.name || 'Unknown',
                avatar: m.user.image,
                email: m.user.email,
                role: m.teamLevel
            })
        })
    })

    return Array.from(map.values())
}
