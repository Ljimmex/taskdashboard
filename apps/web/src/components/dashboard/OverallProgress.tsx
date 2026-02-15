
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

interface OverallProgressProps {
    projects: any[]
    currentUserId?: string
}

// Helper to calculate progress strictly for the gauge
function calculateProgress(projects: any[]) {
    if (!projects || projects.length === 0) return { inProgress: 0, total: 0 }

    // In progress = status 'active'
    const inProgress = projects.filter(p => p.status === 'active').length
    const total = projects.length

    return { inProgress, total }
}

type DateRange = 'all_time' | 'last_year' | 'last_month' | 'last_week' | 'last_24h'

export function OverallProgress({
    projects = [],
    currentUserId,
}: OverallProgressProps) {
    const { t } = useTranslation()
    const [scope, setScope] = useState<'my_projects' | 'entire_workspace'>('my_projects')
    const [dateRange, setDateRange] = useState<DateRange>('last_week')

    // Filter projects based on scope and date range
    const filteredProjects = useMemo(() => {
        let result = projects;

        // 1. Filter by Scope
        if (scope === 'my_projects' && currentUserId) {
            result = result.filter(p =>
                p.ownerId === currentUserId ||
                p.members?.some((m: any) => (m.user?.id || m.id) === currentUserId)
            )
        }

        // 2. Filter by Date Range (using createdAt)
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

        if (cutoffDate) {
            result = result.filter(p => {
                if (!p.createdAt) return false // Assume null createdAt is old or invalid? Or maybe check startDate? 
                // Let's use createdAt as primary.
                return new Date(p.createdAt) >= cutoffDate!
            })
        }

        return result
    }, [projects, scope, currentUserId, dateRange])

    const { inProgress, total } = calculateProgress(filteredProjects)

    // Calculate progress percentage
    // Safeguard against division by zero
    const percentage = total > 0 ? Math.round((inProgress / total) * 100) : 0

    // Gauge Chart Dimensions (Scaled Up)
    const width = 340 // Increased from 280
    const height = 180 // Increased from 140
    const cx = width / 2
    const cy = height - 20
    const r = 130 // Increased from 100
    const strokeWidth = 25 // Increased from 20

    // Calculate arc path
    // Arc goes from -180 (left) to 0 (right) degrees, covering 180 degrees
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

    // Background Arc (Full semi-circle)
    const bgArc = describeArc(cx, cy, r, 0, 180)

    // Progress Arc
    // Map percentage 0-100 to angle 0-180
    const progressAngle = (percentage / 100) * 180
    const progressArc = describeArc(cx, cy, r, 0, progressAngle)

    // Marker Position (End of progress arc)
    // Used for the small line/marker at the tip
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
        <div className="rounded-2xl bg-[#12121a] p-5 h-[340px] flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">{t('dashboard.overallProgress')}</h3>
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
                        stroke="#3B82F6" // Blue color
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />

                    {/* Marker at the end of progress */}
                    <line
                        x1={markerStart.x}
                        y1={markerStart.y}
                        x2={markerEnd.x}
                        y2={markerEnd.y}
                        stroke="#22C55E" // Green Marker
                        strokeWidth="5"
                        strokeLinecap="round"
                    />

                </svg>

                {/* Center Text */}
                <div className="absolute bottom-0 flex flex-col items-center justify-end h-full pb-4">
                    <span className="text-5xl font-bold text-white mb-2">{percentage}%</span>
                    <span className="text-xs text-gray-400 bg-[#1a1a24] px-2 py-1 rounded">
                        {t('dashboard.occupancyRate', { count: inProgress, total: total })}
                    </span>
                </div>
            </div>
        </div>
    )
}
