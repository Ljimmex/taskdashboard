import { useState, useCallback, useMemo } from 'react'
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard, TaskCardProps } from '../components/TaskCard'
import { TaskColumn, AddColumn, QuickEditTask } from './TaskColumn'

// Sortable Task wrapper
function SortableTask({
    task,
    members,
    onTaskClick,
    onTaskEdit,
    onTaskFullEdit,
    onTaskDelete,
    onTaskDuplicate,
    onTaskArchive,
    isEditing,
    onQuickUpdate,
    onCancelEdit,
}: {
    task: TaskCardProps
    members?: { id: string; name: string; avatar?: string }[]
    onTaskClick?: (id: string) => void
    onTaskEdit?: (id: string) => void
    onTaskFullEdit?: (id: string) => void
    onTaskDelete?: (id: string) => void
    onTaskDuplicate?: (id: string) => void
    onTaskArchive?: (id: string) => void
    isEditing?: boolean
    onQuickUpdate?: (data: { id: string; title: string; priority: string; assigneeId?: string; dueDate?: string }) => void
    onCancelEdit?: () => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: 'Task',
            task,
        },
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {isEditing ? (
                <QuickEditTask
                    task={{
                        ...task,
                        priority: task.priority || 'medium',
                        dueDate: task.dueDate instanceof Date ? task.dueDate.toISOString() : task.dueDate || undefined,
                        assignees: task.assignees || []
                    }}
                    members={members}
                    onUpdate={(data) => onQuickUpdate?.(data)}
                    onClose={() => onCancelEdit?.()}
                />
            ) : (
                <TaskCard
                    {...task}
                    isDragging={isDragging}
                    onClick={() => onTaskClick?.(task.id)}
                    onEdit={() => onTaskEdit?.(task.id)}
                    onFullEdit={() => onTaskFullEdit?.(task.id)}
                    onDelete={() => onTaskDelete?.(task.id)}
                    onDuplicate={() => onTaskDuplicate?.(task.id)}
                    onArchive={() => onTaskArchive?.(task.id)}
                />
            )}
        </div>
    )
}

// Sortable Column Wrapper
function SortableColumn({
    column,
    tasks,
    members,
    onAddTask,
    onTaskClick,
    onTaskEdit,
    onTaskDelete,
    onTaskDuplicate,
    onTaskArchive,
    onRenameColumn,
    onChangeColumnColor,
    onDeleteColumn,
    onMoveAllCards,
    isOver,
    children
}: {
    column: { id: string; title: string; status: any; color?: string }
    tasks: TaskCardProps[]
    members?: { id: string; name: string; avatar?: string }[]
    onAddTask?: (data?: { title: string; priority: string; status: string; assigneeId?: string; dueDate?: string; startDate?: string }) => void
    onTaskClick?: (id: string) => void
    onTaskEdit?: (id: string) => void
    onTaskDelete?: (id: string) => void
    onTaskDuplicate?: (id: string) => void
    onTaskArchive?: (id: string) => void
    onRenameColumn?: (newName: string) => void
    onChangeColumnColor?: (color: string) => void
    onDeleteColumn?: () => void
    onMoveAllCards?: () => void
    isOver?: boolean
    children?: React.ReactNode
}) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: column.id,
        data: {
            type: 'Column',
            column,
        },
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`transition-colors h-full min-h-0 flex flex-col ${isOver ? 'bg-amber-500/5 rounded-xl' : ''}`}
        >
            <TaskColumn
                id={column.id}
                title={column.title}
                status={column.status}
                color={column.color}
                tasks={tasks}
                members={members}
                onAddTask={(data) => onAddTask?.(data)}
                onTaskClick={onTaskClick}
                onTaskEdit={onTaskEdit}
                onTaskDelete={onTaskDelete}
                onTaskDuplicate={onTaskDuplicate}
                onTaskArchive={onTaskArchive}
                onRename={onRenameColumn}
                onChangeColor={onChangeColumnColor}
                onDeleteColumn={onDeleteColumn}
                onMoveAllCards={onMoveAllCards}
                dragHandleProps={{ ...attributes, ...listeners }}
            >
                {children}
            </TaskColumn>
        </div>
    )
}

interface KanbanBoardProps {
    columns: {
        id: string
        title: string
        status: 'todo' | 'in_progress' | 'review' | 'done'
        color?: string
        tasks: TaskCardProps[]
    }[]
    members?: { id: string; name: string; avatar?: string }[]
    onTaskMove?: (taskId: string, fromColumn: string, toColumn: string) => void
    onTaskReorder?: (columnId: string, oldIndex: number, newIndex: number) => void
    onColumnReorder?: (oldIndex: number, newIndex: number) => void
    onTaskClick?: (taskId: string) => void
    onTaskEdit?: (taskId: string) => void
    onTaskFullEdit?: (taskId: string) => void
    onTaskDelete?: (taskId: string) => void
    onTaskDuplicate?: (taskId: string) => void
    onAddTask?: (columnId: string, data?: { title: string; priority: string; status: string; assigneeId?: string; dueDate?: string; startDate?: string }) => void
    onAddColumn?: (title: string, color: string) => void
    onRenameColumn?: (columnId: string, newName: string) => void
    onChangeColumnColor?: (columnId: string, color: string) => void
    onDeleteColumn?: (columnId: string) => void
    onMoveAllCards?: (columnId: string) => void
    onQuickUpdate?: (data: { id: string; title: string; priority: string; assigneeId?: string; dueDate?: string }) => void
}

