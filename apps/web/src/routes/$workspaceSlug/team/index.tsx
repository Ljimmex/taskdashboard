import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TeamHeader, SortOption, SortDirection, FilterOption } from '@/components/features/teams/TeamHeader'
import { TeamTable } from '@/components/features/teams/TeamTable'
import { CreateTeamPanel } from '@/components/features/teams/CreateTeamPanel'
import { InviteMemberPanel } from '@/components/features/teams/InviteMemberPanel'
import { EditMemberPanel } from '@/components/features/teams/EditMemberPanel'
import { ViewMemberPanel } from '@/components/features/teams/ViewMemberPanel'
import { Team, TeamMember } from '@/components/features/teams/types'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'

export const Route = createFileRoute('/$workspaceSlug/team/')({
    component: TeamPage,
})

export default function TeamPage() {
    const { workspaceSlug } = useParams({ from: '/$workspaceSlug/team/' })
    const { data: session } = useSession()
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    // UI State
    const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false)
    const [invitePanelState, setInvitePanelState] = useState<{ isOpen: boolean; team: Team | null }>({
        isOpen: false,
        team: null
    })
    const [viewingSession, setViewingSession] = useState<{ member: TeamMember; teamName: string } | null>(null)
    const [editingSession, setEditingSession] = useState<{ member: TeamMember; teamName: string } | null>(null)

    // Filter/Sort State
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<SortOption>('name')
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
    const [filters, setFilters] = useState<FilterOption>({})

    // 2. Fetch Workspace Details
    const { data: workspaceData } = useQuery({
        queryKey: ['workspace', workspaceSlug, session?.user?.id],
        queryFn: async () => {
            if (!workspaceSlug) return null
            const json = await apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`, {
                headers: {
                    'x-user-id': session?.user?.id || ''
                }
            })
            return json
        },
        enabled: !!workspaceSlug && !!session?.user?.id
    })

    const workspaceId = workspaceData?.id

    // 3. Fetch Teams for this Workspace
    const { data: teamsData, isLoading: isLoadingTeams, error: teamsError, isError: hasTeamsError } = useQuery({
        queryKey: ['teams', workspaceSlug, session?.user?.id],
        queryFn: async () => {
            if (!workspaceSlug) return []
            const json = await apiFetchJson<any>(`/api/teams?workspaceSlug=${workspaceSlug}`, {
                headers: {
                    'x-user-id': session?.user?.id || ''
                }
            })
            return json.data
        },
        enabled: !!workspaceSlug && !!session?.user?.id
    })

    // 4. Fetch Projects for this Workspace (for dropdowns)
    const { data: projectsData } = useQuery({
        queryKey: ['projects', workspaceSlug, session?.user?.id],
        queryFn: async () => {
            if (!workspaceSlug) return []
            const json = await apiFetchJson<any>(`/api/projects?workspaceSlug=${workspaceSlug}`, {
                headers: {
                    'x-user-id': session?.user?.id || ''
                }
            })
            return json.data
        },
        enabled: !!workspaceSlug && !!session?.user?.id
    })

    // 3. Map API Data to UI Types
    const teams: Team[] = (teamsData || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        color: t.color || '#3B82F6',
        projects: t.projects || [],
        members: t.members ? t.members.map((m: any) => {
            // Format lastActiveAt date
            let lastActiveStr = 'Never'
            let lastActiveDate: Date | null = null
            if (m.user?.lastActiveAt) {
                lastActiveDate = new Date(m.user.lastActiveAt)
                const now = new Date()
                const diffMs = now.getTime() - lastActiveDate.getTime()
                const diffMins = Math.floor(diffMs / (1000 * 60))
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

                if (diffMins < 5) {
                    lastActiveStr = 'Just now'
                } else if (diffMins < 60) {
                    lastActiveStr = `${diffMins}m ago`
                } else if (diffHours < 24) {
                    lastActiveStr = `${diffHours}h ago`
                } else if (diffDays < 7) {
                    lastActiveStr = `${diffDays}d ago`
                } else {
                    lastActiveStr = lastActiveDate.toLocaleDateString()
                }
            }

            return {
                id: m.userId,
                name: m.user?.name || 'Unknown',
                email: m.user?.email || '',
                role: m.user?.position || 'Member', // Job title from users table
                projects: m.user?.projects || [],
                projectCount: m.user?.projects?.length || m.user?.projectCount || 0,
                dateAdded: m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'Unknown',
                dateAddedRaw: m.joinedAt ? new Date(m.joinedAt) : null,
                lastActive: lastActiveStr,
                lastActiveDate,
                avatar: m.user?.image,
                teams: [t.name],
                position: m.user?.position,
                status: m.user?.status || 'active',
                city: m.user?.city,
                country: m.user?.country,
                teamLevel: m.teamLevel // Team level from team_members table
            }
        }) : []
    }))

    // 4. Get available options for filters
    const availableRoles = useMemo(() => {
        const roles = new Set<string>()
        teams.forEach(t => t.members.forEach(m => {
            if (m.role) roles.add(m.role)
        }))
        return Array.from(roles).sort()
    }, [teams])

    const availableTeams = useMemo(() => {
        return teams.map(t => t.name).sort()
    }, [teams])

    const availableProjects = useMemo(() => {
        return (projectsData || []).map((p: any) => p.name).sort()
    }, [projectsData])

    // Get a map of which teams each user belongs to
    const memberTeamsMap = useMemo(() => {
        const map: Record<string, string[]> = {}
        teams.forEach(team => {
            team.members.forEach(member => {
                if (!map[member.id]) {
                    map[member.id] = []
                }
                if (!map[member.id].includes(team.name)) {
                    map[member.id].push(team.name)
                }
            })
        })
        return map
    }, [teams])

    // 5. Apply Filters and Search
    const filteredTeams = useMemo(() => {
        return teams.map(team => {
            let filteredMembers = team.members

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                filteredMembers = filteredMembers.filter(m =>
                    m.name.toLowerCase().includes(query) ||
                    m.email.toLowerCase().includes(query) ||
                    m.role.toLowerCase().includes(query)
                )
            }

            // Role filter
            if (filters.roles && filters.roles.length > 0) {
                filteredMembers = filteredMembers.filter(m => filters.roles!.includes(m.role))
            }

            // Team filter (if showing all members)
            if (filters.teams && filters.teams.length > 0) {
                if (!filters.teams.includes(team.name)) {
                    return { ...team, members: [] }
                }
            }

            // Status filter
            if (filters.status && filters.status.length > 0) {
                filteredMembers = filteredMembers.filter(m => filters.status!.includes(m.status as any))
            }

            // Sort
            filteredMembers = [...filteredMembers].sort((a, b) => {
                let comparison = 0
                switch (sortBy) {
                    case 'name':
                        comparison = a.name.localeCompare(b.name)
                        break
                    case 'email':
                        comparison = a.email.localeCompare(b.email)
                        break
                    case 'role':
                        comparison = a.role.localeCompare(b.role)
                        break
                    case 'dateAdded':
                        comparison = (a.dateAddedRaw?.getTime() || 0) - (b.dateAddedRaw?.getTime() || 0)
                        break
                    case 'lastActive':
                        comparison = (a.lastActiveDate?.getTime() || 0) - (b.lastActiveDate?.getTime() || 0)
                        break
                    case 'projectCount':
                        comparison = (a.projectCount || 0) - (b.projectCount || 0)
                        break
                    default:
                        comparison = 0
                }
                return sortDirection === 'asc' ? comparison : -comparison
            })

            return { ...team, members: filteredMembers }
        }).filter(team => team.members.length > 0 || !searchQuery) // Show empty teams only if no search
    }, [teams, searchQuery, filters, sortBy, sortDirection])

    // 6. Mutations
    const createTeamMutation = useMutation({
        mutationFn: async (newTeam: { name: string; description?: string; color: string; members: any[] }) => {
            return apiFetchJson<any>('/api/teams', {
                method: 'POST',
                headers: {
                    'x-user-id': session?.user?.id || ''
                },
                body: JSON.stringify({
                    ...newTeam,
                    workspaceSlug: workspaceSlug
                })
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] })
            setIsCreatePanelOpen(false)
        }
    })

    const inviteMemberMutation = useMutation({
        mutationFn: async (data: { teamId: string; email?: string; userId?: string; role: string }) => {
            return apiFetchJson<any>(`/api/teams/${data.teamId}/members`, {
                method: 'POST',
                headers: {
                    'x-user-id': session?.user?.id || ''
                },
                body: JSON.stringify(data)
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] })
            setInvitePanelState(prev => ({ ...prev, isOpen: false }))
        }
    })

    const deleteMemberMutation = useMutation({
        mutationFn: async (data: { teamId: string; userId: string }) => {
            return apiFetchJson<any>(`/api/teams/${data.teamId}/members/${data.userId}`, {
                method: 'DELETE',
                headers: {
                    'x-user-id': session?.user?.id || ''
                }
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] })
            setEditingSession(null)
        }
    })

    const updateMemberMutation = useMutation({
        mutationFn: async (data: { teamId: string; userId: string; updates: Partial<TeamMember> }) => {
            return apiFetchJson<any>(`/api/teams/${data.teamId}/members/${data.userId}`, {
                method: 'PATCH',
                headers: {
                    'x-user-id': session?.user?.id || ''
                },
                body: JSON.stringify(data.updates)
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] })
            setEditingSession(null)
        }
    })

    const deleteTeamMutation = useMutation({
        mutationFn: async (teamId: string) => {
            return apiFetchJson<any>(`/api/teams/${teamId}`, {
                method: 'DELETE',
                headers: {
                    'x-user-id': session?.user?.id || ''
                }
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] })
        }
    })

    // Handlers
    const handleCreateTeam = (teamData: { name: string; description?: string; color: string; members: any[] }) => {
        createTeamMutation.mutate(teamData)
    }

    const handleInviteClick = (team: Team) => {
        setInvitePanelState({ isOpen: true, team })
    }

    const handleInviteSubmit = (data: { type: 'email' | 'link'; emails?: string[]; userIds?: string[]; role?: string }) => {
        const targetTeamId = invitePanelState.team?.id
        if (!targetTeamId) return

        if (data.type === 'email') {
            if (data.userIds) {
                data.userIds.forEach(userId => {
                    inviteMemberMutation.mutate({
                        teamId: targetTeamId,
                        userId: userId,
                        role: data.role || 'member'
                    })
                })
            } else if (data.emails) {
                data.emails.forEach(email => {
                    inviteMemberMutation.mutate({
                        teamId: targetTeamId,
                        email: email,
                        role: data.role || 'member'
                    })
                })
            }
        }
    }

    const handleSaveMember = async (id: string, updates: Partial<TeamMember>) => {
        const teamName = editingSession?.teamName
        const team = teams.find(t => t.name === teamName)
        if (!team) return

        updateMemberMutation.mutate({
            teamId: team.id,
            userId: id,
            updates
        })
    }

    const handleDeleteMember = async (id: string, teamIdArg?: string) => {
        let teamId = teamIdArg

        if (!teamId) {
            const teamName = editingSession?.teamName
            const team = teams.find(t => t.name === teamName)
            teamId = team?.id
        }

        if (!teamId) return

        deleteMemberMutation.mutate({
            teamId: teamId,
            userId: id
        })
    }

    const handleDeleteTeam = (team: Team) => {
        if (confirm(`Are you sure you want to delete "${team.name}"? This action cannot be undone.`)) {
            deleteTeamMutation.mutate(team.id)
        }
    }

    const handleEditTeam = (team: Team) => {
        // TODO: Open edit team panel
        console.log('Edit team:', team)
    }

    const handleSortChange = (sort: SortOption, direction: SortDirection) => {
        setSortBy(sort)
        setSortDirection(direction)
    }

    if (isLoadingTeams) {
        return <div className="p-8 text-center text-gray-500">{t('teams.loading')}</div>
    }

    if (hasTeamsError) {
        return (
            <div className="p-8 text-center">
                <div className="text-red-500 mb-4 font-semibold">{t('teams.error_loading')}</div>
                <div className="text-gray-400 text-sm">{String(teamsError)}</div>
                <button
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['teams'] })}
                    className="mt-6 px-4 py-2 bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition-colors"
                >
                    {t('teams.retry')}
                </button>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
            <TeamHeader
                teamCount={filteredTeams.length}
                memberCount={filteredTeams.reduce((acc, t) => acc + t.members.length, 0)}
                onAddTeam={() => setIsCreatePanelOpen(true)}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
                filters={filters}
                onFiltersChange={setFilters}
                availableRoles={availableRoles}
                availableTeams={availableTeams}
                availableProjects={availableProjects}
                userRole={workspaceData?.userRole}
            />

            <div className="space-y-2">
                {filteredTeams.map(team => (
                    <TeamTable
                        key={team.id}
                        team={team}
                        userRole={workspaceData?.userRole}
                        onInvite={handleInviteClick}
                        onEditMember={(member) => {
                            // Inject all teams this member belongs to
                            const allTeams = memberTeamsMap[member.id] || []
                            setEditingSession({
                                member: { ...member, teams: allTeams },
                                teamName: team.name
                            })
                        }}
                        onViewMember={(member) => {
                            // Inject all teams this member belongs to
                            const allTeams = memberTeamsMap[member.id] || []
                            setViewingSession({
                                member: { ...member, teams: allTeams },
                                teamName: team.name
                            })
                        }}
                        onEditTeam={handleEditTeam}
                        onDeleteTeam={handleDeleteTeam}
                        onDeleteMember={(member) => handleDeleteMember(member.id, team.id)}
                    />
                ))}
            </div>

            <CreateTeamPanel
                isOpen={isCreatePanelOpen}
                onClose={() => setIsCreatePanelOpen(false)}
                onCreate={handleCreateTeam}
            />

            <InviteMemberPanel
                isOpen={invitePanelState.isOpen}
                onClose={() => setInvitePanelState(prev => ({ ...prev, isOpen: false }))}
                teamName={invitePanelState.team?.name || ''}
                workspaceSlug={workspaceSlug}
                workspaceId={workspaceId}
                onInvite={handleInviteSubmit}
            />

            <EditMemberPanel
                isOpen={!!editingSession}
                onClose={() => setEditingSession(null)}
                member={editingSession?.member || null}
                currentTeamName={editingSession?.teamName}
                availableTeams={teams.map(t => t.name)}
                availableTeamObjects={teams.map(t => ({ name: t.name, color: t.color }))}
                availableProjects={availableProjects}
                onSave={handleSaveMember}
                onDelete={handleDeleteMember}
            />

            <ViewMemberPanel
                isOpen={!!viewingSession}
                onClose={() => setViewingSession(null)}
                member={viewingSession?.member || null}
                teamName={viewingSession?.teamName}
            />
        </div>
    )
}
