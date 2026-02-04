import { useState } from 'react'
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
        { id: 'low', name: 'Low', color: '#6b7280', position: 0 },
        { id: 'medium', name: 'Medium', color: '#3b82f6', position: 1 },
        { id: 'high', name: 'High', color: '#f59e0b', position: 2 },
        { id: 'urgent', name: 'Urgent', color: '#ef4444', position: 3 },
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
            // Invalidate the workspace query to refresh priorities
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
        if (confirm('Are you sure you want to delete this priority?')) {
            deletePriorityMutation.mutate(id)
        }
    }

    return (
        <div className="space-y-8">
            {/* Priorities Section */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Task Priorities</h3>
                <p className="text-sm text-gray-400 mb-4">
                    Customize priority levels for your workspace tasks
                </p>

                {!workspace ? (
                    <div className="text-center py-8 text-gray-500">Loading priorities...</div>
                ) : (
                    <div className="space-y-2">
                        {priorities.map((priority) => (
                            <div
                                key={priority.id}
                                className="bg-[#1a1a24] border border-gray-800 rounded-lg p-4 flex items-center gap-3"
                            >
                                <GripVertical className="w-4 h-4 text-gray-600" />

                                {editingId === priority.id ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="flex-1 bg-[#0f0f14] border border-gray-700 rounded px-3 py-2 text-sm text-white"
                                        />
                                        <div className="flex gap-1 flex-wrap" style={{ maxWidth: '160px' }}>
                                            {PRESET_COLORS.map((color) => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => setEditColor(color)}
                                                    className={`w-5 h-5 rounded border-2 transition-all ${editColor === color ? 'border-white scale-110' : 'border-gray-700'
                                                        }`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleSaveEdit}
                                            className="p-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: priority.color }}
                                        />
                                        <span className="flex-1 text-white">{priority.name}</span>
                                        <button
                                            onClick={() => handleEditPriority(priority)}
                                            className="p-2 hover:bg-gray-800 rounded transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4 text-gray-400" />
                                        </button>
                                        <button
                                            onClick={() => handleDeletePriority(priority.id)}
                                            className="p-2 hover:bg-gray-800 rounded transition-colors"
                                            disabled={priorities.length <= 1}
                                        >
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}

                        {/* Create New Priority */}
                        {isCreating ? (
                            <div className="bg-[#1a1a24] border border-gray-800 rounded-lg p-4 flex items-center gap-3">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Priority name..."
                                    className="flex-1 bg-[#0f0f14] border border-gray-700 rounded px-3 py-2 text-sm text-white"
                                    autoFocus
                                />
                                <div className="flex gap-1 flex-wrap" style={{ maxWidth: '160px' }}>
                                    {PRESET_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setNewColor(color)}
                                            className={`w-5 h-5 rounded border-2 transition-all ${newColor === color ? 'border-white scale-110' : 'border-gray-700'
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={handleCreatePriority}
                                    disabled={!newName.trim()}
                                    className="p-2 bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setIsCreating(false)
                                        setNewName('')
                                        setNewIcon('')
                                    }}
                                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsCreating(true)}
                                className="w-full bg-[#1a1a24] border border-gray-800 border-dashed rounded-lg p-4 text-gray-400 hover:text-white hover:border-gray-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Priority
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Default Industry Template Section */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Default Project Template</h3>
                <p className="text-sm text-gray-400 mb-4">
                    Select a default industry template for new projects
                </p>

                <select
                    value={workspace.defaultIndustryTemplateId || ''}
                    onChange={(e) => updateDefaultsMutation.mutate({ defaultIndustryTemplateId: e.target.value || undefined })}
                    className="w-full bg-[#1a1a24] border border-gray-800 rounded-lg px-4 py-2 text-white"
                >
                    <option value="">No default (manual selection)</option>
                    {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                            {template.name} - {template.description}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    )
}
