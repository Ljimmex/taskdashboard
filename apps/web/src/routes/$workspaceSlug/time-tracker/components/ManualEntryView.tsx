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

function TimeSelect({ value, onChange, label }: { value: string, onChange: (v: string) => void, label: string }) {
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
      <label className="block text-[11px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider mb-2 pl-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-[var(--app-bg-elevated)] border rounded-xl text-left transition-all outline-none ${open ? 'border-[var(--app-accent)] ring-1 ring-[var(--app-accent)]/20 shadow-lg' : 'border-[var(--app-divider)] hover:border-[var(--app-text-muted)]'
          }`}
      >
        <span className="font-mono text-[var(--app-text-primary)] font-semibold">{value}</span>
        <Clock size={18} className={open ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-muted)]'} />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-2 bg-[var(--app-bg-card)] border border-[var(--app-divider)] rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar overflow-hidden backdrop-blur-xl">
          <div className="p-1">
            {times.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { onChange(t); setOpen(false) }}
                className={`w-full px-4 py-2 text-left font-mono text-sm rounded-lg transition-colors ${value === t
                  ? 'text-[var(--app-accent)] font-bold bg-[var(--app-accent)]/10'
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

export function ManualEntryView({ workspaceSlug, userId, canManage }: { workspaceSlug: string; userId: string; canManage: boolean }) {
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
    queryFn: () => apiFetchJson<{ success: boolean; data: any[] }>(`/api/workspaces/${workspaceSlug}/members`),
    enabled: !!workspaceSlug && canManage,
    refetchInterval: 5000,
  })
  const members = membersData?.data || []

  // Fetch tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['my-tasks', workspaceSlug, selectedUserId],
    queryFn: () => apiFetchJson<{ success: boolean; data: MyTask[] }>(`/api/time/my-tasks?workspaceSlug=${workspaceSlug}&targetUserId=${selectedUserId}`),
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
    }
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
      endedAt: end.toISOString()
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--app-bg-card)] rounded-3xl p-6 md:p-8 border border-[var(--app-divider)] shadow-sm">

        <div className="mb-8 border-b border-[var(--app-divider)] pb-6 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 flex items-center justify-center bg-[var(--app-accent)]/10 rounded-xl text-[var(--app-accent)]">
              {sidebarIcons.timetracker.gold}
            </div>
            <h2 className="text-2xl font-bold text-[var(--app-text-primary)] tracking-tight">
              {t('timeTracker.manual.title', 'Dodaj czas ręcznie')}
            </h2>
          </div>
          <p className="text-sm text-[var(--app-text-muted)] mt-1.5 max-w-sm">
            {t('timeTracker.manual.subtitle', 'Uzupełnij brakujące godziny pracy wybierając zadanie i przedział czasowy.')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {canManage && (
            <div>
              <label className="block text-[11px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider mb-2 pl-1">
                {t('timeTracker.manual.user', 'Użytkownik')}
              </label>
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`w-full flex items-center justify-between px-4 py-3 bg-[var(--app-bg-elevated)] border rounded-xl text-left transition-all outline-none ${userDropdownOpen ? 'border-[var(--app-accent)] ring-1 ring-[var(--app-accent)]/20 shadow-lg' : 'border-[var(--app-divider)] hover:border-[var(--app-text-muted)]'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <User size={18} className="text-[var(--app-text-muted)]" />
                    <span className="font-semibold text-[var(--app-text-primary)]">
                      {members.find((m: any) => m.user?.id === selectedUserId)?.user?.name || selectedUserId}
                    </span>
                  </div>
                  <ChevronDown size={18} className={`text-[var(--app-text-muted)] transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {userDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-[var(--app-bg-card)] border border-[var(--app-divider)] rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar p-1">
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
                        className={`w-full px-4 py-3 text-left hover:bg-[var(--app-bg-deepest)] font-medium transition-colors flex items-center justify-between ${selectedUserId === m.user?.id ? 'text-[var(--app-accent)] bg-[var(--app-accent)]/5' : 'text-[var(--app-text-primary)]'
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
            <label className="block text-[11px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider mb-2 pl-1">
              {t('timeTracker.selectTask', 'Zadanie lub Spotkanie')}
            </label>
            <div className="relative" ref={taskRef}>
              <button
                type="button"
                onClick={() => setTaskDropdownOpen(!taskDropdownOpen)}
                disabled={tasksLoading}
                className={`w-full flex items-center justify-between px-4 py-3 bg-[var(--app-bg-elevated)] border rounded-xl text-left transition-all outline-none ${taskDropdownOpen ? 'border-[var(--app-accent)] ring-1 ring-[var(--app-accent)]/20 shadow-lg' : 'border-[var(--app-divider)] hover:border-[var(--app-text-muted)]'
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
                        {selectedEntryType === 'task' && selectedSubtaskId && selectedTask.subtasks.find((s: any) => s.id === selectedSubtaskId) && (
                          <span className="text-[var(--app-accent)]">
                            <span className="mx-1 text-[var(--app-text-muted)]">/</span>
                            {selectedTask.subtasks.find((s: any) => s.id === selectedSubtaskId)?.title}
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
                <ChevronDown size={18} className={`text-[var(--app-text-muted)] flex-shrink-0 transition-transform duration-200 ${taskDropdownOpen ? 'rotate-180' : ''}`} />
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
                            className={`w-full px-4 py-3 text-left hover:bg-[var(--app-bg-deepest)] flex flex-col transition-colors ${selectedTaskId === task.id && !selectedSubtaskId ? 'bg-[var(--app-accent)]/5 text-[var(--app-accent)]' : ''}`}
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
                                  className={`w-full px-4 py-2 pl-8 text-left hover:bg-[var(--app-bg-elevated)] flex items-center gap-2 text-sm transition-colors ${selectedSubtaskId === sub.id ? 'bg-[var(--app-accent)]/5 text-[var(--app-accent)]' : ''}`}
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
                onChange={(val) => {
                  if (val) setDate(val.split('T')[0])
                }}
                className="w-full"
                triggerClassName="w-full px-4 py-3 bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] hover:border-[var(--app-text-muted)] rounded-xl outline-none transition-all font-mono text-[var(--app-text-primary)] flex items-center justify-between font-semibold"
              />
            </div>
            <TimeSelect label={t('timeTracker.manual.startTime', 'Czas startu')} value={startTime} onChange={(val) => setStartTime(val)} />
            <TimeSelect label={t('timeTracker.manual.endTime', 'Czas końca')} value={endTime} onChange={(val) => setEndTime(val)} />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider mb-2 pl-1 flex items-center gap-2">
              <AlignLeft size={12} />
              {t('timeTracker.description', 'Opis (Opcjonalnie)')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('timeTracker.descriptionPlaceholderManual', 'Krótko opisz co zostało wykonane...')}
              rows={3}
              className="w-full bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] rounded-xl px-4 py-3 text-sm text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)] focus:ring-1 focus:ring-[var(--app-accent)]/20 transition-all resize-none placeholder:text-[var(--app-text-muted)]/50"
            />
          </div>

          {/* DYNAMIC DURATION WIDGET */}
          <div className={`flex items-center justify-between p-5 rounded-2xl transition-all duration-300 ${durationMinutes > 0
            ? 'bg-gradient-to-r from-[var(--app-bg-elevated)] to-[var(--app-accent)]/10 border border-[var(--app-accent)]/20 shadow-[0_4px_12px_rgba(242,206,136,0.06)]'
            : 'bg-gradient-to-r from-[var(--app-bg-elevated)] to-[var(--app-bg-deepest)] border border-transparent'
            }`}>
            <span className="text-sm font-semibold text-[var(--app-text-secondary)]">
              {t('timeTracker.manual.durationAuto', 'Podsumowanie czasu')}
            </span>
            <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all duration-300 ${durationMinutes > 0
              ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)] border-[var(--app-accent)] shadow-md'
              : 'bg-[var(--app-bg-card)] text-[var(--app-text-muted)] border-[var(--app-divider)]'
              }`}>
              <Clock size={18} />
              <span className="text-xl font-bold font-mono tracking-tight">{formatMinutes(durationMinutes)}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!selectedTaskId || durationMinutes <= 0 || manualMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[var(--app-accent)] text-[var(--app-accent-text)] font-bold text-base hover:bg-[var(--app-accent-hover)] hover:shadow-lg hover:shadow-[var(--app-accent)]/20 disabled:opacity-50 disabled:grayscale disabled:hover:shadow-none transition-all active:scale-[0.98]"
            >
              {manualMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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