import { cn } from '@/lib/utils'

interface CalendarEventProps {
    title: string
    time?: string
    color?: string
    className?: string
}

export function CalendarEvent({ title, time, color = "#fbbf24", className }: CalendarEventProps) {
    return (
        <div
            className={cn(
                "group flex flex-col gap-0.5 p-2 rounded-md bg-card/50 hover:bg-card border border-border/50 transition-colors cursor-pointer relative overflow-hidden",
                className
            )}
        >
            <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: color }}
            />
            <div className="pl-2.5">
                <div className="text-sm font-medium leading-none truncate">{title}</div>
                {time && (
                    <div className="text-xs text-muted-foreground mt-1">{time}</div>
                )}
            </div>
        </div>
    )
}
