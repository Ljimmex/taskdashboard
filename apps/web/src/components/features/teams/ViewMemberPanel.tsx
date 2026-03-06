import { useRef, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, apiFetchJson } from '@/lib/api'
import { useTranslation } from 'react-i18next'
import { useRouter, useParams } from '@tanstack/react-router'
import { usePanelStore } from '../../../lib/panelStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { TeamMember } from './types'
import { ProgressBar } from '@/components/common/ProgressBar'
import {
    SubtaskCheckboxIcon,
    SendIcon,
    KanbanIconGrey
} from '../tasks/components/TaskIcons'

interface ViewMemberPanelProps {
    isOpen: boolean
    onClose: () => void
    member: TeamMember | null
    teamName?: string
}

export function ViewMemberPanel({ isOpen, onClose, member, teamName }: ViewMemberPanelProps) {
    const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)
    const panelRef = useRef<HTMLDivElement>(null)
    const { t } = useTranslation()
    const router = useRouter()
    const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
    const queryClient = useQueryClient()

    const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false)
    const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null)

    // Sync global panel state
    useEffect(() => {
        setIsPanelOpen(isOpen)
        if (!isOpen) {
            setIsAssignTaskOpen(false)
        }
    }, [isOpen, setIsPanelOpen])

    // Close on Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isAssignTaskOpen) {
                    setIsAssignTaskOpen(false)
                } else {
                    onClose()
                }
            }
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            return () => document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose, isAssignTaskOpen])

    // Determine displayed teams: prioritize member.teams, fall back to teamName if present
    const displayTeams = (member?.teams && member.teams.length > 0)
        ? member.teams
        : (teamName ? [teamName] : [])

    // Real Workload Data Calculation
    const { data: tasksData, isLoading: isLoadingTasks } = useQuery({
        queryKey: ['workspace-tasks', workspaceSlug],
        queryFn: () => apiFetchJson<any>(`/api/tasks?workspaceSlug=${workspaceSlug}`),
        enabled: !!workspaceSlug && !!member && isOpen
    })

    const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
        queryKey: ['workspace-projects', workspaceSlug],
        queryFn: () => apiFetchJson<any>(`/api/projects?workspaceSlug=${workspaceSlug}`),
        enabled: !!workspaceSlug && !!member && isOpen
    })

    const completedTasks = useMemo(() => {
        if (!tasksData?.data || !projectsData?.data || !member) return 0
        let count = 0
        const allTasks = tasksData.data.filter((task: any) => {
            return task.assignees?.some((a: any) => a === member?.id || a.id === member?.id) ||
                task.assigneeDetails?.some((a: any) => a.id === member?.id)
        })

        allTasks.forEach((task: any) => {
            if (task.isCompleted) {
                count++
                return
            }
            const proj = projectsData.data.find((p: any) => p.id === task.projectId)
            if (proj?.stages && proj.stages.length > 0) {
                const finalStage = proj.stages[proj.stages.length - 1]
                if (task.status === finalStage.name || task.status === finalStage.id) {
                    count++
                }
            }
        })
        return count
    }, [tasksData, projectsData, member])

    const totalTasks = useMemo(() => {
        if (!tasksData?.data || !member) return 0
        return tasksData.data.filter((task: any) => {
            return task.assignees?.some((a: any) => a === member?.id || a.id === member?.id) ||
                task.assigneeDetails?.some((a: any) => a.id === member?.id)
        }).length
    }, [tasksData, member])

    const workloadPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const isLoadingWorkload = isLoadingTasks || isLoadingProjects

    // Filter tasks not assigned to this member but belonging to the projects they're part of (or all workspace projects if we want to be less restrictive)
    const assignableTasks = useMemo(() => {
        if (!tasksData?.data || !member) return []
        return tasksData.data.filter((task: any) => {
            const isAssigned = task.assignees?.some((a: any) => a === member?.id || a.id === member?.id) ||
                task.assigneeDetails?.some((a: any) => a.id === member?.id)
            if (isAssigned) return false

            // Optional: filter by projects the member is part of. But here we can show all unassigned workspace tasks for flexibility.
            return !task.isCompleted
        })
    }, [tasksData, member])

    const assignTaskMutation = useMutation({
        mutationFn: async (taskId: string) => {
            const currentTask = tasksData?.data?.find((t: any) => t.id === taskId)
            if (!currentTask) throw new Error("Task not found")

            // Preserve existing assignees and add the new member
            const existingAssigneeIds = currentTask.assigneeDetails?.map((a: any) => a.id) ||
                currentTask.assignees?.map((a: any) => typeof a === 'string' ? a : a.id) || []

            const updatedAssignees = Array.from(new Set([...existingAssigneeIds, member?.id]))

            return apiFetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    assignees: updatedAssignees,
                })
            })
        },
        onMutate: (taskId) => {
            setSubmittingTaskId(taskId)
        },
        onSettled: () => {
            setSubmittingTaskId(null)
            queryClient.invalidateQueries({ queryKey: ['workspace-tasks', workspaceSlug] })
        }
    })

    if (!isOpen || !member) return null

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Main View Panel */}
            <div
                ref={panelRef}
                className={`fixed top-4 right-4 bottom-4 w-full max-w-md bg-[var(--app-bg-deepest)] rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'}`}
            >
                {/* Header: Compact & Productivity Focused */}
                <div className="flex-none p-6 border-b border-[var(--app-border)] flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        {/* Avatar 48x48 */}
                        <div className="relative">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-[var(--app-text-primary)] overflow-hidden shadow-sm border border-[var(--app-border)] ${member.avatar ? 'bg-transparent' : 'bg-gradient-to-br from-gray-700 to-gray-600'}`}>
                                {member.avatar ? (
                                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                ) : (
                                    member.name.charAt(0)
                                )}
                            </div>
                            {/* Presence Indicator Badge */}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--app-bg-deepest)] ${member.lastActive === 'Just now' ? 'bg-green-500' : 'bg-[var(--app-text-muted)]'}`} title={member.lastActive === 'Just now' ? 'Online' : 'Offline'}></div>
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-[var(--app-text-primary)] leading-tight">{member.name}</h2>
                            <p className="text-[var(--app-text-secondary)] text-xs mb-1">{member.role || member.position || 'No title'}</p>

                            {/* NEW: Contact Info moved here */}
                            <div className="flex items-center gap-1.5 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)] transition-colors cursor-pointer w-fit">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                                {member.email}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] transition-colors p-1"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 px-6 py-6 overflow-y-auto space-y-8">

                    {/* Workload Indicator (Moved to top as it's key info) */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label className="uppercase text-xs font-semibold text-[var(--app-text-muted)] tracking-wider">
                                {t('teams.view_panel.current_workload')}
                                {isLoadingWorkload && <span className="ml-2 lowercase text-[10px] opacity-70">({t('common.loading', 'Loading...')})</span>}
                            </Label>
                            <span className="text-xs text-[var(--app-text-secondary)]">{t('teams.view_panel.tasks_count', { completed: completedTasks, total: totalTasks })}</span>
                        </div>
                        <ProgressBar
                            value={completedTasks}
                            max={totalTasks > 0 ? totalTasks : 1}
                            size="md"
                            showLabel={false}
                        />
                        <p className="text-[10px] text-[var(--app-text-muted)] mt-1 text-right">{t('teams.view_panel.capacity_used', { percentage: workloadPercentage })}</p>
                    </div>

                    {/* Quick Actions - Improved Styling + Project Icons */}
                    <div className="grid grid-cols-3 gap-3">
                        <Button
                            variant="default" // Changed from outline for better visibility
                            onClick={() => setIsAssignTaskOpen(true)}
                            className="h-auto py-3 flex flex-col gap-2 bg-[var(--app-bg-card)] border border-[var(--app-border)] hover:bg-[var(--app-bg-input)] hover:border-[var(--app-border)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-all shadow-sm group"
                        >
                            <div className="opacity-80 group-hover:opacity-100 transition-opacity">
                                <SubtaskCheckboxIcon />
                            </div>
                            <span className="text-[10px] font-medium">{t('teams.view_panel.quick_actions.assign_task')}</span>
                        </Button>

                        <Button
                            variant="default"
                            onClick={() => {
                                onClose()
                                router.navigate({ to: `/${workspaceSlug}/messages`, search: { userId: member.id } })
                            }}
                            className="h-auto py-3 flex flex-col gap-2 bg-[var(--app-bg-card)] border border-[var(--app-border)] hover:bg-[var(--app-bg-input)] hover:border-[var(--app-border)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-all shadow-sm group"
                        >
                            <div className="opacity-80 group-hover:opacity-100 transition-opacity">
                                <SendIcon />
                            </div>
                            <span className="text-[10px] font-medium">{t('teams.view_panel.quick_actions.message')}</span>
                        </Button>

                        <Button
                            variant="default"
                            onClick={() => {
                                onClose()
                                router.navigate({ to: `/${workspaceSlug}/my-tasks`, search: { userId: member.id } })
                            }}
                            className="h-auto py-3 flex flex-col gap-2 bg-[var(--app-bg-card)] border border-[var(--app-border)] hover:bg-[var(--app-bg-input)] hover:border-[var(--app-border)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-all shadow-sm group"
                        >
                            <div className="opacity-80 group-hover:opacity-100 transition-opacity">
                                <KanbanIconGrey />
                            </div>
                            <span className="text-[10px] font-medium">{t('teams.view_panel.quick_actions.view_tasks')}</span>
                        </Button>
                    </div>

                    {/* Context: Teams & Projects */}
                    <div className="space-y-6">
                        {/* Teams */}
                        <div>
                            <Label className="uppercase text-xs font-semibold text-[var(--app-text-muted)] tracking-wider mb-3 block">{t('teams.view_panel.teams')}</Label>
                            <div className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[var(--app-bg-sidebar)]">
                                <div className="flex flex-wrap gap-2">
                                    {displayTeams.length > 0 ? displayTeams.map((team, i) => (
                                        <div key={i} className="flex items-center gap-1 bg-[var(--app-bg-elevated)] pl-2 pr-2.5 py-1 rounded-lg text-xs font-medium text-[var(--app-text-primary)] border border-[var(--app-border)]/50">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                            {team}
                                        </div>
                                    )) : (
                                        <span className="text-[var(--app-text-muted)] text-xs py-1">{t('teams.view_panel.no_teams')}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Projects */}
                        <div>
                            <Label className="uppercase text-xs font-semibold text-[var(--app-text-muted)] tracking-wider mb-3 block">{t('teams.view_panel.active_projects')}</Label>
                            <div className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[var(--app-bg-sidebar)]">
                                {(member.projects && member.projects.length > 0) ? (
                                    <div className="flex flex-wrap gap-2">
                                        {member.projects.map((proj, i) => (
                                            <div key={i} className="flex items-center gap-1 bg-[var(--app-bg-elevated)] px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--app-text-primary)] border border-[var(--app-border)]/50">
                                                {proj}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-[var(--app-text-muted)] py-1">{t('teams.view_panel.no_projects')}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* System Information */}
                    <div className="pt-4 border-t border-[var(--app-border)] space-y-3">
                        <div className="flex items-center justify-between text-xs text-[var(--app-text-muted)]">
                            <span>{t('teams.view_panel.member_since')}</span>
                            <span className="text-[var(--app-text-secondary)] font-medium">{member.dateAdded || 'Unknown'}</span>
                        </div>

                        {/* Location */}
                        {(member.city || member.country) && (
                            <div className="flex items-center justify-between text-xs text-[var(--app-text-muted)]">
                                <span className="flex items-center gap-1.5">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    {t('teams.view_panel.location')}
                                </span>
                                <span className="text-[var(--app-text-secondary)] font-medium">
                                    {[member.city, member.country].filter(Boolean).join(', ')}
                                </span>
                            </div>
                        )}

                        {/* Team Level */}
                        {member.teamLevel && (
                            <div className="flex items-center justify-between text-xs text-[var(--app-text-muted)]">
                                <span className="flex items-center gap-1.5">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                                    </svg>
                                    {t('teams.edit_panel.team_level')}
                                </span>
                                <span className={`font-medium px-2 py-0.5 rounded text-[10px] ${member.teamLevel === 'team_lead' ? 'bg-amber-500/20 text-amber-400' :
                                    member.teamLevel === 'senior' ? 'bg-blue-500/20 text-blue-400' :
                                        member.teamLevel === 'mid' ? 'bg-green-500/20 text-green-400' :
                                            member.teamLevel === 'junior' ? 'bg-purple-500/20 text-purple-400' :
                                                'bg-gray-500/20 text-[var(--app-text-secondary)]'
                                    }`}>
                                    {member.teamLevel === 'team_lead' ? t('teams.roles.team_lead') :
                                        member.teamLevel === 'senior' ? t('teams.roles.senior') :
                                            member.teamLevel === 'mid' ? t('teams.roles.mid') :
                                                member.teamLevel === 'junior' ? t('teams.roles.junior') : t('teams.roles.intern')}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sub-panel: Assign Task */}
            <div
                className={`fixed top-4 right-4 bottom-4 w-full max-w-md bg-[var(--app-bg-deepest)] rounded-2xl z-[60] flex flex-col shadow-2xl transform transition-transform duration-300 ease-out border border-[var(--app-border)] ${isAssignTaskOpen && isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'}`}
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-[var(--app-border)] flex items-center gap-3">
                    <button
                        onClick={() => setIsAssignTaskOpen(false)}
                        className="text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] transition-colors p-1 -ml-1"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <div>
                        <h3 className="text-lg font-bold text-[var(--app-text-primary)] leading-tight">Assign Task</h3>
                        <p className="text-xs text-[var(--app-text-secondary)]">Select a task to assign to {member.name}</p>
                    </div>
                </div>

                {/* Task List */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                    {isLoadingTasks ? (
                        <div className="text-center py-8 text-sm text-[var(--app-text-muted)]">{t('common.loading')}</div>
                    ) : assignableTasks.length === 0 ? (
                        <div className="text-center py-8 text-sm text-[var(--app-text-muted)]">No available tasks to assign.</div>
                    ) : (
                        assignableTasks.map((task: any) => {
                            const proj = projectsData?.data?.find((p: any) => p.id === task.projectId)
                            return (
                                <div key={task.id} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between gap-3 group cursor-pointer" onClick={() => !submittingTaskId && !assignTaskMutation.isPending && assignTaskMutation.mutate(task.id)}>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-[var(--app-text-primary)] truncate">{task.title}</p>
                                        <p className="text-xs text-[var(--app-text-secondary)]/80 truncate mt-1">{proj?.name || 'Unknown Project'}</p>
                                    </div>
                                    <button
                                        disabled={submittingTaskId === task.id || assignTaskMutation.isPending}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            assignTaskMutation.mutate(task.id)
                                        }}
                                        className="h-8 px-4 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-black transition-all opacity-0 group-hover:opacity-100 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg shadow-amber-500/20"
                                    >
                                        {submittingTaskId === task.id ? 'Assigning...' : 'Assign'}
                                    </button>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </>,
        document.body
    )
}
