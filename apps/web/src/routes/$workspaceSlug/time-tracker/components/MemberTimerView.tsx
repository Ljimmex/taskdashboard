import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetchJson } from '@/lib/api'
import { Clock, Play, Square, ChevronDown, Calendar, CheckSquare, AlignLeft, Activity, SkipForward, Coffee, Brain, ChevronUp } from 'lucide-react'
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
  const [clockType, setClockType] = useState<'analog' | 'digital' | 'pomodoro'>('analog')

  // Pomodoro State
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work')
  const [workDuration, setWorkDuration] = useState(25)
  const [breakDuration, setBreakDuration] = useState(5)
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(25 * 60)
  const [pomodoroTotalTime, setPomodoroTotalTime] = useState(25 * 60)
  const [pomodoroSessions, setPomodoroSessions] = useState(0)

  // Pagination state
  const [historyPage, setHistoryPage] = useState(1)
  const itemsPerPage = 10

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pomodoroIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  // Otwieranie/zamykanie dropdownu zadań
  const taskRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (taskRef.current && !taskRef.current.contains(e.target as Node)) {
        setTaskDropdownOpen(false)
      }
    }
    if (taskDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [taskDropdownOpen])

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
          if (data.clockType === 'pomodoro') {
            setClockType('pomodoro')
            setPomodoroMode(data.pomodoroMode || 'work')
            setWorkDuration(data.workDuration || 25)
            setBreakDuration(data.breakDuration || 5)
            setPomodoroTimeLeft(data.pomodoroTimeLeft || 25 * 60)
            setPomodoroTotalTime(data.pomodoroTotalTime || 25 * 60)
          }
        }
      }
    } catch { /* ignore */ }
  }, [userId])

  // Timer tick
  useEffect(() => {
    if (isRunning && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        setElapsed((Date.now() - startTimeRef.current) / 1000)
      }, 50) // 50ms = płynniejszy analogowy zegar
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
      workspaceSlug: string;
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
      workspaceSlug,
      entryType: selectedEntryType,
      description: description
    })
  }, [selectedTaskId, selectedSubtaskId, selectedEntryType, description, startMutation])

  const handleStop = useCallback(() => {
    if (!activeEntryId) return
    stopMutation.mutate(activeEntryId)
  }, [activeEntryId, stopMutation])

  // Pomodoro Logic
  const handleSkip = useCallback(() => {
    if (isRunning && pomodoroMode === 'work') {
      handleStop()
    }

    if (pomodoroMode === 'work') {
      const newSessionCount = pomodoroSessions + 1
      setPomodoroSessions(newSessionCount)
      if (newSessionCount % 4 === 0) {
        setPomodoroMode('longBreak')
        setPomodoroTimeLeft(15 * 60)
        setPomodoroTotalTime(15 * 60)
      } else {
        setPomodoroMode('shortBreak')
        const dur = breakDuration * 60
        setPomodoroTimeLeft(dur)
        setPomodoroTotalTime(dur)
      }
    } else {
      setPomodoroMode('work')
      const dur = workDuration * 60
      setPomodoroTimeLeft(dur)
      setPomodoroTotalTime(dur)
    }
    setIsRunning(false)
  }, [pomodoroMode, pomodoroSessions, isRunning, handleStop, workDuration, breakDuration])

  useEffect(() => {
    if (clockType === 'pomodoro' && isRunning) {
      pomodoroIntervalRef.current = setInterval(() => {
        setPomodoroTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(pomodoroIntervalRef.current!)
            handleSkip()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current)
    }
    return () => {
      if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current)
    }
  }, [clockType, isRunning, handleSkip])

  // Persistence for Pomodoro
  useEffect(() => {
    if (clockType === 'pomodoro') {
      const data = JSON.parse(localStorage.getItem(`tt_${userId}`) || '{}')
      localStorage.setItem(`tt_${userId}`, JSON.stringify({
        ...data,
        clockType,
        pomodoroMode,
        workDuration,
        breakDuration,
        pomodoroTimeLeft,
        pomodoroTotalTime
      }))
    }
  }, [pomodoroTimeLeft, isRunning, clockType, userId, pomodoroMode, pomodoroTotalTime, workDuration, breakDuration])

  const adjustTime = (amount: number, type: 'min' | 'sec') => {
    if (isRunning) return
    if (pomodoroMode === 'work') {
      if (type === 'min') {
        const next = Math.max(0, Math.min(120, workDuration + amount))
        setWorkDuration(next)
        setPomodoroTimeLeft(next * 60 + (pomodoroTimeLeft % 60))
        setPomodoroTotalTime(next * 60 + (pomodoroTimeLeft % 60))
      } else {
        const currentSec = pomodoroTimeLeft % 60
        const nextSec = (currentSec + amount + 60) % 60
        const currentMin = Math.floor(pomodoroTimeLeft / 60)
        const total = currentMin * 60 + nextSec
        setPomodoroTimeLeft(total)
        setPomodoroTotalTime(total)
        // We don't update workDuration here as it's primarily for minutes, but we could update state if needed.
        // For simplicity, workDuration will represent the minute goal.
      }
    } else {
      if (type === 'min') {
        const next = Math.max(0, Math.min(60, breakDuration + amount))
        setBreakDuration(next)
        setPomodoroTimeLeft(next * 60 + (pomodoroTimeLeft % 60))
        setPomodoroTotalTime(next * 60 + (pomodoroTimeLeft % 60))
      } else {
        const currentSec = pomodoroTimeLeft % 60
        const nextSec = (currentSec + amount + 60) % 60
        const currentMin = Math.floor(pomodoroTimeLeft / 60)
        const total = currentMin * 60 + nextSec
        setPomodoroTimeLeft(total)
        setPomodoroTotalTime(total)
      }
    }
  }

  // Zmienne dla Zegara Analogowego (Płynny ruch sekundnika)
  const hr = Math.floor(elapsed / 3600)
  const min = Math.floor((elapsed % 3600) / 60)
  const sec = elapsed % 60

  const secDeg = sec * 6
  const minDeg = min * 6 + (sec / 60) * 6
  const hrDeg = (hr % 12) * 30 + (min / 60) * 30

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      {/* SEKCJA 1: Wybór Zadania */}
      <div className="bg-[var(--app-bg-card)] rounded-3xl p-6 md:p-8 border border-[var(--app-divider)] shadow-sm">
        <label className="block text-[11px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider mb-2 pl-1">
          {t('timeTracker.timer.whatWorkingOn', 'Nad czym teraz pracujesz?')}
        </label>

        <div className="relative" ref={taskRef}>
          <button
            disabled={isRunning || tasksLoading}
            onClick={() => setTaskDropdownOpen(!taskDropdownOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 bg-[var(--app-bg-elevated)] border rounded-xl text-left transition-all outline-none ${taskDropdownOpen
              ? 'border-[var(--app-accent)] ring-1 ring-[var(--app-accent)]/20 shadow-lg'
              : 'border-[var(--app-divider)] hover:border-[var(--app-text-muted)]'
              } ${isRunning ? 'opacity-60 cursor-not-allowed grayscale-[0.3]' : ''}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-1.5 rounded-lg bg-[var(--app-bg-card)] border border-[var(--app-divider)] flex-shrink-0">
                {selectedEntryType === 'meeting' ? <Calendar size={16} className="text-[var(--app-accent)]" /> : <CheckSquare size={16} className="text-[var(--app-text-muted)]" />}
              </div>

              {selectedTaskId ? (
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-[var(--app-text-primary)] truncate">
                    {myTasks.find(t => t.id === selectedTaskId)?.title}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selectedEntryType === 'meeting' && selectedMeeting && (
                      <span className="flex items-center gap-1 text-[var(--app-accent)] text-xs font-bold uppercase tracking-tight truncate">
                        {selectedMeeting.title}
                      </span>
                    )}
                    {selectedEntryType === 'task' && selectedSubtaskId && (
                      <span className="flex items-center gap-1 text-[var(--app-accent)] text-xs font-bold uppercase tracking-tight truncate">
                        → {selectedTask?.subtasks.find(s => s.id === selectedSubtaskId)?.title}
                      </span>
                    )}
                    {!selectedMeetingId && !selectedSubtaskId && (
                      <span className="text-xs font-medium text-[var(--app-text-muted)] truncate">
                        {myTasks.find(t => t.id === selectedTaskId)?.projectName}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-[var(--app-text-muted)] font-medium">
                  {tasksLoading ? t('common.loading', 'Ładowanie zadań...') : t('timeTracker.timer.selectTask', 'Wybierz zadanie z listy...')}
                </span>
              )}
            </div>
            {!isRunning && <ChevronDown size={20} className={`text-[var(--app-text-muted)] flex-shrink-0 transition-transform duration-200 ${taskDropdownOpen ? 'rotate-180' : ''}`} />}
          </button>

          {/* Task Dropdown Menu */}
          {taskDropdownOpen && !isRunning && (
            <div className="absolute z-50 w-full mt-2 bg-[var(--app-bg-card)] border border-[var(--app-divider)] rounded-xl shadow-xl max-h-80 overflow-y-auto custom-scrollbar overflow-hidden backdrop-blur-md">
              {myTasks.length === 0 ? (
                <div className="p-6 text-center text-sm font-medium text-[var(--app-text-muted)]">
                  {t('timeTracker.noTasks', 'Brak przypisanych zadań.')}
                </div>
              ) : (
                <div className="py-2">
                  {/* ZADANIA */}
                  {myTasks.filter(t => t.id !== 'standalone-meetings').length > 0 && (
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] bg-[var(--app-bg-elevated)]/50">
                      {t('timeTracker.timer.tasksHeader', 'Zadania Projektowe')}
                    </div>
                  )}

                  {myTasks.filter(t => t.id !== 'standalone-meetings').map((task: MyTask) => (
                    <div key={task.id} className="border-b border-[var(--app-divider)] last:border-0">
                      <button
                        onClick={() => {
                          setSelectedTaskId(task.id)
                          setSelectedSubtaskId(null)
                          setSelectedMeetingId(null)
                          setSelectedEntryType('task')
                          setTaskDropdownOpen(false)
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-[var(--app-bg-elevated)] flex flex-col transition-colors group"
                      >
                        <span className="font-semibold text-sm text-[var(--app-text-primary)] group-hover:text-[var(--app-accent)] transition-colors">{task.title}</span>
                        <span className="text-[11px] font-medium text-[var(--app-text-muted)] mt-0.5">{task.projectName}</span>
                      </button>

                      {/* Podzadania */}
                      {task.subtasks.length > 0 && (
                        <div className="bg-[var(--app-bg-elevated)]/30 pb-2 border-l-2 border-[var(--app-divider)] ml-4 mr-2 mb-2 rounded-r-lg">
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
                              className="w-full px-4 py-2 text-left hover:bg-[var(--app-bg-card)] flex items-center gap-3 text-sm transition-colors group"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-[var(--app-divider)] group-hover:bg-[var(--app-accent)] transition-colors" />
                              <span className="text-[var(--app-text-secondary)] font-medium text-[13px] group-hover:text-[var(--app-accent)] transition-colors">{sub.title}</span>
                              {sub.isCompleted && <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-accent)] ml-auto bg-[var(--app-accent)]/10 px-2 py-0.5 rounded-md">Wykonane</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* SPOTKANIA */}
                  {myTasks.find(t => t.id === 'standalone-meetings') && (
                    <>
                      <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] bg-[var(--app-bg-elevated)]/50 border-t border-[var(--app-divider)]">
                        {t('timeTracker.meetingsHeader', 'Spotkania i Wydarzenia')}
                      </div>
                      <div>
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
                            className="w-full px-4 py-3 text-left hover:bg-[var(--app-bg-elevated)] flex items-center gap-3 border-b border-[var(--app-divider)] last:border-0 transition-colors group"
                          >
                            <div className="p-1.5 rounded-md bg-[var(--app-accent)]/10 text-[var(--app-accent)] group-hover:bg-[var(--app-accent)]/20 transition-colors">
                              <Calendar size={14} />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-semibold text-sm text-[var(--app-text-primary)] truncate">{m.title}</span>
                              <span className="text-[10px] font-medium text-[var(--app-text-muted)] mt-0.5">
                                {new Date(m.date).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}
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

        <div className="mt-5">
          <label className="block text-[11px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider mb-2 pl-1 flex items-center gap-2">
            <AlignLeft size={12} />
            {t('timeTracker.description', 'Krótki opis (Opcjonalnie)')}
          </label>
          <input
            type="text"
            placeholder={t('timeTracker.descriptionPlaceholder', 'Nad czym konkretnie dzisiaj pracujesz?')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isRunning}
            className="w-full bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] rounded-xl px-4 py-3 text-sm text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)] focus:ring-1 focus:ring-[var(--app-accent)]/20 transition-all placeholder:text-[var(--app-text-muted)]/50 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* SEKCJA 2: Główny Zegar (Analog/Digital) */}
      <div className="bg-[var(--app-bg-card)] rounded-3xl p-8 shadow-sm text-center flex flex-col items-center relative border border-[var(--app-divider)]">

        {/* Toggle Switch */}
        <div className="absolute top-6 left-6">
          <div className="inline-flex bg-[var(--app-bg-elevated)] p-1 rounded-full border border-[var(--app-divider)] shadow-sm">
            {[
              { id: 'analog', label: 'Analogowy' },
              { id: 'digital', label: 'Cyfrowy' },
              { id: 'pomodoro', label: 'Pomodoro' }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  if (isRunning && clockType !== type.id) return // Don't switch while running to avoid data mess
                  setClockType(type.id as any)
                }}
                disabled={isRunning && clockType !== type.id}
                className={`relative px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${clockType === type.id
                  ? 'bg-[var(--app-accent)] text-[#0a0a0f] shadow-md shadow-[var(--app-accent)]/20'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] disabled:opacity-30'
                  }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 md:mt-4"></div>

        {/* CLOCK RENDERER */}
        {clockType === 'analog' ? (
          <div className="mb-8 relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
            {/* Soft Glow behind clock if running */}
            <div className={`absolute inset-0 rounded-full transition-opacity duration-1000 blur-3xl pointer-events-none ${isRunning ? 'bg-[var(--app-accent)]/10 opacity-100' : 'opacity-0'}`} />

            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl relative z-10">
              {/* Outer Ring */}
              <circle cx="50" cy="50" r="48" fill="var(--app-bg-card)" stroke="var(--app-divider)" strokeWidth="1" />
              {/* Progress Ring (Accent Color) */}
              <circle
                cx="50" cy="50" r="48" fill="transparent"
                stroke={isRunning ? "var(--app-accent)" : "transparent"}
                strokeWidth="2" strokeDasharray="301.59"
                strokeDashoffset={301.59 - (301.59 * (elapsed % 3600)) / 3600}
                strokeLinecap="round" transform="rotate(-90 50 50)"
                className="transition-all duration-300 ease-linear"
              />
              {/* Inner Face */}
              <circle cx="50" cy="50" r="42" fill="var(--app-bg-elevated)" />

              {/* Digital Time inside Analog */}
              <text x="50" y="68" textAnchor="middle" fill="var(--app-text-muted)" fontSize="9" fontFamily="monospace" fontWeight="bold" letterSpacing="0.05em">
                {formatTime(Math.floor(elapsed))}
              </text>

              {/* Hour Markers */}
              {Array.from({ length: 12 }).map((_, i) => (
                <line key={`hr-${i}`} x1="50" y1="12" x2="50" y2="16" stroke="var(--app-text-muted)" strokeWidth={i % 3 === 0 ? "1.5" : "1"} strokeLinecap="round" transform={`rotate(${i * 30} 50 50)`} />
              ))}
              {/* Minute Markers */}
              {Array.from({ length: 60 }).map((_, i) => i % 5 !== 0 && (
                <line key={`min-${i}`} x1="50" y1="10" x2="50" y2="12" stroke="var(--app-divider)" strokeWidth="0.5" transform={`rotate(${i * 6} 50 50)`} />
              ))}

              {/* Hands */}
              <line x1="50" y1="50" x2="50" y2="26" stroke="var(--app-text-primary)" strokeWidth="3" strokeLinecap="round" transform={`rotate(${hrDeg} 50 50)`} style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }} />
              <line x1="50" y1="50" x2="50" y2="18" stroke="var(--app-text-secondary)" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${minDeg} 50 50)`} style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }} />
              <line x1="50" y1="50" x2="50" y2="12" stroke="var(--app-accent)" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${secDeg} 50 50)`} />

              {/* Center Dot */}
              <circle cx="50" cy="50" r="3.5" fill="var(--app-accent)" />
              <circle cx="50" cy="50" r="1.5" fill="var(--app-bg-card)" />
            </svg>
          </div>
        ) : clockType === 'pomodoro' ? (
          <div className="mb-4 relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
            {/* Glow effect based on mode */}
            <div className={`absolute inset-0 rounded-full transition-opacity duration-1000 blur-3xl pointer-events-none ${isRunning ? (pomodoroMode === 'work' ? 'bg-[var(--app-accent)]/10' : 'bg-slate-400/10') : 'opacity-0'}`} />

            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl relative z-10 transform -rotate-90">
              {/* Tło okręgu */}
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--app-divider)" strokeWidth="3" />

              {/* Pasek postępu (drenujący) */}
              <circle
                cx="50" cy="50" r="45"
                fill="none"
                stroke={pomodoroMode === 'work' ? "var(--app-accent)" : "#94a3b8"} // Slate/Blue-gray for break
                strokeWidth="5"
                strokeDasharray={2 * Math.PI * 45}
                strokeDashoffset={(2 * Math.PI * 45) * (1 - (pomodoroTimeLeft / pomodoroTotalTime))}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
              />
            </svg>

            {/* Time in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
              <div className="flex items-center justify-center gap-1 relative">
                <div className="flex flex-col items-center">
                  {!isRunning && (
                    <button onClick={() => adjustTime(1, 'min')} className="p-1 text-[var(--app-text-muted)] hover:text-[var(--app-accent)] transition-colors">
                      <ChevronUp size={24} />
                    </button>
                  )}
                  <div className={`font-mono text-5xl md:text-7xl font-black tracking-tighter tabular-nums ${pomodoroMode === 'work' ? 'text-[var(--app-text-primary)]' : 'text-slate-300'}`}>
                    {Math.floor(pomodoroTimeLeft / 60)}
                  </div>
                  {!isRunning && (
                    <button onClick={() => adjustTime(-1, 'min')} className="p-1 text-[var(--app-text-muted)] hover:text-[var(--app-accent)] transition-colors">
                      <ChevronDown size={24} />
                    </button>
                  )}
                </div>

                <div className={`font-mono text-5xl md:text-7xl font-black tracking-tighter tabular-nums ${pomodoroMode === 'work' ? 'text-[var(--app-text-primary)]' : 'text-slate-300'} mb-1 md:mb-2`}>
                  :
                </div>

                <div className="flex flex-col items-center">
                  {!isRunning && (
                    <button onClick={() => adjustTime(1, 'sec')} className="p-1 text-[var(--app-text-muted)] hover:text-[var(--app-accent)] transition-colors">
                      <ChevronUp size={24} />
                    </button>
                  )}
                  <div className={`font-mono text-5xl md:text-7xl font-black tracking-tighter tabular-nums ${pomodoroMode === 'work' ? 'text-[var(--app-text-primary)]' : 'text-slate-300'}`}>
                    {String(pomodoroTimeLeft % 60).padStart(2, '0')}
                  </div>
                  {!isRunning && (
                    <button onClick={() => adjustTime(-1, 'sec')} className="p-1 text-[var(--app-text-muted)] hover:text-[var(--app-accent)] transition-colors">
                      <ChevronDown size={24} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-12 mt-6">
            <div className={`font-mono text-[4.5rem] md:text-8xl font-black tracking-tighter transition-colors duration-500 tabular-nums ${isRunning ? 'text-[var(--app-accent)] drop-shadow-[0_0_20px_var(--app-accent)]' : 'text-[var(--app-text-primary)]'}`}>
              {formatTime(Math.floor(elapsed))}
            </div>
            {isRunning && <div className="text-[var(--app-text-muted)] font-bold uppercase tracking-[0.3em] text-xs mt-2 animate-pulse">Rejestrowanie</div>}
          </div>
        )}

        {/* Przycisk Start/Stop i Badge pod zegarem */}
        {clockType === 'pomodoro' && (
          <div className="mb-8 mt-2">
            <div className={`px-5 py-2 rounded-full flex items-center gap-2.5 border shadow-[0_4px_20px_rgba(0,0,0,0.1)] backdrop-blur-2xl transition-all duration-500 ${pomodoroMode === 'work'
              ? 'bg-[var(--app-accent)]/10 border-[var(--app-accent)]/30 text-[var(--app-accent)]'
              : 'bg-slate-400/10 border-slate-400/30 text-slate-400'
              }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${pomodoroMode === 'work' ? 'bg-[var(--app-accent)]' : 'bg-slate-400'}`} />
              {pomodoroMode === 'work' ? <Brain size={16} className="opacity-80" /> : <Coffee size={16} className="opacity-80" />}
              <span className="text-[11px] font-black uppercase tracking-[0.25em]">
                {t(`timeTracker.timer.pomodoro.${pomodoroMode === 'work' ? 'work' : 'break'}`, pomodoroMode === 'work' ? 'WORK' : 'BREAK')}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center w-full max-w-md mt-2 gap-4">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={!selectedTaskId || startMutation.isPending || (clockType === 'pomodoro' && pomodoroMode !== 'work')}
              className="flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-[var(--app-accent)] text-[var(--app-accent-text)] border border-[var(--app-accent)] font-bold text-lg hover:bg-[var(--app-accent-hover)] hover:shadow-[0_10px_30px_rgba(242,206,136,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              <Play size={24} className="fill-[var(--app-accent-text)] transition-colors" />
              {clockType === 'pomodoro' ? 'Zacznij Sesję' : t('timeTracker.timer.start', 'Start Pracy')}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={stopMutation.isPending}
              className="flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-[var(--app-bg-deepest)] text-rose-500 border border-rose-500/30 font-bold text-lg hover:bg-rose-500/10 hover:border-rose-500 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-40 group animate-pulse-slow shadow-sm"
            >
              <Square size={24} className="fill-rose-500 transition-colors" />
              {clockType === 'pomodoro' ? 'Przerwij i Zapisz' : t('timeTracker.timer.stop', 'Zakończ i Zapisz')}
            </button>
          )}

          {clockType === 'pomodoro' && (
            <button
              onClick={handleSkip}
              className="p-4 rounded-2xl bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] text-[var(--app-text-primary)] transition-all hover:bg-[var(--app-bg-card)] hover:border-[var(--app-text-muted)] group shadow-sm"
              title="Pomiń fazę"
            >
              <SkipForward size={24} className="group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {/* SEKCJA 3: Ostatnie sesje (Historia) */}
      <div className="bg-[var(--app-bg-card)] rounded-3xl p-6 md:p-8 border border-[var(--app-divider)] shadow-sm">
        <div className="flex items-center justify-between mb-6 border-b border-[var(--app-divider)] pb-4">
          <h2 className="text-sm font-bold text-[var(--app-text-primary)] uppercase tracking-wider flex items-center gap-2">
            <Activity size={18} className="text-[var(--app-accent)]" />
            {t('timeTracker.recentSessions', 'Ostatnio Zarejestrowane')}
          </h2>
          {myHistory.length > 0 && (
            <span className="text-xs font-bold text-[var(--app-text-muted)] bg-[var(--app-bg-elevated)] px-2.5 py-1 rounded-md border border-[var(--app-divider)]">
              {myHistory.length} wpisów
            </span>
          )}
        </div>

        {myHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-[var(--app-bg-elevated)]/50 rounded-2xl border border-dashed border-[var(--app-divider)]">
            <Clock size={32} className="text-[var(--app-text-muted)]/40 mb-3" />
            <p className="text-sm font-medium text-[var(--app-text-muted)]">
              {t('timeTracker.noSessions', 'Nie masz jeszcze żadnych wpisów czasu. Rozpocznij pracę!')}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedHistory.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] hover:border-[var(--app-accent)]/30 hover:bg-[var(--app-bg-card)] transition-all duration-200 group"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="text-[14px] font-semibold text-[var(--app-text-primary)] truncate flex items-center gap-2 mb-1 group-hover:text-[var(--app-accent)] transition-colors">
                      {entry.entryType === 'meeting' && <Calendar size={14} className="text-[var(--app-accent)]" />}
                      <span>{entry.taskTitle || 'Nieznane zadanie'}</span>
                      {entry.subtaskTitle && (
                        <span className="text-[var(--app-accent)] font-normal">
                          <span className="text-[var(--app-text-muted)] px-1">/</span>
                          {entry.subtaskTitle}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-medium text-[var(--app-text-muted)]">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(entry.startedAt).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' })}
                        <span className="mx-0.5">•</span>
                        {new Date(entry.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {entry.endedAt ? ` - ${new Date(entry.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ` - (Trwa)`}
                      </span>

                      <span className="px-2 py-0.5 rounded border border-[var(--app-divider)] bg-[var(--app-bg-card)]">
                        {entry.projectRole === 'project_leader' ? 'Lider Projektu' : entry.projectRole === 'area_leader' ? 'Lider Obszaru' : 'Uczestnik'}
                      </span>

                      {entry.approvalStatus === 'pending' && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase font-bold tracking-wider">Oczekujące</span>
                      )}
                      {entry.approvalStatus === 'approved' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase font-bold tracking-wider">Zatwierdzone</span>
                      )}
                    </div>

                    {entry.description && (
                      <div className="mt-2 text-xs text-[var(--app-text-secondary)] italic border-l-2 border-[var(--app-accent)]/30 pl-2 line-clamp-1">
                        {entry.description}
                      </div>
                    )}
                  </div>

                  <div className="text-right sm:text-right mt-3 sm:mt-0 flex-shrink-0">
                    <span className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[var(--app-accent)]/10 text-[var(--app-accent)] text-lg font-bold font-mono border border-[var(--app-accent)]/20 shadow-sm">
                      {formatMinutes(entry.durationMinutes || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-2">
                <button
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] hover:bg-[var(--app-bg-card)] disabled:opacity-50 text-[var(--app-text-secondary)] transition-colors"
                >
                  {t('common.prev', 'Wstecz')}
                </button>
                <div className="flex gap-1">
                  {/* Uproszczona paginacja, pokazujemy tylko 3 najbliższe strony */}
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    if (page === 1 || page === totalPages || (page >= historyPage - 1 && page <= historyPage + 1)) {
                      return (
                        <button
                          key={page}
                          onClick={() => setHistoryPage(page)}
                          className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors border ${historyPage === page
                            ? 'bg-[var(--app-accent)] text-[#0a0a0f] border-[var(--app-accent)]'
                            : 'bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] border-[var(--app-divider)] hover:bg-[var(--app-bg-card)]'
                            }`}
                        >
                          {page}
                        </button>
                      )
                    } else if (page === historyPage - 2 || page === historyPage + 2) {
                      return <span key={page} className="text-[var(--app-text-muted)] px-1">...</span>
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                  disabled={historyPage === totalPages}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] hover:bg-[var(--app-card)] disabled:opacity-50 text-[var(--app-text-secondary)] transition-colors"
                >
                  {t('common.next', 'Dalej')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}