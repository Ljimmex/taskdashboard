import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetchJson } from '@/lib/api'
import { Clock, Play, Square, ChevronDown, Calendar } from 'lucide-react'
import { formatTime, formatMinutes } from './utils'
import { MyTask } from './types'

export function MemberTimerView({ workspaceSlug, userId }: { workspaceSlug: string; userId: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null)
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [selectedEntryType, setSelectedEntryType] = useState<'task' | 'meeting'>('task')
  const [isRunning, setIsRunning] = useState(false)
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [taskDropdownOpen, setTaskDropdownOpen] = useState(false)
  const [description, setDescription] = useState('')

  // UI Display Preferences
  const [clockType, setClockType] = useState<'analog' | 'digital'>('analog')

  // Pagination state
  const [historyPage, setHistoryPage] = useState(1)
  const itemsPerPage = 10

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  // Restore timer from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`tt_${userId}`)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.entryId && data.startTime) {
          setActiveEntryId(data.entryId)
          setSelectedTaskId(data.taskId)
          setSelectedSubtaskId(data.subtaskId || null)
          setSelectedMeetingId(data.meetingId || null)
          setSelectedEntryType(data.entryType || 'task')
          setDescription(data.description || '')
          setIsRunning(true)
          startTimeRef.current = data.startTime
        }
      }
    } catch { /* ignore */ }
  }, [userId])

  // Timer tick
  useEffect(() => {
    if (isRunning && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        setElapsed((Date.now() - startTimeRef.current) / 1000)
      }, 50)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning])

  // Fetch my tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['my-tasks', workspaceSlug],
    queryFn: () => apiFetchJson<{ success: boolean; data: MyTask[] }>(`/api/time/my-tasks?workspaceSlug=${workspaceSlug}`),
    enabled: !!workspaceSlug && !!userId,
    refetchInterval: 5000,
  })
  const myTasks = (tasksData?.data || []).filter((t: MyTask) => t.status !== 'done')

  // Fetch my time entries (history)
  const { data: historyData } = useQuery({
    queryKey: ['my-time-entries', userId],
    queryFn: () => apiFetchJson<{ success: boolean; data: any[]; totalMinutes: number }>('/api/time'),
    enabled: !!userId,
    refetchInterval: 5000,
  })
  const myHistory = historyData?.data || []

  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * itemsPerPage
    return myHistory.slice(start, start + itemsPerPage)
  }, [myHistory, historyPage])
  const totalPages = Math.ceil(myHistory.length / itemsPerPage)

  const selectedTask = myTasks.find((t: MyTask) => t.id === selectedTaskId)
  const selectedMeeting = selectedTask?.meetings?.find((m: any) => m.id === selectedMeetingId)

  const startMutation = useMutation({
    mutationFn: (body: {
      taskId: string;
      subtaskId?: string | null;
      entryType: 'task' | 'meeting';
      description?: string;
    }) =>
      apiFetchJson<{ success: boolean; data: any }>('/api/time/start', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (res) => {
      if (res.success && res.data) {
        const now = Date.now()
        setActiveEntryId(res.data.id)
        setIsRunning(true)
        setElapsed(0)
        startTimeRef.current = now
        localStorage.setItem(`tt_${userId}`, JSON.stringify({
          entryId: res.data.id,
          taskId: selectedTaskId,
          subtaskId: selectedSubtaskId,
          meetingId: selectedMeetingId,
          entryType: selectedEntryType,
          description: description,
          startTime: now,
        }))
      }
    },
  })

  const stopMutation = useMutation({
    mutationFn: (entryId: string) =>
      apiFetchJson<{ success: boolean; data: any }>(`/api/time/${entryId}/stop`, { method: 'PATCH' }),
    onSuccess: () => {
      setIsRunning(false)
      setActiveEntryId(null)
      setElapsed(0)
      setDescription('')
      startTimeRef.current = 0
      localStorage.removeItem(`tt_${userId}`)
      queryClient.invalidateQueries({ queryKey: ['my-time-entries'] })
    },
  })

  const handleStart = useCallback(() => {
    if (!selectedTaskId) return
    startMutation.mutate({
      taskId: selectedTaskId,
      subtaskId: selectedSubtaskId,
      entryType: selectedEntryType,
      description: description
    })
  }, [selectedTaskId, selectedSubtaskId, selectedEntryType, description, startMutation])

  const handleStop = useCallback(() => {
    if (!activeEntryId) return
    stopMutation.mutate(activeEntryId)
  }, [activeEntryId, stopMutation])

  const hr = Math.floor(elapsed / 3600)
  const min = Math.floor((elapsed % 3600) / 60)
  const sec = elapsed % 60

  const secDeg = sec * 6
  const minDeg = min * 6 + (sec / 60) * 6
  const hrDeg = (hr % 12) * 30 + (min / 60) * 30

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-[var(--app-bg-card)] rounded-2xl p-6 shadow-sm">
        <label className="block text-sm font-semibold text-[var(--app-text-muted)] uppercase tracking-wider mb-2">
          {t('timeTracker.whatWorkingOn', 'What are you working on?')}
        </label>
        <div className="relative">
          <button
            disabled={isRunning || tasksLoading}
            onClick={() => setTaskDropdownOpen(!taskDropdownOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 bg-[var(--app-bg-elevated)] border rounded-xl text-left transition-all ${taskDropdownOpen ? 'border-[var(--app-accent)] ring-1 ring-[var(--app-accent)]' : 'border-[var(--app-border)] hover:border-[var(--app-border-hover)]'
              } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {selectedTaskId ? (
              <div className="flex flex-col">
                <span className="font-bold text-[var(--app-text-primary)]">
                  {myTasks.find(t => t.id === selectedTaskId)?.title}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  {selectedEntryType === 'meeting' && selectedMeeting && (
                    <div className="flex items-center gap-1 text-[var(--app-accent)] text-xs font-bold uppercase tracking-tighter">
                      <Calendar size={12} /> {selectedMeeting.title}
                    </div>
                  )}
                  {selectedEntryType === 'task' && selectedSubtaskId && (
                    <div className="flex items-center gap-1 text-[var(--app-accent)] text-xs font-bold uppercase tracking-tighter">
                      → {selectedTask?.subtasks.find(s => s.id === selectedSubtaskId)?.title}
                    </div>
                  )}
                  {!selectedMeetingId && !selectedSubtaskId && (
                    <span className="text-xs text-[var(--app-text-muted)]">
                      {myTasks.find(t => t.id === selectedTaskId)?.projectName}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-[var(--app-text-muted)]">
                {tasksLoading ? t('common.loading', 'Loading...') : t('timeTracker.selectTask', 'Select a task to track time...')}
              </span>
            )}
            <ChevronDown size={20} className={`text-[var(--app-text-muted)] transition-transform duration-200 ${taskDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {taskDropdownOpen && !isRunning && (
            <div className="absolute z-50 w-full mt-2 bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] max-h-80 overflow-y-auto custom-scrollbar">
              {myTasks.length === 0 ? (
                <div className="p-4 text-center text-sm text-[var(--app-text-muted)]">
                  {t('timeTracker.noTasks', 'No tasks assigned to you.')}
                </div>
              ) : (
                <>
                  {myTasks.filter(t => t.id !== 'standalone-meetings').length > 0 && (
                    <div className="px-4 py-2 bg-[var(--app-bg-deepest)]/50 border-b border-[var(--app-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                      {t('timeTracker.tasksHeader', 'Tasks')}
                    </div>
                  )}
                  {myTasks.filter(t => t.id !== 'standalone-meetings').map((task: MyTask) => (
                    <div key={task.id} className="border-b border-[var(--app-border)] last:border-0">
                      <button
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
                              {sub.isCompleted && <span className="text-xs text-emerald-500 ml-auto">Done</span>}
                            </button>
                          ))}
                        </div>
                      )}
                      {task.meetings && task.meetings.length > 0 && (
                        <div className="bg-[var(--app-bg-elevated)]/30 border-t border-[var(--app-border)]/50 pb-2">
                          {task.meetings.map((m: any) => (
                            <button
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

                  {myTasks.find(t => t.id === 'standalone-meetings') && (
                    <>
                      <div className="px-4 py-2 bg-[var(--app-bg-deepest)]/50 border-y border-[var(--app-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] mt-0">
                        {t('timeTracker.meetingsHeader', 'Meetings & Calendar Events')}
                      </div>
                      <div className="bg-[var(--app-bg-elevated)]">
                        {myTasks.find(t => t.id === 'standalone-meetings')?.meetings?.map((m: any) => (
                          <button
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

        <div className="mt-4">
          <input
            type="text"
            placeholder={t('timeTracker.descriptionPlaceholder', 'Opisz co robisz... (opcjonalnie)')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isRunning}
            className="w-full bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)] transition-all"
          />
        </div>
      </div>

      <div className="bg-[var(--app-bg-card)] rounded-2xl p-8 shadow-sm text-center flex flex-col items-center relative">
        <div className="w-full flex justify-start mb-6 -mt-2 -ml-2">
          <div className="flex bg-[#1a1a24] p-1 rounded-full">
            <button
              onClick={() => setClockType('analog')}
              className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${clockType === 'analog'
                ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                : 'text-gray-500 hover:text-white'
                }`}
            >
              {t('timeTracker.analog', 'Analog')}
            </button>
            <button
              onClick={() => setClockType('digital')}
              className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${clockType === 'digital'
                ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                : 'text-gray-500 hover:text-white'
                }`}
            >
              {t('timeTracker.digital', 'Digital')}
            </button>
          </div>
        </div>

        {clockType === 'analog' ? (
          <div className="mb-6 relative w-64 h-64 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
              <circle cx="50" cy="50" r="48" fill="transparent" stroke={isRunning ? "var(--app-accent)" : "var(--app-border)"} strokeWidth="2" className="transition-colors duration-500" />
              <circle cx="50" cy="50" r="40" fill="var(--app-bg-deepest)" />
              <text x="50" y="65" textAnchor="middle" fill="var(--app-text-muted)" fontSize="8" fontFamily="monospace" fontWeight="bold">
                {formatTime(Math.floor(elapsed))}
              </text>
              {Array.from({ length: 12 }).map((_, i) => (
                <line key={i} x1="50" y1="12" x2="50" y2="15" stroke="var(--app-text-muted)" strokeWidth="1" strokeLinecap="round" transform={`rotate(${i * 30} 50 50)`} />
              ))}
              {Array.from({ length: 60 }).map((_, i) => i % 5 !== 0 && (
                <line key={i} x1="50" y1="11" x2="50" y2="13" stroke="var(--app-border-hover)" strokeWidth="0.5" transform={`rotate(${i * 6} 50 50)`} />
              ))}
              <circle cx="50" cy="50" r="3" fill="var(--app-accent)" />
              <line x1="50" y1="50" x2="50" y2="28" stroke="var(--app-text-primary)" strokeWidth="3" strokeLinecap="round" transform={`rotate(${hrDeg} 50 50)`} />
              <line x1="50" y1="50" x2="50" y2="20" stroke="var(--app-text-secondary)" strokeWidth="2" strokeLinecap="round" transform={`rotate(${minDeg} 50 50)`} />
              <line x1="50" y1="50" x2="50" y2="15" stroke="var(--app-accent)" strokeWidth="1" strokeLinecap="round" transform={`rotate(${secDeg} 50 50)`} />
            </svg>
          </div>
        ) : (
          <div className="mb-8">
            <div className={`font-mono text-6xl font-bold tracking-tight transition-colors ${isRunning ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-primary)]'}`}>
              {formatTime(elapsed)}
            </div>
          </div>
        )}

        {isRunning && selectedTask && (
          <p className="text-sm text-[var(--app-text-muted)] mb-6">
            {selectedTask.title}
            {selectedEntryType === 'meeting' && selectedMeeting && (
              <span className="text-[var(--app-accent)] flex items-center gap-1 justify-center mt-1">
                <Calendar size={14} /> {selectedMeeting.title}
              </span>
            )}
            {selectedEntryType === 'task' && selectedSubtaskId && selectedTask.subtasks.find((s: any) => s.id === selectedSubtaskId) && (
              <span className="text-[var(--app-accent)]"> → {selectedTask.subtasks.find((s: any) => s.id === selectedSubtaskId)?.title}</span>
            )}
          </p>
        )}

        <div className="flex items-center justify-center gap-4 mt-4">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={!selectedTaskId || startMutation.isPending}
              className="flex items-center justify-center gap-3 min-w-[200px] px-8 py-4 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-lg hover:bg-emerald-500 hover:text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:border-emerald-500 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              <Play size={22} className="fill-emerald-500 group-hover:fill-white transition-colors" />
              {t('timeTracker.start', 'Start Timer')}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={stopMutation.isPending}
              className="flex items-center justify-center gap-3 min-w-[200px] px-8 py-4 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold text-lg hover:bg-rose-500 hover:text-white hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:border-rose-500 active:scale-95 transition-all disabled:opacity-40 group"
            >
              <Square size={22} className="fill-rose-500 group-hover:fill-white transition-colors" />
              {t('timeTracker.stop', 'Stop Timer')}
            </button>
          )}
        </div>
      </div>

      <div className="bg-[var(--app-bg-card)] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--app-text-muted)] uppercase tracking-wider flex items-center gap-2">
            <Clock size={14} />
            {t('timeTracker.recentSessions', 'Recent Sessions')}
          </h2>
        </div>

        {myHistory.length === 0 ? (
          <p className="text-sm text-[var(--app-text-muted)] text-center py-8">
            {t('timeTracker.noSessions', 'No time entries yet. Start tracking!')}
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {paginatedHistory.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--app-bg-elevated)] border border-[var(--app-border)] hover:border-[var(--app-accent)]/20 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--app-text-primary)] truncate flex items-center gap-2">
                      {entry.entryType === 'meeting' && <Calendar size={14} className="text-[var(--app-accent)]" />}
                      <span>{entry.taskTitle || 'Unknown Task'}</span>
                      {entry.subtaskTitle && (
                        <>
                          <span className="text-[var(--app-text-muted)] text-xs">→</span>
                          <span className="text-[var(--app-accent)]">{entry.subtaskTitle}</span>
                        </>
                      )}
                    </div>
                    {entry.description && (
                      <div className="text-xs text-[var(--app-text-secondary)] mt-1 italic opacity-80 decoration-[var(--app-accent)]/30 line-clamp-1 border-l-2 border-[var(--app-accent)]/20 pl-2">
                        {entry.description}
                      </div>
                    )}
                    <div className="text-xs text-[var(--app-text-muted)] mt-1 flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded-md bg-[var(--app-bg-deepest)] border border-[var(--app-border)] font-medium whitespace-nowrap">
                        {entry.projectRole === 'project_leader' ? 'Lider Projektu' : entry.projectRole === 'area_leader' ? 'Lider Obszaru' : 'Uczestnik'}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(entry.startedAt).toLocaleDateString()} • {new Date(entry.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {entry.endedAt ? ` — ${new Date(entry.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ` — (In progress)`}
                      </span>
                      {entry.approvalStatus === 'pending' && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] uppercase font-bold tracking-wider ml-auto">Pending</span>
                      )}
                      {entry.approvalStatus === 'approved' && (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] uppercase font-bold tracking-wider ml-auto">Approved</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-[var(--app-accent)] ml-4 whitespace-nowrap bg-[var(--app-accent)]/10 px-3 py-1.5 rounded-lg">
                    {formatMinutes(entry.durationMinutes || 0)}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center gap-4">
                <button
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  className="p-2 rounded-lg hover:bg-[var(--app-bg-elevated)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--app-text-secondary)]"
                >
                  {t('common.prev', 'Previous')}
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= historyPage - 1 && page <= historyPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setHistoryPage(page)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${historyPage === page
                            ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]'
                            : 'hover:bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)]'
                            }`}
                        >
                          {page}
                        </button>
                      )
                    } else if (
                      page === historyPage - 2 ||
                      page === historyPage + 2
                    ) {
                      return <span key={page} className="text-[var(--app-text-muted)] px-1">...</span>
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                  disabled={historyPage === totalPages}
                  className="p-2 rounded-lg hover:bg-[var(--app-bg-elevated)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--app-text-secondary)]"
                >
                  {t('common.next', 'Next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
