import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { apiFetchJson } from '@/lib/api'
import { Trash2, Edit2, Plus, Check, X, GripVertical } from 'lucide-react'

interface Priority {
  id: string
  name: string
  color: string
  icon?: string
  position: number
}

interface IndustryTemplate {
  id: string
  name: string
  description: string
}

interface WorkspaceDefaultsTabProps {
  workspace: any
}

const PRESET_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#6B7280', // gray
  '#14B8A6', // teal
  '#F97316', // orange
  '#06B6D4', // cyan
]

export function WorkspaceDefaultsTab({ workspace }: WorkspaceDefaultsTabProps) {
  const { t } = useTranslation()
  const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug?: string }
  const queryClient = useQueryClient()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6B7280')
  const [newIcon, setNewIcon] = useState('')

  // Get priorities from workspace prop and handle default industry template changes
  const priorities: Priority[] = workspace?.priorities || [
    {
      id: 'low',
      name: t('settings.organization.defaults.priority_names.low'),
      color: '#6b7280',
      position: 0,
    },
    {
      id: 'medium',
      name: t('settings.organization.defaults.priority_names.medium'),
      color: '#3b82f6',
      position: 1,
    },
    {
      id: 'high',
      name: t('settings.organization.defaults.priority_names.high'),
      color: '#f59e0b',
      position: 2,
    },
    {
      id: 'urgent',
      name: t('settings.organization.defaults.priority_names.urgent'),
      color: '#ef4444',
      position: 3,
    },
  ]

  // Fetch industry templates
  const { data: templates = [] } = useQuery({
    queryKey: ['industry-templates'],
    queryFn: async () => {
      const res = await apiFetchJson<{ data: IndustryTemplate[] }>('/api/industry-templates')
      return res.data || []
    },
  })

  // Create priority mutation
  const createPriorityMutation = useMutation({
    mutationFn: async ({
      id,
      name,
      color,
      icon,
    }: {
      id: string
      name: string
      color: string
      icon: string
    }) => {
      await apiFetchJson(`/api/workspaces/${workspace.id}/priorities`, {
        method: 'POST',
        body: JSON.stringify({ id, name, color, icon }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceSlug] })
      setIsCreating(false)
      setNewName('')
      setNewColor('#6B7280')
      setNewIcon('')
    },
  })

  // Delete priority mutation
  const deletePriorityMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetchJson(`/api/workspaces/${workspace.id}/priorities/${id}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceSlug] })
    },
  })

  // Update workspace defaults mutation
  const updateDefaultsMutation = useMutation({
    mutationFn: async (data: { defaultIndustryTemplateId?: string }) => {
      await apiFetchJson(`/api/workspaces/${workspace.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceSlug] })
    },
  })

  // Update priorities mutation (reorder or edit)
  const updatePrioritiesMutation = useMutation({
    mutationFn: async (updatedPriorities: Priority[]) => {
      await apiFetchJson(`/api/workspaces/${workspace.id}/priorities`, {
        method: 'PATCH',
        body: JSON.stringify({ priorities: updatedPriorities }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceSlug] })
      setEditingId(null)
    },
  })

  const handleCreatePriority = () => {
    if (newName.trim()) {
      const id = newName.toLowerCase().replace(/\s+/g, '-')
      createPriorityMutation.mutate({
        id,
        name: newName.trim(),
        color: newColor,
        icon: newIcon,
      })
    }
  }

  const handleEditPriority = (priority: Priority) => {
    setEditingId(priority.id)
    setEditName(priority.name)
    setEditColor(priority.color)
    setEditIcon(priority.icon || '')
  }

  const handleSaveEdit = () => {
    if (editingId) {
      const updated = priorities.map((p) =>
        p.id === editingId ? { ...p, name: editName, color: editColor, icon: editIcon } : p
      )
      updatePrioritiesMutation.mutate(updated)
    }
  }

  const handleDeletePriority = (id: string) => {
    if (confirm(t('settings.organization.defaults.delete_priority_confirm'))) {
      deletePriorityMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-8">
      {/* Default Industry Template Section */}
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-[var(--app-text-primary)]">
              {t('settings.organization.defaults.default_template_title')}
            </h4>
            <p className="text-sm text-[var(--app-text-secondary)]">
              {t('settings.organization.defaults.default_template_subtitle')}
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--app-text-primary)]">
              {t('settings.organization.defaults.select_default_template')}
            </label>
            <select
              className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-elevated)] px-4 py-2 text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)]"
              value={workspace?.settings?.defaultIndustryTemplateId || ''}
              onChange={(e) => {
                updateDefaultsMutation.mutate({
                  defaultIndustryTemplateId: e.target.value || undefined,
                })
              }}
            >
              <option value="">{t('settings.organization.defaults.no_template')}</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-[var(--app-text-muted)]">
            {t('settings.organization.defaults.industry_template_hint')}
          </p>
        </div>
      </div>

      {/* Time Tracker Settings */}
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-[var(--app-text-primary)]">
              {t('settings.organization.defaults.time_tracker_title', 'Ustawienia Time Tracker')}
            </h4>
            <p className="text-sm text-[var(--app-text-secondary)]">
              {t(
                'settings.organization.defaults.time_tracker_subtitle',
                'Skonfiguruj parametry rozliczeń i RevShare.'
              )}
            </p>
          </div>
        </div>
        <div className="space-y-6">
          <div className="flex max-w-sm flex-col gap-2">
            <label className="text-sm font-medium text-[var(--app-text-primary)]">
              {t(
                'settings.organization.defaults.revshare_threshold',
                'Próg kwalifikacji RevShare (Godziny)'
              )}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                className="w-32 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-elevated)] px-4 py-2 text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)]"
                value={workspace?.settings?.revshareHourThreshold || 200}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val)) {
                    updateDefaultsMutation.mutate({
                      settings: {
                        ...workspace.settings,
                        revshareHourThreshold: val,
                      },
                    } as any)
                  }
                }}
              />
              <span className="text-sm font-bold text-[var(--app-text-muted)]">h</span>
            </div>
            <p className="mt-1 text-xs text-[var(--app-text-muted)]">
              {t(
                'settings.organization.defaults.revshare_threshold_hint',
                'Minimalna liczba zatwierdzonych godzin potrzebna do odblokowania udziału w RevShare.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Priorities Management */}
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-[var(--app-text-primary)]">
              {t('settings.organization.defaults.priorities_title')}
            </h4>
            <p className="text-sm text-[var(--app-text-secondary)]">
              {t('settings.organization.defaults.priorities_subtitle')}
            </p>
          </div>
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          {priorities.map((priority) => (
            <div
              key={priority.id}
              className="group flex items-center gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-elevated)] p-4 transition-all hover:border-[var(--app-border-hover)]"
            >
              <div className="cursor-grab text-[var(--app-text-muted)] active:cursor-grabbing group-hover:text-[var(--app-text-secondary)]">
                <GripVertical className="h-5 w-5" />
              </div>

              {editingId === priority.id ? (
                <div className="flex flex-1 items-center gap-3">
                  <div
                    className="h-10 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: editColor }}
                  />
                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded border border-[var(--app-border)] bg-[var(--app-bg-card)] px-3 py-2 text-sm text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)]"
                      autoFocus
                    />
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditColor(color)}
                          className={`h-6 w-6 rounded-md border-2 transition-all ${
                            editColor === color
                              ? 'scale-110 border-[var(--app-text-primary)] shadow-sm'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="rounded-lg bg-green-500 p-2 text-white transition-colors hover:bg-green-600"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] p-2 text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text-primary)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="h-10 w-1.5 rounded-full"
                    style={{ backgroundColor: priority.color }}
                  />

                  <div className="flex-1">
                    <h5 className="font-medium text-[var(--app-text-primary)]">{priority.name}</h5>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                        ID: {priority.id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleEditPriority(priority)}
                      className="rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-card)] hover:text-[var(--app-text-primary)]"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePriority(priority.id)}
                      className="rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-500"
                      disabled={priorities.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Create New Priority */}
          {isCreating && (
            <div className="flex items-center gap-4 rounded-xl border border-[var(--app-accent)] bg-[var(--app-bg-elevated)] p-4">
              <Plus className="h-5 w-5 text-[var(--app-accent)]" />
              <div className="flex-1 space-y-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t('settings.organization.defaults.priority_name_placeholder')}
                  className="w-full rounded border border-[var(--app-border)] bg-[var(--app-bg-card)] px-3 py-2 text-sm text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)]"
                  autoFocus
                />
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      className={`h-6 w-6 rounded-md border-2 transition-all ${
                        newColor === color
                          ? 'scale-110 border-[var(--app-text-primary)] shadow-sm'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreatePriority}
                  className="rounded-lg bg-[var(--app-accent)] p-2 text-[var(--app-accent-text)] transition-colors hover:opacity-90"
                  disabled={createPriorityMutation.isPending || !newName.trim()}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false)
                    setNewName('')
                  }}
                  className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] p-2 text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips card */}
      <div className="bg-[var(--app-accent)]/5 border-[var(--app-accent)]/10 rounded-2xl border p-6">
        <div className="flex gap-4">
          <div className="bg-[var(--app-accent)]/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl">
            <Plus className="h-5 w-5 text-[var(--app-accent)]" />
          </div>
          <div>
            <h5 className="mb-1 font-semibold text-[var(--app-text-primary)]">
              {t('settings.organization.defaults.pro_tip_title')}
            </h5>
            <p className="text-sm leading-relaxed text-[var(--app-text-secondary)]">
              {t('settings.organization.defaults.pro_tip_content')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
