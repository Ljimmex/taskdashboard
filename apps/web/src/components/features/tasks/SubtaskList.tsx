import { useState } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { SubtaskItem, type Subtask } from './SubtaskItem'

// Re-export Subtask type
export type { Subtask } from './SubtaskItem'

interface SubtaskListProps {
    subtasks: Subtask[]
    onReorder?: (subtasks: Subtask[]) => void
    onToggle?: (subtaskId: string) => void
    onEdit?: (subtaskId: string, updates: Partial<Subtask>) => void
    onDelete?: (subtaskId: string) => void
    onAdd?: (title: string, afterId?: string) => void
}

// Add Subtask Input
const AddSubtaskInput = ({ onAdd }: { onAdd: (title: string) => void }) => {
    const [isAdding, setIsAdding] = useState(false)
    const [title, setTitle] = useState('')

    const handleSubmit = () => {
        if (title.trim()) {
            onAdd(title.trim())
            setTitle('')
            setIsAdding(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit()
        } else if (e.key === 'Escape') {
            setTitle('')
            setIsAdding(false)
        }
    }

    if (!isAdding) {
        return (
            <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 w-full p-3 rounded-xl border-2 border-dashed border-gray-700 text-gray-500 hover:border-[#F2CE88]/50 hover:text-[#F2CE88] transition-all group"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5V19M5 12H19" />
                </svg>
                <span className="text-sm font-medium">Dodaj podzadanie</span>
            </button>
        )
    }

    return (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-900/50 border border-gray-700">
            <div className="w-5 h-5 rounded-md border-2 border-gray-600 flex-shrink-0" />
            <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                    if (!title.trim()) setIsAdding(false)
                }}
                placeholder="Wpisz tytuł podzadania..."
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
            />
            <button
                onClick={handleSubmit}
                disabled={!title.trim()}
                className="px-3 py-1 rounded-lg bg-[#F2CE88] text-black text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d4b476] transition-colors"
            >
                Dodaj
            </button>
            <button
                onClick={() => {
                    setTitle('')
                    setIsAdding(false)
                }}
                className="p-1 text-gray-400 hover:text-white transition-colors"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>
        </div>
    )
}

// Main SubtaskList Component
export function SubtaskList({
    subtasks,
    onReorder,
    onToggle,
    onEdit,
    onDelete,
    onAdd,
}: SubtaskListProps) {
    const [addingAfterId, setAddingAfterId] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = subtasks.findIndex((s) => s.id === active.id)
            const newIndex = subtasks.findIndex((s) => s.id === over.id)
            const newOrder = arrayMove(subtasks, oldIndex, newIndex)
            onReorder?.(newOrder)
        }
    }

    const handleAddAfter = (afterId: string, title: string) => {
        onAdd?.(title, afterId)
        setAddingAfterId(null)
    }

    return (
        <div className="space-y-2">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={subtasks.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {subtasks.map((subtask) => (
                        <SubtaskItem
                            key={subtask.id}
                            subtask={subtask}
                            onToggle={() => onToggle?.(subtask.id)}
                            onEdit={(updates) => onEdit?.(subtask.id, updates)}
                            onDelete={() => onDelete?.(subtask.id)}
                            onAddAfter={() => setAddingAfterId(subtask.id)}
                            isAddingAfter={addingAfterId === subtask.id}
                            onAddAfterSubmit={(title) => handleAddAfter(subtask.id, title)}
                            onAddAfterCancel={() => setAddingAfterId(null)}
                        />
                    ))}
                </SortableContext>
            </DndContext>

            {subtasks.length === 0 && (
                <div className="text-center py-6 rounded-xl bg-gray-900/20">
                    <p className="text-sm text-gray-500">Brak podzadań</p>
                </div>
            )}

            {onAdd && (
                <AddSubtaskInput onAdd={(title) => onAdd(title)} />
            )}
        </div>
    )
}
