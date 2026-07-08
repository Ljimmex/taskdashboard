import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import { useSession } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { normalizeLayout } from '@/lib/dashboard'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'
import { DashboardPanelShell } from '@/components/dashboard/DashboardPanelShell'
import { DashboardPanelAddBar } from '@/components/dashboard/DashboardPanelAddBar'
import { DASHBOARD_PANELS_BY_ID } from '@/components/dashboard/panels'
import type { DashboardLayoutItem } from '@/lib/dashboard'

export const Route = createFileRoute('/$workspaceSlug/')({
  component: DashboardHome,
})

function isWidePanel(panelId: string): boolean {
  return (DASHBOARD_PANELS_BY_ID[panelId]?.colSpan || 8) >= 6
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

  return (
    <div ref={setNodeRef} style={style} className="w-full">
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

function SortableColumn({
  items,
  workspaceSlug,
  isEditing,
  onRemove,
  onDragEnd,
  className,
}: {
  items: DashboardLayoutItem[]
  workspaceSlug: string
  isEditing: boolean
  onRemove: (id: string) => void
  onDragEnd: (event: DragEndEvent) => void
  className?: string
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div className={cn('flex flex-col gap-4', className)}>
        <SortableContext items={items.map((i) => i.panelId)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortablePanelItem
              key={item.panelId}
              item={item}
              workspaceSlug={workspaceSlug}
              isEditing={isEditing}
              onRemove={onRemove}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  )
}

function DashboardHome() {
  const { t } = useTranslation()
  const { workspaceSlug } = Route.useParams()
  const { data: session } = useSession()
  const { layout, isLoading, updateLayout, resetLayout } = useDashboardLayout()
  const [isEditing, setIsEditing] = useState(false)

  const normalizedLayout = normalizeLayout(layout)
  const wideItems = normalizedLayout.filter((i) => isWidePanel(i.panelId))
  const narrowItems = normalizedLayout.filter((i) => !isWidePanel(i.panelId))

  const reorderGroup = useCallback(
    (wide: boolean, event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const activeId = String(active.id)
      const overId = String(over.id)
      const groupItems = normalizedLayout.filter((i) => isWidePanel(i.panelId) === wide)
      const oldIndex = groupItems.findIndex((i) => i.panelId === activeId)
      const newIndex = groupItems.findIndex((i) => i.panelId === overId)
      if (oldIndex === -1 || newIndex === -1) return

      const nextGroup = arrayMove(groupItems, oldIndex, newIndex)
      const itemMap = Object.fromEntries(normalizedLayout.map((i) => [i.panelId, i]))
      let groupIdx = 0
      const nextLayout = normalizedLayout.map((item) => {
        if (isWidePanel(item.panelId) === wide) {
          return { ...itemMap[nextGroup[groupIdx++].panelId] }
        }
        return item
      })

      updateLayout(nextLayout.map((item, idx) => ({ ...item, order: idx })))
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setIsEditing((v) => !v)}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            isEditing
              ? 'bg-amber-500 text-black hover:bg-amber-400'
              : 'bg-[var(--app-bg-elevated)] text-[var(--app-text-primary)] hover:bg-[var(--app-bg-card)]'
          )}
        >
          {isEditing
            ? t('dashboard.doneEditing', 'Gotowe')
            : t('dashboard.customize', 'Dostosuj dashboard')}
        </button>
      </div>

      {isEditing && (
        <DashboardPanelAddBar layout={normalizedLayout} onAdd={handleAdd} onReset={resetLayout} />
      )}

      <div className="animate-fade-in grid grid-cols-1 gap-4 lg:grid-cols-12">
        <SortableColumn
          items={wideItems}
          workspaceSlug={workspaceSlug}
          isEditing={isEditing}
          onRemove={handleRemove}
          onDragEnd={(e) => reorderGroup(true, e)}
          className="lg:col-span-8"
        />
        <SortableColumn
          items={narrowItems}
          workspaceSlug={workspaceSlug}
          isEditing={isEditing}
          onRemove={handleRemove}
          onDragEnd={(e) => reorderGroup(false, e)}
          className="lg:col-span-4"
        />
      </div>
    </div>
  )
}
