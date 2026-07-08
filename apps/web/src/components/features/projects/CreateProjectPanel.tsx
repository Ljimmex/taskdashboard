import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Palette, Users, FolderOpen } from 'lucide-react'
import { DueDatePicker } from '../tasks/components/DueDatePicker'
import { useSession } from '@/lib/auth'
import { usePanelStore } from '@/lib/panelStore'
import { apiFetch, apiFetchJson } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Team {
  id: string
  name: string
  color?: string
}

interface IndustryTemplate {
  id: string
  slug: string
  name: string
  nameEn?: string
  icon?: string
  description?: string
}

interface CreateProjectPanelProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
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

export function CreateProjectPanel({
  isOpen,
  onClose,
  onSuccess,
  workspaceId,
}: CreateProjectPanelProps) {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [industryTemplateId, setIndustryTemplateId] = useState<string>('no_template')
  const [startDate, setStartDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [templates, setTemplates] = useState<IndustryTemplate[]>([])
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
      // Reset fields
      setName('')
      setDescription('')
      setStartDate('')
      setDeadline('')
      setColor(PROJECT_COLORS[0])
      setTeamIds([])
      // Don't reset industryTemplateId immediately to avoid flash if we fetch a default

      try {
        // 1. Fetch Templates & Teams in parallel
        const [templatesRes, teamsRes] = await Promise.all([
          apiFetchJson<any>('/api/industry-templates', {
            headers: { 'x-user-id': session?.user?.id || '' },
          }),
          apiFetchJson<any>(workspaceId ? `/api/teams?workspaceId=${workspaceId}` : '/api/teams', {
            headers: { 'x-user-id': session?.user?.id || '' },
          }),
        ])

        if (!mounted) return

        if (templatesRes.success && templatesRes.data) {
          setTemplates(templatesRes.data)
        }

        if (teamsRes.data && Array.isArray(teamsRes.data)) {
          setTeams(teamsRes.data)
          // No default selection for multi-team to avoid accidental assignment
        }

        // 2. Fetch Workspace Default Template (after templates loaded)
        if (workspaceId) {
          const wsRes = await apiFetchJson<any>(`/api/workspaces/${workspaceId}`)
          if (!mounted) return

          const wsData = wsRes.data || wsRes
          if (wsData?.defaultIndustryTemplateId) {
            setIndustryTemplateId(wsData.defaultIndustryTemplateId)
          } else {
            setIndustryTemplateId('no_template')
          }
        } else {
          setIndustryTemplateId('no_template')
        }
      } catch (err) {
        console.error('Error loading project panel data:', err)
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [isOpen, workspaceId, session?.user?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || teamIds.length === 0) return

    setLoading(true)
    setError(null)

    try {
      const finalTemplateId = industryTemplateId === 'no_template' ? null : industryTemplateId

      const response = await apiFetch('/api/projects', {
        method: 'POST',
        headers: {
          'x-user-id': session?.user?.id || '',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
          teamIds,
          workspaceId,
          industryTemplateId: finalTemplateId,
          startDate: startDate || null,
          deadline: deadline || null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        onSuccess?.()
        onClose()
      } else {
        setError(result.error || 'Failed to create project')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

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
                {t('projects.create.title')}
              </h2>
              <p className="truncate text-sm text-[var(--app-text-muted)]">
                {t('projects.create.subtitle')}
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
              {t('projects.create.name')} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('projects.create.name_placeholder')}
              className="w-full rounded-none border border-[var(--app-border)] bg-[var(--app-bg-input)] px-4 py-3 font-medium text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] transition-all focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 sm:rounded-xl"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              {t('projects.create.description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('projects.create.description_placeholder')}
              rows={3}
              className="w-full resize-none rounded-none border border-[var(--app-border)] bg-[var(--app-bg-input)] px-4 py-3 text-sm text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] transition-all focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 sm:rounded-xl"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
              <Users size={14} className="mr-2 inline" />
              {t('projects.create.team')} <span className="text-red-400">*</span>
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
            </div>
            {teams.length === 0 && (
              <p className="mt-2 text-xs text-[var(--app-text-muted)]">
                {t('projects.create.no_teams')}
              </p>
            )}
            <p className="mt-2 text-[10px] text-[var(--app-text-muted)]">
              {t('projects.create.multi_team_help') || 'Możesz zaznaczyć kilka zespołów'}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
              {t('projects.create.template')}
            </label>
            <Select value={industryTemplateId} onValueChange={setIndustryTemplateId}>
              <SelectTrigger className="h-auto w-full rounded-none border border-[var(--app-border)] bg-[var(--app-bg-input)] px-4 py-3 text-[var(--app-text-primary)] transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/30 sm:rounded-xl">
                <SelectValue placeholder={t('projects.create.select_template')} />
              </SelectTrigger>
              <SelectContent className="border border-[var(--app-border)] bg-[var(--app-bg-elevated)] text-[var(--app-text-primary)]">
                <SelectItem
                  value="no_template"
                  className="cursor-pointer py-3 font-medium text-[var(--app-text-secondary)] focus:bg-[var(--app-bg-sidebar)] focus:text-[var(--app-text-primary)] data-[state=checked]:text-[var(--app-text-primary)]"
                >
                  {t('projects.create.no_template')}
                </SelectItem>
                {templates.map((template) => (
                  <SelectItem
                    key={template.id}
                    value={template.id}
                    className="cursor-pointer py-3 text-[var(--app-text-secondary)] focus:bg-[var(--app-bg-sidebar)] focus:text-[var(--app-text-primary)] data-[state=checked]:text-[var(--app-text-primary)]"
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="flex items-center gap-2 font-medium">
                        {' '}
                        {template.icon} {template.name}
                      </span>
                      {template.description && (
                        <span className="max-w-[280px] truncate text-xs text-[var(--app-text-muted)]">
                          {template.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-[var(--app-text-muted)]">
              {t('projects.create.template_help')}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
              <Palette size={14} className="mr-2 inline" />
              {t('projects.create.color')}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
                {t('projects.create.start_date')}
              </label>
              <DueDatePicker
                value={startDate}
                onChange={(date) => setStartDate(date || '')}
                placeholder={t('projects.create.start_date')}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
                {t('projects.create.deadline')}
              </label>
              <DueDatePicker
                value={deadline}
                onChange={(date) => setDeadline(date || '')}
                placeholder={t('projects.create.deadline')}
                className="w-full"
              />
            </div>
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
            {t('projects.create.cancel')}
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !name.trim() || teamIds.length === 0}
            className="flex-1 rounded-none bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 font-semibold text-black shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-xl"
          >
            {loading ? t('projects.create.creating') : t('projects.create.submit')}
          </button>
        </div>
      </div>
    </>
  )
}
