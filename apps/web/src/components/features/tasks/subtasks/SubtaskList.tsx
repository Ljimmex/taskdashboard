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
import type { Assignee } from '../components/AssigneePicker'

// Re-export Subtask type
export type { Subtask } from './SubtaskItem'

interface SubtaskListProps {
  subtasks: Subtask[]
  readOnly?: boolean
  onReorder?: (subtasks: Subtask[]) => void
  onToggle?: (subtaskId: string) => void
  onEdit?: (subtaskId: string, updates: Partial<Subtask>) => void
  onDelete?: (subtaskId: string) => void
  onAdd?: (title: string, afterId?: string) => void
  availableAssignees?: Assignee[]
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
        className="group flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-gray-700 p-3 text-gray-500 transition-all hover:border-[#F2CE88]/50 hover:text-[#F2CE88]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 5V19M5 12H19" />
        </svg>
        <span className="text-sm font-medium">Dodaj podzadanie</span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900/50 p-3">
      <div className="h-5 w-5 flex-shrink-0 rounded-md border-2 border-gray-600" />
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
        className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
      />
      <button
        onClick={handleSubmit}
        disabled={!title.trim()}
        className="rounded-lg bg-[#F2CE88] px-3 py-1 text-xs font-bold text-black transition-colors hover:bg-[#d4b476] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Dodaj
      </button>
      <button
        onClick={() => {
          setTitle('')
          setIsAdding(false)
        }}
        className="p-1 text-gray-400 transition-colors hover:text-white"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// Main SubtaskList Component
export function SubtaskList({
  subtasks,
  readOnly = false,
  onReorder,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  availableAssignees = [],
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

  // Read-only mode - simple list without drag & drop or editing, no interaction
  if (readOnly) {
    return (
      <div className="space-y-2">
        {subtasks.map((subtask) => {
          const isCompleted = subtask.isCompleted

          return (
            <div key={subtask.id} className="rounded-xl bg-gray-900/30 p-3">
              <div className="flex items-start gap-3">
                {/* Checkbox icon */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onToggle?.(subtask.id)
                  }}
                  disabled={!onToggle}
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all ${!onToggle ? 'cursor-default' : 'cursor-pointer'} ${
                    isCompleted
                      ? 'border-[#F2CE88] bg-[#F2CE88]'
                      : `border-gray-600 ${onToggle ? 'hover:border-[#F2CE88]/50' : ''}`
                  }`}
                >
                  {isCompleted && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#12121a"
                      strokeWidth="3"
                    >
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-medium ${isCompleted ? 'text-gray-500 line-through' : 'text-white'}`}
                    >
                      {subtask.title}
                    </span>
                    {/* Assignee and Dependencies - Read Only */}
                    <div className="flex items-center gap-2">
                      {subtask.dependsOn && subtask.dependsOn.length > 0 && (
                        <div className="p-0.5 text-amber-500" title="Zależności">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M12 17h.01" />
                            <path d="M12 14h.01" />
                            <path d="M12 11h.01" />
                          </svg>
                        </div>
                      )}
                      {subtask.assignee && (
                        <div title={subtask.assignee.name}>
                          {subtask.assignee.avatar || subtask.assignee.image ? (
                            <img
                              src={subtask.assignee.avatar || subtask.assignee.image}
                              alt={subtask.assignee.name}
                              className="h-5 w-5 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-[9px] font-semibold text-black">
                              {subtask.assignee.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Description */}
                  {subtask.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">{subtask.description}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {subtasks.length === 0 && (
          <div className="rounded-xl bg-gray-900/20 py-6 text-center">
            <p className="text-sm text-gray-500">Brak podzadań</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={subtasks.map((s) => s.id)} strategy={verticalListSortingStrategy}>
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
              availableAssignees={availableAssignees}
              otherSubtasks={subtasks.filter((s) => s.id !== subtask.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {subtasks.length === 0 && (
        <div className="rounded-xl bg-gray-900/20 py-6 text-center">
          <p className="text-sm text-gray-500">Brak podzadań</p>
        </div>
      )}

      {onAdd && <AddSubtaskInput onAdd={(title) => onAdd(title)} />}
    </div>
  )
}
