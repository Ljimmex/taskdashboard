import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { AlignLeft, Calendar, CheckSquare, ChevronDown, Clock, Loader2, Pencil, Trash2, X } from 'lucide-react'
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
  const safeDate = Number.isNaN(date.getTime()) ? new Date(Date.now() + fallbackMinutes * 60000) : date

  return {
    date: `${safeDate.getFullYear()}-${String(safeDate.getMonth() + 1).padStart(2, '0')}-${String(safeDate.getDate()).padStart(2, '0')}`,
    time: `${String(safeDate.getHours()).padStart(2, '0')}:${String(safeDate.getMinutes()).padStart(2, '0')}`,
  }
}

function TimeSelect({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
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
      <label className="block text-[11px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider mb-2 pl-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-[var(--app-bg-elevated)] border rounded-xl text-left transition-all outline-none ${
          open ? 'border-[var(--app-accent)] ring-1 ring-[var(--app-accent)]/20 shadow-lg' : 'border-[var(--app-divider)] hover:border-[var(--app-text-muted)]'
        }`}
      >
        <span className="font-mono text-[var(--app-text-primary)] font-semibold">{value}</span>
        <Clock size={18} className={open ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-muted)]'} />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-2 bg-[var(--app-bg-card)] border border-[var(--app-divider)] rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar overflow-hidden backdrop-blur-xl">
          <div className="p-1">
            {times.map((timeOption) => (
              <button
                key={timeOption}
                type="button"
                onClick={() => {
                  onChange(timeOption)
                  setOpen(false)
                }}
                className={`w-full px-4 py-2 text-left font-mono text-sm rounded-lg transition-colors ${
                  value === timeOption
                    ? 'text-[var(--app-accent)] font-bold bg-[var(--app-accent)]/10'
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
    const endSource = entry.endedAt || new Date(new Date(entry.startedAt).getTime() + entry.rawDurationMinutes * 60000).toISOString()
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
      if (modalRef.current && !modalRef.current.contains(event.target as Node) && !isSaving && !isDeleting) {
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
    queryFn: () => apiFetchJson<{ success: boolean; data: MyTask[] }>(`/api/time/my-tasks?workspaceSlug=${workspaceSlug}&targetUserId=${ownerUserId}`),
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl bg-[var(--app-bg-card)] border border-[var(--app-divider)] rounded-t-3xl rounded-b-none sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[var(--app-divider)]">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[var(--app-accent)]/10 flex items-center justify-center text-[var(--app-accent)] flex-shrink-0">
              <Pencil size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-[var(--app-text-primary)]">
                {t('timeTracker.editPendingEntryTitle', 'Edytuj wpis oczekujący')}
              </h2>
              <p className="text-sm text-[var(--app-text-muted)] mt-1">
                {t('timeTracker.editPendingEntrySubtitle', 'Zmień szczegóły wpisu przed jego zatwierdzeniem lub usuń go z listy aktywności.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isDeleting}
            className="p-2 rounded-xl hover:bg-[var(--app-bg-elevated)] text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="rounded-2xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)]/40 p-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-black uppercase tracking-[0.18em]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {t('timeTracker.history.pending', 'Oczekujące')}
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--app-bg-card)] border border-[var(--app-divider)] text-[10px] font-black uppercase tracking-[0.18em] text-[var(--app-text-muted)]">
                {selectedEntryType === 'meeting' ? <Calendar size={12} /> : <CheckSquare size={12} />}
                {selectedEntryType === 'meeting' ? t('timeTracker.isMeeting', 'Spotkanie') : t('timeTracker.task', 'Zadanie')}
              </span>
            </div>
            <h3 className="text-base font-bold text-[var(--app-text-primary)] truncate">
              {selectedTask
                ? selectedSubtask
                  ? `${selectedTask.title} / ${selectedSubtask.title}`
                  : selectedMeeting
                    ? `${selectedTask.title} / ${selectedMeeting.title}`
                    : selectedTask.title
                : entry.taskTitle}
            </h3>
            <p className="text-xs text-[var(--app-text-muted)] mt-1">
              {t('timeTracker.pendingEntryModalHint', 'Możesz edytować wyłącznie własne wpisy ze statusem pending.')}
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider mb-2 pl-1">
              {t('timeTracker.selectTask', 'Zadanie lub Spotkanie')}
            </label>
            <div className="relative" ref={taskRef}>
              <button
                type="button"
                onClick={() => setTaskDropdownOpen(!taskDropdownOpen)}
                disabled={tasksLoading}
                className={`w-full flex items-center justify-between px-4 py-3 bg-[var(--app-bg-elevated)] border rounded-xl text-left transition-all outline-none ${
                  taskDropdownOpen
                    ? 'border-[var(--app-accent)] ring-1 ring-[var(--app-accent)]/20 shadow-lg'
                    : 'border-[var(--app-divider)] hover:border-[var(--app-text-muted)]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CheckSquare size={18} className="text-[var(--app-text-muted)] flex-shrink-0" />
                  {selectedTask ? (
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-[var(--app-text-primary)] truncate">
                        {selectedTask.title}
                      </span>
                      <span className="text-xs text-[var(--app-text-muted)] mt-0.5 truncate flex items-center gap-1">
                        {selectedTask.projectName}
                        {selectedEntryType === 'meeting' && selectedMeeting && (
                          <span className="text-[var(--app-accent)] flex items-center gap-1">
                            <span className="mx-1">•</span> <Calendar size={10} /> {selectedMeeting.title}
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
                    <span className="text-[var(--app-text-muted)] font-medium">
                      {tasksLoading ? t('common.loading', 'Ładowanie zadań...') : t('timeTracker.manual.pickTask', 'Wybierz nad czym pracowałeś...')}
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={18}
                  className={`text-[var(--app-text-muted)] flex-shrink-0 transition-transform duration-200 ${taskDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {taskDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-[var(--app-bg-card)] border border-[var(--app-divider)] rounded-xl shadow-xl max-h-80 overflow-y-auto custom-scrollbar overflow-hidden">
                  {myTasks.length === 0 ? (
                    <div className="p-6 text-center text-sm font-medium text-[var(--app-text-muted)]">
                      {t('timeTracker.timer.noTasks', 'Brak przypisanych zadań.')}
                    </div>
                  ) : (
                    <div className="py-2">
                      {/* TASKS */}
                      {myTasks.filter(t => t.id !== 'standalone-meetings').length > 0 && (
                        <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] bg-[var(--app-bg-elevated)]/50">
                          {t('timeTracker.tasksHeader', 'Zadania Projektowe')}
                        </div>
                      )}

                      {myTasks.filter(t => t.id !== 'standalone-meetings').map((task: MyTask) => (
                        <div key={task.id} className="border-b border-[var(--app-divider)] last:border-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTaskId(task.id)
                              setSelectedSubtaskId(null)
                              setSelectedMeetingId(null)
                              setSelectedEntryType('task')
                              setTaskDropdownOpen(false)
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-[var(--app-bg-deepest)] flex flex-col transition-colors ${
                              selectedTaskId === task.id && !selectedSubtaskId ? 'bg-[var(--app-accent)]/5 text-[var(--app-accent)]' : ''
                            }`}
                          >
                            <span className="font-semibold text-sm text-[var(--app-text-primary)] group-hover:text-[var(--app-accent)] transition-colors">{task.title}</span>
                            <span className="text-[11px] font-medium text-[var(--app-text-muted)] mt-0.5">{task.projectName}</span>
                          </button>

                          {/* Subtasks */}
                          {task.subtasks.length > 0 && (
                            <div className="bg-[var(--app-bg-elevated)]/30 pb-2 border-l-2 border-l-[var(--app-divider)] ml-4 mr-2 mb-2 rounded-r-lg">
                              {task.subtasks.map(sub => (
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
                                  className={`w-full px-4 py-2 pl-8 text-left hover:bg-[var(--app-bg-elevated)] flex items-center gap-2 text-sm transition-colors ${
                                    selectedSubtaskId === sub.id ? 'bg-[var(--app-accent)]/5 text-[var(--app-accent)]' : ''
                                  }`}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--app-divider)] group-hover:bg-[var(--app-accent)] transition-colors" />
                                  <span className="text-[var(--app-text-secondary)] font-medium text-[13px]">{sub.title}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* MEETINGS */}
                      {myTasks.find(t => t.id === 'standalone-meetings') && (
                        <>
                          <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] bg-[var(--app-bg-elevated)]/50 border-t border-[var(--app-divider)]">
                            {t('timeTracker.meetingsHeader', 'Spotkania i Wydarzenia')}
                          </div>
                          <div>
                            {myTasks.find(t => t.id === 'standalone-meetings')?.meetings?.map((m: any) => (
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
                                className="w-full px-4 py-3 text-left hover:bg-[var(--app-bg-elevated)] flex items-center gap-3 border-b border-[var(--app-divider)] last:border-0 transition-colors"
                              >
                                <div className="p-1.5 rounded-md bg-[var(--app-accent)]/10 text-[var(--app-accent)]">
                                  <Calendar size={14} />
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="font-semibold text-sm text-[var(--app-text-primary)] truncate">{m.title}</span>
                                  <span className="text-[10px] font-medium text-[var(--app-text-muted)] mt-0.5">{new Date(m.date).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}</span>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider mb-2 pl-1">
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
            <label className="block text-[11px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider mb-2 pl-1 flex items-center gap-2">
              <AlignLeft size={12} />
              {t('timeTracker.description', 'Opis')}
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('timeTracker.descriptionPlaceholderManual', 'Opisz co zostało wykonane...')}
              rows={4}
              className="w-full bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] rounded-xl px-4 py-3 text-sm text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)] focus:ring-1 focus:ring-[var(--app-accent)]/20 transition-all resize-none placeholder:text-[var(--app-text-muted)]/50"
            />
          </div>

          <div className={`flex items-center justify-between p-5 rounded-2xl transition-all duration-300 ${
            durationMinutes > 0
              ? 'bg-gradient-to-r from-[var(--app-bg-elevated)] to-[var(--app-accent)]/10 border border-[var(--app-accent)]/20 shadow-[0_4px_12px_rgba(242,206,136,0.06)]'
              : 'bg-gradient-to-r from-[var(--app-bg-elevated)] to-[var(--app-bg-deepest)] border border-transparent'
          }`}>
            <div>
              <div className="text-sm font-semibold text-[var(--app-text-secondary)]">
                {t('timeTracker.manual.durationAuto', 'Podsumowanie czasu')}
              </div>
              {selectedEntryType === 'meeting' && (
                <div className="text-xs text-[var(--app-text-muted)] mt-1">
                  {t('timeTracker.meetingContributionNote', 'Spotkania zachowuja ten sam czas logowania, ale licza sie z mnoznikiem 50% w punktach wkładu.')}
                </div>
              )}
            </div>
            <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all duration-300 ${
              durationMinutes > 0
                ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)] border-[var(--app-accent)] shadow-md'
                : 'bg-[var(--app-bg-card)] text-[var(--app-text-muted)] border-[var(--app-divider)]'
            }`}>
              <Clock size={18} />
              <span className="text-xl font-bold font-mono tracking-tight">{formatMinutes(durationMinutes)}</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 border-t border-[var(--app-divider)] bg-[var(--app-bg-card)]/80 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            type="button"
            onClick={onDelete}
            disabled={isSaving || isDeleting}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 font-bold hover:bg-rose-500/15 transition-colors disabled:opacity-50"
          >
            {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            {t('timeTracker.deletePendingEntry', 'Usuń wpis')}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="px-4 py-3 bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] rounded-xl font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-card)] transition-colors disabled:opacity-50"
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
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--app-accent)] text-[var(--app-accent-text)] font-bold hover:bg-[var(--app-accent-hover)] transition-all shadow-sm disabled:opacity-50"
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
