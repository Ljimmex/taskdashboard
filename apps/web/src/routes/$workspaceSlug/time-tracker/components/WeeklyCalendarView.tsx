import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from 'date-fns'
import { enUS, pl } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock, ArrowDown, ArrowUp } from 'lucide-react'
import { apiFetchJson } from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatMinutes } from './utils'
import type { TimeEntryRaw } from './types'

interface WeeklyCalendarViewProps {
  workspaceSlug: string
  userId?: string
}

const HOUR_HEIGHT = 44
const START_HOUR = 0
const END_HOUR = 24
const VISIBLE_HOURS = END_HOUR - START_HOUR

const ENTRY_COLORS = {
  pendingTask: {
    bg: 'bg-amber-500/25',
    border: 'border-amber-500',
    text: 'text-white drop-shadow-sm',
    dot: 'bg-amber-500',
  },
  approvedTask: {
    bg: 'bg-emerald-500/25',
    border: 'border-emerald-500',
    text: 'text-white drop-shadow-sm',
    dot: 'bg-emerald-500',
  },
  pendingMeeting: {
    bg: 'bg-purple-500/25',
    border: 'border-purple-500',
    text: 'text-white drop-shadow-sm',
    dot: 'bg-purple-500',
  },
  approvedMeeting: {
    bg: 'bg-blue-500/25',
    border: 'border-blue-500',
    text: 'text-white drop-shadow-sm',
    dot: 'bg-blue-500',
  },
}

function getEntryColor(entryType?: 'task' | 'meeting', approvalStatus?: 'pending' | 'approved' | 'rejected') {
  const isApproved = approvalStatus === 'approved'
  if (entryType === 'meeting') {
    return isApproved ? ENTRY_COLORS.approvedMeeting : ENTRY_COLORS.pendingMeeting
  }
  return isApproved ? ENTRY_COLORS.approvedTask : ENTRY_COLORS.pendingTask
}

interface EntryFragment {
  entry: TimeEntryRaw
  start: Date
  end: Date
  durationMinutes: number
  continuesToNextDay: boolean
  continuedFromPrevDay: boolean
}

function splitEntryIntoDays(entry: TimeEntryRaw, days: Date[]): EntryFragment[] {
  const entryStart = parseISO(entry.startedAt)
  const entryEnd = entry.endedAt
    ? parseISO(entry.endedAt)
    : new Date(entryStart.getTime() + (entry.durationMinutes || 0) * 60000)

  const fragments: EntryFragment[] = []

  days.forEach((day) => {
    const dayStart = new Date(day)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(day)
    dayEnd.setHours(23, 59, 59, 999)

    if (entryEnd <= dayStart || entryStart > dayEnd) return

    const fragmentStart = entryStart > dayStart ? entryStart : dayStart
    const fragmentEnd = entryEnd < dayEnd ? entryEnd : dayEnd
    const duration = Math.round((fragmentEnd.getTime() - fragmentStart.getTime()) / 60000)

    if (duration > 0) {
      fragments.push({
        entry,
        start: fragmentStart,
        end: fragmentEnd,
        durationMinutes: duration,
        continuesToNextDay: fragmentEnd.getTime() === dayEnd.getTime() && entryEnd > dayEnd,
        continuedFromPrevDay: fragmentStart.getTime() === dayStart.getTime() && entryStart < dayStart,
      })
    }
  })

  return fragments
}

