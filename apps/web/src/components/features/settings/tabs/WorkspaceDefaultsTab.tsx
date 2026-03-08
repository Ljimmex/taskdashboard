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
        { id: 'low', name: t('settings.organization.defaults.priority_names.low'), color: '#6b7280', position: 0 },
        { id: 'medium', name: t('settings.organization.defaults.priority_names.medium'), color: '#3b82f6', position: 1 },
        { id: 'high', name: t('settings.organization.defaults.priority_names.high'), color: '#f59e0b', position: 2 },
        { id: 'urgent', name: t('settings.organization.defaults.priority_names.urgent'), color: '#ef4444', position: 3 },
    ]

    // Fetch industry templates
    const { data: templates = [] } = useQuery({
        queryKey: ['industry-templates'],
        queryFn: async () => {
            const res = await apiFetchJson<{ data: IndustryTemplate[] }>('/api/industry-templates')
            return res.data || []
        }
    })

    // Create priority mutation
    const createPriorityMutation = useMutation({
        mutationFn: async ({ id, name, color, icon }: { id: string; name: string; color: string; icon: string }) => {
            await apiFetchJson(`/api/workspaces/${workspace.id}/priorities`, {
                method: 'POST',
                body: JSON.stringify({ id, name, color, icon })
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspace', workspaceSlug] })
            setIsCreating(false)
            setNewName('')
            setNewColor('#6B7280')
            setNewIcon('')
        }
    })

    // Delete priority mutation
    const deletePriorityMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiFetchJson(`/api/workspaces/${workspace.id}/priorities/${id}`, {
                method: 'DELETE'
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspace', workspaceSlug] })
        }
    })

    // Update workspace defaults mutation
    const updateDefaultsMutation = useMutation({
        mutationFn: async (data: { defaultIndustryTemplateId?: string }) => {
            await apiFetchJson(`/api/workspaces/${workspace.id}`, {
                method: 'PATCH',
                body: JSON.stringify(data)
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspace', workspaceSlug] })
        }
    })

    // Update priorities mutation (reorder or edit)
    const updatePrioritiesMutation = useMutation({
        mutationFn: async (updatedPriorities: Priority[]) => {
            await apiFetchJson(`/api/workspaces/${workspace.id}/priorities`, {
                method: 'PATCH',
                body: JSON.stringify({ priorities: updatedPriorities })
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspace', workspaceSlug] })
            setEditingId(null)
        }
    })

    const handleCreatePriority = () => {
        if (newName.trim()) {
            const id = newName.toLowerCase().replace(/\s+/g, '-')
            createPriorityMutation.mutate({
                id,
                name: newName.trim(),
                color: newColor,
                icon: newIcon
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
            const updated = priorities.map(p =>
                p.id === editingId
                    ? { ...p, name: editName, color: editColor, icon: editIcon }
                    : p
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
            <div className="bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h4 className="font-semibold text-[var(--app-text-primary)] text-lg">{t('settings.organization.defaults.default_template_title')}</h4>
                        <p className="text-sm text-[var(--app-text-secondary)]">{t('settings.organization.defaults.default_template_subtitle')}</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--app-text-primary)]">
                            {t('settings.organization.defaults.select_default_template')}
                        </label>
                        <select
                            className="w-full bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-lg px-4 py-2 text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)]"
                            value={workspace?.settings?.defaultIndustryTemplateId || ''}
                            onChange={(e) => {
                                updateDefaultsMutation.mutate({ defaultIndustryTemplateId: e.target.value || undefined })
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

            {/* Priorities Management */}
            <div className="bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h4 className="font-semibold text-[var(--app-text-primary)] text-lg">{t('settings.organization.defaults.priorities_title')}</h4>
                        <p className="text-sm text-[var(--app-text-secondary)]">{t('settings.organization.defaults.priorities_subtitle')}</p>
                    </div>
                    {!isCreating && (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="p-2 hover:bg-[var(--app-bg-elevated)] rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="space-y-3">
                    {priorities.map((priority) => (
                        <div
                            key={priority.id}
                            className="flex items-center gap-4 p-4 bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl group hover:border-[var(--app-border-hover)] transition-all"
                        >
                            <div className="cursor-grab active:cursor-grabbing text-[var(--app-text-muted)] group-hover:text-[var(--app-text-secondary)]">
                                <GripVertical className="w-5 h-5" />
                            </div>

                            {editingId === priority.id ? (
                                <div className="flex-1 flex items-center gap-3">
                                    <div
                                        className="w-1.5 h-10 rounded-full shrink-0"
                                        style={{ backgroundColor: editColor }}
                                    />
                                    <div className="flex-1 space-y-3">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded px-3 py-2 text-sm text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)]"
                                            autoFocus
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            {PRESET_COLORS.map((color) => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => setEditColor(color)}
                                                    className={`w-6 h-6 rounded-md border-2 transition-all ${editColor === color ? 'border-[var(--app-text-primary)] scale-110 shadow-sm' : 'border-transparent'
                                                        }`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveEdit}
                                            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="p-2 bg-[var(--app-bg-card)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="w-1.5 h-10 rounded-full"
                                        style={{ backgroundColor: priority.color }}
                                    />

                                    <div className="flex-1">
                                        <h5 className="font-medium text-[var(--app-text-primary)]">{priority.name}</h5>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-[var(--app-text-muted)] uppercase tracking-wider font-bold">
                                                ID: {priority.id}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEditPriority(priority)}
                                            className="p-2 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-card)] rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeletePriority(priority.id)}
                                            className="p-2 text-[var(--app-text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            disabled={priorities.length <= 1}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {/* Create New Priority */}
                    {isCreating && (
                        <div className="flex items-center gap-4 p-4 bg-[var(--app-bg-elevated)] border border-[var(--app-accent)] rounded-xl">
                            <Plus className="w-5 h-5 text-[var(--app-accent)]" />
                            <div className="flex-1 space-y-3">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder={t('settings.organization.defaults.priority_name_placeholder')}
                                    className="w-full bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded px-3 py-2 text-sm text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)]"
                                    autoFocus
                                />
                                <div className="flex flex-wrap gap-2">
                                    {PRESET_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setNewColor(color)}
                                            className={`w-6 h-6 rounded-md border-2 transition-all ${newColor === color ? 'border-[var(--app-text-primary)] scale-110 shadow-sm' : 'border-transparent'
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreatePriority}
                                    className="p-2 bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-text)] rounded-lg transition-colors"
                                    disabled={createPriorityMutation.isPending || !newName.trim()}
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setIsCreating(false)
                                        setNewName('')
                                    }}
                                    className="p-2 bg-[var(--app-bg-card)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tips card */}
            <div className="bg-[var(--app-accent)]/5 border border-[var(--app-accent)]/10 rounded-2xl p-6">
                <div className="flex gap-4">
                    <div className="w-10 h-10 bg-[var(--app-accent)]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Plus className="w-5 h-5 text-[var(--app-accent)]" />
                    </div>
                    <div>
                        <h5 className="font-semibold text-[var(--app-text-primary)] mb-1">
                            {t('settings.organization.defaults.pro_tip_title')}
                        </h5>
                        <p className="text-sm text-[var(--app-text-secondary)] leading-relaxed">
                            {t('settings.organization.defaults.pro_tip_content')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
