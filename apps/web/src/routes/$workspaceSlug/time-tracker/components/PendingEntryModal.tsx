import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  ChevronDown,
  Clock,
  Loader2,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DueDatePicker } from '@/components/features/tasks/components/DueDatePicker'
import { apiFetchJson } from '@/lib/api'
import { formatMinutes } from './utils'
import { MyTask } from './types'

export interface PendingRecentEntry {
  id: string
  userId: string
  taskId: string | null
  subtaskId: string | null
  taskTitle: string
  description: string | null
  startedAt: string
  endedAt: string | null
  rawDurationMinutes: number
  entryType: 'task' | 'meeting'
  approvalStatus: string
}

interface PendingEntryModalProps {
  isOpen: boolean
  entry: PendingRecentEntry | null
  workspaceSlug: string
  ownerUserId: string
  isSaving: boolean
  isDeleting: boolean
  onClose: () => void
  onSave: (payload: {
    description: string
    durationMinutes: number
    startedAt: string
    endedAt: string
    entryType: 'task' | 'meeting'
    taskId: string | null
    subtaskId: string | null
  }) => void
  onDelete: () => void
}

function toLocalDateParts(input: string, fallbackMinutes = 0) {
  const date = new Date(input)
  const safeDate = Number.isNaN(date.getTime())
    ? new Date(Date.now() + fallbackMinutes * 60000)
    : date

  return {
    date: `${safeDate.getFullYear()}-${String(safeDate.getMonth() + 1).padStart(2, '0')}-${String(safeDate.getDate()).padStart(2, '0')}`,
    time: `${String(safeDate.getHours()).padStart(2, '0')}:${String(safeDate.getMinutes()).padStart(2, '0')}`,
  }
}

