import { useState } from 'react'
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
        enabled: !!workspaceSlug
    })

    const labels = labelsData || []

    // Create label mutation
    const createMutation = useMutation({
        mutationFn: async ({ name, color }: { name: string, color: string }) => {
            const res = await apiFetchJson<{ data: Label }>('/api/labels', {
                method: 'POST',
                body: JSON.stringify({ workspaceSlug, name, color })
            })
            return res.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['labels', workspaceSlug] })
            setIsCreating(false)
            setNewName('')
            setNewColor('#6B7280')
        }
    })

    // Update label mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, name, color }: { id: string, name: string, color: string }) => {
            const res = await apiFetchJson<{ data: Label }>(`/api/labels/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ workspaceSlug, name, color })
            })
            return res.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['labels', workspaceSlug] })
            setEditingId(null)
        }
    })

    // Delete label mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiFetchJson(`/api/labels/${id}?workspaceSlug=${workspaceSlug}`, {
                method: 'DELETE'
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['labels', workspaceSlug] })
        }
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
        if (confirm(`Czy na pewno chcesz usunąć etykietę "${name}"?\n\nUwaga: Usunięcie etykiety nie usunie jej z istniejących zadań.`)) {
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
        return <div className="text-gray-400">Ładowanie etykiet...</div>
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Etykiety</h3>
                <p className="text-sm text-gray-400">
                    Zarządzaj etykietami dla całej przestrzeni roboczej. Zmiany będą widoczne globalnie.
                </p>
            </div>

            {/* Labels list */}
            <div className="space-y-2">
                {labels.length === 0 && !isCreating && (
                    <div className="text-center py-8 text-gray-500">
                        Brak etykiet. Utwórz pierwszą etykietę poniżej.
                    </div>
                )}

                {labels.map((label) => (
                    <div
                        key={label.id}
                        className="flex items-center gap-3 p-3 bg-[#1a1a24] rounded-lg border border-gray-800/50 hover:border-gray-700/50 transition-colors"
                    >
                        {editingId === label.id ? (
                            // Edit mode
                            <>
                                <ColorPicker
                                    color={editColor}
                                    onChange={setEditColor}
                                />
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="flex-1 bg-[#14141b] border border-gray-700 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#F2CE88]"
                                    placeholder="Nazwa etykiety"
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
                                        className="p-2 text-green-500 hover:bg-green-500/10 rounded transition-colors disabled:opacity-50"
                                        title="Zapisz"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={cancelEditing}
                                        disabled={updateMutation.isPending}
                                        className="p-2 text-gray-400 hover:bg-gray-700/50 rounded transition-colors"
                                        title="Anuluj"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            // View mode
                            <>
                                <div
                                    className="w-6 h-6 rounded flex-shrink-0"
                                    style={{ backgroundColor: label.color }}
                                />
                                <span className="flex-1 text-white text-sm">{label.name}</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => startEditing(label)}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors"
                                        title="Edytuj"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(label.id, label.name)}
                                        disabled={deleteMutation.isPending}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                                        title="Usuń"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {/* Create new label */}
                {isCreating ? (
                    <div className="flex items-center gap-3 p-3 bg-[#1a1a24] rounded-lg border border-[#F2CE88]/50">
                        <ColorPicker
                            color={newColor}
                            onChange={setNewColor}
                        />
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="flex-1 bg-[#14141b] border border-gray-700 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#F2CE88]"
                            placeholder="Nazwa nowej etykiety"
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
                                className="p-2 text-green-500 hover:bg-green-500/10 rounded transition-colors disabled:opacity-50"
                                title="Utwórz"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => {
                                    setIsCreating(false)
                                    setNewName('')
                                    setNewColor('#6B7280')
                                }}
                                disabled={createMutation.isPending}
                                className="p-2 text-gray-400 hover:bg-gray-700/50 rounded transition-colors"
                                title="Anuluj"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-[#1a1a24] rounded-lg border border-dashed border-gray-700 hover:border-[#F2CE88] text-gray-400 hover:text-white transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">Dodaj nową etykietę</span>
                    </button>
                )}
            </div>

            {/* Info box */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-300">
                    <strong>Wskazówka:</strong> Zmiany kolorów i nazw etykiet będą natychmiast widoczne we wszystkich zadaniach i projektach używających tych etykiet.
                </p>
            </div>
        </div>
    )
}

// Color Picker Component
function ColorPicker({ color, onChange }: { color: string, onChange: (color: string) => void }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="relative flex-shrink-0">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-8 h-8 rounded-lg border-2 border-gray-700 hover:border-[#F2CE88] transition-all shadow-md flex-shrink-0"
                style={{ backgroundColor: color }}
                title="Wybierz kolor"
            />

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[100]"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Color palette */}
                    <div className="absolute top-10 left-0 z-[101] p-3 bg-[#1a1a24] border border-gray-700/50 rounded-xl shadow-2xl w-[184px]">
                        <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map((presetColor) => (
                                <button
                                    key={presetColor}
                                    type="button"
                                    onClick={() => {
                                        onChange(presetColor)
                                        setIsOpen(false)
                                    }}
                                    className="w-6 h-6 rounded-md border-2 transition-all hover:scale-110 flex-shrink-0"
                                    style={{
                                        backgroundColor: presetColor,
                                        borderColor: color === presetColor ? '#F2CE88' : 'transparent'
                                    }}
                                    title={presetColor}
                                />
                            ))}
                        </div>

                        {/* Custom color input */}
                        <div className="mt-3 pt-3 border-t border-gray-800">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1 h-8 rounded-lg overflow-hidden border border-gray-700">
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => onChange(e.target.value)}
                                        className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] cursor-pointer bg-transparent border-none"
                                    />
                                </div>
                                <span className="text-[10px] font-mono text-gray-500 uppercase">{color}</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