export function KanbanBoard({
    columns,
    members,
    onTaskMove,
    onTaskReorder,
    onColumnReorder,
    onTaskClick,
    onTaskEdit,
    onTaskFullEdit,
    onTaskDelete,
    onTaskDuplicate,
    onAddTask,
    onAddColumn,
    onRenameColumn,
    onChangeColumnColor,
    onDeleteColumn,
    onMoveAllCards,
    onQuickUpdate,
}: KanbanBoardProps) {
    const [activeColumn, setActiveColumn] = useState<any | null>(null)
    const [activeTask, setActiveTask] = useState<TaskCardProps | null>(null)
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null)

    // Memoize column IDs for SortableContext
    const columnsId = useMemo(() => columns.map((col) => col.id), [columns])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 10, // Increased distance to prevent accidental drags when clicking menu
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const findColumn = useCallback((id: string) => {
        return columns.find((col) => col.id === id) ||
            columns.find((col) => col.tasks.some((t) => t.id === id))
    }, [columns])

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        if (active.data.current?.type === 'Column') {
            setActiveColumn(active.data.current.column)
            return
        }

        if (active.data.current?.type === 'Task') {
            setActiveTask(active.data.current.task)
            return
        }
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id
        const overId = over.id

        if (activeId === overId) return

        const isActiveTask = active.data.current?.type === 'Task'
        const isOverTask = over.data.current?.type === 'Task'

        if (!isActiveTask) return

        // Dropping a Task over another Task
        if (isActiveTask && isOverTask) {
            const activeColumn = findColumn(activeId as string)
            const overColumn = findColumn(overId as string)

            if (!activeColumn || !overColumn) return

            if (activeColumn.id !== overColumn.id) {
                // Trigger move immediately
            }
        }

        // Dropping a Task over a Column
        const isOverColumn = over.data.current?.type === 'Column'
        if (isActiveTask && isOverColumn) {
            const activeColumn = findColumn(activeId as string)
            const overColumn = columns.find(c => c.id === overId)
            if (activeColumn && overColumn && activeColumn.id !== overColumn.id) {
                // Logic handled in DragEnd
            }
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setActiveColumn(null)
        setActiveTask(null)

        if (!over) return

        const activeId = active.id
        const overId = over.id

        if (activeId === overId) return

        // Column Reordering
        if (active.data.current?.type === 'Column') {
            const oldIndex = columns.findIndex((col) => col.id === activeId)
            const newIndex = columns.findIndex((col) => col.id === overId)

            if (oldIndex !== newIndex) {
                onColumnReorder?.(oldIndex, newIndex)
            }
            return
        }

        // Task Reordering
        const activeColumn = findColumn(activeId as string)
        const overColumn = findColumn(overId as string) || columns.find(col => col.id === overId)

        if (!activeColumn || !overColumn) return

        if (activeColumn.id === overColumn.id) {
            // Same column reorder
            const oldIndex = activeColumn.tasks.findIndex((t) => t.id === activeId)
            const newIndex = activeColumn.tasks.findIndex((t) => t.id === overId)

            if (oldIndex !== newIndex && newIndex !== -1) {
                onTaskReorder?.(activeColumn.id, oldIndex, newIndex)
            }
        } else {
            // Move to different column
            onTaskMove?.(activeId as string, activeColumn.id, overColumn.id)
        }
    }

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    }

    return (
        <div className="h-full flex flex-col min-h-0">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 flex gap-6 overflow-x-auto pb-4 min-h-0">
                    <SortableContext items={columnsId} strategy={horizontalListSortingStrategy}>
                        {columns.map(column => (
                            <SortableColumn
                                key={column.id}
                                column={column}
                                tasks={column.tasks}
                                members={members}
                                onAddTask={(data) => onAddTask?.(column.id, data)}
                                onTaskClick={onTaskClick}
                                onTaskEdit={onTaskEdit}
                                onTaskDelete={onTaskDelete}
                                onTaskArchive={undefined}
                                onRenameColumn={(newName) => onRenameColumn?.(column.id, newName)}
                                onChangeColumnColor={(color) => onChangeColumnColor?.(column.id, color)}
                                onDeleteColumn={() => onDeleteColumn?.(column.id)}
                                onMoveAllCards={() => onMoveAllCards?.(column.id)}
                                isOver={false}
                            >
                                <SortableContext
                                    items={column.tasks.map(t => t.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {column.tasks.map(task => (
                                        <SortableTask
                                            key={task.id}
                                            task={task}
                                            members={members}
                                            onTaskClick={onTaskClick}
                                            onTaskEdit={() => setEditingTaskId(task.id)}
                                            onTaskFullEdit={onTaskFullEdit}
                                            onTaskDelete={onTaskDelete}
                                            onTaskDuplicate={onTaskDuplicate}
                                            isEditing={editingTaskId === task.id}
                                            onQuickUpdate={(data) => {
                                                onQuickUpdate?.(data)
                                                setEditingTaskId(null)
                                            }}
                                            onCancelEdit={() => setEditingTaskId(null)}
                                        />
                                    ))}
                                </SortableContext>
                            </SortableColumn>
                        ))}
                    </SortableContext>

                    <AddColumn
                        onAdd={onAddColumn}
                    />
                </div>

                <DragOverlay dropAnimation={dropAnimation}>
                    {activeColumn && (
                        <div className="opacity-80 rotate-2">
                            <TaskColumn
                                id={activeColumn.id}
                                title={activeColumn.title}
                                status={activeColumn.status}
                                color={activeColumn.color}
                                tasks={activeColumn.tasks}
                                members={members}
                                onAddTask={() => { }}
                            />
                        </div>
                    )}
                    {activeTask && (
                        <div className="opacity-80 rotate-2 cursor-grabbing">
                            <TaskCard {...activeTask} isDragging />
                        </div>
                    )}
                </DragOverlay>
            </DndContext>
        </div>
    )
}
