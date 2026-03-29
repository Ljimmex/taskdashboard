import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetchJson } from '@/lib/api'
import { ChevronDown, Clock, Calendar } from 'lucide-react'
import { DueDatePicker } from '@/components/features/tasks/components/DueDatePicker'
import { MyTask } from './types'
import { formatMinutes } from './utils'
import { toast } from '@/hooks/useToast'

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
      <label className="block text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider mb-2">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-[var(--app-bg-elevated)] rounded-xl text-left transition-all outline-none ${open ? 'ring-1 ring-[var(--app-accent)]' : 'hover:bg-[var(--app-bg-deepest)]'
          }`}
      >
        <span className="font-mono text-[var(--app-text-primary)] font-semibold">{value}</span>
        <Clock size={20} className="text-[var(--app-text-muted)]" />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-2 bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] max-h-60 overflow-y-auto custom-scrollbar">
          {times.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { onChange(t); setOpen(false) }}
              className={`w-full px-4 py-2 text-left font-mono transition-colors ${value === t ? 'text-[#F2CE88] font-bold bg-[var(--app-bg-deepest)]' : 'text-[var(--app-text-primary)] hover:bg-[var(--app-bg-deepest)]'
                }`}
            >
              {t}
            </button>
          ))}
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

  // Fetch workspace members (only if canManage)
  const { data: membersData } = useQuery({
    queryKey: ['workspace-members', workspaceSlug],
    queryFn: () => apiFetchJson<{ success: boolean; data: any[] }>(`/api/workspaces/${workspaceSlug}/members`),
    enabled: !!workspaceSlug && canManage,
    refetchInterval: 5000,
  })
  const members = membersData?.data || []

  // Fetch tasks for selected user
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
      entryType: selectedEntryType,
      description,
      durationMinutes,
      startedAt: start.toISOString(),
      endedAt: end.toISOString()
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[var(--app-bg-card)] rounded-2xl p-8 shadow-sm">
        <div className="mb-8 border-b border-[var(--app-border)]/50 pb-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--app-text-primary)]">
            {t('timeTracker.manualEntry', 'Manual Entry')}
          </h2>
          <p className="text-sm text-[var(--app-text-muted)] mt-2">
            {t('timeTracker.manualEntrySub', 'Log time manually')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {canManage && (
            <div>
              <label className="block text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider mb-2">
                {t('timeTracker.user', 'User')}
              </label>
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`w-full flex items-center justify-between px-4 py-3 bg-[var(--app-bg-elevated)] rounded-xl text-left transition-all outline-none ${userDropdownOpen ? 'ring-1 ring-[var(--app-accent)]' : 'hover:bg-[var(--app-bg-deepest)]'
                    }`}
                >
                  <span className="font-medium text-[var(--app-text-primary)]">
                    {members.find((m: any) => m.user?.id === selectedUserId)?.user?.name || selectedUserId}
                  </span>
                  <ChevronDown size={20} className={`text-[var(--app-text-muted)] transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {userDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] max-h-60 overflow-y-auto custom-scrollbar">
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
                        className={`w-full px-4 py-3 text-left hover:bg-[var(--app-bg-deepest)] font-medium transition-colors flex items-center justify-between ${selectedUserId === m.user?.id ? 'text-[var(--app-accent)] bg-[var(--app-bg-deepest)]' : 'text-[var(--app-text-primary)]'
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
            <label className="block text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider mb-2">
              {t('timeTracker.selectTask', 'Select task')}
            </label>
            <div className="relative" ref={taskRef}>
              <button
                type="button"
                onClick={() => setTaskDropdownOpen(!taskDropdownOpen)}
                disabled={tasksLoading}
                className={`w-full flex items-center justify-between px-4 py-3 bg-[var(--app-bg-elevated)] rounded-xl text-left transition-all outline-none ${taskDropdownOpen ? 'ring-1 ring-[var(--app-accent)]' : 'hover:bg-[var(--app-bg-deepest)]'
                  }`}
              >
                {selectedTask ? (
                  <div className="flex flex-col">
                    <span className="font-medium text-[var(--app-text-primary)]">
                      {selectedTask.title}
                    </span>
                    <span className="text-xs text-[var(--app-text-muted)] mt-0.5">
                      {selectedTask.projectName}
                      {selectedEntryType === 'meeting' && selectedMeeting && (
                        <span className="text-[var(--app-accent)] flex items-center gap-1 mt-1">
                          <Calendar size={12} /> {selectedMeeting.title}
                        </span>
                      )}
                      {selectedEntryType === 'task' && selectedSubtaskId && selectedTask.subtasks.find((s: any) => s.id === selectedSubtaskId) && (
                        <span className="text-[var(--app-accent)]"> → {selectedTask.subtasks.find((s: any) => s.id === selectedSubtaskId)?.title}</span>
                      )}
                    </span>
                  </div>
                ) : (
                  <span className="text-[var(--app-text-muted)]">
                    {tasksLoading ? t('common.loading', 'Loading...') : t('timeTracker.pickTask', 'Pick a task...')}
                  </span>
                )}
                <ChevronDown size={20} className={`text-[var(--app-text-muted)] transition-transform duration-200 ${taskDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {taskDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] max-h-80 overflow-y-auto custom-scrollbar">
                  {myTasks.length === 0 ? (
                    <div className="p-4 text-center text-sm text-[var(--app-text-muted)]">
                      {t('timeTracker.noTasks', 'No assigned tasks found.')}
                    </div>
                  ) : (
                    <>
                      {/* TASKS SECTION */}
                      {myTasks.filter(t => t.id !== 'standalone-meetings').length > 0 && (
                        <div className="px-4 py-2 bg-[var(--app-bg-deepest)]/50 border-b border-[var(--app-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                          {t('timeTracker.tasksHeader', 'Tasks')}
                        </div>
                      )}
                      {myTasks.filter(t => t.id !== 'standalone-meetings').map((task: MyTask) => (
                        <div key={task.id} className="border-b border-[var(--app-border)] last:border-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTaskId(task.id)
                              setSelectedSubtaskId(null)
                              setSelectedMeetingId(null)
                              setSelectedEntryType('task')
                              setTaskDropdownOpen(false)
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-[var(--app-bg-deepest)] flex flex-col"
                          >
                            <span className="font-medium text-[var(--app-text-primary)]">{task.title}</span>
                            <span className="text-xs text-[var(--app-text-muted)] mt-0.5">{task.projectName}</span>
                          </button>
                          {task.subtasks.length > 0 && (
                            <div className="bg-[var(--app-bg-deepest)]/50 pb-2">
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
                                  className="w-full px-4 py-2 pl-8 text-left hover:bg-[var(--app-bg-elevated)] flex items-center gap-2 text-sm"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)]" />
                                  <span className="text-[var(--app-text-secondary)]">{sub.title}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {task.meetings && task.meetings.length > 0 && (
                            <div className="bg-[var(--app-bg-elevated)]/30 border-t border-[var(--app-border)]/50 pb-2">
                              {task.meetings.map((m: any) => (
                                <button
                                  type="button"
                                  key={m.id}
                                  onClick={() => {
                                    setSelectedTaskId(task.id)
                                    setSelectedSubtaskId(null)
                                    setSelectedMeetingId(m.id)
                                    setSelectedEntryType('meeting')
                                    setTaskDropdownOpen(false)
                                  }}
                                  className="w-full px-4 py-2 pl-8 text-left hover:bg-[var(--app-bg-elevated)] flex items-center gap-2 text-sm"
                                >
                                  <Calendar size={14} className="text-[var(--app-accent)]" />
                                  <span className="text-[var(--app-text-secondary)]">{m.title}</span>
                                  <span className="text-xs text-[var(--app-text-muted)] ml-auto">
                                    {new Date(m.date).toLocaleDateString()}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* MEETINGS SECTION */}
                      {myTasks.find(t => t.id === 'standalone-meetings') && (
                        <>
                          <div className="px-4 py-2 bg-[var(--app-bg-deepest)]/50 border-y border-[var(--app-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] mt-0">
                            {t('timeTracker.meetingsHeader', 'Meetings & Calendar Events')}
                          </div>
                          <div className="bg-[var(--app-bg-elevated)]">
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
                                className="w-full px-4 py-3 text-left hover:bg-[var(--app-bg-deepest)] flex items-center gap-3 border-b border-[var(--app-border)] last:border-0"
                              >
                                <div className="p-2 rounded-lg bg-[var(--app-accent)]/10 text-[var(--app-accent)]">
                                  <Calendar size={16} />
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="font-medium text-[var(--app-text-primary)] truncate">{m.title}</span>
                                  <span className="text-[10px] text-[var(--app-text-muted)] uppercase tracking-tight">{new Date(m.date).toLocaleString()}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider mb-2">
                {t('timeTracker.date', 'Date')}
              </label>
              <DueDatePicker
                value={date}
                onChange={(val) => {
                  if (val) setDate(val.split('T')[0])
                }}
                className="w-full"
                triggerClassName="w-full px-4 py-3 bg-[var(--app-bg-elevated)] rounded-xl outline-none transition-all font-mono text-[var(--app-text-primary)] hover:bg-[var(--app-bg-deepest)] flex items-center justify-between font-semibold"
              />
            </div>
            <TimeSelect
              label={t('timeTracker.startTime', 'Start Time')}
              value={startTime}
              onChange={(val) => setStartTime(val)}
            />
            <TimeSelect
              label={t('timeTracker.endTime', 'End Time')}
              value={endTime}
              onChange={(val) => setEndTime(val)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider mb-2">
              {t('timeTracker.description', 'Description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('timeTracker.descriptionPlaceholderManual', 'Opisz co zostało wykonane...')}
              rows={3}
              className="w-full bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl px-4 py-3 text-sm text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)] transition-all resize-none"
            />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between p-5 rounded-xl bg-[var(--app-bg-deepest)] gap-4">
            <span className="text-sm font-medium text-[var(--app-text-muted)]">{t('timeTracker.durationAuto', 'Duration will be computed automatically')}</span>
            <div className="flex items-center gap-2 text-[var(--app-accent)] bg-[var(--app-accent)]/10 px-4 py-2 rounded-lg">
              <Clock size={18} />
              <span className="text-xl font-bold font-mono">{formatMinutes(durationMinutes)}</span>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={!selectedTaskId || durationMinutes <= 0 || manualMutation.isPending}
              className="w-full flex justify-center py-4 rounded-full bg-[var(--app-accent)] text-[var(--app-accent-text)] font-bold text-lg hover:shadow-[0_0_20px_var(--app-accent)] hover:opacity-90 disabled:opacity-40 disabled:hover:shadow-none transition-all"
            >
              {manualMutation.isPending ? t('common.loading', 'Loading...') : t('timeTracker.addEntry', 'Add Entry')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
