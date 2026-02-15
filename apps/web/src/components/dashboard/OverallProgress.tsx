import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChecklistIcon, HistoryIcon, FoldersIcon, CalendarSmallIcon } from './icons'

interface OverallProgressProps {
    inProgress?: number
    totalProjects?: number
    upcoming?: number
}

// Chart data points - more points for smoother curve
const chartData = [5, 8, 6, 12, 10, 15, 13, 18, 14, 20, 17, 22, 19, 25]
const chartLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function OverallProgress({
    inProgress = 24,
    totalProjects = 45,
    upcoming = 12
}: OverallProgressProps) {
    const { t } = useTranslation()
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(9) // Show tooltip by default

    // Calculate chart dimensions - BIGGER
    const chartWidth = 280
    const chartHeight = 140
    const maxValue = Math.max(...chartData)
    const minValue = Math.min(...chartData)
    const range = maxValue - minValue || 1

    // Generate SVG path for smooth curve
    const points = chartData.map((value, index) => {
        const x = (index / (chartData.length - 1)) * chartWidth
        const y = chartHeight - ((value - minValue) / range) * (chartHeight - 30) - 15
        return { x, y, value }
    })

    // Create smooth bezier curve path
    const createSmoothPath = (pts: typeof points) => {
        if (pts.length < 2) return ''

        let path = `M ${pts[0].x} ${pts[0].y}`

        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1]
            const curr = pts[i]
            const cpx1 = prev.x + (curr.x - prev.x) / 3
            const cpx2 = prev.x + (2 * (curr.x - prev.x)) / 3
            path += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`
        }

        return path
    }

    const linePath = createSmoothPath(points)
    const areaPath = `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`

    return (
        <div className="rounded-2xl bg-[#12121a] p-5 h-[296px] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">{t('dashboard.overallProgress')}</h3>
                <a href="#" className="text-xs text-gray-500 hover:text-[#F2CE88] transition-colors">
                    {t('dashboard.seeAll')}
                </a>
            </div>

            {/* Dropdown with calendar icon */}
            <button className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-4 w-fit px-2 py-1 rounded bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
                <CalendarSmallIcon />
                {t('dashboard.last7Days')}
                <span className="ml-1 text-[8px]">▼</span>
            </button>

            {/* Content: Stats + Chart */}
            <div className="flex flex-1 gap-3">
                {/* Stats Column */}
                <div className="flex flex-col gap-3 flex-shrink-0 w-[130px]">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <ChecklistIcon />
                        </div>
                        <span className="text-xs text-gray-400">{inProgress} {t('dashboard.inProgress')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gray-800/50 flex items-center justify-center">
                            <HistoryIcon />
                        </div>
                        <span className="text-xs text-gray-400">{totalProjects} {t('dashboard.totalProjects')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gray-800/50 flex items-center justify-center">
                            <FoldersIcon />
                        </div>
                        <span className="text-xs text-gray-400">{upcoming} {t('dashboard.upcoming')}</span>
                    </div>
                </div>

                {/* Chart - BIGGER */}
                <div className="flex-1 flex flex-col justify-end min-w-0">
                    <div className="relative">
                        <svg
                            width="100%"
                            height={chartHeight}
                            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                            preserveAspectRatio="xMidYMid meet"
                            className="overflow-visible"
                        >
                            {/* Gradient definition */}
                            <defs>
                                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#F2CE88" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#F2CE88" stopOpacity="0.02" />
                                </linearGradient>
                            </defs>

                            {/* Area fill */}
                            <path d={areaPath} fill="url(#chartGradient)" />

                            {/* Line - thicker for better visibility */}
                            <path
                                d={linePath}
                                fill="none"
                                stroke="#F2CE88"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            {/* Interactive points - only on key positions */}
                            {[0, 2, 4, 6, 9, 11, 13].map((idx) => {
                                const point = points[idx]
                                if (!point) return null
                                return (
                                    <g key={idx}>
                                        <circle
                                            cx={point.x}
                                            cy={point.y}
                                            r={hoveredPoint === idx ? 6 : 4}
                                            fill={hoveredPoint === idx ? "#F2CE88" : "#12121a"}
                                            stroke="#F2CE88"
                                            strokeWidth="2"
                                            className="cursor-pointer transition-all"
                                            onMouseEnter={() => setHoveredPoint(idx)}
                                            onMouseLeave={() => setHoveredPoint(9)}
                                        />
                                        {/* Tooltip */}
                                        {hoveredPoint === idx && (
                                            <g>
                                                <rect
                                                    x={point.x - 14}
                                                    y={point.y - 30}
                                                    width="28"
                                                    height="20"
                                                    rx="5"
                                                    fill="#F2CE88"
                                                />
                                                <polygon
                                                    points={`${point.x - 5},${point.y - 10} ${point.x + 5},${point.y - 10} ${point.x},${point.y - 4}`}
                                                    fill="#F2CE88"
                                                />
                                                <text
                                                    x={point.x}
                                                    y={point.y - 16}
                                                    textAnchor="middle"
                                                    fontSize="11"
                                                    fontWeight="bold"
                                                    fill="#000"
                                                >
                                                    {point.value}
                                                </text>
                                            </g>
                                        )}
                                    </g>
                                )
                            })}
                        </svg>
                    </div>

                    {/* X-axis labels */}
                    <div className="flex justify-between mt-2 px-1">
                        {chartLabels.map((label, index) => (
                            <span
                                key={index}
                                className="text-[10px] text-gray-600"
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
