import { useState } from 'react'

interface OverallProgressProps {
    inProgress?: number
    totalProjects?: number
    upcoming?: number
}

// SVG Icons for stats
const ChecklistIcon = () => (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="3" fill="#7A664E" />
        <path d="M9 10.5L11 12.5L15 8.5" stroke="#F2CE88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 16.5L11 18.5L15 14.5" stroke="#F2CE88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 22.5L11 24.5L15 20.5" stroke="#F2CE88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="18" y="10" width="8" height="2" rx="1" fill="#F2CE88" />
        <rect x="18" y="16" width="8" height="2" rx="1" fill="#F2CE88" />
        <rect x="18" y="22" width="6" height="2" rx="1" fill="#F2CE88" />
    </svg>
)

const HistoryIcon = () => (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
        <path d="M16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28C22.6274 28 28 22.6274 28 16" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
        <path d="M28 10V16H22" stroke="#545454" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="16" r="2" fill="#9E9E9E" />
        <path d="M16 16L16 10" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
        <path d="M16 16L20 20" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

const FoldersIcon = () => (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
        <path d="M4 8C4 6.89543 4.89543 6 6 6H12L14 8H20C21.1046 8 22 8.89543 22 10V22C22 23.1046 21.1046 24 20 24H6C4.89543 24 4 23.1046 4 22V8Z" fill="#545454" />
        <path d="M8 14C8 12.8954 8.89543 12 10 12H16L18 14H26C27.1046 14 28 14.8954 28 16V26C28 27.1046 27.1046 28 26 28H10C8.89543 28 8 27.1046 8 26V14Z" fill="#545454" />
        <path d="M28 22L14 28L18 22L14 16L28 22Z" fill="#9E9E9E" />
    </svg>
)

const CalendarSmallIcon = () => (
    <svg width="12" height="12" viewBox="0 0 32 32" fill="none">
        <path d="M6 10C6 7.79086 7.79086 6 10 6H22C24.2091 6 26 7.79086 26 10V24C26 26.2091 24.2091 28 22 28H10C7.79086 28 6 26.2091 6 24V10Z" fill="#545454" />
        <path d="M6 12H26" stroke="#9E9E9E" strokeWidth="3" />
        <path d="M11 4V8" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
        <path d="M21 4V8" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

// Chart data points - more points for smoother curve
const chartData = [5, 8, 6, 12, 10, 15, 13, 18, 14, 20, 17, 22, 19, 25]
const chartLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function OverallProgress({
    inProgress = 24,
    totalProjects = 45,
    upcoming = 12
}: OverallProgressProps) {
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
                <h3 className="font-semibold text-white">Overall Progress</h3>
                <a href="#" className="text-xs text-gray-500 hover:text-[#F2CE88] transition-colors">
                    See all
                </a>
            </div>

            {/* Dropdown with calendar icon */}
            <button className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-4 w-fit px-2 py-1 rounded bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
                <CalendarSmallIcon />
                Last 7 days
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
                        <span className="text-xs text-gray-400">{inProgress} In Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gray-800/50 flex items-center justify-center">
                            <HistoryIcon />
                        </div>
                        <span className="text-xs text-gray-400">{totalProjects} Total Project</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gray-800/50 flex items-center justify-center">
                            <FoldersIcon />
                        </div>
                        <span className="text-xs text-gray-400">{upcoming} Upcoming</span>
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
