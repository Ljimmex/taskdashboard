import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { apiFetchJson } from '@/lib/api'
import { Trash2, Edit2, Plus, Check, X } from 'lucide-react'

interface Label {
  id: string
  name: string
  color: string
}

interface LabelsSettingsTabProps {
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

// Workspace is passed but not currently used - kept for consistency with other tabs
export function LabelsSettingsTab({ workspace: _workspace }: LabelsSettingsTabProps) {
  const { t } = useTranslation()
  const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
  const queryClient = useQueryClient()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6B7280')

  // Fetch labels
  const { data: labelsData, isLoading } = useQuery({
    queryKey: ['labels', workspaceSlug],
    queryFn: async () => {
      const res = await apiFetchJson<any>(`/api/labels?workspaceSlug=${workspaceSlug}`)
      return res.data as Label[]
    },
    enabled: !!workspaceSlug,
  })

  const labels = labelsData || []

  // Create label mutation
  const createMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const res = await apiFetchJson<{ data: Label }>('/api/labels', {
        method: 'POST',
        body: JSON.stringify({ workspaceSlug, name, color }),
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels', workspaceSlug] })
      setIsCreating(false)
      setNewName('')
      setNewColor('#6B7280')
    },
  })

  // Update label mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const res = await apiFetchJson<{ data: Label }>(`/api/labels/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ workspaceSlug, name, color }),
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels', workspaceSlug] })
      setEditingId(null)
    },
  })

  // Delete label mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetchJson(`/api/labels/${id}?workspaceSlug=${workspaceSlug}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels', workspaceSlug] })
    },
  })

  const handleCreate = () => {
    if (newName.trim()) {
      createMutation.mutate({ name: newName.trim(), color: newColor })
    }
  }

  const handleUpdate = (id: string) => {
    if (editName.trim()) {
      updateMutation.mutate({ id, name: editName.trim(), color: editColor })
    }
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(t('settings.organization.labels.delete_confirm', { name }))) {
      deleteMutation.mutate(id)
    }
  }

  const startEditing = (label: Label) => {
    setEditingId(label.id)
    setEditName(label.name)
    setEditColor(label.color)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditName('')
    setEditColor('')
  }

  if (isLoading) {
    return <div className="text-gray-400">{t('settings.organization.labels.loading')}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--app-text-primary)]">
            {t('settings.organization.labels.title')}
          </h3>
          <p className="text-sm text-[var(--app-text-secondary)]">
            {t('settings.organization.labels.subtitle')}
          </p>
        </div>
      </div>

      {/* Labels list */}
      <div className="space-y-2">
        {labels.length === 0 && !isCreating && (
          <div className="py-8 text-center text-[var(--app-text-muted)]">
            {t('settings.organization.labels.no_labels')}
          </div>
        )}

        {labels.map((label) => (
          <div
            key={label.id}
            className="flex items-center gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] p-3 transition-colors hover:border-[var(--app-border-hover)]"
          >
            {editingId === label.id ? (
              // Edit mode
              <>
                <ColorPicker color={editColor} onChange={setEditColor} />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded border border-[var(--app-border)] bg-[var(--app-bg-elevated)] px-3 py-1.5 text-sm text-[var(--app-text-primary)] focus:border-[var(--app-accent)] focus:outline-none"
                  placeholder={t('settings.organization.labels.name_placeholder')}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdate(label.id)
                    if (e.key === 'Escape') cancelEditing()
                  }}
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => handleUpdate(label.id)}
                    disabled={updateMutation.isPending || !editName.trim()}
                    className="rounded p-2 text-green-500 transition-colors hover:bg-green-500/10 disabled:opacity-50"
                    title={t('common.save')}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={updateMutation.isPending}
                    className="rounded p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)]"
                    title={t('common.cancel')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              // View mode
              <>
                <div
                  className="h-6 w-6 flex-shrink-0 rounded"
                  style={{ backgroundColor: label.color }}
                />
                <span className="flex-1 text-sm text-[var(--app-text-primary)]">{label.name}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEditing(label)}
                    className="rounded p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
                    title={t('common.edit')}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(label.id, label.name)}
                    disabled={deleteMutation.isPending}
                    className="rounded p-2 text-[var(--app-text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                    title={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Create new label */}
        {isCreating ? (
          <div className="flex items-center gap-3 rounded-lg border border-[var(--app-accent)] bg-[var(--app-bg-card)] p-3">
            <ColorPicker color={newColor} onChange={setNewColor} />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 rounded border border-[var(--app-border)] bg-[var(--app-bg-elevated)] px-3 py-1.5 text-sm text-[var(--app-text-primary)] focus:border-[var(--app-accent)] focus:outline-none"
              placeholder={t('settings.organization.labels.new_name_placeholder')}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') {
                  setIsCreating(false)
                  setNewName('')
                }
              }}
            />
            <div className="flex gap-1">
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending || !newName.trim()}
                className="rounded p-2 text-green-500 transition-colors hover:bg-green-500/10 disabled:opacity-50"
                title={t('settings.organization.labels.create_tooltip')}
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setIsCreating(false)
                  setNewName('')
                  setNewColor('#6B7280')
                }}
                disabled={createMutation.isPending}
                className="rounded p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)]"
                title="Anuluj"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--app-border)] bg-[var(--app-bg-card)] p-3 text-[var(--app-text-muted)] transition-colors hover:border-[var(--app-accent)] hover:text-[var(--app-text-primary)]"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">
              {t('settings.organization.labels.add_button')}
            </span>
          </button>
        )}
      </div>

      {/* Info box */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
        <p className="text-sm text-blue-600 dark:text-blue-300">
          <strong>{t('settings.organization.labels.tip_header')}:</strong>{' '}
          {t('settings.organization.labels.tip_content')}
        </p>
      </div>
    </div>
  )
}

// Color Picker Component
function ColorPicker({ color, onChange }: { color: string; onChange: (color: string) => void }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 flex-shrink-0 rounded-lg border-2 border-[var(--app-border)] shadow-md transition-all hover:border-[var(--app-accent)]"
        style={{ backgroundColor: color }}
        title={t('settings.organization.labels.color_picker_tooltip')}
      />

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />

          {/* Color palette */}
          <div className="absolute left-0 top-10 z-[101] w-[184px] rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-card)] p-3 shadow-2xl">
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => {
                    onChange(presetColor)
                    setIsOpen(false)
                  }}
                  className="h-6 w-6 flex-shrink-0 rounded-md border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: presetColor,
                    borderColor: color === presetColor ? 'var(--app-accent)' : 'transparent',
                  }}
                  title={presetColor}
                />
              ))}
            </div>

            {/* Custom color input */}
            <div className="mt-3 border-t border-[var(--app-border)] pt-3">
              <div className="flex items-center gap-2">
                <div className="relative h-8 flex-1 overflow-hidden rounded-lg border border-[var(--app-border)]">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute -inset-2 h-[calc(100%+16px)] w-[calc(100%+16px)] cursor-pointer border-none bg-transparent"
                  />
                </div>
                <span className="font-mono text-[10px] uppercase text-[var(--app-text-muted)]">
                  {color}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
