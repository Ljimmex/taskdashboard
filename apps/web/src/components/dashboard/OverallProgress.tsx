import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarSmallIcon } from './icons'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'


interface OverallProgressProps {
    projects: any[]
    currentUserId?: string
    workspaceSlug?: string
}

type DateRange = 'all_time' | 'last_year' | 'last_month' | 'last_week' | 'last_24h'

export function OverallProgress({
    projects = [],
    currentUserId,
    workspaceSlug
}: OverallProgressProps) {
    const { t } = useTranslation()
    const [scope, setScope] = useState<'my_projects' | 'entire_workspace'>('my_projects')
    const [dateRange, setDateRange] = useState<DateRange>('last_week')

    // Fetch tasks
    const { data: tasks = [] } = useTasks(workspaceSlug)

    // Build a map of project stages to identify "final" (done) stages
    const projectFinalStages = useMemo(() => {
        const map = new Map<string, Set<string>>() // projectId -> Set<stageId> (final stages)
        projects.forEach(p => {
            const finalStageIds = new Set<string>()
            let maxPositionStage: any = null

            if (p.stages && Array.isArray(p.stages) && p.stages.length > 0) {
                p.stages.forEach((s: any) => {
                    if (s.isFinal) finalStageIds.add(s.id)

                    // Track max position stage as fallback
                    if (!maxPositionStage || (s.position !== undefined && s.position > maxPositionStage.position)) {
                        maxPositionStage = s
                    }
                })

                // Fallback: If no stage is explicitly final, use the one with highest position
                // This handles user-created projects where stages default to isFinal: false
                if (finalStageIds.size === 0 && maxPositionStage) {
                    finalStageIds.add(maxPositionStage.id)
                }
            }
            map.set(p.id, finalStageIds)
        })
        return map
    }, [projects])

    // Filter projects based on scope (to know which tasks to include)
    const validProjectIds = useMemo(() => {
        let result = projects;

        // Filter by Scope (My Projects vs All)
        if (scope === 'my_projects' && currentUserId) {
            result = result.filter(p =>
                p.ownerId === currentUserId ||
                p.members?.some((m: any) => (m.user?.id || m.id) === currentUserId)
            )
        }
        return new Set(result.map(p => p.id))
    }, [projects, scope, currentUserId])

    // Calculate Task Stats
    const stats = useMemo(() => {
        const now = new Date()
        let cutoffDate: Date | null = null

        switch (dateRange) {
            case 'last_year':
                cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1))
                break
            case 'last_month':
                cutoffDate = new Date(now.setMonth(now.getMonth() - 1))
                break
            case 'last_week':
                cutoffDate = new Date(now.setDate(now.getDate() - 7))
                break
            case 'last_24h':
                cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
                break
            case 'all_time':
            default:
                cutoffDate = null
        }

        let filteredTasks = tasks.filter(task => {
            // 1. Must belong to a valid project (based on scope)
            if (!validProjectIds.has(task.projectId)) return false

            // 2. Date Filter (Created At)
            if (cutoffDate && (!task.createdAt || new Date(task.createdAt) < cutoffDate)) return false

            return true
        })

        const total = filteredTasks.length
        const completed = filteredTasks.filter(task => {
            const finalStages = projectFinalStages.get(task.projectId)
            // Check if status is "done", "completed" OR matches a final stage ID
            // Check if status is "done", "completed" OR matches a final stage ID
            const status = task.status as string
            return status === 'done' ||
                status === 'completed' ||
                (finalStages && task.status && finalStages.has(task.status))
        }).length

        return { total, completed }
    }, [tasks, validProjectIds, dateRange, projectFinalStages])

    // Calculate progress percentage
    const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

    // Gauge Chart Dimensions
    const width = 340
    const height = 180
    const cx = width / 2
    const cy = height - 20
    const r = 130
    const strokeWidth = 25

    // Calculate arc path
    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 180) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }

    const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        const d = [
            "M", start.x, start.y,
            "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
        ].join(" ");

        return d;
    }

    const bgArc = describeArc(cx, cy, r, 0, 180)
    const progressAngle = (percentage / 100) * 180
    const progressArc = describeArc(cx, cy, r, 0, progressAngle)

    // Marker Position
    const markerStart = polarToCartesian(cx, cy, r - strokeWidth / 2, progressAngle)
    const markerEnd = polarToCartesian(cx, cy, r + strokeWidth / 2, progressAngle)

    const getDateRangeLabel = (range: DateRange) => {
        switch (range) {
            case 'all_time': return t('dashboard.allTime')
            case 'last_year': return t('dashboard.lastYear')
            case 'last_month': return t('dashboard.lastMonth')
            case 'last_week': return t('dashboard.lastWeek')
            case 'last_24h': return t('dashboard.last24h')
            default: return t('dashboard.allTime')
        }
    }

    return (
        <div className="rounded-2xl bg-[#12121a] p-5 h-[340px] flex flex-col overflow-hidden relative transition-all duration-300 hover:shadow-lg hover:shadow-black/20">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Postęp Zadań</h3>
                {/* Scope Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#F2CE88] transition-colors outline-none cursor-pointer">
                            {scope === 'my_projects' ? t('dashboard.myProjects') : t('dashboard.entireWorkspace')} <ChevronDown size={14} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#12121a] border-[#272732] text-white">
                        <DropdownMenuItem
                            className="hover:bg-[#1a1a24] cursor-pointer"
                            onClick={() => setScope('my_projects')}
                        >
                            {t('dashboard.myProjects')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="hover:bg-[#1a1a24] cursor-pointer"
                            onClick={() => setScope('entire_workspace')}
                        >
                            {t('dashboard.entireWorkspace')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Date Range Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-2 w-fit px-2 py-1 rounded bg-gray-800/30 hover:bg-gray-800/50 transition-colors outline-none cursor-pointer">
                        <CalendarSmallIcon />
                        {getDateRangeLabel(dateRange)}
                        <span className="ml-1 text-[8px]">▼</span>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-[#12121a] border-[#272732] text-white z-50">
                    <DropdownMenuItem className="hover:bg-[#1a1a24] cursor-pointer" onClick={() => setDateRange('all_time')}>{t('dashboard.allTime')}</DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-[#1a1a24] cursor-pointer" onClick={() => setDateRange('last_year')}>{t('dashboard.lastYear')}</DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-[#1a1a24] cursor-pointer" onClick={() => setDateRange('last_month')}>{t('dashboard.lastMonth')}</DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-[#1a1a24] cursor-pointer" onClick={() => setDateRange('last_week')}>{t('dashboard.lastWeek')}</DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-[#1a1a24] cursor-pointer" onClick={() => setDateRange('last_24h')}>{t('dashboard.last24h')}</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Gauge Chart Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative mt-4">
                <svg width={width} height={height} className="overflow-visible">
                    {/* Background Arc */}
                    <path
                        d={bgArc}
                        fill="none"
                        stroke="#1E1E29"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />

                    {/* Progress Arc */}
                    <path
                        d={progressArc}
                        fill="none"
                        stroke="#F2CE88" // Amber/Gold Color
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(242, 206, 136, 0.2))' }}
                    />

                    {/* Marker at the end of progress */}
                    <line
                        x1={markerStart.x}
                        y1={markerStart.y}
                        x2={markerEnd.x}
                        y2={markerEnd.y}
                        stroke="#FFF" // White Marker
                        strokeWidth="4"
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />

                </svg>

                {/* Center Text */}
                <div className="absolute bottom-0 flex flex-col items-center justify-end h-full pb-4">
                    <span className="text-5xl font-bold text-white mb-2 tracking-tight">{percentage}%</span>
                    <span className="text-xs text-gray-400 bg-[#1a1a24] px-3 py-1.5 rounded-full">
                        {t('dashboard.completed')}: {stats.completed} / {stats.total}
                    </span>
                </div>
            </div>
        </div>
    );
}
