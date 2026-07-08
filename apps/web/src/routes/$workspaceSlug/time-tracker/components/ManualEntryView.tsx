import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetchJson } from '@/lib/api'
import { ChevronDown, Clock, Calendar, User, CheckSquare, AlignLeft, Plus } from 'lucide-react'
import { DueDatePicker } from '@/components/features/tasks/components/DueDatePicker'
import { MyTask } from './types'
import { formatMinutes } from './utils'
import { toast } from '@/hooks/useToast'
import { sidebarIcons } from '@/components/dashboard/icons/SidebarIcons'

function TimeSelect({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const times = useMemo(() => {
    const arr = []
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        arr.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
      }
    }
    return arr
  }, [])

  return (
    <div className="relative" ref={ref}>
      <label className="mb-2 block pl-1 text-[11px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
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
            {times.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onChange(t)
                  setOpen(false)
                }}
                className={`w-full rounded-lg px-4 py-2 text-left font-mono text-sm transition-colors ${
                  value === t
                    ? 'bg-[var(--app-accent)]/10 font-bold text-[var(--app-accent)]'
                    : 'text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ManualEntryView({
  workspaceSlug,
  userId,
  canManage,
}: {
  workspaceSlug: string
  userId: string
  canManage: boolean
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [selectedUserId, setSelectedUserId] = useState<string>(userId)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null)
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [selectedEntryType, setSelectedEntryType] = useState<'task' | 'meeting'>('task')
  const [taskDropdownOpen, setTaskDropdownOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [description, setDescription] = useState('')
  const taskRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (taskRef.current && !taskRef.current.contains(e.target as Node)) {
        setTaskDropdownOpen(false)
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Time state
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState<string>('09:00')
  const [endTime, setEndTime] = useState<string>('17:00')

  // Fetch workspace members
  const { data: membersData } = useQuery({
    queryKey: ['workspace-members', workspaceSlug],
    queryFn: () =>
      apiFetchJson<{ success: boolean; data: any[] }>(`/api/workspaces/${workspaceSlug}/members`),
    enabled: !!workspaceSlug && canManage,
    refetchInterval: 5000,
  })
  const members = membersData?.data || []

  // Fetch tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['my-tasks', workspaceSlug, selectedUserId],
    queryFn: () =>
      apiFetchJson<{ success: boolean; data: MyTask[] }>(
        `/api/time/my-tasks?workspaceSlug=${workspaceSlug}&targetUserId=${selectedUserId}`
      ),
    enabled: !!workspaceSlug && !!selectedUserId,
  })
  const myTasks = (tasksData?.data || []).filter((t: MyTask) => t.status !== 'done')
  const selectedTask = myTasks.find((t: MyTask) => t.id === selectedTaskId)
  const selectedMeeting = selectedTask?.meetings?.find((m: any) => m.id === selectedMeetingId)

  // Calculate duration
  const durationMinutes = useMemo(() => {
    if (!date || !startTime || !endTime) return 0
    const start = new Date(`${date}T${startTime}`)
    let end = new Date(`${date}T${endTime}`)
    if (end < start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
  }, [date, startTime, endTime])

  const manualMutation = useMutation({
    mutationFn: (body: any) =>
      apiFetchJson<{ success: boolean; data: any }>('/api/time', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (res) => {
      if (res.success) {
        setSelectedTaskId(null)
        setSelectedSubtaskId(null)
        setDescription('')
        queryClient.invalidateQueries({ queryKey: ['my-time-entries'] })
        queryClient.invalidateQueries({ queryKey: ['project-time-entries'] })
        queryClient.invalidateQueries({ queryKey: ['revshare'] })
        toast.success(t('timeTracker.manualEntrySuccess', 'Wpis dodany pomyślnie!'))
      }
    },
    onError: () => {
      toast.error(t('timeTracker.manualEntryError', 'Błąd podczas dodawania wpisu.'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTaskId || durationMinutes <= 0) return

    const start = new Date(`${date}T${startTime}`)
    let end = new Date(`${date}T${endTime}`)
    if (end < start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000)

    manualMutation.mutate({
      taskId: selectedTaskId,
      subtaskId: selectedSubtaskId,
      userId: selectedUserId,
      workspaceSlug,
      entryType: selectedEntryType,
      description,
      durationMinutes,
      startedAt: start.toISOString(),
      endedAt: end.toISOString(),
    })
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-2xl space-y-6 duration-500">
      <div className="rounded-3xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] p-6 shadow-sm md:p-8">
        <div className="mb-8 flex flex-col items-center border-b border-[var(--app-divider)] pb-6 text-center">
          <div className="mb-2 flex items-center gap-3">
            <div className="bg-[var(--app-accent)]/10 flex h-10 w-10 items-center justify-center rounded-xl text-[var(--app-accent)]">
              {sidebarIcons.timetracker.gold}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--app-text-primary)]">
              {t('timeTracker.manual.title', 'Dodaj czas ręcznie')}
            </h2>
          </div>
          <p className="mt-1.5 max-w-sm text-sm text-[var(--app-text-muted)]">
            {t(
              'timeTracker.manual.subtitle',
              'Uzupełnij brakujące godziny pracy wybierając zadanie i przedział czasowy.'
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {canManage && (
            <div>
              <label className="mb-2 block pl-1 text-[11px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                {t('timeTracker.manual.user', 'Użytkownik')}
              </label>
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`flex w-full items-center justify-between rounded-xl border bg-[var(--app-bg-elevated)] px-4 py-3 text-left outline-none transition-all ${
                    userDropdownOpen
                      ? 'ring-[var(--app-accent)]/20 border-[var(--app-accent)] shadow-lg ring-1'
                      : 'border-[var(--app-divider)] hover:border-[var(--app-text-muted)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <User size={18} className="text-[var(--app-text-muted)]" />
                    <span className="font-semibold text-[var(--app-text-primary)]">
                      {members.find((m: any) => m.user?.id === selectedUserId)?.user?.name ||
                        selectedUserId}
                    </span>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-[var(--app-text-muted)] transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {userDropdownOpen && (
                  <div className="custom-scrollbar absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] p-1 shadow-xl">
                    {members.map((m: any) => (
                      <button
                        key={m.user?.id}
                        type="button"
                        onClick={() => {
                          setSelectedUserId(m.user?.id)
                          setSelectedTaskId(null)
                          setSelectedSubtaskId(null)
                          setUserDropdownOpen(false)
                        }}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left font-medium transition-colors hover:bg-[var(--app-bg-deepest)] ${
                          selectedUserId === m.user?.id
                            ? 'bg-[var(--app-accent)]/5 text-[var(--app-accent)]'
                            : 'text-[var(--app-text-primary)]'
                        }`}
                      >
                        <span>{m.user?.name || m.user?.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

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
                        {selectedEntryType === 'task' &&
                          selectedSubtaskId &&
                          selectedTask.subtasks.find((s: any) => s.id === selectedSubtaskId) && (
                            <span className="text-[var(--app-accent)]">
                              <span className="mx-1 text-[var(--app-text-muted)]">/</span>
                              {
                                selectedTask.subtasks.find((s: any) => s.id === selectedSubtaskId)
                                  ?.title
                              }
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
                              className={`flex w-full flex-col px-4 py-3 text-left transition-colors hover:bg-[var(--app-bg-deepest)] ${selectedTaskId === task.id && !selectedSubtaskId ? 'bg-[var(--app-accent)]/5 text-[var(--app-accent)]' : ''}`}
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
                                    className={`flex w-full items-center gap-2 px-4 py-2 pl-8 text-left text-sm transition-colors hover:bg-[var(--app-bg-elevated)] ${selectedSubtaskId === sub.id ? 'bg-[var(--app-accent)]/5 text-[var(--app-accent)]' : ''}`}
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
                onChange={(val) => {
                  if (val) setDate(val.split('T')[0])
                }}
                className="w-full"
                triggerClassName="w-full px-4 py-3 bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] hover:border-[var(--app-text-muted)] rounded-xl outline-none transition-all font-mono text-[var(--app-text-primary)] flex items-center justify-between font-semibold"
              />
            </div>
            <TimeSelect
              label={t('timeTracker.manual.startTime', 'Czas startu')}
              value={startTime}
              onChange={(val) => setStartTime(val)}
            />
            <TimeSelect
              label={t('timeTracker.manual.endTime', 'Czas końca')}
              value={endTime}
              onChange={(val) => setEndTime(val)}
            />
          </div>

          <div>
            <label className="mb-2 block flex items-center gap-2 pl-1 text-[11px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
              <AlignLeft size={12} />
              {t('timeTracker.description', 'Opis (Opcjonalnie)')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t(
                'timeTracker.descriptionPlaceholderManual',
                'Krótko opisz co zostało wykonane...'
              )}
              rows={3}
              className="focus:ring-[var(--app-accent)]/20 placeholder:text-[var(--app-text-muted)]/50 w-full resize-none rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] px-4 py-3 text-sm text-[var(--app-text-primary)] outline-none transition-all focus:border-[var(--app-accent)] focus:ring-1"
            />
          </div>

          {/* DYNAMIC DURATION WIDGET */}
          <div
            className={`flex items-center justify-between rounded-2xl p-5 transition-all duration-300 ${
              durationMinutes > 0
                ? 'to-[var(--app-accent)]/10 border-[var(--app-accent)]/20 border bg-gradient-to-r from-[var(--app-bg-elevated)] shadow-[0_4px_12px_rgba(242,206,136,0.06)]'
                : 'border border-transparent bg-gradient-to-r from-[var(--app-bg-elevated)] to-[var(--app-bg-deepest)]'
            }`}
          >
            <span className="text-sm font-semibold text-[var(--app-text-secondary)]">
              {t('timeTracker.manual.durationAuto', 'Podsumowanie czasu')}
            </span>
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={!selectedTaskId || durationMinutes <= 0 || manualMutation.isPending}
              className="hover:shadow-[var(--app-accent)]/20 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--app-accent)] py-4 text-base font-bold text-[var(--app-accent-text)] transition-all hover:bg-[var(--app-accent-hover)] hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:hover:shadow-none"
            >
              {manualMutation.isPending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <Plus size={20} />
                  {t('timeTracker.manual.addEntry', 'Dodaj wpis czasu')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
