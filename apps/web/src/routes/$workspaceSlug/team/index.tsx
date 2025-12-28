import { useState } from 'react'
import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TeamHeader } from '@/components/features/teams/TeamHeader'
import { TeamTable } from '@/components/features/teams/TeamTable'
import { CreateTeamPanel } from '@/components/features/teams/CreateTeamPanel'
import { InviteMemberPanel } from '@/components/features/teams/InviteMemberPanel'
import { EditMemberPanel } from '@/components/features/teams/EditMemberPanel'
import { ViewMemberPanel } from '@/components/features/teams/ViewMemberPanel'
import { Team, TeamMember } from '@/components/features/teams/types'
import { useSession } from '@/lib/auth'

export const Route = createFileRoute('/$workspaceSlug/team/')({
    component: TeamPage,
})

export default function TeamPage() {
    const { workspaceSlug } = useParams({ from: '/$workspaceSlug/team/' })
    const { data: session } = useSession()
    const queryClient = useQueryClient()

    // UI State
    const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false)
    const [invitePanelState, setInvitePanelState] = useState<{ isOpen: boolean; team: Team | null }>({
        isOpen: false,
        team: null
    })
    const [viewingSession, setViewingSession] = useState<{ member: TeamMember; teamName: string } | null>(null)
    const [editingSession, setEditingSession] = useState<{ member: TeamMember; teamName: string } | null>(null)

    // 1. Fetch Current Workspace to get ID
    const { data: workspaces } = useQuery({
        queryKey: ['workspaces', session?.user?.id],
        queryFn: async () => {
            const res = await fetch('/api/workspaces', {
                headers: {
                    'x-user-id': session?.user?.id || ''
                }
            })
            if (!res.ok) throw new Error('Failed to fetch workspaces')
            const json = await res.json()
            return json.data
        },
        enabled: !!session?.user?.id
    })

    const currentWorkspace = workspaces?.find((w: any) => w.slug === workspaceSlug)

    // 2. Fetch Teams for this Workspace
    const { data: teamsData, isLoading: isLoadingTeams } = useQuery({
        queryKey: ['teams', currentWorkspace?.id, session?.user?.id],
        queryFn: async () => {
            if (!currentWorkspace?.id) return []
            const res = await fetch(`/api/teams?workspaceId=${currentWorkspace.id}`, {
                headers: {
                    'x-user-id': session?.user?.id || ''
                }
            })
            if (!res.ok) throw new Error('Failed to fetch teams')
            const json = await res.json()
            return json.data
        },
        enabled: !!currentWorkspace?.id && !!session?.user?.id
    })

    // 3. Map API Data to UI Types
    const teams: Team[] = (teamsData || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        color: t.color || '#3B82F6',
        members: t.members ? t.members.map((m: any) => ({
            id: m.userId, // Use user_id from relation
            name: m.user?.name || 'Unknown',
            email: m.user?.email || '',
            role: m.user?.position || m.role || 'Member', // Prefer User Position (Job Title), fallback to Team Role
            projects: [], // Placeholder: Backend to implement
            projectCount: 0,
            dateAdded: m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'Unknown', // Use joinedAt from team_members
            lastActive: 'Recently', // Placeholder
            avatar: m.user?.image,
            teams: [t.name], // Current team context
            position: m.user?.position // Also set explicit position field
        })) : []
    }))

    // 4. Mutations
    const createTeamMutation = useMutation({
        mutationFn: async (newTeam: { name: string; description?: string; color: string; members: any[] }) => {
            const res = await fetch('/api/teams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': session?.user?.id || ''
                },
                body: JSON.stringify({
                    ...newTeam,
                    workspaceId: currentWorkspace.id
                })
            })
            if (!res.ok) throw new Error('Failed to create team')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] })
            setIsCreatePanelOpen(false)
        }
    })

    const inviteMemberMutation = useMutation({
        mutationFn: async (data: { teamId: string; email?: string; userId?: string; role: string }) => {
            const res = await fetch(`/api/teams/${data.teamId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': session?.user?.id || ''
                },
                body: JSON.stringify(data)
            })
            if (!res.ok) throw new Error('Failed to add member')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] })
            setInvitePanelState(prev => ({ ...prev, isOpen: false }))
        }
    })

    const deleteMemberMutation = useMutation({
        mutationFn: async (data: { teamId: string; userId: string }) => {
            const res = await fetch(`/api/teams/${data.teamId}/members/${data.userId}`, {
                method: 'DELETE',
                headers: {
                    'x-user-id': session?.user?.id || ''
                }
            })
            if (!res.ok) throw new Error('Failed to delete member')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] })
            setEditingSession(null)
        }
    })

    const updateMemberMutation = useMutation({
        mutationFn: async (data: { teamId: string; userId: string; updates: Partial<TeamMember> }) => {
            const res = await fetch(`/api/teams/${data.teamId}/members/${data.userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': session?.user?.id || ''
                },
                body: JSON.stringify(data.updates)
            })
            if (!res.ok) throw new Error('Failed to update member')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] })
            setEditingSession(null)
        }
    })

    // Handlers
    const handleCreateTeam = (teamData: { name: string; description?: string; color: string; members: any[] }) => {
        createTeamMutation.mutate(teamData)
    }

    const handleInviteClick = (team: Team) => {
        setInvitePanelState({ isOpen: true, team })
    }

    const handleInviteSubmit = (data: { type: 'email' | 'link'; emails?: string[]; role?: string }) => {
        const targetTeamId = invitePanelState.team?.id
        if (!targetTeamId) return

        if (data.type === 'email' && data.emails) {
            data.emails.forEach(email => {
                inviteMemberMutation.mutate({
                    teamId: targetTeamId,
                    email: email,
                    role: data.role || 'member'
                })
            })
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

    const handleDeleteMember = async (id: string, _teamId?: string) => {
        const teamName = editingSession?.teamName
        const team = teams.find(t => t.name === teamName)
        if (!team) return

        deleteMemberMutation.mutate({
            teamId: team.id,
            userId: id
        })
    }


    if (isLoadingTeams) {
        return <div className="p-8 text-center text-gray-500">Loading teams...</div>
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
            <TeamHeader
                teamCount={teams.length}
                memberCount={teams.reduce((acc, t) => acc + t.members.length, 0)}
                onAddTeam={() => setIsCreatePanelOpen(true)}
            />

            <div className="space-y-2">
                {teams.map(team => (
                    <TeamTable
                        key={team.id}
                        team={team}
                        onInvite={handleInviteClick}
                        onEditMember={(member) => setEditingSession({ member, teamName: team.name })}
                        onViewMember={(member) => setViewingSession({ member, teamName: team.name })}
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
                onInvite={handleInviteSubmit}
            />

            <EditMemberPanel
                isOpen={!!editingSession}
                onClose={() => setEditingSession(null)}
                member={editingSession?.member || null}
                currentTeamName={editingSession?.teamName}
                availableTeams={teams.map(t => t.name)}
                availableProjects={['Wortix', 'Pragion', 'Plague Inc.', 'UppApp', 'Handix', 'Clinic Web', 'Driftly', 'Internal', 'Apex', 'Hero', 'Nation', 'Mu', 'Zeta', 'Xi - Xian Group']}
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
