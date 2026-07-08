import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useTimeEntries, useStopTimer, usePauseTimer, useResumeTimer } from '@/hooks/useTimeEntries'
import { Clock, Timer, Play, Pause, Square, ArrowRight } from 'lucide-react'
import type { DashboardPanelProps } from '@/lib/dashboard'
import type { TimeEntry } from '@/hooks/useTimeEntries'

function formatElapsed(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  const s = Math.floor((minutes * 60) % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function elapsedMinutes(entry: TimeEntry) {
  const startedAt = new Date(entry.startedAt).getTime()
  const now = Date.now()
  let elapsedMs = now - startedAt
  if (entry.pausedAt) {
    elapsedMs -= new Date(entry.pausedAt).getTime() - startedAt
  }
  elapsedMs -= (entry.totalPausedMinutes || 0) * 60 * 1000
  return Math.max(0, elapsedMs / 1000 / 60)
}

function ActiveTimerRow({ entry, workspaceSlug }: { entry: TimeEntry; workspaceSlug: string }) {
  const { t } = useTranslation()
  const [tick, setTick] = useState(0)
  const stopTimer = useStopTimer()
  const pauseTimer = usePauseTimer()
  const resumeTimer = useResumeTimer()
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 1000)
    return () => clearInterval(id)
  }, [entry.id])

  const minutes = useMemo(() => elapsedMinutes(entry) + tick * 0, [entry, tick])

  const handleAction = async (action: 'stop' | 'pause' | 'resume') => {
    setIsProcessing(true)
    try {
      if (action === 'stop') await stopTimer.mutateAsync({ entryId: entry.id, workspaceSlug })
      if (action === 'pause') await pauseTimer.mutateAsync({ entryId: entry.id, workspaceSlug })
      if (action === 'resume') await resumeTimer.mutateAsync({ entryId: entry.id, workspaceSlug })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
        <Timer size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--app-text-primary)]">
          {entry.taskTitle || entry.description || t('dashboard.generalTimer')}
        </p>
        <p className="font-mono text-lg font-semibold text-amber-500">{formatElapsed(minutes)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {entry.isPaused ? (
          <button
            type="button"
            onClick={() => handleAction('resume')}
            disabled={isProcessing}
            title={t('dashboard.resumeTimer')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-green-500 transition-colors hover:bg-green-500/10 disabled:opacity-50"
          >
            <Play size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleAction('pause')}
            disabled={isProcessing}
            title={t('dashboard.pauseTimer')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-500 transition-colors hover:bg-amber-500/10 disabled:opacity-50"
          >
            <Pause size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={() => handleAction('stop')}
          disabled={isProcessing}
          title={t('dashboard.stopTimer')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
        >
          <Square size={14} />
        </button>
      </div>
    </div>
  )
}

export function TimeTrackerPanel({ workspaceSlug }: DashboardPanelProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: entries = [], isLoading } = useTimeEntries(workspaceSlug, { activeOnly: true })

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-[var(--app-bg-card)] p-5">
        <div className="space-y-3">
          <div className="h-14 animate-pulse rounded-xl bg-gray-800/20" />
          <div className="h-14 animate-pulse rounded-xl bg-gray-800/20" />
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--app-bg-card)] p-5">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] py-8 text-center">
          <Clock size={32} className="mb-2 text-[var(--app-text-muted)]" />
          <p className="text-sm font-medium text-[var(--app-text-primary)]">
            {t('dashboard.noActiveTimers', 'Brak aktywnych timerów')}
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: `/${workspaceSlug}/time-tracker` })}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-amber-400"
          >
            {t('dashboard.openTimeTracker', 'Otwórz time tracker')}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-[var(--app-bg-card)] p-5">
      <div className="space-y-3">
        {entries.map((entry) => (
          <ActiveTimerRow key={entry.id} entry={entry} workspaceSlug={workspaceSlug} />
        ))}
        <button
          type="button"
          onClick={() => navigate({ to: `/${workspaceSlug}/time-tracker` })}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text-primary)]"
        >
          {t('dashboard.viewAllTimers', 'Zobacz wszystkie timery')}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
