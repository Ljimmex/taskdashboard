import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetchJson } from '@/lib/api'
import {
  Clock,
  Play,
  Pause,
  Square,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckSquare,
  AlignLeft,
  Activity,
  SkipForward,
  Coffee,
  Brain,
  ChevronUp,
} from 'lucide-react'
import { formatTime, formatMinutes } from './utils'
import { MyTask } from './types'

export function MemberTimerView({
  workspaceSlug,
  userId,
}: {
  workspaceSlug: string
  userId: string
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null)
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [selectedEntryType, setSelectedEntryType] = useState<'task' | 'meeting'>('task')
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false) // Added isPaused state
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
          setIsRunning(data.isPaused ? false : true)
          setIsPaused(data.isPaused || false)
          startTimeRef.current = data.startTime
          // If it was paused, we don't need to do anything with elapsed yet as the interval isn't running
          // But when we resume, we'll need to know how much time to "shift"
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
    } catch {
      /* ignore */
    }
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
    queryFn: () =>
      apiFetchJson<{ success: boolean; data: MyTask[] }>(
        `/api/time/my-tasks?workspaceSlug=${workspaceSlug}`
      ),
    enabled: !!workspaceSlug && !!userId,
    refetchInterval: 5000,
  })
  const myTasks = (tasksData?.data || []).filter((t: MyTask) => t.status !== 'done')

  // Fetch my time entries (history)
  const { data: historyData } = useQuery({
    queryKey: ['my-time-entries', userId],
    queryFn: () =>
      apiFetchJson<{ success: boolean; data: any[]; totalMinutes: number }>('/api/time'),
    enabled: !!userId,
    refetchInterval: 5000,
  })

  // Fetch active time entry from server to sync state
  const { data: activeEntryData, error: activeEntryError } = useQuery({
    queryKey: ['active-time-entry', activeEntryId],
    queryFn: () => apiFetchJson<{ success: boolean; data: any }>(`/api/time/${activeEntryId}`),
    enabled: !!activeEntryId,
    refetchInterval: 5000, // Frequent sync
    retry: false,
  })

  // Sync active entry from server to local state
  useEffect(() => {
    if (activeEntryData?.success && activeEntryData.data) {
      const serverEntry = activeEntryData.data
      const serverStartedAt = new Date(serverEntry.startedAt).getTime()
      const serverIsPaused = serverEntry.isPaused
      const serverPausedAt = serverEntry.pausedAt ? new Date(serverEntry.pausedAt).getTime() : null
      const totalPausedMs = (serverEntry.totalPausedMinutes || 0) * 60000

      // Update local flags
      setIsRunning(!serverIsPaused)
      setIsPaused(serverIsPaused)

      // Calculate the "apparent" startTimeRef.current so that (Date.now() - startTimeRef.current) gives the worked time
      // Logic: WorkedTime = (Now - StartedAt) - TotalPaused
      // So, apparentStartTime = StartedAt + TotalPaused
      startTimeRef.current = serverStartedAt + totalPausedMs

      // If currently paused, elapsed should reflect the static time up to the pause
      if (serverIsPaused && serverPausedAt) {
        setElapsed((serverPausedAt - startTimeRef.current) / 1000)
      }

      // Sync IDs and metadata
      setSelectedTaskId(serverEntry.taskId)
      setSelectedSubtaskId(serverEntry.subtaskId || null)
      setSelectedMeetingId(serverEntry.meetingId || null)
      setSelectedEntryType(serverEntry.entryType || 'task')

      // Update localStorage to match server
      const saved = JSON.parse(localStorage.getItem(`tt_${userId}`) || '{}')
      localStorage.setItem(
        `tt_${userId}`,
        JSON.stringify({
          ...saved,
          entryId: serverEntry.id,
          taskId: serverEntry.taskId,
          subtaskId: serverEntry.subtaskId,
          startTime: startTimeRef.current,
          isPaused: serverIsPaused,
          pausedAt: serverPausedAt,
        })
      )
    }
  }, [activeEntryData, userId])

  // We no longer clear the timer automatically on 404 to be resilient to accidental deletions
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
      taskId: string
      subtaskId?: string | null
      workspaceSlug: string
      entryType: 'task' | 'meeting'
      description?: string
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
        localStorage.setItem(
          `tt_${userId}`,
          JSON.stringify({
            entryId: res.data.id,
            taskId: selectedTaskId,
            subtaskId: selectedSubtaskId,
            meetingId: selectedMeetingId,
            entryType: selectedEntryType,
            description: description,
            startTime: now,
          })
        )
      }
    },
  })

  const manualSaveMutation = useMutation({
    mutationFn: (body: any) =>
      apiFetchJson<{ success: boolean; data: any }>('/api/time', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
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

  const pauseMutation = useMutation({
    mutationFn: (entryId: string) =>
      apiFetchJson<{ success: boolean; data: any }>(`/api/time/${entryId}/pause`, {
        method: 'PATCH',
      }),
    onSuccess: (res) => {
      if (res.success) {
        setIsRunning(false)
        setIsPaused(true)
        const now = Date.now()
        const saved = JSON.parse(localStorage.getItem(`tt_${userId}`) || '{}')
        localStorage.setItem(
          `tt_${userId}`,
          JSON.stringify({ ...saved, isPaused: true, pausedAt: now })
        )
        queryClient.invalidateQueries({ queryKey: ['active-time-entry', activeEntryId] })
      }
    },
  })

  const resumeMutation = useMutation({
    mutationFn: (entryId: string) =>
      apiFetchJson<{ success: boolean; data: any }>(`/api/time/${entryId}/resume`, {
        method: 'PATCH',
      }),
    onSuccess: (res) => {
      if (res.success) {
        const saved = JSON.parse(localStorage.getItem(`tt_${userId}`) || '{}')
        const pausedAt = saved.pausedAt || Date.now()
        const pauseDuration = Date.now() - pausedAt

        // SHIFT the start time forward by the duration of the pause
        // so that (Date.now() - startTimeRef.current) results in the correct elapsed time
        startTimeRef.current += pauseDuration

        setIsRunning(true)
        setIsPaused(false)
        localStorage.setItem(
          `tt_${userId}`,
          JSON.stringify({
            ...saved,
            isPaused: false,
            pausedAt: null,
            startTime: startTimeRef.current,
          })
        )
        queryClient.invalidateQueries({ queryKey: ['active-time-entry', activeEntryId] })
      }
    },
  })

  const stopMutation = useMutation({
    mutationFn: (entryId: string) =>
      apiFetchJson<{ success: boolean; data: any }>(`/api/time/${entryId}/stop`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      setIsRunning(false)
      setIsPaused(false) // Clear pause state
      setActiveEntryId(null)
      setElapsed(0)
      setDescription('')
      startTimeRef.current = 0
      localStorage.removeItem(`tt_${userId}`)
      queryClient.invalidateQueries({ queryKey: ['my-time-entries'] })
    },
    onError: (err: any) => {
      // If entry doesn't exist (404), fallback to creating a NEW manual entry with the same stats
      if (err.status === 404 || err.message?.includes('404')) {
        const endedAt = new Date()
        const durationMinutes = Math.round((endedAt.getTime() - startTimeRef.current) / 60000)

        manualSaveMutation.mutate({
          taskId: selectedTaskId,
          subtaskId: selectedSubtaskId,
          workspaceSlug,
          description: description,
          durationMinutes,
          startedAt: new Date(startTimeRef.current).toISOString(),
          endedAt: endedAt.toISOString(),
          entryType: selectedEntryType,
        })
      }
    },
  })

  const handleStart = useCallback(() => {
    if (!selectedTaskId) return
    startMutation.mutate({
      taskId: selectedTaskId,
      subtaskId: selectedSubtaskId,
      workspaceSlug,
      entryType: selectedEntryType,
      description: description,
    })
  }, [selectedTaskId, selectedSubtaskId, selectedEntryType, description, startMutation])

  const handleStop = useCallback(() => {
    if (!activeEntryId) return
    stopMutation.mutate(activeEntryId)
  }, [activeEntryId, stopMutation])

  const handlePause = useCallback(() => {
    if (!activeEntryId) return
    pauseMutation.mutate(activeEntryId)
  }, [activeEntryId, pauseMutation])

  const handleResume = useCallback(() => {
    if (!activeEntryId) return
    resumeMutation.mutate(activeEntryId)
  }, [activeEntryId, resumeMutation])

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
      localStorage.setItem(
        `tt_${userId}`,
        JSON.stringify({
          ...data,
          clockType,
          pomodoroMode,
          workDuration,
          breakDuration,
          pomodoroTimeLeft,
          pomodoroTotalTime,
        })
      )
    }
  }, [
    pomodoroTimeLeft,
    isRunning,
    clockType,
    userId,
    pomodoroMode,
    pomodoroTotalTime,
    workDuration,
    breakDuration,
  ])

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
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-4xl space-y-6 pb-12 duration-500">
      {/* SEKCJA 1: Wybór Zadania */}
      <div className="rounded-3xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] p-6 shadow-sm md:p-8">
        <label className="mb-2 block pl-1 text-[11px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
          {t('timeTracker.timer.whatWorkingOn', 'Nad czym teraz pracujesz?')}
        </label>

        <div className="relative" ref={taskRef}>
          <button
            disabled={isRunning || tasksLoading}
            onClick={() => setTaskDropdownOpen(!taskDropdownOpen)}
            className={`flex w-full items-center justify-between rounded-xl border bg-[var(--app-bg-elevated)] px-4 py-3 text-left outline-none transition-all ${
              taskDropdownOpen
                ? 'ring-[var(--app-accent)]/20 border-[var(--app-accent)] shadow-lg ring-1'
                : 'border-[var(--app-divider)] hover:border-[var(--app-text-muted)]'
            } ${isRunning ? 'cursor-not-allowed opacity-60 grayscale-[0.3]' : ''}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex-shrink-0 rounded-lg border border-[var(--app-divider)] bg-[var(--app-bg-card)] p-1.5">
                {selectedEntryType === 'meeting' ? (
                  <Calendar size={16} className="text-[var(--app-accent)]" />
                ) : (
                  <CheckSquare size={16} className="text-[var(--app-text-muted)]" />
                )}
              </div>

              {selectedTaskId ? (
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-bold text-[var(--app-text-primary)]">
                    {myTasks.find((t) => t.id === selectedTaskId)?.title}
                  </span>
                  <div className="mt-0.5 flex items-center gap-2">
                    {selectedEntryType === 'meeting' && selectedMeeting && (
                      <span className="flex items-center gap-1 truncate text-xs font-bold uppercase tracking-tight text-[var(--app-accent)]">
                        {selectedMeeting.title}
                      </span>
                    )}
                    {selectedEntryType === 'task' && selectedSubtaskId && (
                      <span className="flex items-center gap-1 truncate text-xs font-bold uppercase tracking-tight text-[var(--app-accent)]">
                        → {selectedTask?.subtasks.find((s) => s.id === selectedSubtaskId)?.title}
                      </span>
                    )}
                    {!selectedMeetingId && !selectedSubtaskId && (
                      <span className="truncate text-xs font-medium text-[var(--app-text-muted)]">
                        {myTasks.find((t) => t.id === selectedTaskId)?.projectName}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="font-medium text-[var(--app-text-muted)]">
                  {tasksLoading
                    ? t('common.loading', 'Ładowanie zadań...')
                    : t('timeTracker.timer.selectTask', 'Wybierz zadanie z listy...')}
                </span>
              )}
            </div>
            {!isRunning && (
              <ChevronDown
                size={20}
                className={`flex-shrink-0 text-[var(--app-text-muted)] transition-transform duration-200 ${taskDropdownOpen ? 'rotate-180' : ''}`}
              />
            )}
          </button>

          {/* Task Dropdown Menu */}
          {taskDropdownOpen && !isRunning && (
            <div className="custom-scrollbar absolute z-50 mt-2 max-h-80 w-full overflow-hidden overflow-y-auto rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] shadow-xl backdrop-blur-md">
              {myTasks.length === 0 ? (
                <div className="p-6 text-center text-sm font-medium text-[var(--app-text-muted)]">
                  {t('timeTracker.noTasks', 'Brak przypisanych zadań.')}
                </div>
              ) : (
                <div className="py-2">
                  {/* ZADANIA */}
                  {myTasks.filter((t) => t.id !== 'standalone-meetings').length > 0 && (
                    <div className="bg-[var(--app-bg-elevated)]/50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                      {t('timeTracker.timer.tasksHeader', 'Zadania Projektowe')}
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
                          onClick={() => {
                            setSelectedTaskId(task.id)
                            setSelectedSubtaskId(null)
                            setSelectedMeetingId(null)
                            setSelectedEntryType('task')
                            setTaskDropdownOpen(false)
                          }}
                          className="group flex w-full flex-col px-4 py-3 text-left transition-colors hover:bg-[var(--app-bg-elevated)]"
                        >
                          <span className="text-sm font-semibold text-[var(--app-text-primary)] transition-colors group-hover:text-[var(--app-accent)]">
                            {task.title}
                          </span>
                          <span className="mt-0.5 text-[11px] font-medium text-[var(--app-text-muted)]">
                            {task.projectName}
                          </span>
                        </button>

                        {/* Podzadania */}
                        {task.subtasks.length > 0 && (
                          <div className="bg-[var(--app-bg-elevated)]/30 mb-2 ml-4 mr-2 rounded-r-lg border-l-2 border-[var(--app-divider)] pb-2">
                            {task.subtasks.map((sub) => (
                              <button
                                key={sub.id}
                                onClick={() => {
                                  setSelectedTaskId(task.id)
                                  setSelectedSubtaskId(sub.id)
                                  setSelectedMeetingId(null)
                                  setSelectedEntryType('task')
                                  setTaskDropdownOpen(false)
                                }}
                                className="group flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-[var(--app-bg-card)]"
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-[var(--app-divider)] transition-colors group-hover:bg-[var(--app-accent)]" />
                                <span className="text-[13px] font-medium text-[var(--app-text-secondary)] transition-colors group-hover:text-[var(--app-accent)]">
                                  {sub.title}
                                </span>
                                {sub.isCompleted && (
                                  <span className="bg-[var(--app-accent)]/10 ml-auto rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--app-accent)]">
                                    Wykonane
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                  {/* SPOTKANIA */}
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
                              key={m.id}
                              onClick={() => {
                                setSelectedTaskId('standalone-meetings')
                                setSelectedSubtaskId(null)
                                setSelectedMeetingId(m.id)
                                setSelectedEntryType('meeting')
                                setTaskDropdownOpen(false)
                              }}
                              className="group flex w-full items-center gap-3 border-b border-[var(--app-divider)] px-4 py-3 text-left transition-colors last:border-0 hover:bg-[var(--app-bg-elevated)]"
                            >
                              <div className="bg-[var(--app-accent)]/10 group-hover:bg-[var(--app-accent)]/20 rounded-md p-1.5 text-[var(--app-accent)] transition-colors">
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

        <div className="mt-5">
          <label className="mb-2 block flex items-center gap-2 pl-1 text-[11px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
            <AlignLeft size={12} />
            {t('timeTracker.description', 'Krótki opis (Opcjonalnie)')}
          </label>
          <input
            type="text"
            placeholder={t(
              'timeTracker.descriptionPlaceholder',
              'Nad czym konkretnie dzisiaj pracujesz?'
            )}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isRunning}
            className="focus:ring-[var(--app-accent)]/20 placeholder:text-[var(--app-text-muted)]/50 w-full rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] px-4 py-3 text-sm text-[var(--app-text-primary)] outline-none transition-all focus:border-[var(--app-accent)] focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>

      {/* SEKCJA 2: Główny Zegar (Analog/Digital) */}
      <div className="relative flex flex-col items-center rounded-3xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] p-8 text-center shadow-sm">
        {/* Toggle Switch */}
        <div className="absolute left-6 top-6">
          <div className="inline-flex rounded-full border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] p-1 shadow-sm">
            {[
              { id: 'analog', label: 'Analogowy' },
              { id: 'digital', label: 'Cyfrowy' },
              { id: 'pomodoro', label: 'Pomodoro' },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  if (isRunning && clockType !== type.id) return // Don't switch while running to avoid data mess
                  setClockType(type.id as any)
                }}
                disabled={isRunning && clockType !== type.id}
                className={`relative rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-300 ${
                  clockType === type.id
                    ? 'shadow-[var(--app-accent)]/20 bg-[var(--app-accent)] text-[#0a0a0f] shadow-md'
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
          <div className="relative mb-4 flex h-64 w-64 items-center justify-center md:h-80 md:w-80">
            {/* Soft Glow behind clock if running */}
            <div
              className={`pointer-events-none absolute inset-0 rounded-full blur-3xl transition-opacity duration-1000 ${isRunning ? 'bg-[var(--app-accent)]/10 opacity-100' : 'opacity-0'}`}
            />

            <svg viewBox="0 0 100 100" className="relative z-10 h-full w-full drop-shadow-xl">
              {/* Outer Ring */}
              <circle
                cx="50"
                cy="50"
                r="48"
                fill="var(--app-bg-card)"
                stroke="var(--app-divider)"
                strokeWidth="1"
              />
              {/* Progress Ring (Accent Color) */}
              <circle
                cx="50"
                cy="50"
                r="48"
                fill="transparent"
                stroke={isRunning ? 'var(--app-accent)' : 'transparent'}
                strokeWidth="2"
                strokeDasharray="301.59"
                strokeDashoffset={301.59 - (301.59 * (elapsed % 3600)) / 3600}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                className="transition-all duration-300 ease-linear"
              />
              {/* Inner Face */}
              <circle cx="50" cy="50" r="42" fill="var(--app-bg-elevated)" />

              {/* Digital Time inside Analog */}
              <text
                x="50"
                y="68"
                textAnchor="middle"
                fill="var(--app-text-muted)"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
                letterSpacing="0.05em"
              >
                {formatTime(Math.floor(elapsed))}
              </text>

              {/* Hour Markers */}
              {Array.from({ length: 12 }).map((_, i) => (
                <line
                  key={`hr-${i}`}
                  x1="50"
                  y1="12"
                  x2="50"
                  y2="16"
                  stroke="var(--app-text-muted)"
                  strokeWidth={i % 3 === 0 ? '1.5' : '1'}
                  strokeLinecap="round"
                  transform={`rotate(${i * 30} 50 50)`}
                />
              ))}
              {/* Minute Markers */}
              {Array.from({ length: 60 }).map(
                (_, i) =>
                  i % 5 !== 0 && (
                    <line
                      key={`min-${i}`}
                      x1="50"
                      y1="10"
                      x2="50"
                      y2="12"
                      stroke="var(--app-divider)"
                      strokeWidth="0.5"
                      transform={`rotate(${i * 6} 50 50)`}
                    />
                  )
              )}

              {/* Hands */}
              <line
                x1="50"
                y1="50"
                x2="50"
                y2="26"
                stroke="var(--app-text-primary)"
                strokeWidth="3"
                strokeLinecap="round"
                transform={`rotate(${hrDeg} 50 50)`}
                style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}
              />
              <line
                x1="50"
                y1="50"
                x2="50"
                y2="18"
                stroke="var(--app-text-secondary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                transform={`rotate(${minDeg} 50 50)`}
                style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}
              />
              <line
                x1="50"
                y1="50"
                x2="50"
                y2="12"
                stroke="var(--app-accent)"
                strokeWidth="1.5"
                strokeLinecap="round"
                transform={`rotate(${secDeg} 50 50)`}
              />

              {/* Center Dot */}
              <circle cx="50" cy="50" r="3.5" fill="var(--app-accent)" />
              <circle cx="50" cy="50" r="1.5" fill="var(--app-bg-card)" />
            </svg>
          </div>
        ) : clockType === 'pomodoro' ? (
          <div className="relative mb-4 flex h-64 w-64 items-center justify-center md:h-80 md:w-80">
            {/* Glow effect based on mode */}
            <div
              className={`pointer-events-none absolute inset-0 rounded-full blur-3xl transition-opacity duration-1000 ${isRunning ? (pomodoroMode === 'work' ? 'bg-[var(--app-accent)]/10' : 'bg-slate-400/10') : 'opacity-0'}`}
            />

            <svg
              viewBox="0 0 100 100"
              className="relative z-10 h-full w-full -rotate-90 transform drop-shadow-2xl"
            >
              {/* Tło okręgu */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="var(--app-divider)"
                strokeWidth="3"
              />

              {/* Pasek postępu (drenujący) */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={pomodoroMode === 'work' ? 'var(--app-accent)' : '#94a3b8'} // Slate/Blue-gray for break
                strokeWidth="5"
                strokeDasharray={2 * Math.PI * 45}
                strokeDashoffset={2 * Math.PI * 45 * (1 - pomodoroTimeLeft / pomodoroTotalTime)}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
              />
            </svg>

            {/* Time in center */}
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center gap-1">
                <div className="flex flex-col items-center">
                  {!isRunning && (
                    <button
                      onClick={() => adjustTime(1, 'min')}
                      className="p-1 text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-accent)]"
                    >
                      <ChevronUp size={24} />
                    </button>
                  )}
                  <div
                    className={`font-mono text-5xl font-black tabular-nums tracking-tighter md:text-7xl ${pomodoroMode === 'work' ? 'text-[var(--app-text-primary)]' : 'text-slate-300'}`}
                  >
                    {Math.floor(pomodoroTimeLeft / 60)}
                  </div>
                  {!isRunning && (
                    <button
                      onClick={() => adjustTime(-1, 'min')}
                      className="p-1 text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-accent)]"
                    >
                      <ChevronDown size={24} />
                    </button>
                  )}
                </div>

                <div
                  className={`font-mono text-5xl font-black tabular-nums tracking-tighter md:text-7xl ${pomodoroMode === 'work' ? 'text-[var(--app-text-primary)]' : 'text-slate-300'} mb-1 md:mb-2`}
                >
                  :
                </div>

                <div className="flex flex-col items-center">
                  {!isRunning && (
                    <button
                      onClick={() => adjustTime(1, 'sec')}
                      className="p-1 text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-accent)]"
                    >
                      <ChevronUp size={24} />
                    </button>
                  )}
                  <div
                    className={`font-mono text-5xl font-black tabular-nums tracking-tighter md:text-7xl ${pomodoroMode === 'work' ? 'text-[var(--app-text-primary)]' : 'text-slate-300'}`}
                  >
                    {String(pomodoroTimeLeft % 60).padStart(2, '0')}
                  </div>
                  {!isRunning && (
                    <button
                      onClick={() => adjustTime(-1, 'sec')}
                      className="p-1 text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-accent)]"
                    >
                      <ChevronDown size={24} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-10 mt-6">
            <div
              className={`font-mono text-[4.5rem] font-black tabular-nums tracking-tighter transition-colors duration-500 md:text-8xl ${isRunning ? 'text-[var(--app-accent)] drop-shadow-[0_0_20px_var(--app-accent)]' : 'text-[var(--app-text-primary)]'}`}
            >
              {formatTime(Math.floor(elapsed))}
            </div>
            {isRunning && (
              <div className="mt-2 flex flex-col items-center gap-2">
                <div className="animate-pulse text-xs font-bold uppercase tracking-[0.3em] text-[var(--app-text-muted)]">
                  {t('timeTracker.timer.recording', 'Rejestrowanie')}
                </div>
                {activeEntryError && (activeEntryError as any).status === 404 && (
                  <div className="flex animate-bounce items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-500 shadow-sm">
                    <Activity size={12} />
                    {t(
                      'timeTracker.timer.unsynced',
                      'Wpis usunięty - zostanie przywrócony przy zapisie'
                    )}
                  </div>
                )}
              </div>
            )}
            {isPaused && (
              <div className="mt-2 flex flex-col items-center gap-2">
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-amber-500">
                  {t('timeTracker.timer.paused', 'Wstrzymano')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Przycisk Start/Stop i Badge pod zegarem */}
        {clockType === 'pomodoro' && (
          <div className="mb-8 mt-2">
            <div
              className={`flex items-center gap-2.5 rounded-full border px-5 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.1)] backdrop-blur-2xl transition-all duration-500 ${
                pomodoroMode === 'work'
                  ? 'bg-[var(--app-accent)]/10 border-[var(--app-accent)]/30 text-[var(--app-accent)]'
                  : 'border-slate-400/30 bg-slate-400/10 text-slate-400'
              }`}
            >
              <div
                className={`h-2 w-2 animate-pulse rounded-full ${pomodoroMode === 'work' ? 'bg-[var(--app-accent)]' : 'bg-slate-400'}`}
              />
              {pomodoroMode === 'work' ? (
                <Brain size={16} className="opacity-80" />
              ) : (
                <Coffee size={16} className="opacity-80" />
              )}
              <span className="text-[11px] font-black uppercase tracking-[0.25em]">
                {t(
                  `timeTracker.timer.pomodoro.${pomodoroMode === 'work' ? 'work' : 'break'}`,
                  pomodoroMode === 'work' ? 'WORK' : 'BREAK'
                )}
              </span>
            </div>
          </div>
        )}

        <div className="mt-2 flex w-full max-w-xl items-center justify-center gap-4">
          {!isRunning && !isPaused ? (
            <button
              onClick={handleStart}
              disabled={
                !selectedTaskId ||
                startMutation.isPending ||
                (clockType === 'pomodoro' && pomodoroMode !== 'work')
              }
              className="group flex flex-1 items-center justify-center gap-3 rounded-2xl border border-[var(--app-accent)] bg-[var(--app-accent)] px-8 py-4 text-lg font-bold text-[var(--app-accent-text)] transition-all duration-300 hover:scale-105 hover:bg-[var(--app-accent-hover)] hover:shadow-[0_10px_30px_rgba(242,206,136,0.3)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Play size={24} className="fill-[var(--app-accent-text)] transition-colors" />
              {clockType === 'pomodoro'
                ? 'Zacznij Sesję'
                : t('timeTracker.timer.start', 'Start Pracy')}
            </button>
          ) : isPaused ? (
            <button
              onClick={handleResume}
              disabled={resumeMutation.isPending}
              className="group flex flex-1 items-center justify-center gap-3 rounded-2xl border border-[var(--app-accent)] bg-[var(--app-accent)] px-8 py-4 text-lg font-bold text-[var(--app-accent-text)] transition-all duration-300 hover:scale-105 hover:bg-[var(--app-accent-hover)] hover:shadow-[0_10px_30px_rgba(242,206,136,0.3)] active:scale-95 disabled:opacity-40"
            >
              <Play size={24} className="fill-[var(--app-accent-text)] transition-colors" />
              {t('timeTracker.timer.resume', 'Wznów Pracę')}
            </button>
          ) : (
            <button
              onClick={handlePause}
              disabled={pauseMutation.isPending}
              className="group flex flex-1 items-center justify-center gap-3 rounded-2xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] px-8 py-4 text-lg font-bold text-amber-500 shadow-sm transition-all duration-300 hover:scale-105 hover:border-amber-500/30 hover:bg-amber-500/5 active:scale-95 disabled:opacity-40"
            >
              <Pause size={24} className="fill-amber-500 transition-colors" />
              {t('timeTracker.timer.pause', 'Pauza')}
            </button>
          )}

          {(isRunning || isPaused) && (
            <button
              onClick={handleStop}
              disabled={stopMutation.isPending}
              className="group flex flex-[0.7] items-center justify-center gap-3 rounded-2xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] px-6 py-4 text-lg font-bold text-rose-500 shadow-sm transition-all duration-300 hover:scale-105 hover:border-rose-500/30 hover:bg-rose-500/5 active:scale-95 disabled:opacity-40"
            >
              <Square size={24} className="fill-rose-500 transition-colors" />
              {clockType === 'pomodoro' ? 'Zakończ' : t('timeTracker.timer.stop', 'Stop')}
            </button>
          )}

          {clockType === 'pomodoro' && (
            <button
              onClick={handleSkip}
              className="group rounded-2xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] p-4 text-[var(--app-text-primary)] shadow-sm transition-all hover:border-[var(--app-text-muted)] hover:bg-[var(--app-bg-card)]"
              title="Pomiń fazę"
            >
              <SkipForward size={24} className="transition-transform group-hover:scale-110" />
            </button>
          )}
        </div>
      </div>

      {/* SEKCJA 3: Ostatnie sesje (Historia) */}
      <div className="rounded-3xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center justify-between border-b border-[var(--app-divider)] pb-4">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--app-text-primary)]">
            <Activity size={18} className="text-[var(--app-accent)]" />
            {t('timeTracker.recentSessions', 'Ostatnio Zarejestrowane')}
          </h2>
          {myHistory.length > 0 && (
            <span className="rounded-md border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] px-2.5 py-1 text-xs font-bold text-[var(--app-text-muted)]">
              {myHistory.length} wpisów
            </span>
          )}
        </div>

        {myHistory.length === 0 ? (
          <div className="bg-[var(--app-bg-elevated)]/50 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-divider)] py-10">
            <Clock size={32} className="text-[var(--app-text-muted)]/40 mb-3" />
            <p className="text-sm font-medium text-[var(--app-text-muted)]">
              {t(
                'timeTracker.noSessions',
                'Nie masz jeszcze żadnych wpisów czasu. Rozpocznij pracę!'
              )}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedHistory.map((entry: any) => (
                <div
                  key={entry.id}
                  className="hover:border-[var(--app-accent)]/30 group flex flex-col justify-between rounded-2xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] p-4 transition-all duration-200 hover:bg-[var(--app-bg-card)] sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="mb-1 flex items-center gap-2 truncate text-[14px] font-semibold text-[var(--app-text-primary)] transition-colors group-hover:text-[var(--app-accent)]">
                      {entry.entryType === 'meeting' && (
                        <Calendar size={14} className="text-[var(--app-accent)]" />
                      )}
                      <span>{entry.taskTitle || 'Nieznane zadanie'}</span>
                      {entry.subtaskTitle && (
                        <span className="font-normal text-[var(--app-accent)]">
                          <span className="px-1 text-[var(--app-text-muted)]">/</span>
                          {entry.subtaskTitle}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-medium text-[var(--app-text-muted)]">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(entry.startedAt).toLocaleDateString('pl-PL', {
                          month: 'short',
                          day: 'numeric',
                        })}
                        <span className="mx-0.5">•</span>
                        {new Date(entry.startedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {entry.endedAt
                          ? ` - ${new Date(entry.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : ` - (Trwa)`}
                      </span>

                      <span className="rounded border border-[var(--app-divider)] bg-[var(--app-bg-card)] px-2 py-0.5">
                        {entry.projectRole === 'project_leader'
                          ? 'Lider Projektu'
                          : entry.projectRole === 'area_leader'
                            ? 'Lider Obszaru'
                            : 'Uczestnik'}
                      </span>

                      {entry.approvalStatus === 'pending' && (
                        <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-bold uppercase tracking-wider text-amber-500">
                          Oczekujące
                        </span>
                      )}
                      {entry.approvalStatus === 'approved' && (
                        <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-bold uppercase tracking-wider text-emerald-500">
                          Zatwierdzone
                        </span>
                      )}
                    </div>

                    {entry.description && (
                      <div className="border-[var(--app-accent)]/30 mt-2 line-clamp-1 border-l-2 pl-2 text-xs italic text-[var(--app-text-secondary)]">
                        {entry.description}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex-shrink-0 text-right sm:mt-0 sm:text-right">
                    <span className="bg-[var(--app-accent)]/10 border-[var(--app-accent)]/20 inline-flex items-center justify-center rounded-xl border px-4 py-2 font-mono text-lg font-bold text-[var(--app-accent)] shadow-sm">
                      {formatMinutes(entry.durationMinutes || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between border-t border-[var(--app-divider)] pt-6">
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--app-text-muted)]">
                  {t('common.page', 'Strona')} {historyPage} {t('common.of', 'z')} {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] p-2 text-[var(--app-text-primary)] transition-all hover:bg-[var(--app-bg-card)] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="mx-2 flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const page = i + 1
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= historyPage - 1 && page <= historyPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setHistoryPage(page)}
                            className={`h-8 w-8 rounded-xl text-xs font-black transition-all ${
                              historyPage === page
                                ? 'bg-[var(--app-accent)] text-white shadow-lg shadow-blue-500/20'
                                : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      } else if (page === historyPage - 2 || page === historyPage + 2) {
                        return (
                          <span
                            key={page}
                            className="self-center px-1 text-[var(--app-text-muted)]"
                          >
                            ...
                          </span>
                        )
                      }
                      return null
                    })}
                  </div>
                  <button
                    onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                    disabled={historyPage === totalPages}
                    className="rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] p-2 text-[var(--app-text-primary)] transition-all hover:bg-[var(--app-bg-card)] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
