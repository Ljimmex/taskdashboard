import { createFileRoute } from '@tanstack/react-router'
import { CalendarView } from '@/components/features/calendar/CalendarView'

export const Route = createFileRoute('/$workspaceSlug/calendar')({
  component: CalendarPage,
})

function CalendarPage() {
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden p-6">
      <CalendarView />
    </div>
  )
}
