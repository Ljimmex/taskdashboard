import { cn } from '@/lib/utils'

interface CalendarEventProps {
  title: string
  time?: string
  color?: string
  className?: string
}

export function CalendarEvent({ title, time, color = '#fbbf24', className }: CalendarEventProps) {
  return (
    <div
      className={cn(
        'bg-card/50 hover:bg-card border-border/50 group relative flex cursor-pointer flex-col gap-0.5 overflow-hidden rounded-md border p-2 transition-colors',
        className
      )}
    >
      <div className="absolute bottom-0 left-0 top-0 w-1" style={{ backgroundColor: color }} />
      <div className="pl-2.5">
        <div className="truncate text-sm font-medium leading-none">{title}</div>
        {time && <div className="text-muted-foreground mt-1 text-xs">{time}</div>}
      </div>
    </div>
  )
}
