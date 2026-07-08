import { CalendarSection } from '@/components/dashboard/CalendarSection'
import type { DashboardPanelProps } from '@/lib/dashboard'

export function CalendarPanel(_props: DashboardPanelProps) {
  return (
    <div className="w-full">
      <CalendarSection />
    </div>
  )
}
