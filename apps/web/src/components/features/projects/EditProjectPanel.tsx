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

export function EditProjectPanel({
  isOpen,
  onClose,
  onSuccess,
  project,
  workspaceId,
}: EditProjectPanelProps) {
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
        const teamsRes = await apiFetch(
          workspaceId ? `/api/teams?workspaceId=${workspaceId}` : '/api/teams',
          {
            headers: { 'x-user-id': session?.user?.id || '' },
          }
        )
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
          'x-user-id': session?.user?.id || '',
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
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      <div className="animate-slide-in-right fixed inset-0 z-50 flex w-full max-w-none flex-col rounded-none bg-[var(--app-bg-card)] shadow-2xl sm:inset-auto sm:bottom-4 sm:right-4 sm:top-4 sm:w-[448px] sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--app-border)] p-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none bg-amber-500/10 sm:rounded-xl">
              <FolderOpen className="h-5 w-5 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold text-[var(--app-text-primary)]">
                {t('project_edit.panel.title')}
              </h2>
              <p className="truncate text-sm text-[var(--app-text-muted)]">
                {t('project_edit.panel.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-sidebar)] hover:text-[var(--app-text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="scrollbar-hide flex-1 space-y-6 overflow-y-auto p-6"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
              {t('project_edit.panel.name')} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('project_edit.panel.name_placeholder')}
              className="w-full rounded-none border border-[var(--app-border)] bg-[var(--app-bg-input)] px-4 py-3 font-medium text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] transition-all focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 sm:rounded-xl"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              {t('project_edit.panel.description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('project_edit.panel.description_placeholder')}
              rows={3}
              className="w-full resize-none rounded-none border border-[var(--app-border)] bg-[var(--app-bg-input)] px-4 py-3 text-sm text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] transition-all focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 sm:rounded-xl"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
              <Users size={14} className="mr-2 inline" />
              {t('project_edit.panel.team')} <span className="text-red-400">*</span>
            </label>
            <div className="scrollbar-hide max-h-[200px] space-y-2 overflow-y-auto pr-2">
              {teams.map((team) => (
                <div
                  key={team.id}
                  onClick={() => {
                    if (teamIds.includes(team.id)) {
                      setTeamIds(teamIds.filter((id) => id !== team.id))
                    } else {
                      setTeamIds([...teamIds, team.id])
                    }
                  }}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-none border p-3 transition-all sm:rounded-xl',
                    teamIds.includes(team.id)
                      ? 'border-amber-500/30 bg-amber-500/10 text-[var(--app-text-primary)]'
                      : 'border-[var(--app-border)] bg-[var(--app-bg-input)] text-[var(--app-text-muted)] hover:bg-[var(--app-bg-sidebar)] hover:text-[var(--app-text-secondary)]'
                  )}
                >
                  <div
                    className={cn('h-2 w-2 rounded-full', !team.color && 'bg-amber-500')}
                    style={team.color ? { backgroundColor: team.color } : {}}
                  />
                  <span className="flex-1 text-sm font-medium">{team.name}</span>
                  {teamIds.includes(team.id) && (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500">
                      <div className="h-1.5 w-1.5 rounded-full bg-black" />
                    </div>
                  )}
                </div>
              ))}
              {teams.length === 0 && (
                <p className="mt-2 text-xs text-[var(--app-text-muted)]">
                  {t('project_edit.panel.no_teams')}
                </p>
              )}
              <p className="mt-2 text-[10px] text-[var(--app-text-muted)]">
                {t('project_edit.panel.multi_team_help')}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
              <Palette size={14} className="mr-2 inline" />
              {t('project_edit.panel.color')}
            </label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-lg transition-all ${
                    color === c
                      ? 'scale-110 ring-2 ring-[var(--app-text-primary)] ring-offset-2 ring-offset-[var(--app-bg-card)]'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
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
            <div className="rounded-none border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 sm:rounded-xl">
              {error}
            </div>
          )}
        </form>

        <div className="flex gap-3 border-t border-[var(--app-border)] p-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-none border border-[var(--app-border)] px-4 py-3 font-medium text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-sidebar)] sm:rounded-xl"
          >
            {t('project_edit.panel.cancel')}
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !name.trim() || teamIds.length === 0}
            className="flex-1 rounded-none bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 font-semibold text-black shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-xl"
          >
            {loading ? t('project_edit.panel.saving') : t('project_edit.panel.submit')}
          </button>
        </div>
      </div>
    </>
  )
}
