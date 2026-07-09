import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import {
  DndContext,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import { MoreVertical, Plus, Pencil, Undo, RotateCcw, Check } from 'lucide-react'
import { useSession } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { normalizeLayout } from '@/lib/dashboard'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'
import { DashboardPanelShell } from '@/components/dashboard/DashboardPanelShell'
import { DashboardPanelSidebar } from '@/components/dashboard/DashboardPanelSidebar'
import { DASHBOARD_PANELS_BY_ID } from '@/components/dashboard/panels'
import type { DashboardLayoutItem } from '@/lib/dashboard'

export const Route = createFileRoute('/$workspaceSlug/')({
  component: DashboardHome,
})

function getColSpanClass(colSpan: number): string {
  switch (colSpan) {
    case 1:
      return 'lg:col-span-1'
    case 2:
      return 'lg:col-span-2'
    case 3:
      return 'lg:col-span-3'
    case 4:
      return 'lg:col-span-4'
    case 5:
      return 'lg:col-span-5'
    case 6:
      return 'lg:col-span-6'
    case 7:
      return 'lg:col-span-7'
    case 8:
      return 'lg:col-span-8'
    case 9:
      return 'lg:col-span-9'
    case 10:
      return 'lg:col-span-10'
    case 11:
      return 'lg:col-span-11'
    case 12:
    default:
      return 'lg:col-span-12'
  }
}

function SortablePanelItem({
  item,
  workspaceSlug,
  isEditing,
  onRemove,
}: {
  item: DashboardLayoutItem
  workspaceSlug: string
  isEditing: boolean
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.panelId,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const definition = DASHBOARD_PANELS_BY_ID[item.panelId]
  if (!definition) return null

  const PanelComponent = definition.component

  const colSpan = definition.colSpan || 12

  return (
    <div ref={setNodeRef} style={style} className={cn('col-span-12', getColSpanClass(colSpan))}>
      <DashboardPanelShell
        isEditing={isEditing}
        onRemove={() => onRemove(item.panelId)}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      >
        <PanelComponent workspaceSlug={workspaceSlug} config={item.config} />
      </DashboardPanelShell>
    </div>
  )
}

function SortableGrid({
  items,
  workspaceSlug,
  isEditing,
  onRemove,
  onDragEnd,
}: {
  items: DashboardLayoutItem[]
  workspaceSlug: string
  isEditing: boolean
  onRemove: (id: string) => void
  onDragEnd: (event: DragEndEvent) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  return (
    <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.panelId)} strategy={rectSortingStrategy}>
        <div className="grid grid-flow-dense grid-cols-12 items-start gap-4">
          {items.map((item) => (
            <SortablePanelItem
              key={item.panelId}
              item={item}
              workspaceSlug={workspaceSlug}
              isEditing={isEditing}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function DashboardHome() {
  const { t } = useTranslation()
  const { workspaceSlug } = Route.useParams()
  const { data: session } = useSession()
  const { layout, isLoading, updateLayout, resetLayout } = useDashboardLayout()
  const [isEditing, setIsEditing] = useState(false)
  const [isPanelPickerOpen, setIsPanelPickerOpen] = useState(false)
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false)
  const [originalLayout, setOriginalLayout] = useState<DashboardLayoutItem[] | null>(null)

  const normalizedLayout = normalizeLayout(layout)

  const startEditing = useCallback(() => {
    setOriginalLayout(normalizedLayout.map((item) => ({ ...item })))
    setIsEditing(true)
  }, [normalizedLayout])

  const stopEditing = useCallback(() => {
    setIsEditing(false)
    setOriginalLayout(null)
  }, [])

  const handleUndo = useCallback(() => {
    if (originalLayout) {
      updateLayout(originalLayout.map((item) => ({ ...item })))
    }
  }, [originalLayout, updateLayout])

  const handleSave = useCallback(() => {
    stopEditing()
  }, [stopEditing])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const activeId = String(active.id)
      const overId = String(over.id)
      const oldIndex = normalizedLayout.findIndex((i) => i.panelId === activeId)
      const newIndex = normalizedLayout.findIndex((i) => i.panelId === overId)
      if (oldIndex === -1 || newIndex === -1) return

      const nextLayout = arrayMove(normalizedLayout, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        order: idx,
      }))
      updateLayout(nextLayout)
    },
    [normalizedLayout, updateLayout]
  )

  const handleRemove = useCallback(
    (panelId: string) => {
      const nextLayout = normalizedLayout
        .filter((i) => i.panelId !== panelId)
        .map((item, idx) => ({ ...item, order: idx }))
      updateLayout(nextLayout)
    },
    [normalizedLayout, updateLayout]
  )

  const handleAdd = useCallback(
    (panelId: string) => {
      if (normalizedLayout.find((i) => i.panelId === panelId)) return
      const nextLayout = [
        ...normalizedLayout,
        { panelId, order: normalizedLayout.length, config: {} },
      ]
      updateLayout(nextLayout)
    },
    [normalizedLayout, updateLayout]
  )

  if (isLoading || !session?.user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--app-accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="relative space-y-4 p-2">
      <DashboardPanelSidebar
        isOpen={isPanelPickerOpen}
        layout={normalizedLayout}
        onAdd={handleAdd}
        onClose={() => setIsPanelPickerOpen(false)}
        onReset={resetLayout}
      />

      <div className="animate-fade-in">
        <SortableGrid
          items={normalizedLayout}
          workspaceSlug={workspaceSlug}
          isEditing={isEditing}
          onRemove={handleRemove}
          onDragEnd={handleDragEnd}
        />
      </div>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <div
          className={cn(
            'flex flex-col-reverse items-end gap-3 overflow-hidden transition-all duration-200',
            isFabMenuOpen
              ? 'pointer-events-auto max-h-40 opacity-100'
              : 'pointer-events-none max-h-0 opacity-0'
          )}
        >
          <button
            type="button"
            onClick={() => {
              setIsFabMenuOpen(false)
              setIsPanelPickerOpen(true)
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--app-accent)] text-[var(--app-accent-text)] shadow-lg transition-transform hover:scale-105"
            title={t('dashboard.addTile', 'Dodaj kafelek')}
          >
            <Plus size={20} />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsFabMenuOpen(false)
              if (isEditing) {
                stopEditing()
              } else {
                startEditing()
              }
            }}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105',
              isEditing
                ? 'bg-[var(--app-bg-elevated)] text-[var(--app-text-primary)] ring-1 ring-[var(--app-border)]'
                : 'bg-[var(--app-accent)] text-[var(--app-accent-text)]'
            )}
            title={
              isEditing
                ? t('dashboard.doneEditing', 'Gotowe')
                : t('dashboard.editPosition', 'Edytuj położenie')
            }
          >
            <Pencil size={18} />
          </button>
        </div>

        <div className="flex flex-row-reverse items-center gap-3">
          <button
            type="button"
            disabled={isEditing}
            onClick={() => setIsFabMenuOpen((v) => !v)}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-2xl shadow-black/30 transition-all hover:scale-110 hover:shadow-black/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100',
              isFabMenuOpen
                ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-[var(--app-accent-text)]'
                : 'border-[var(--app-bg-card)] bg-[var(--app-text-primary)] text-[var(--app-bg-card)]'
            )}
            title={
              isEditing
                ? t('dashboard.finishEditingFirst', 'Najpierw zakończ edycję')
                : t('dashboard.moreOptions', 'Więcej')
            }
          >
            <MoreVertical size={20} />
          </button>

          {isEditing && (
            <div className="flex flex-row-reverse items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-accent)] text-[var(--app-accent-text)] shadow-lg transition-all hover:scale-105"
                title={t('dashboard.saveLayout', 'Zapisz układ')}
              >
                <Check size={18} />
              </button>
              <button
                type="button"
                onClick={resetLayout}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] shadow-lg transition-all hover:scale-105 hover:border-[hsl(var(--destructive))]/50 hover:text-[hsl(var(--destructive))]"
                title={t('dashboard.resetDefaultLayout', 'Przywróć domyślny układ')}
              >
                <RotateCcw size={18} />
              </button>
              <button
                type="button"
                onClick={handleUndo}
                className="hover:border-[var(--app-accent)]/50 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] shadow-lg transition-all hover:scale-105 hover:text-[var(--app-accent)]"
                title={t('dashboard.undoChanges', 'Cofnij zmiany')}
              >
                <Undo size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