export function WeeklyCalendarView({ workspaceSlug, userId }: WeeklyCalendarViewProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'pl' ? pl : enUS
  const [currentDate, setCurrentDate] = useState(new Date())

  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  )
  const weekEnd = useMemo(
    () => endOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  )
  const days = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  )

  const { data, isLoading } = useQuery({
    queryKey: ['time-entries-weekly', workspaceSlug, weekStart.toISOString(), userId],
    queryFn: async () => {
      const start = weekStart.toISOString()
      const end = weekEnd.toISOString()
      const userParam = userId ? `&userId=${userId}` : ''
      return apiFetchJson<{ success: boolean; data: TimeEntryRaw[]; totalMinutes: number }>(
        `/api/time?startDate=${start}&endDate=${end}${userParam}`
      )
    },
    enabled: !!workspaceSlug,
  })

  const entries = useMemo(() => {
    return (data?.data || []).filter((entry) => entry.approvalStatus !== 'rejected')
  }, [data])
  const totalMinutes = data?.totalMinutes || 0

  const entriesByDay = useMemo(() => {
    const map: Record<number, EntryFragment[]> = {}
    days.forEach((_, idx) => {
      map[idx] = []
    })
    entries.forEach((entry) => {
      const fragments = splitEntryIntoDays(entry, days)
      fragments.forEach((fragment) => {
        const dayIdx = days.findIndex((d) => isSameDay(d, fragment.start))
        if (dayIdx >= 0) {
          map[dayIdx].push(fragment)
        }
      })
    })
    return map
  }, [entries, days])

  const handlePrev = () => {
    const next = new Date(currentDate)
    next.setDate(next.getDate() - 7)
    setCurrentDate(next)
  }

  const handleNext = () => {
    const next = new Date(currentDate)
    next.setDate(next.getDate() + 7)
    setCurrentDate(next)
  }

  const goToToday = () => setCurrentDate(new Date())

  const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }))

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg-card)] rounded-2xl border border-[var(--app-border)] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b border-[var(--app-border)] bg-[var(--app-bg-card)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[var(--app-bg-elevated)] rounded-full border border-[var(--app-border)] p-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-full text-[var(--app-text-muted)] hover:bg-[var(--app-bg-deepest)] hover:text-[var(--app-text-primary)] transition-colors"
              aria-label={t('common.previous', 'Previous')}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goToToday}
              className={cn(
                'px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full transition-colors',
                isCurrentWeek
                  ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]'
                  : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-deepest)] hover:text-[var(--app-text-primary)]'
              )}
            >
              {t('dashboard.today', 'Today')}
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-full text-[var(--app-text-muted)] hover:bg-[var(--app-bg-deepest)] hover:text-[var(--app-text-primary)] transition-colors"
              aria-label={t('common.next', 'Next')}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-bold text-[var(--app-text-primary)]">
              {format(weekStart, 'MMM d', { locale })} – {format(weekEnd, 'MMM d, yyyy', { locale })}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--app-text-muted)]">
              {entries.length} {entries.length === 1 ? t('timeTracker.worklog', 'worklog') : t('timeTracker.worklogs', 'worklogs')}
            </span>
          </div>
        </div>


      </div>

      {/* Calendar */}
      <div
        className="flex-1 overflow-auto weekly-calendar-scroll"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`.weekly-calendar-scroll::-webkit-scrollbar { display: none; }`}</style>
        <div className="min-w-[720px]">
          {/* Day headers */}
          <div
            className="grid border-b border-[var(--app-border)] sticky top-0 z-10 bg-[var(--app-bg-card)]"
            style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}
          >
            <div className="py-3 border-r border-[var(--app-border)]" />
            {days.map((day, idx) => {
              const isToday = isSameDay(day, new Date())
              return (
                <div
                  key={idx}
                  className={cn(
                    'py-3 text-center border-r border-[var(--app-border)] last:border-r-0',
                    isToday && 'bg-[var(--app-accent)]/5'
                  )}
                >
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wider block',
                      isToday ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-muted)]'
                    )}
                  >
                    {format(day, 'EEE', { locale })}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-bold mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full',
                      isToday
                        ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]'
                        : 'text-[var(--app-text-primary)]'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div
            className="grid relative"
            style={{ gridTemplateColumns: '48px repeat(7, 1fr)', height: VISIBLE_HOURS * HOUR_HEIGHT }}
          >
            {/* Hour labels */}
            <div className="border-r border-[var(--app-border)] relative bg-[var(--app-bg-deepest)]/20">
              {Array.from({ length: VISIBLE_HOURS + 1 }).map((_, idx) => {
                const hour = START_HOUR + idx
                return (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 flex items-start justify-end pr-1 -mt-2"
                    style={{ top: idx * HOUR_HEIGHT }}
                  >
                    <span className="text-[10px] font-medium text-[var(--app-text-muted)]">
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Day columns */}
            {days.map((day, dayIdx) => {
              const isToday = isSameDay(day, new Date())
              const dayEntries = entriesByDay[dayIdx] || []

              return (
                <div
                  key={dayIdx}
                  className={cn(
                    'relative border-r border-[var(--app-border)] last:border-r-0',
                    isToday && 'bg-[var(--app-accent)]/5'
                  )}
                >
                  {/* Entries */}
                  {dayEntries.map((fragment, fragmentIdx) => {
                    const { entry, start, durationMinutes, continuesToNextDay, continuedFromPrevDay } = fragment
                    const startHour = start.getHours()
                    const startMinute = start.getMinutes()

                    const rawTop =
                      (startHour - START_HOUR) * HOUR_HEIGHT + (startMinute / 60) * HOUR_HEIGHT
                    const rawHeight = (durationMinutes / 60) * HOUR_HEIGHT

                    const top = Math.max(0, rawTop)
                    const height = Math.min(
                      VISIBLE_HOURS * HOUR_HEIGHT - top,
                      rawHeight + Math.min(0, rawTop)
                    )

                    if (height <= 4) return null

                    const palette = getEntryColor(entry.entryType, entry.approvalStatus)

                    const fullDurationMinutes = entry.endedAt
                      ? Math.max(0, Math.round((parseISO(entry.endedAt).getTime() - parseISO(entry.startedAt).getTime()) / 60000))
                      : durationMinutes

                    return (
                      <div
                        key={`${entry.id}-${fragmentIdx}`}
                        className={cn(
                          'absolute left-1 right-1 px-2 py-1 border-l-4 text-xs cursor-pointer overflow-hidden shadow-sm hover:z-10 hover:shadow-md transition-all',
                          'flex flex-col',
                          continuedFromPrevDay ? 'rounded-t-none' : 'rounded-t-md',
                          continuesToNextDay ? 'rounded-b-none' : 'rounded-b-md',
                          palette.bg,
                          palette.border,
                          palette.text
                        )}
                        style={{
                          top,
                          height,
                          minHeight: 24,
                        }}
                        title={`${entry.taskTitle}${entry.description ? ` – ${entry.description}` : ''}`}
                      >
                        {continuedFromPrevDay ? (
                          <div className="flex-1 flex items-center justify-center">
                            <ArrowUp size={12} className="opacity-80" />
                          </div>
                        ) : (
                          <>
                            <div className="font-semibold truncate leading-tight">
                              {entry.taskTitle}
                            </div>
                            <div className="text-[10px] opacity-90 truncate">
                              {formatMinutes(continuesToNextDay ? fullDurationMinutes : durationMinutes)}
                            </div>
                            {entry.description && height >= 52 && (
                              <div className="text-[10px] opacity-75 truncate mt-0.5 leading-tight">
                                {entry.description}
                              </div>
                            )}
                            {continuesToNextDay && (
                              <div className="mt-auto flex items-center justify-center">
                                <ArrowDown size={10} className="opacity-80" />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Loading / empty states */}
      {isLoading && (
        <div className="px-5 py-8 text-center text-sm text-[var(--app-text-muted)]">
          {t('common.loading', 'Loading…')}
        </div>
      )}
      {!isLoading && entries.length === 0 && (
        <div className="px-5 py-8 text-center border-t border-[var(--app-border)]">
          <p className="text-sm text-[var(--app-text-muted)]">
            {t('timeTracker.noTimeEntriesThisWeek', 'No time entries this week.')}
          </p>
        </div>
      )}

      {/* Footer summary */}
      <div className="px-5 py-4 border-t border-[var(--app-border)] bg-[var(--app-bg-deepest)]/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-[var(--app-accent)]" />
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--app-text-muted)]">
                {t('timeTracker.totalThisWeek', 'Total this week')}
              </p>
              <p className="text-lg font-bold text-[var(--app-text-primary)]">
                {formatMinutes(totalMinutes)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-[var(--app-text-muted)] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {t('timeTracker.pendingTask', 'Pending Task')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {t('timeTracker.approvedTask', 'Accepted Task')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              {t('timeTracker.pendingMeeting', 'Pending Meeting')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {t('timeTracker.approvedMeeting', 'Accepted Meeting')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