function TimeSelect({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const times = useMemo(() => {
    const options: string[] = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        options.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
      }
    }
    return options
  }, [])

  return (
    <div className="relative" ref={ref}>
      <label className="mb-2 block pl-1 text-[11px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between rounded-xl border bg-[var(--app-bg-elevated)] px-4 py-3 text-left outline-none transition-all ${
          open
            ? 'ring-[var(--app-accent)]/20 border-[var(--app-accent)] shadow-lg ring-1'
            : 'border-[var(--app-divider)] hover:border-[var(--app-text-muted)]'
        }`}
      >
        <span className="font-mono font-semibold text-[var(--app-text-primary)]">{value}</span>
        <Clock
          size={18}
          className={open ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-muted)]'}
        />
      </button>
      {open && (
        <div className="custom-scrollbar absolute z-50 mt-2 max-h-60 w-full overflow-hidden overflow-y-auto rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] shadow-xl backdrop-blur-xl">
          <div className="p-1">
            {times.map((timeOption) => (
              <button
                key={timeOption}
                type="button"
                onClick={() => {
                  onChange(timeOption)
                  setOpen(false)
                }}
                className={`w-full rounded-lg px-4 py-2 text-left font-mono text-sm transition-colors ${
                  value === timeOption
                    ? 'bg-[var(--app-accent)]/10 font-bold text-[var(--app-accent)]'
                    : 'text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)]'
                }`}
              >
                {timeOption}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function PendingEntryModal({
  isOpen,
  entry,
  workspaceSlug,
  ownerUserId,
  isSaving,
  isDeleting,
  onClose,
  onSave,
  onDelete,
}: PendingEntryModalProps) {
  const { t } = useTranslation()
  const modalRef = useRef<HTMLDivElement>(null)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null)
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [selectedEntryType, setSelectedEntryType] = useState<'task' | 'meeting'>('task')
  const [taskDropdownOpen, setTaskDropdownOpen] = useState(false)
  const taskRef = useRef<HTMLDivElement>(null)
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!isOpen || !entry) return

    const start = toLocalDateParts(entry.startedAt)
    const endSource =
      entry.endedAt ||
      new Date(new Date(entry.startedAt).getTime() + entry.rawDurationMinutes * 60000).toISOString()
    const end = toLocalDateParts(endSource, entry.rawDurationMinutes)

    setDate(start.date)
    setStartTime(start.time)
    setEndTime(end.time)
    setDescription(entry.description || '')

    // Resolve initial task/meeting selection from the entry (matches ManualEntry semantics)
    if (entry.taskId === 'standalone-meetings') {
      setSelectedTaskId('standalone-meetings')
      setSelectedSubtaskId(null)
      setSelectedMeetingId(null)
      setSelectedEntryType('meeting')
    } else if (entry.taskId) {
      setSelectedTaskId(entry.taskId)
      setSelectedSubtaskId(entry.subtaskId)
      setSelectedMeetingId(null)
      setSelectedEntryType('task')
    } else {
      setSelectedTaskId(null)
      setSelectedSubtaskId(null)
      setSelectedMeetingId(null)
      setSelectedEntryType('meeting')
    }
  }, [entry, isOpen])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving && !isDeleting) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isDeleting, isOpen, isSaving, onClose])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (taskRef.current && !taskRef.current.contains(event.target as Node)) {
        setTaskDropdownOpen(false)
      }
    }

    if (taskDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [taskDropdownOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !isSaving &&
        !isDeleting
      ) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDeleting, isOpen, isSaving, onClose])

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['my-tasks', workspaceSlug, ownerUserId],
    queryFn: () =>
      apiFetchJson<{ success: boolean; data: MyTask[] }>(
        `/api/time/my-tasks?workspaceSlug=${workspaceSlug}&targetUserId=${ownerUserId}`
      ),
    enabled: !!workspaceSlug && !!ownerUserId,
  })
  const myTasks = (tasksData?.data || []).filter((t: MyTask) => t.status !== 'done')
  const selectedTask = myTasks.find((t: MyTask) => t.id === selectedTaskId)
  const selectedMeeting = selectedTask?.meetings?.find((m: any) => m.id === selectedMeetingId)
  const selectedSubtask = selectedTask?.subtasks.find((s: any) => s.id === selectedSubtaskId)

  const durationMinutes = useMemo(() => {
    if (!date || !startTime || !endTime) return 0

    const start = new Date(`${date}T${startTime}`)
    let end = new Date(`${date}T${endTime}`)

    if (end <= start) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
    }

    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
  }, [date, endTime, startTime])

  if (!isOpen || !entry) return null

  return createPortal(
    <div className="animate-in fade-in fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm duration-200 sm:items-center sm:p-4">
      <div
        ref={modalRef}
        className="animate-in slide-in-from-bottom sm:zoom-in-95 relative w-full max-w-2xl overflow-hidden rounded-b-none rounded-t-3xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] shadow-2xl duration-200 sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--app-divider)] px-6 py-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className="bg-[var(--app-accent)]/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-[var(--app-accent)]">
              <Pencil size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-[var(--app-text-primary)]">
                {t('timeTracker.editPendingEntryTitle', 'Edytuj wpis oczekujący')}
              </h2>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                {t(
                  'timeTracker.editPendingEntrySubtitle',
                  'Zmień szczegóły wpisu przed jego zatwierdzeniem lub usuń go z listy aktywności.'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isDeleting}
            className="rounded-xl p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="bg-[var(--app-bg-elevated)]/40 rounded-2xl border border-[var(--app-divider)] p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-500">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                {t('timeTracker.history.pending', 'Oczekujące')}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--app-divider)] bg-[var(--app-bg-card)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--app-text-muted)]">
                {selectedEntryType === 'meeting' ? (
                  <Calendar size={12} />
                ) : (
                  <CheckSquare size={12} />
                )}
                {selectedEntryType === 'meeting'
                  ? t('timeTracker.isMeeting', 'Spotkanie')
                  : t('timeTracker.task', 'Zadanie')}
              </span>
            </div>
            <h3 className="truncate text-base font-bold text-[var(--app-text-primary)]">
              {selectedTask
                ? selectedSubtask
                  ? `${selectedTask.title} / ${selectedSubtask.title}`
                  : selectedMeeting
                    ? `${selectedTask.title} / ${selectedMeeting.title}`
                    : selectedTask.title
                : entry.taskTitle}
            </h3>
            <p className="mt-1 text-xs text-[var(--app-text-muted)]">
              {t(
                'timeTracker.pendingEntryModalHint',
                'Możesz edytować wyłącznie własne wpisy ze statusem pending.'
              )}
            </p>
          </div>

          <div>
            <label className="mb-2 block pl-1 text-[11px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
              {t('timeTracker.selectTask', 'Zadanie lub Spotkanie')}
            </label>
            <div className="relative" ref={taskRef}>
              <button
                type="button"
                onClick={() => setTaskDropdownOpen(!taskDropdownOpen)}
                disabled={tasksLoading}
                className={`flex w-full items-center justify-between rounded-xl border bg-[var(--app-bg-elevated)] px-4 py-3 text-left outline-none transition-all ${
                  taskDropdownOpen
                    ? 'ring-[var(--app-accent)]/20 border-[var(--app-accent)] shadow-lg ring-1'
                    : 'border-[var(--app-divider)] hover:border-[var(--app-text-muted)]'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CheckSquare size={18} className="flex-shrink-0 text-[var(--app-text-muted)]" />
                  {selectedTask ? (
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold text-[var(--app-text-primary)]">
                        {selectedTask.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-[var(--app-text-muted)]">
                        {selectedTask.projectName}
                        {selectedEntryType === 'meeting' && selectedMeeting && (
                          <span className="flex items-center gap-1 text-[var(--app-accent)]">
                            <span className="mx-1">•</span> <Calendar size={10} />{' '}
                            {selectedMeeting.title}
                          </span>
                        )}
                        {selectedEntryType === 'task' && selectedSubtask && (
                          <span className="text-[var(--app-accent)]">
                            <span className="mx-1 text-[var(--app-text-muted)]">/</span>
                            {selectedSubtask.title}
                          </span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <span className="font-medium text-[var(--app-text-muted)]">
                      {tasksLoading
                        ? t('common.loading', 'Ładowanie zadań...')
                        : t('timeTracker.manual.pickTask', 'Wybierz nad czym pracowałeś...')}
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={18}
                  className={`flex-shrink-0 text-[var(--app-text-muted)] transition-transform duration-200 ${taskDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {taskDropdownOpen && (
                <div className="custom-scrollbar absolute z-50 mt-2 max-h-80 w-full overflow-hidden overflow-y-auto rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] shadow-xl">
                  {myTasks.length === 0 ? (
                    <div className="p-6 text-center text-sm font-medium text-[var(--app-text-muted)]">
                      {t('timeTracker.timer.noTasks', 'Brak przypisanych zadań.')}
                    </div>
                  ) : (
                    <div className="py-2">
                      {/* TASKS */}
                      {myTasks.filter((t) => t.id !== 'standalone-meetings').length > 0 && (
                        <div className="bg-[var(--app-bg-elevated)]/50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                          {t('timeTracker.tasksHeader', 'Zadania Projektowe')}
                        </div>
                      )}

                      {myTasks
                        .filter((t) => t.id !== 'standalone-meetings')
                        .map((task: MyTask) => (
                          <div
                            key={task.id}
                            className="border-b border-[var(--app-divider)] last:border-0"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTaskId(task.id)
                                setSelectedSubtaskId(null)
                                setSelectedMeetingId(null)
                                setSelectedEntryType('task')
                                setTaskDropdownOpen(false)
                              }}
                              className={`flex w-full flex-col px-4 py-3 text-left transition-colors hover:bg-[var(--app-bg-deepest)] ${
                                selectedTaskId === task.id && !selectedSubtaskId
                                  ? 'bg-[var(--app-accent)]/5 text-[var(--app-accent)]'
                                  : ''
                              }`}
                            >
                              <span className="text-sm font-semibold text-[var(--app-text-primary)] transition-colors group-hover:text-[var(--app-accent)]">
                                {task.title}
                              </span>
                              <span className="mt-0.5 text-[11px] font-medium text-[var(--app-text-muted)]">
                                {task.projectName}
                              </span>
                            </button>

                            {/* Subtasks */}
                            {task.subtasks.length > 0 && (
                              <div className="bg-[var(--app-bg-elevated)]/30 mb-2 ml-4 mr-2 rounded-r-lg border-l-2 border-l-[var(--app-divider)] pb-2">
                                {task.subtasks.map((sub) => (
                                  <button
                                    type="button"
                                    key={sub.id}
                                    onClick={() => {
                                      setSelectedTaskId(task.id)
                                      setSelectedSubtaskId(sub.id)
                                      setSelectedMeetingId(null)
                                      setSelectedEntryType('task')
                                      setTaskDropdownOpen(false)
                                    }}
                                    className={`flex w-full items-center gap-2 px-4 py-2 pl-8 text-left text-sm transition-colors hover:bg-[var(--app-bg-elevated)] ${
                                      selectedSubtaskId === sub.id
                                        ? 'bg-[var(--app-accent)]/5 text-[var(--app-accent)]'
                                        : ''
                                    }`}
                                  >
                                    <div className="h-1.5 w-1.5 rounded-full bg-[var(--app-divider)] transition-colors group-hover:bg-[var(--app-accent)]" />
                                    <span className="text-[13px] font-medium text-[var(--app-text-secondary)]">
                                      {sub.title}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}

                      {/* MEETINGS */}
                      {myTasks.find((t) => t.id === 'standalone-meetings') && (
                        <>
                          <div className="bg-[var(--app-bg-elevated)]/50 border-t border-[var(--app-divider)] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                            {t('timeTracker.meetingsHeader', 'Spotkania i Wydarzenia')}
                          </div>
                          <div>
                            {myTasks
                              .find((t) => t.id === 'standalone-meetings')
                              ?.meetings?.map((m: any) => (
                                <button
                                  type="button"
                                  key={m.id}
                                  onClick={() => {
                                    setSelectedTaskId('standalone-meetings')
                                    setSelectedSubtaskId(null)
                                    setSelectedMeetingId(m.id)
                                    setSelectedEntryType('meeting')
                                    setTaskDropdownOpen(false)
                                  }}
                                  className="flex w-full items-center gap-3 border-b border-[var(--app-divider)] px-4 py-3 text-left transition-colors last:border-0 hover:bg-[var(--app-bg-elevated)]"
                                >
                                  <div className="bg-[var(--app-accent)]/10 rounded-md p-1.5 text-[var(--app-accent)]">
                                    <Calendar size={14} />
                                  </div>
                                  <div className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate text-sm font-semibold text-[var(--app-text-primary)]">
                                      {m.title}
                                    </span>
                                    <span className="mt-0.5 text-[10px] font-medium text-[var(--app-text-muted)]">
                                      {new Date(m.date).toLocaleString('pl-PL', {
                                        dateStyle: 'short',
                                        timeStyle: 'short',
                                      })}
                                    </span>
                                  </div>
                                </button>
                              ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block pl-1 text-[11px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                {t('timeTracker.manual.date', 'Data')}
              </label>
              <DueDatePicker
                value={date}
                onChange={(value) => {
                  if (value) setDate(value.split('T')[0])
                }}
                className="w-full"
                triggerClassName="w-full px-4 py-3 bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] hover:border-[var(--app-text-muted)] rounded-xl outline-none transition-all font-mono text-[var(--app-text-primary)] flex items-center justify-between font-semibold"
              />
            </div>
            <TimeSelect
              label={t('timeTracker.manual.startTime', 'Czas rozpoczęcia')}
              value={startTime}
              onChange={setStartTime}
            />
            <TimeSelect
              label={t('timeTracker.manual.endTime', 'Czas zakończenia')}
              value={endTime}
              onChange={setEndTime}
            />
          </div>

          <div>
            <label className="mb-2 block flex items-center gap-2 pl-1 text-[11px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
              <AlignLeft size={12} />
              {t('timeTracker.description', 'Opis')}
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t(
                'timeTracker.descriptionPlaceholderManual',
                'Opisz co zostało wykonane...'
              )}
              rows={4}
              className="focus:ring-[var(--app-accent)]/20 placeholder:text-[var(--app-text-muted)]/50 w-full resize-none rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] px-4 py-3 text-sm text-[var(--app-text-primary)] outline-none transition-all focus:border-[var(--app-accent)] focus:ring-1"
            />
          </div>

          <div
            className={`flex items-center justify-between rounded-2xl p-5 transition-all duration-300 ${
              durationMinutes > 0
                ? 'to-[var(--app-accent)]/10 border-[var(--app-accent)]/20 border bg-gradient-to-r from-[var(--app-bg-elevated)] shadow-[0_4px_12px_rgba(242,206,136,0.06)]'
                : 'border border-transparent bg-gradient-to-r from-[var(--app-bg-elevated)] to-[var(--app-bg-deepest)]'
            }`}
          >
            <div>
              <div className="text-sm font-semibold text-[var(--app-text-secondary)]">
                {t('timeTracker.manual.durationAuto', 'Podsumowanie czasu')}
              </div>
              {selectedEntryType === 'meeting' && (
                <div className="mt-1 text-xs text-[var(--app-text-muted)]">
                  {t(
                    'timeTracker.meetingContributionNote',
                    'Spotkania zachowuja ten sam czas logowania, ale licza sie z mnoznikiem 50% w punktach wkładu.'
                  )}
                </div>
              )}
            </div>
            <div
              className={`flex items-center gap-2.5 rounded-xl border px-4 py-2 transition-all duration-300 ${
                durationMinutes > 0
                  ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-[var(--app-accent-text)] shadow-md'
                  : 'border-[var(--app-divider)] bg-[var(--app-bg-card)] text-[var(--app-text-muted)]'
              }`}
            >
              <Clock size={18} />
              <span className="font-mono text-xl font-bold tracking-tight">
                {formatMinutes(durationMinutes)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--app-bg-card)]/80 flex flex-col-reverse gap-3 border-t border-[var(--app-divider)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onDelete}
            disabled={isSaving || isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 font-bold text-rose-500 transition-colors hover:bg-rose-500/15 disabled:opacity-50"
          >
            {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            {t('timeTracker.deletePendingEntry', 'Usuń wpis')}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] px-4 py-3 font-medium text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-card)] hover:text-[var(--app-text-primary)] disabled:opacity-50"
            >
              {t('common.cancel', 'Anuluj')}
            </button>
            <button
              type="button"
              disabled={!selectedTaskId || durationMinutes <= 0 || isSaving || isDeleting}
              onClick={() => {
                const start = new Date(`${date}T${startTime}`)
                let end = new Date(`${date}T${endTime}`)

                if (end <= start) {
                  end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
                }

                onSave({
                  description,
                  durationMinutes,
                  startedAt: start.toISOString(),
                  endedAt: end.toISOString(),
                  entryType: selectedEntryType,
                  taskId: selectedTaskId,
                  subtaskId: selectedSubtaskId,
                })
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--app-accent)] px-5 py-3 font-bold text-[var(--app-accent-text)] shadow-sm transition-all hover:bg-[var(--app-accent-hover)] disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Calendar size={18} />}
              {t('timeTracker.savePendingEntry', 'Zapisz zmiany')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
