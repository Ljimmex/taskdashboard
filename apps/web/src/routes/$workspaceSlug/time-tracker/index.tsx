import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { Clock, Play, Square, ChevronDown, PieChart } from 'lucide-react'
import { DueDatePicker } from '@/components/features/tasks/components/DueDatePicker'

export const Route = createFileRoute('/$workspaceSlug/time-tracker/')({
    component: TimeTrackerPage,
})

// ─── Types ────────────────────────────────────────────────────────────

interface MyTask {
    id: string
    title: string
    status: string
    priority: string
    projectId: string
    projectName: string
    subtasks: { id: string; title: string; isCompleted: boolean }[]
}

interface RevShareParticipant {
    userId: string
    name: string
    image: string | null
    role: string
    totalMinutes: number
    totalHours: number
    influencePoints: number
    sharePercent: number
}

interface TimeEntryRaw {
    id: string
    taskId: string
    subtaskId: string | null
    userId: string
    description: string | null
    durationMinutes: number
    startedAt: string
    endedAt: string | null
    taskTitle: string
    subtaskTitle: string | null
    userName: string
    userImage: string | null
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ─── Main Component ─────────────────────────────────────────────────

function TimeTrackerPage() {
    const { t } = useTranslation()
    const { workspaceSlug } = Route.useParams()
    const { data: session } = useSession()
    const userId = session?.user?.id

    const [view, setView] = useState<'member' | 'manual' | 'owner'>('member')

    // Check workspace role
    const { data: workspaceData } = useQuery({
        queryKey: ['workspace-role', workspaceSlug, userId],
        queryFn: () => apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`),
        enabled: !!workspaceSlug && !!userId,
    })
    const userRole = workspaceData?.userRole
    const canViewDashboard = userRole === 'owner' || userRole === 'admin'
    // HR Manager or higher can manage time for others
    const canManageOtherTime = ['owner', 'admin', 'project_manager', 'hr_manager'].includes(userRole)

    return (
        <div className="flex flex-col h-full bg-[var(--app-bg-deepest)]">
            {/* Header — ProjectsHeader style */}
            <div className="flex items-center justify-between px-6 py-4 relative z-50">
                {/* Left side — View Toggle (pill style) */}
                <div className="flex bg-[#1a1a24] p-1 rounded-full">
                    <button
                        onClick={() => setView('member')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${view === 'member'
                            ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                            : 'text-gray-500 hover:text-white'
                            }`}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={view === 'member' ? '#0a0a0f' : '#9E9E9E'} strokeWidth="2">
                            <circle cx="12" cy="12" r="9" />
                            <polyline points="12 7 12 12 15 15" />
                        </svg>
                        {t('timeTracker.myTimer', 'My Timer')}
                    </button>

                    <button
                        onClick={() => setView('manual')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${view === 'manual'
                            ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                            : 'text-gray-500 hover:text-white'
                            }`}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={view === 'manual' ? '#0a0a0f' : '#9E9E9E'} strokeWidth="2">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 Z" />
                        </svg>
                        {t('timeTracker.manualEntry', 'Manual Entry')}
                    </button>

                    {canViewDashboard && (
                        <button
                            onClick={() => setView('owner')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${view === 'owner'
                                ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                                : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={view === 'owner' ? '#0a0a0f' : '#9E9E9E'} strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            {t('timeTracker.dashboard', 'Dashboard')}
                        </button>
                    )}
                </div>

                {/* Right side — placeholder for future controls */}
                <div className="flex items-center gap-3" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {view === 'member' ? (
                    <MemberTimerView workspaceSlug={workspaceSlug} userId={userId || ''} />
                ) : view === 'manual' ? (
                    <ManualEntryView workspaceSlug={workspaceSlug} userId={userId || ''} canManage={canManageOtherTime} />
                ) : (
                    <OwnerDashboardView workspaceSlug={workspaceSlug} userId={userId || ''} />
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════
// MEMBER TIMER VIEW
// ═══════════════════════════════════════════════════════════════════════

function MemberTimerView({ workspaceSlug, userId }: { workspaceSlug: string; userId: string }) {
    const { t } = useTranslation()
    const queryClient = useQueryClient()

    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null)
    const [isRunning, setIsRunning] = useState(false)
    const [activeEntryId, setActiveEntryId] = useState<string | null>(null)
    const [elapsed, setElapsed] = useState(0)
    const [taskDropdownOpen, setTaskDropdownOpen] = useState(false)

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
                    setIsRunning(true)
                    startTimeRef.current = data.startTime
                }
            }
        } catch { /* ignore */ }
    }, [userId])

    // Timer tick
    useEffect(() => {
        // Run ticker more frequently (e.g., 50ms) so the analog second hand smoothly sweeps
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
    })
    // Filter out 'done' tasks
    const myTasks = (tasksData?.data || []).filter((t: MyTask) => t.status !== 'done')

    // Fetch my time entries (history)
    const { data: historyData } = useQuery({
        queryKey: ['my-time-entries', userId],
        queryFn: () => apiFetchJson<{ success: boolean; data: any[]; totalMinutes: number }>('/api/time'),
        enabled: !!userId,
    })
    const myHistory = historyData?.data || []

    const paginatedHistory = useMemo(() => {
        const start = (historyPage - 1) * itemsPerPage
        return myHistory.slice(start, start + itemsPerPage)
    }, [myHistory, historyPage])
    const totalPages = Math.ceil(myHistory.length / itemsPerPage)

    const selectedTask = myTasks.find((t: MyTask) => t.id === selectedTaskId)

    // Start timer
    const startMutation = useMutation({
        mutationFn: (body: { taskId: string; subtaskId?: string | null }) =>
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
                    startTime: now,
                }))
            }
        },
    })

    // Stop timer
    const stopMutation = useMutation({
        mutationFn: (entryId: string) =>
            apiFetchJson<{ success: boolean; data: any }>(`/api/time/${entryId}/stop`, { method: 'PATCH' }),
        onSuccess: () => {
            setIsRunning(false)
            setActiveEntryId(null)
            setElapsed(0)
            startTimeRef.current = 0
            localStorage.removeItem(`tt_${userId}`)
            queryClient.invalidateQueries({ queryKey: ['my-time-entries'] })
        },
    })

    const handleStart = useCallback(() => {
        if (!selectedTaskId) return
        startMutation.mutate({ taskId: selectedTaskId, subtaskId: selectedSubtaskId })
    }, [selectedTaskId, selectedSubtaskId, startMutation])

    const handleStop = useCallback(() => {
        if (!activeEntryId) return
        stopMutation.mutate(activeEntryId)
    }, [activeEntryId, stopMutation])

    // Analog Clock Calculation
    // We base the hands purely on elapsed time to create a stopwatch effect.
    // elapsed is in total seconds (with decimals).
    const hr = Math.floor(elapsed / 3600)
    const min = Math.floor((elapsed % 3600) / 60)
    const sec = elapsed % 60

    // Degrees
    const secDeg = sec * 6 // 360 / 60
    const minDeg = min * 6 + (sec / 60) * 6
    const hrDeg = (hr % 12) * 30 + (min / 60) * 30

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Task Selector */}
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
                        {selectedTask ? (
                            <div className="flex flex-col">
                                <span className="font-medium text-[var(--app-text-primary)]">
                                    {selectedTask.title}
                                </span>
                                <span className="text-xs text-[var(--app-text-muted)] mt-0.5">
                                    {selectedTask.projectName}
                                    {selectedSubtaskId && selectedTask.subtasks.find((s) => s.id === selectedSubtaskId) && (
                                        <span className="text-[var(--app-accent)]"> → {selectedTask.subtasks.find((s) => s.id === selectedSubtaskId)?.title}</span>
                                    )}
                                </span>
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
                                myTasks.map((task: MyTask) => (
                                    <div key={task.id} className="border-b border-[var(--app-border)] last:border-0">
                                        <button
                                            onClick={() => {
                                                setSelectedTaskId(task.id)
                                                setSelectedSubtaskId(null)
                                                setTaskDropdownOpen(false)
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-[var(--app-bg-deepest)] flex flex-col"
                                        >
                                            <span className="font-medium text-[var(--app-text-primary)]">{task.title}</span>
                                            <span className="text-xs text-[var(--app-text-muted)] mt-0.5">{task.projectName} • {task.status}</span>
                                        </button>
                                        {task.subtasks.length > 0 && (
                                            <div className="bg-[var(--app-bg-deepest)]/50 pb-2">
                                                {task.subtasks.map(sub => (
                                                    <button
                                                        key={sub.id}
                                                        onClick={() => {
                                                            setSelectedTaskId(task.id)
                                                            setSelectedSubtaskId(sub.id)
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
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Timer Display */}
            <div className="bg-[var(--app-bg-card)] rounded-2xl p-8 shadow-sm text-center flex flex-col items-center relative">

                {/* Timer Type Toggle */}
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
                        {/* Analog Clock Face */}
                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                            {/* Outer Ring */}
                            <circle cx="50" cy="50" r="48" fill="transparent" stroke={isRunning ? "var(--app-accent)" : "var(--app-border)"} strokeWidth="2" className="transition-colors duration-500" />
                            <circle cx="50" cy="50" r="40" fill="var(--app-bg-deepest)" />

                            {/* Digital fallback inside clock */}
                            <text x="50" y="65" textAnchor="middle" fill="var(--app-text-muted)" fontSize="8" fontFamily="monospace" fontWeight="bold">
                                {formatTime(Math.floor(elapsed))}
                            </text>

                            {/* Clock Markers (12 hrs) */}
                            {Array.from({ length: 12 }).map((_, i) => (
                                <line key={i} x1="50" y1="12" x2="50" y2="15" stroke="var(--app-text-muted)" strokeWidth="1" strokeLinecap="round" transform={`rotate(${i * 30} 50 50)`} />
                            ))}

                            {/* Minute Markers (60 mins) */}
                            {Array.from({ length: 60 }).map((_, i) => i % 5 !== 0 && (
                                <line key={i} x1="50" y1="11" x2="50" y2="13" stroke="var(--app-border-hover)" strokeWidth="0.5" transform={`rotate(${i * 6} 50 50)`} />
                            ))}

                            {/* Center Dot */}
                            <circle cx="50" cy="50" r="3" fill="var(--app-accent)" />

                            {/* Hour Hand */}
                            <line x1="50" y1="50" x2="50" y2="28" stroke="var(--app-text-primary)" strokeWidth="3" strokeLinecap="round" transform={`rotate(${hrDeg} 50 50)`} />

                            {/* Minute Hand */}
                            <line x1="50" y1="50" x2="50" y2="20" stroke="var(--app-text-secondary)" strokeWidth="2" strokeLinecap="round" transform={`rotate(${minDeg} 50 50)`} />

                            {/* Second Hand (Smooth sweep) */}
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
                        {selectedSubtaskId && selectedTask.subtasks.find((s) => s.id === selectedSubtaskId) && (
                            <span className="text-[var(--app-accent)]"> → {selectedTask.subtasks.find((s) => s.id === selectedSubtaskId)?.title}</span>
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

            {/* History */}
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
                                            <span>{entry.taskTitle || 'Unknown Task'}</span>
                                            {entry.subtaskTitle && (
                                                <>
                                                    <span className="text-[var(--app-text-muted)] text-xs">→</span>
                                                    <span className="text-[var(--app-accent)]">{entry.subtaskTitle}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="text-xs text-[var(--app-text-muted)] mt-1">
                                            {new Date(entry.startedAt).toLocaleDateString()} • {new Date(entry.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {entry.endedAt ? ` — ${new Date(entry.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ` — (In progress)`}
                                        </div>
                                    </div>
                                    <div className="text-sm font-bold text-[var(--app-accent)] ml-4 whitespace-nowrap bg-[var(--app-accent)]/10 px-3 py-1.5 rounded-lg">
                                        {formatMinutes(entry.durationMinutes || 0)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination Controls */}
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
                                        // Simple windowing for many pages -> always show first, last, and +/- 1
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

// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// MANUAL ENTRY VIEW
// ═══════════════════════════════════════════════════════════════════════

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

function ManualEntryView({ workspaceSlug, userId, canManage }: { workspaceSlug: string; userId: string; canManage: boolean }) {
    const { t } = useTranslation()
    const queryClient = useQueryClient()

    const [selectedUserId, setSelectedUserId] = useState<string>(userId)
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null)
    const [taskDropdownOpen, setTaskDropdownOpen] = useState(false)
    const [userDropdownOpen, setUserDropdownOpen] = useState(false)
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
                queryClient.invalidateQueries({ queryKey: ['my-time-entries'] })
                queryClient.invalidateQueries({ queryKey: ['project-time-entries'] })
                queryClient.invalidateQueries({ queryKey: ['revshare'] })

                alert('Success!')
            }
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
                                            {selectedSubtaskId && selectedTask.subtasks.find((s) => s.id === selectedSubtaskId) && (
                                                <span className="text-[var(--app-accent)]"> → {selectedTask.subtasks.find((s) => s.id === selectedSubtaskId)?.title}</span>
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
                                        myTasks.map((task: MyTask) => (
                                            <div key={task.id} className="border-b border-[var(--app-border)] last:border-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedTaskId(task.id)
                                                        setSelectedSubtaskId(null)
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
                                            </div>
                                        ))
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

// ═══════════════════════════════════════════════════════════════════════
// OWNER DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════════════════

function OwnerDashboardView({ workspaceSlug, userId }: { workspaceSlug: string; userId: string }) {
    const { t } = useTranslation()
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)

    // Fetch projects
    const { data: projectsData } = useQuery({
        queryKey: ['projects', workspaceSlug],
        queryFn: () => apiFetchJson<any>(`/api/projects?workspaceSlug=${workspaceSlug}`),
        enabled: !!workspaceSlug && !!userId,
    })
    const projects = projectsData?.data || []

    // Fetch revshare data
    const { data: revshareData, isLoading: revshareLoading } = useQuery({
        queryKey: ['revshare', selectedProjectId],
        queryFn: () => apiFetchJson<{ success: boolean; data: { participants: RevShareParticipant[]; totalIP: number } }>(`/api/time/revshare/${selectedProjectId}`),
        enabled: !!selectedProjectId,
    })

    // Fetch project time entries
    const { data: entriesData } = useQuery({
        queryKey: ['project-time-entries', selectedProjectId],
        queryFn: () => apiFetchJson<{ success: boolean; data: TimeEntryRaw[] }>(`/api/time/project/${selectedProjectId}`),
        enabled: !!selectedProjectId,
    })

    const participants = revshareData?.data?.participants || []
    const totalIP = revshareData?.data?.totalIP || 0
    const entries = entriesData?.data || []

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Project Selector */}
            <div className="bg-[var(--app-bg-card)] rounded-2xl p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-[var(--app-text-muted)] uppercase tracking-wider mb-3">
                    {t('timeTracker.selectProject', 'Select Project')}
                </h2>
                <div className="relative">
                    <button
                        onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                        className={`w-full flex items-center justify-between px-4 py-3 bg-[var(--app-bg-elevated)] border rounded-xl text-left transition-all ${projectDropdownOpen ? 'border-[var(--app-accent)] ring-1 ring-[var(--app-accent)]' : 'border-[var(--app-border)] hover:border-[var(--app-border-hover)]'
                            }`}
                    >
                        {selectedProjectId ? (
                            <span className="font-medium text-[var(--app-text-primary)]">
                                {projects.find((p: any) => p.id === selectedProjectId)?.name || selectedProjectId}
                            </span>
                        ) : (
                            <span className="text-[var(--app-text-muted)]">
                                {t('timeTracker.pickProject', '— Select a project —')}
                            </span>
                        )}
                        <ChevronDown size={20} className={`text-[var(--app-text-muted)] transition-transform duration-200 ${projectDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {projectDropdownOpen && (
                        <div className="absolute z-50 w-full mt-2 bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] max-h-80 overflow-y-auto custom-scrollbar">
                            {projects.length === 0 ? (
                                <div className="p-4 text-center text-sm text-[var(--app-text-muted)]">
                                    {t('timeTracker.noProjects', 'No projects available.')}
                                </div>
                            ) : (
                                projects.map((p: any) => (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            setSelectedProjectId(p.id)
                                            setProjectDropdownOpen(false)
                                        }}
                                        className={`w-full px-4 py-3 text-left hover:bg-[var(--app-bg-deepest)] font-medium transition-colors flex items-center justify-between ${selectedProjectId === p.id ? 'text-[var(--app-accent)] bg-[var(--app-bg-deepest)]' : 'text-[var(--app-text-primary)]'
                                            }`}
                                    >
                                        <span>{p.name}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {!selectedProjectId && (
                <div className="text-center py-16 text-[var(--app-text-muted)]">
                    <PieChart size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">{t('timeTracker.noProjectSelected', 'Select a project to view data')}</p>
                </div>
            )}

            {selectedProjectId && revshareLoading && (
                <div className="text-center py-16 text-[var(--app-text-muted)] animate-pulse">Loading...</div>
            )}

            {selectedProjectId && !revshareLoading && (
                <>
                    {/* Revenue Share Table */}
                    <div className="bg-[var(--app-bg-card)] rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-[var(--app-text-muted)] uppercase tracking-wider flex items-center gap-2">
                                <PieChart size={14} />
                                {t('timeTracker.revshareTitle', 'Revenue Share')}
                            </h2>
                            <span className="text-xs text-[var(--app-text-muted)]">
                                {t('timeTracker.totalIP', 'Total Influence Points (IP)')}: <span className="font-bold text-[var(--app-accent)]">{totalIP}</span>
                            </span>
                        </div>

                        {participants.length === 0 ? (
                            <p className="text-sm text-[var(--app-text-muted)] text-center py-8">
                                {t('timeTracker.noData', 'No time entries for this project yet.')}
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-[var(--app-border)]">
                                            <th className="text-left pb-3 text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">{t('timeTracker.member', 'Member')}</th>
                                            <th className="text-left pb-3 text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">{t('timeTracker.role', 'Role')}</th>
                                            <th className="text-right pb-3 text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">{t('timeTracker.hours', 'Hours')}</th>
                                            <th className="text-right pb-3 text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">{t('timeTracker.influencePoints', 'Influence Points')}</th>
                                            <th className="text-right pb-3 text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">{t('timeTracker.share', 'Share')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {participants.map((p) => (
                                            <tr key={p.userId} className="border-b border-[var(--app-border)]/50 hover:bg-[var(--app-bg-elevated)]/50 transition-colors">
                                                <td className="py-3 pr-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-[var(--app-accent)]/10 flex items-center justify-center text-sm font-bold text-[var(--app-accent)] overflow-hidden">
                                                            {p.image ? (
                                                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                p.name?.charAt(0)?.toUpperCase() || '?'
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-medium text-[var(--app-text-primary)]">{p.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <span className="px-2 py-1 rounded-lg text-xs font-medium bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] capitalize">
                                                        {p.role.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right text-sm font-medium text-[var(--app-text-primary)]">
                                                    {p.totalHours}h
                                                </td>
                                                <td className="py-3 text-right text-sm font-medium text-[var(--app-accent)]">
                                                    {p.influencePoints}
                                                </td>
                                                <td className="py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="w-16 h-2 rounded-full bg-[var(--app-bg-elevated)] overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full bg-[var(--app-accent)] transition-all"
                                                                style={{ width: `${Math.min(p.sharePercent, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-bold text-[var(--app-text-primary)] min-w-[3rem] text-right">
                                                            {p.sharePercent}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Distribution Chart */}
                    {participants.length > 0 && (
                        <div className="bg-[var(--app-bg-card)] rounded-2xl p-6 shadow-sm">
                            <h2 className="text-sm font-semibold text-[var(--app-text-muted)] uppercase tracking-wider mb-4">
                                {t('timeTracker.distribution', 'Distribution')}
                            </h2>
                            <div className="space-y-2">
                                {participants.map((p, i) => {
                                    const colors = ['var(--app-accent)', '#10b981', '#3b82f6', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4', '#84cc16']
                                    return (
                                        <div key={p.userId} className="flex items-center gap-3">
                                            <span className="text-xs text-[var(--app-text-muted)] w-24 truncate">{p.name}</span>
                                            <div className="flex-1 h-6 rounded-lg bg-[var(--app-bg-elevated)] overflow-hidden">
                                                <div
                                                    className="h-full rounded-lg transition-all duration-500 flex items-center px-2"
                                                    style={{ width: `${Math.max(p.sharePercent, 3)}%`, backgroundColor: colors[i % colors.length] }}
                                                >
                                                    {p.sharePercent > 8 && (
                                                        <span className="text-[11px] font-black text-[#0a0a0f]">{p.sharePercent}%</span>
                                                    )}
                                                </div>
                                            </div>
                                            {p.sharePercent <= 8 && (
                                                <span className="text-xs font-bold text-[var(--app-text-muted)]">{p.sharePercent}%</span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* All Time Entries */}
                    <div className="bg-[var(--app-bg-card)] rounded-2xl p-6 shadow-sm">
                        <h2 className="text-sm font-semibold text-[var(--app-text-muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Clock size={14} />
                            {t('timeTracker.allEntries', 'All Time Entries')}
                        </h2>

                        {entries.length === 0 ? (
                            <p className="text-sm text-[var(--app-text-muted)] text-center py-8">
                                {t('timeTracker.noEntries', 'No time entries for this project.')}
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                                {entries.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--app-bg-elevated)] border border-[var(--app-border)] hover:border-[var(--app-accent)]/20 transition-all"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-7 h-7 rounded-full bg-[var(--app-accent)]/10 flex items-center justify-center text-xs font-bold text-[var(--app-accent)] flex-shrink-0 overflow-hidden">
                                                {entry.userImage ? (
                                                    <img src={entry.userImage} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    entry.userName?.charAt(0)?.toUpperCase() || '?'
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-medium text-[var(--app-text-primary)] truncate">
                                                    {entry.taskTitle}
                                                    {entry.subtaskTitle && (
                                                        <span className="text-[var(--app-accent)]"> → {entry.subtaskTitle}</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-[var(--app-text-muted)]">
                                                    {entry.userName} • {new Date(entry.startedAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-[var(--app-accent)] ml-4 whitespace-nowrap">
                                            {formatMinutes(entry.durationMinutes)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
