import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Palette, FolderOpen, Users } from 'lucide-react'
import { DueDatePicker } from '../tasks/components/DueDatePicker'
import { useSession } from '@/lib/auth'
import { usePanelStore } from '@/lib/panelStore'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Team {
    id: string
    name: string
    color: string
}

interface EditProjectPanelProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    project: any | null // Using any to avoid strict type mismatch with index.tsx
    workspaceId?: string
}

const PROJECT_COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#EAB308', // Yellow
    '#84CC16', // Lime
    '#22C55E', // Green
    '#10B981', // Emerald
    '#14B8A6', // Teal
    '#06B6D4', // Cyan
    '#0EA5E9', // Sky
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#A855F7', // Purple
    '#D946EF', // Fuchsia
    '#EC4899', // Pink
    '#F43F5E', // Rose
    '#64748B', // Slate
]

export function EditProjectPanel({ isOpen, onClose, onSuccess, project, workspaceId }: EditProjectPanelProps) {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [color, setColor] = useState(PROJECT_COLORS[0])
    const [deadline, setDeadline] = useState('')
    const [teamIds, setTeamIds] = useState<string[]>([])
    const [teams, setTeams] = useState<Team[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Sync global panel state
    useEffect(() => {
        setIsPanelOpen(isOpen)
        return () => setIsPanelOpen(false)
    }, [isOpen, setIsPanelOpen])

    // Load Data
    useEffect(() => {
        if (!isOpen) return

        let mounted = true

        const loadData = async () => {
            try {
                // Fetch Teams
                const teamsRes = await apiFetch(workspaceId ? `/api/teams?workspaceId=${workspaceId}` : '/api/teams', {
                    headers: { 'x-user-id': session?.user?.id || '' }
                })
                const teamsData = await teamsRes.json()

                if (!mounted) return

                if (teamsData.data && Array.isArray(teamsData.data)) {
                    setTeams(teamsData.data)
                }

            } catch (err) {
                console.error('Error loading project panel data:', err)
            }
        }

        loadData()

        return () => {
            mounted = false
        }
    }, [isOpen, session?.user?.id])

    // Sync Project Data
    useEffect(() => {
        if (!isOpen || !project) return

        setName(project.name || '')
        setDescription(project.description || '')
        setColor(project.color || PROJECT_COLORS[0])
        setDeadline(project.deadline ? new Date(project.deadline).toISOString() : '')

        // Initialize teams from project
        if (project.projectTeams && project.projectTeams.length > 0) {
            setTeamIds(project.projectTeams.map((pt: any) => pt.teamId))
        } else if (project.teams && project.teams.length > 0) {
            setTeamIds(project.teams.map((t: any) => t.teamId || t.id))
        } else if (project.teamId) {
            setTeamIds([project.teamId])
        } else {
            setTeamIds([])
        }

        setError(null)
    }, [isOpen, project])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !project || teamIds.length === 0) return

        setLoading(true)
        setError(null)

        try {
            const response = await apiFetch(`/api/projects/${project.id}`, {
                method: 'PATCH',
                headers: {
                    'x-user-id': session?.user?.id || ''
                },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || null,
                    color,
                    deadline: deadline || null,
                    teamIds,
                }),
            })

            const result = await response.json()

            if (result.success) {
                onSuccess?.()
                onClose()
            } else {
                setError(result.error || 'Failed to update project')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen || !project) return null

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={onClose}
            />

            <div className="fixed top-4 right-4 bottom-4 w-full max-w-md bg-[var(--app-bg-card)] rounded-2xl shadow-2xl z-50 flex flex-col animate-slide-in-right">
                <div className="flex items-center justify-between p-6 border-b border-[var(--app-border)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <FolderOpen className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--app-text-primary)]">{t('project_edit.panel.title')}</h2>
                            <p className="text-sm text-[var(--app-text-muted)]">{t('project_edit.panel.subtitle')}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-sidebar)] rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                    <div>
                        <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-2">
                            {t('project_edit.panel.name')} <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('project_edit.panel.name_placeholder')}
                            className="w-full px-4 py-3 rounded-xl bg-[var(--app-bg-input)] text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all font-medium border border-[var(--app-border)]"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            {t('project_edit.panel.description')}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('project_edit.panel.description_placeholder')}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-[var(--app-bg-input)] text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] focus:outline-none focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all resize-none text-sm border border-[var(--app-border)]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-2">
                            <Users size={14} className="inline mr-2" />
                            {t('project_edit.panel.team')} <span className="text-red-400">*</span>
                        </label>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
                            {teams.map((team) => (
                                <div
                                    key={team.id}
                                    onClick={() => {
                                        if (teamIds.includes(team.id)) {
                                            setTeamIds(teamIds.filter(id => id !== team.id))
                                        } else {
                                            setTeamIds([...teamIds, team.id])
                                        }
                                    }}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border border-[var(--app-border)]",
                                        teamIds.includes(team.id)
                                            ? "bg-[var(--app-accent)]/10 border-[var(--app-accent)]/30 text-[var(--app-text-primary)]"
                                            : "bg-[var(--app-bg-input)] text-[var(--app-text-muted)] hover:bg-[var(--app-bg-sidebar)] hover:text-[var(--app-text-secondary)]"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "w-2 h-2 rounded-full",
                                            !team.color && "bg-amber-500"
                                        )}
                                        style={team.color ? { backgroundColor: team.color } : {}}
                                    />
                                    <span className="flex-1 text-sm font-medium">{team.name}</span>
                                    {teamIds.includes(team.id) && (
                                        <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-black" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {teams.length === 0 && (
                                <p className="text-xs text-[var(--app-text-muted)] mt-2">
                                    {t('project_edit.panel.no_teams')}
                                </p>
                            )}
                            <p className="text-[10px] text-[var(--app-text-muted)] mt-2">
                                {t('project_edit.panel.multi_team_help')}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-2">
                            <Palette size={14} className="inline mr-2" />
                            {t('project_edit.panel.color')}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {PROJECT_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-lg transition-all ${color === c
                                        ? 'ring-2 ring-[var(--app-text-primary)] ring-offset-2 ring-offset-[var(--app-bg-card)] scale-110'
                                        : 'hover:scale-110'
                                        }`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-2">
                            {t('project_edit.panel.deadline')}
                        </label>
                        <DueDatePicker
                            value={deadline}
                            onChange={(date) => setDeadline(date || '')}
                            placeholder={t('project_edit.panel.deadline')}
                            className="w-full"
                        />
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                </form>

                <div className="p-6 border-t border-[var(--app-border)] flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl border border-[var(--app-border)] text-[var(--app-text-secondary)] font-medium hover:bg-[var(--app-bg-sidebar)] transition-colors"
                    >
                        {t('project_edit.panel.cancel')}
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={loading || !name.trim() || teamIds.length === 0}
                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
                    >
                        {loading ? t('project_edit.panel.saving') : t('project_edit.panel.submit')}
                    </button>
                </div>
            </div>
        </>
    )
}
