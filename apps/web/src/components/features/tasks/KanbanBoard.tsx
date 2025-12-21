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
import { TaskCard, TaskCardProps } from './TaskCard'
import { TaskColumn, AddColumn } from './TaskColumn'

// Sortable Task wrapper
function SortableTask({
    task,
    onTaskClick,
    onTaskEdit,
    onTaskDelete,
    onTaskDuplicate,
    onTaskArchive,
}: {
    task: TaskCardProps
    onTaskClick?: (id: string) => void
    onTaskEdit?: (id: string) => void
    onTaskDelete?: (id: string) => void
    onTaskDuplicate?: (id: string) => void
    onTaskArchive?: (id: string) => void
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
            <TaskCard
                {...task}
                isDragging={isDragging}
                onClick={() => onTaskClick?.(task.id)}
                onEdit={() => onTaskEdit?.(task.id)}
                onDelete={() => onTaskDelete?.(task.id)}
                onDuplicate={() => onTaskDuplicate?.(task.id)}
                onArchive={() => onTaskArchive?.(task.id)}
            />
        </div>
    )
}

// Sortable Column Wrapper (was DroppableTaskColumn)
function SortableColumn({
    column,
    tasks,
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
    onAddTask?: () => void
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
            className={`transition-colors h-full flex flex-col ${isOver ? 'bg-amber-500/5 rounded-xl' : ''}`}
        >
            <TaskColumn
                id={column.id}
                title={column.title}
                status={column.status}
                color={column.color}
                tasks={tasks}
                onAddTask={() => onAddTask?.()}
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
    onTaskMove?: (taskId: string, fromColumn: string, toColumn: string) => void
    onTaskReorder?: (columnId: string, oldIndex: number, newIndex: number) => void
    onColumnReorder?: (oldIndex: number, newIndex: number) => void
    onTaskClick?: (taskId: string) => void
    onTaskEdit?: (taskId: string) => void
    onTaskDelete?: (taskId: string) => void
    onAddTask?: (columnId: string) => void
    onAddColumn?: (title: string, color: string) => void
    onRenameColumn?: (columnId: string, newName: string) => void
    onChangeColumnColor?: (columnId: string, color: string) => void
    onDeleteColumn?: (columnId: string) => void
    onMoveAllCards?: (columnId: string) => void
}

export function KanbanBoard({
    columns,
    onTaskMove,
    onTaskReorder,
    onColumnReorder,
    onTaskClick,
    onTaskEdit,
    onTaskDelete,
    onAddTask,
    onAddColumn,
    onRenameColumn,
    onChangeColumnColor,
    onDeleteColumn,
    onMoveAllCards,
}: KanbanBoardProps) {
    const [activeColumn, setActiveColumn] = useState<any | null>(null)
    const [activeTask, setActiveTask] = useState<TaskCardProps | null>(null)

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
                // Trigger move immediately for UI feedback if needed, 
                // but typically we wait for DragEnd for functional update.
                // However, for "live" feel we often invoke arrayMove here locally?
                // For now, let's leave simple logic for DragEnd.
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

            // If dropping over the column container itself, might need different logic,
            // but assumes dropping over a task usually.
            // If updated to useSortable for column, dropping on column might return index -1 or last?

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
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-6 overflow-x-auto pb-4 items-start h-full">
                <SortableContext items={columnsId} strategy={horizontalListSortingStrategy}>
                    {columns.map(column => (
                        <SortableColumn
                            key={column.id}
                            column={column}
                            tasks={column.tasks}
                            onAddTask={() => onAddTask?.(column.id)}
                            onTaskClick={onTaskClick}
                            onTaskEdit={onTaskEdit}
                            onTaskDelete={onTaskDelete}
                            onTaskArchive={undefined} // Assuming simpler interface
                            onRenameColumn={(newName) => onRenameColumn?.(column.id, newName)}
                            onChangeColumnColor={(color) => onChangeColumnColor?.(column.id, color)}
                            onDeleteColumn={() => onDeleteColumn?.(column.id)}
                            onMoveAllCards={() => onMoveAllCards?.(column.id)}
                            isOver={false} // Simplification
                        >
                            <SortableContext
                                items={column.tasks.map(t => t.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {column.tasks.map(task => (
                                    <SortableTask
                                        key={task.id}
                                        task={task}
                                        onTaskClick={onTaskClick}
                                        onTaskEdit={onTaskEdit}
                                        onTaskDelete={onTaskDelete}
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
                            // Minimal props for visual
                            onAddTask={() => { }}
                        // ... pass minimal props
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
    )
}
