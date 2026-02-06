import { createFileRoute } from '@tanstack/react-router'
import { CalendarView } from '@/components/features/calendar/CalendarView'

export const Route = createFileRoute('/$workspaceSlug/calendar')({
  component: CalendarPage,
})

function CalendarPage() {
  return (
    <div className="flex-1 h-full p-6 overflow-hidden flex flex-col">
      <CalendarView />
    </div>
  )
}
