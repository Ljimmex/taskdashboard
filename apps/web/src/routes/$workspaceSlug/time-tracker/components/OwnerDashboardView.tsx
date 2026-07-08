import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetchJson } from '@/lib/api'
import {
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  PieChart as PieChartIcon,
  Download,
  AlertCircle,
  Search,
  FileSpreadsheet,
  ChevronDown,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatHours } from './utils'

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
]

export function OwnerDashboardView({
  selectedProjectId,
  projects,
  workspaceSlug,
}: {
  selectedProjectId: string | null
  projects: any[]
  workspaceSlug: string
}) {
  const { t, i18n } = useTranslation()
  const activeProjectName = useMemo(
    () =>
      projects.find((p) => p.id === selectedProjectId)?.name ||
      t('timeTracker.projectDashboard', 'Dashboard Projektu'),
    [projects, selectedProjectId, t]
  )
  const [dashboardMode, setDashboardMode] = useState<'monthly' | 'cumulative' | 'custom'>('monthly')

  // Nowe stany dla filtrów
  const [searchTerm, setSearchTerm] = useState('')
  const [teamFilter, setTeamFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false)
  const teamRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (teamRef.current && !teamRef.current.contains(e.target as Node)) {
        setTeamDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset strony po zmianie filtrów
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, teamFilter])

  // Fetch teams for filtering
  const { data: teamsData } = useQuery({
    queryKey: ['teams', workspaceSlug],
    queryFn: async () => {
      if (!workspaceSlug) return []
      const json = await apiFetchJson<{ success: boolean; data: any[] }>(
        `/api/teams?workspaceSlug=${workspaceSlug}`
      )
      return json.data
    },
    enabled: !!workspaceSlug,
  })
  const teams = teamsData || []

  // Fetch data
  const { data: revshareData, isLoading: revshareLoading } = useQuery({
    queryKey: ['revshare', selectedProjectId, dashboardMode, dateFrom, dateTo],
    queryFn: () => {
      let url = `/api/time/contribution/${selectedProjectId}`
      if (dashboardMode === 'monthly') {
        const now = new Date()
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        url += `/monthly?month=${monthStr}`
      } else if (dashboardMode === 'cumulative') {
        url += `/cumulative`
      } else if (dashboardMode === 'custom') {
        url += `/custom?startDate=${dateFrom}&endDate=${dateTo}`
      }
      return apiFetchJson<{
        success: boolean
        data: {
          participants: any[]
          totalPW: number
          totalProjectPW: number
          hourThreshold: number
        }
      }>(url)
    },
    enabled: !!selectedProjectId,
    refetchInterval: 5000,
  })

  const { data: entriesData } = useQuery({
    queryKey: ['project-time-entries', selectedProjectId, dashboardMode, dateFrom, dateTo], // Added filters to query key
    queryFn: () => {
      const params = new URLSearchParams()
      if (dashboardMode === 'monthly') {
        // If dateFrom is not set, use current month
        const monthStr = dateFrom ? dateFrom.slice(0, 7) : new Date().toISOString().slice(0, 7)
        params.append('month', monthStr)
      } else if (dashboardMode === 'custom' && dateFrom && dateTo) {
        params.append('startDate', dateFrom)
        params.append('endDate', dateTo)
      }
      return apiFetchJson<{ success: boolean; data: any[] }>(
        `/api/time/project/${selectedProjectId}?${params.toString()}`
      )
    },
    enabled: !!selectedProjectId,
  })

  const participants = revshareData?.data?.participants || []
  const totalPW = revshareData?.data?.totalPW || 0
  const totalProjectPW = revshareData?.data?.totalProjectPW || 0
  const hourThreshold = revshareData?.data?.hourThreshold || 200
  const entries = entriesData?.data || []

  const filteredParticipants = useMemo(() => {
    const selectedTeam = teamFilter === 'ALL' ? null : teams.find((t: any) => t.id === teamFilter)
    // Team members might be an array of objects with userId
    const teamMemberIds = selectedTeam ? selectedTeam.members.map((m: any) => m.userId) : null

    return participants.filter((p: any) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesTeam =
        teamFilter === 'ALL' || (teamMemberIds && teamMemberIds.includes(p.userId))
      return matchesSearch && matchesTeam
    })
  }, [participants, searchTerm, teamFilter, teams])

  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage)
  const paginatedParticipants = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredParticipants.slice(start, start + itemsPerPage)
  }, [filteredParticipants, currentPage, itemsPerPage])

  // ----------------------------------------------------
  // LOGIKA: Przetwarzanie danych dla wykresów
  // ----------------------------------------------------
  const roleBreakdownData = useMemo(() => {
    const breakdown = participants.reduce((acc: any, p: any) => {
      acc[p.role] = (acc[p.role] || 0) + p.totalHours
      return acc
    }, {})
    const total = Object.values(breakdown).reduce((a: number, b) => a + Number(b), 0)
    return Object.entries(breakdown)
      .map(([name, value], index) => ({
        name: name.replace('_', ' '),
        value: Number(value),
        color: COLORS[index % COLORS.length],
        percent: total > 0 ? Math.round((Number(value) / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [participants])

  const timelineData = useMemo(() => {
    const formatDateLocal = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const daily: Record<string, number> = {}

    // If monthly mode, fill all days of that month
    if (dashboardMode === 'monthly') {
      const now = new Date()
      const monthStr = dateFrom ? dateFrom.slice(0, 7) : now.toISOString().slice(0, 7)
      const [yr, mo] = monthStr.split('-').map(Number)
      const daysInMonth = new Date(yr, mo, 0).getDate()
      for (let i = 1; i <= daysInMonth; i++) {
        const ds = `${yr}-${String(mo).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        daily[ds] = 0
      }
    }

    entries.forEach((e: any) => {
      const dateStr = formatDateLocal(new Date(e.startedAt))
      daily[dateStr] = (daily[dateStr] || 0) + e.durationMinutes / 60
    })

    return Object.entries(daily)
      .map(([date, hours]) => ({ date, hours: Number((hours as number).toFixed(1)) }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [entries, dashboardMode, dateFrom])

  const heatmapData = useMemo(() => {
    // Generujemy obecny rok (od 1 stycznia do 31 grudnia)
    const currentYear = new Date().getFullYear()
    const days: { date: string; dateObj: Date; hours: number; isPadding?: boolean }[] = []

    // Pomocnicza funkcja do formatowania daty w formacie YYYY-MM-DD w lokalnym czasie
    const formatDateLocal = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Jan 1
    const jan1 = new Date(currentYear, 0, 1)

    // Pad beginning so the first row is always Monday (1)
    const startDay = jan1.getDay() // 4
    const paddingCount = startDay === 0 ? 6 : startDay - 1

    for (let i = 0; i < paddingCount; i++) {
      const padDate = new Date(jan1)
      padDate.setDate(padDate.getDate() - (paddingCount - i))
      days.push({ date: '', dateObj: padDate, hours: 0, isPadding: true })
    }

    const d = new Date(jan1)
    while (d.getFullYear() === currentYear) {
      const dateObj = new Date(d)
      const dateStr = formatDateLocal(dateObj)
      days.push({ date: dateStr, dateObj, hours: 0 })
      d.setDate(d.getDate() + 1)
    }

    if (entries.length > 0) {
      entries.forEach((e: any) => {
        const entryDate = new Date(e.startedAt)
        const dateStr = formatDateLocal(entryDate)
        const day = days.find((d) => !d.isPadding && d.date === dateStr)
        if (day) day.hours += e.durationMinutes / 60
      })
    }
    return days
  }, [entries])

  // ----------------------------------------------------
  // LOGIKA: Eksporty
  // ----------------------------------------------------
  const exportToCSV = () => {
    const headers = [
      t('timeTracker.csv.teamMember', 'Członek Zespołu'),
      t('timeTracker.csv.role', 'Rola'),
      t('timeTracker.csv.hours', 'Godziny'),
      t('timeTracker.csv.points', 'Punkty (PW)'),
      t('timeTracker.csv.share', 'Udział (%)'),
      t('timeTracker.csv.status', 'Status'),
    ]
    const rows = filteredParticipants.map((p: any) => [
      `"${p.name}"`,
      `"${p.role.replace('_', ' ')}"`,
      `"${formatHours(p.totalHours)}"`,
      `"${p.contributionPoints}"`,
      `"${p.hasThreshold ? `${p.sharePercent}%` : '0%'}"`,
      `"${p.hasThreshold ? t('timeTracker.qualified', 'ZAKWALIFIKOWANY') : t('timeTracker.pending', 'W TRAKCIE')}"`,
    ])

    const csvHeaders = headers.map((h) => `"${h}"`).join(';')
    const csvContent =
      '\uFEFF' + 'sep=;\r\n' + [csvHeaders, ...rows.map((r) => r.join(';'))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    const dateStr = new Date().toISOString().split('T')[0]
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `raport_revshare_${activeProjectName.replace(/\s+/g, '_')}_${dateStr}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = async () => {
    const doc = new jsPDF()
    // Use a guaranteed full-subset font from Google Fonts repo
    const fontUrl =
      'https://raw.githubusercontent.com/googlefonts/roboto/main/src/v2/Roboto-Regular.ttf'

    try {
      const fontRes = await fetch(fontUrl)
      if (!fontRes.ok) throw new Error('Font fetch failed')
      const arrayBuffer = await fontRes.arrayBuffer()
      const base64Font = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )

      doc.addFileToVFS('RobotoFull.ttf', base64Font)
      doc.addFont('RobotoFull.ttf', 'Roboto', 'normal')
      doc.setFont('Roboto')
    } catch (e) {
      console.error('Failed to load PDF font', e)
    }

    doc.setFont('Roboto', 'normal')
    doc.setFontSize(18)
    // Ensure title also uses the font
    doc.text(t('timeTracker.pdf.reportTitle', 'Raport Revenue Share'), 14, 22)

    let periodText = ''
    if (dashboardMode === 'monthly') {
      const now = new Date()
      const year = now.getFullYear()
      const monthNamesPl = [
        'Styczeń',
        'Luty',
        'Marzec',
        'Kwiecień',
        'Maj',
        'Czerwiec',
        'Lipiec',
        'Sierpień',
        'Wrzesień',
        'Październik',
        'Listopad',
        'Grudzień',
      ]
      const monthNamesEn = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ]
      const monthName =
        i18n.language === 'pl' ? monthNamesPl[now.getMonth()] : monthNamesEn[now.getMonth()]
      periodText = `${monthName} ${year}`
    } else if (dashboardMode === 'cumulative') {
      periodText = t('timeTracker.cumulative', 'Skumulowany')
    } else if (dashboardMode === 'custom') {
      periodText = `${dateFrom || ''} - ${dateTo || ''}`
      if (periodText === '- ') periodText = t('timeTracker.allTime', 'Cały czas')
    }

    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`${t('timeTracker.pdf.project', 'Projekt:')} ${activeProjectName}`, 14, 30)
    doc.text(`${t('timeTracker.pdf.period', 'Okres:')} ${periodText}`, 14, 36)
    doc.text(`${t('timeTracker.pdf.totalPoints', 'Łączne PW Projektu:')} ${totalProjectPW}`, 14, 42)
    doc.text(`${t('timeTracker.pdf.threshold', 'Próg kwalifikacji:')} ${hourThreshold}h`, 14, 48)

    const tableColumn = [
      t('timeTracker.csv.teamMember', 'Członek Zespołu'),
      t('timeTracker.csv.role', 'Rola'),
      t('timeTracker.csv.hours', 'Godziny'),
      t('timeTracker.csv.points', 'Punkty (PW)'),
      t('timeTracker.csv.share', 'Udział (%)'),
      t('timeTracker.csv.status', 'Status'),
    ]
    const tableRows = filteredParticipants.map((p: any) => [
      p.name,
      p.role.replace('_', ' ').toUpperCase(),
      formatHours(p.totalHours),
      p.contributionPoints.toString(),
      `${p.hasThreshold ? p.sharePercent : 0}%`,
      p.hasThreshold
        ? t('timeTracker.qualified', 'ZAKWALIFIKOWANY')
        : t('timeTracker.pending', 'W TRAKCIE'),
    ])

    autoTable(doc, {
      startY: 56,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], font: 'Roboto', fontStyle: 'normal' },
      styles: { fontSize: 9, cellPadding: 3, font: 'Roboto', fontStyle: 'normal' },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'center', cellWidth: 35 },
      },
    })
    doc.save(`raport_revshare_${activeProjectName.replace(/\s+/g, '_')}.pdf`)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-6xl space-y-6 pb-12 duration-500 ease-out">
      {/* Header & Controls */}
      {selectedProjectId && (
        <div className="mb-2 flex flex-col justify-between gap-4 px-2 lg:flex-row lg:items-center">
          <h1 className="text-xl font-bold tracking-tight text-[var(--app-text-primary)]">
            {activeProjectName}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full border border-[var(--app-divider)] bg-[var(--app-bg-card)] p-1 shadow-sm">
              <button
                onClick={() => setDashboardMode('monthly')}
                className={`rounded-full px-5 py-2 text-xs font-extrabold uppercase tracking-wider transition-all duration-300 ${dashboardMode === 'monthly' ? 'bg-[var(--app-accent)] text-white shadow-md' : 'text-[var(--app-text-primary)] opacity-60 hover:bg-[var(--app-bg-deepest)] hover:opacity-100'}`}
              >
                {t('timeTracker.monthly', 'Miesięczny')}
              </button>
              <button
                onClick={() => setDashboardMode('cumulative')}
                className={`rounded-full px-5 py-2 text-xs font-extrabold uppercase tracking-wider transition-all duration-300 ${dashboardMode === 'cumulative' ? 'bg-[var(--app-accent)] text-white shadow-md' : 'text-[var(--app-text-primary)] opacity-60 hover:bg-[var(--app-bg-deepest)] hover:opacity-100'}`}
              >
                {t('timeTracker.cumulative', 'Skumulowany')}
              </button>
              <button
                onClick={() => setDashboardMode('custom')}
                className={`rounded-full px-5 py-2 text-xs font-extrabold uppercase tracking-wider transition-all duration-300 ${dashboardMode === 'custom' ? 'bg-[var(--app-accent)] text-white shadow-md' : 'text-[var(--app-text-primary)] opacity-60 hover:bg-[var(--app-bg-deepest)] hover:opacity-100'}`}
              >
                {t('timeTracker.custom', 'Własny')}
              </button>
            </div>

            {dashboardMode === 'custom' && (
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] p-1.5">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] px-3 py-1.5 text-sm text-[var(--app-text-primary)] focus:border-blue-500 focus:outline-none"
                />
                <span className="text-[var(--app-text-muted)]">-</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] px-3 py-1.5 text-sm text-[var(--app-text-primary)] focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedProjectId && (
        <div className="bg-[var(--app-bg-card)]/50 mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--app-divider)] py-24 backdrop-blur-sm">
          <div className="border-[var(--app-divider)]/50 mb-4 rounded-full border bg-[var(--app-bg-elevated)] p-4 shadow-sm">
            <PieChartIcon size={40} className="text-[var(--app-text-muted)]" />
          </div>
          <h3 className="mb-1 text-lg font-bold text-[var(--app-text-primary)]">
            {t('timeTracker.dashboard.selectProject', 'Wybierz projekt z listy')}
          </h3>
          <p className="text-sm font-medium text-[var(--app-text-muted)]">
            {t(
              'timeTracker.dashboard.clickSidebar',
              'Kliknij projekt w panelu bocznym, aby zobaczyć analitykę.'
            )}
          </p>
        </div>
      )}

      {selectedProjectId && !revshareLoading && (
        <>
          {/* Summary Stats Grid */}
          <div className="mb-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<UsersIcon />}
              label={t('timeTracker.participantsCount', 'Uczestnicy')}
              value={participants.length}
              theme="blue"
            />
            <StatCard
              icon={<PointsIcon />}
              label={t('timeTracker.approvedPoints', 'Zatwierdzone Punkty (PW)')}
              value={
                typeof totalProjectPW === 'number'
                  ? totalProjectPW % 1 === 0
                    ? totalProjectPW
                    : totalProjectPW.toFixed(2)
                  : totalProjectPW
              }
              theme="emerald"
              tooltip={t(
                'timeTracker.totalProjectPWTooltip',
                'Suma wszystkich zatwierdzonych punktów w wybranym okresie.'
              )}
            />
            <StatCard
              icon={<BreakdownIcon />}
              label={t('timeTracker.revsharePool', 'Pula RevShare (Qualifying)')}
              value={
                typeof totalPW === 'number'
                  ? totalPW % 1 === 0
                    ? totalPW
                    : totalPW.toFixed(2)
                  : totalPW
              }
              theme="blue"
              tooltip={t(
                'timeTracker.revsharePoolTooltip',
                'Suma punktów osób, które przekroczyły próg {{threshold}}h.',
                { threshold: hourThreshold }
              )}
            />
            <StatCard
              icon={<HoursIcon />}
              label={t('timeTracker.hoursWorked', 'Przepracowane Godziny')}
              value={formatHours(
                participants.reduce((acc: number, p: any) => acc + p.totalHours, 0)
              )}
              theme="amber"
            />
          </div>

          {/* NEW: Analytics Row (Timeline + Role Breakdown) */}
          {entries.length > 0 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Line Chart */}
              <div className="rounded-3xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] p-6 shadow-sm md:p-8 lg:col-span-2">
                <h2 className="mb-6 flex items-center gap-3 text-base font-bold text-[var(--app-text-primary)] opacity-90">
                  <TimelineIcon />
                  {t('timeTracker.workTimeline', 'Analiza Czasu Pracy')}
                </h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--app-divider)"
                        opacity={0.5}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="var(--app-text-muted)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="var(--app-text-muted)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => formatHours(val)}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'var(--app-bg-card)',
                          borderColor: 'var(--app-divider)',
                          borderRadius: '16px',
                          fontSize: '12px',
                          border: '1px solid var(--app-divider)',
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        }}
                        formatter={(value: any) => [
                          formatHours(Number(value) || 0),
                          t('timeTracker.hours', 'Godziny'),
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="hours"
                        stroke="var(--app-accent)"
                        strokeWidth={3}
                        dot={{
                          r: 4,
                          fill: 'var(--app-accent)',
                          strokeWidth: 2,
                          stroke: 'var(--app-bg-card)',
                        }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Donut Chart (Roles) */}
              <div className="flex flex-col rounded-3xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] p-6 shadow-sm md:p-8">
                <h2 className="mb-4 flex items-center gap-3 text-base font-bold text-[var(--app-text-primary)] opacity-90">
                  <BreakdownIcon />
                  {t('timeTracker.roleBreakdown', 'Rozkład Ról')}
                </h2>
                <div className="relative flex h-52 w-full items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={roleBreakdownData}
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {roleBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'var(--app-bg-card)',
                          border: '1px solid var(--app-divider)',
                          borderRadius: '12px',
                          color: 'var(--app-text-primary)',
                        }}
                        formatter={(value: any, name: any) => {
                          const item = roleBreakdownData.find((d) => d.name === name)
                          return [
                            `${formatHours(Number(value) || 0)} (${item?.percent ?? 0}%)`,
                            name,
                          ]
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  {/* Środek Donuta */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-[var(--app-text-primary)]">
                      {formatHours(participants.reduce((a: number, p: any) => a + p.totalHours, 0))}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">
                      {t('timeTracker.total', 'Łącznie')}
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-4 space-y-2">
                  {roleBreakdownData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-3 w-3 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate text-[var(--app-text-secondary)]">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-3">
                        <span className="font-semibold text-[var(--app-text-primary)]">
                          {formatHours(item.value)}
                        </span>
                        <span className="w-10 text-right text-xs text-[var(--app-text-muted)]">
                          {item.percent}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {roleBreakdownData.length === 0 && (
                    <div className="py-4 text-center text-sm text-[var(--app-text-muted)]">
                      {t('timeTracker.noRoleData', 'Brak danych o rolach')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Revenue Share Table Card with Filters */}
          <div className="rounded-3xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] p-6 shadow-sm md:p-8">
            <div className="mb-8 flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
              <h2 className="flex items-center gap-3 text-base font-bold text-[var(--app-text-primary)] opacity-90">
                <TableIcon />
                {t('timeTracker.revenueShareDetails', 'Szczegóły Udziałów RevShare')}
              </h2>

              <div className="flex flex-col items-center gap-3 sm:flex-row">
                {/* Pasek Szukania */}
                <div className="relative w-full sm:w-auto">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]"
                  />
                  <input
                    type="text"
                    placeholder={t('timeTracker.dashboard.searchPerson', 'Szukaj osoby...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] py-2 pl-9 pr-4 text-sm text-[var(--app-text-primary)] transition-colors focus:border-blue-500 focus:outline-none sm:w-56"
                  />
                </div>
                {/* Filtr Zespołów - Custom Dropdown */}
                <div className="relative w-full sm:w-auto" ref={teamRef}>
                  <button
                    type="button"
                    onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-[var(--app-bg-elevated)] px-4 py-2 text-left outline-none transition-all sm:w-auto ${
                      teamDropdownOpen
                        ? 'ring-[var(--app-accent)]/20 border-[var(--app-accent)] shadow-lg ring-1'
                        : 'border-[var(--app-divider)] hover:border-[var(--app-text-muted)]'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Users
                        size={16}
                        className={
                          teamDropdownOpen
                            ? 'text-[var(--app-accent)]'
                            : 'text-[var(--app-text-muted)]'
                        }
                      />
                      <span className="truncate text-sm font-bold text-[var(--app-text-primary)]">
                        {teamFilter === 'ALL'
                          ? t('timeTracker.dashboard.allTeams', 'Wszystkie Zespoły')
                          : teams.find((t: any) => t.id === teamFilter)?.name || teamFilter}
                      </span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-[var(--app-text-muted)] transition-transform duration-200 ${teamDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {teamDropdownOpen && (
                    <div className="custom-scrollbar animate-in fade-in zoom-in-95 absolute right-0 z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] p-1.5 shadow-2xl duration-200 sm:w-72">
                      <button
                        onClick={() => {
                          setTeamFilter('ALL')
                          setTeamDropdownOpen(false)
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                          teamFilter === 'ALL'
                            ? 'bg-[var(--app-accent)] text-[var(--app-bg-deepest)] shadow-md'
                            : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-deepest)] hover:text-[var(--app-text-primary)]'
                        }`}
                      >
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${teamFilter === 'ALL' ? 'bg-[var(--app-bg-deepest)]' : 'bg-[var(--app-text-muted)]'}`}
                        />
                        {t('timeTracker.dashboard.allTeams', 'Wszystkie Zespoły')}
                      </button>

                      <div className="my-1 border-t border-[var(--app-divider)] opacity-50" />

                      {teams.length === 0 ? (
                        <div className="px-3 py-4 text-center text-[10px] font-bold text-[var(--app-text-muted)]">
                          {t('timeTracker.noTeamsFound', 'Nie znaleziono zespołów')}
                        </div>
                      ) : (
                        teams.map((team: any) => (
                          <button
                            key={team.id}
                            onClick={() => {
                              setTeamFilter(team.id)
                              setTeamDropdownOpen(false)
                            }}
                            className={`flex w-full items-center gap-3 overflow-hidden whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                              teamFilter === team.id
                                ? 'bg-[var(--app-accent)] text-[var(--app-bg-deepest)] shadow-md'
                                : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-deepest)] hover:text-[var(--app-text-primary)]'
                            }`}
                          >
                            <div
                              className={`h-1.5 w-1.5 rounded-full ${teamFilter === team.id ? 'bg-[var(--app-bg-deepest)]' : 'bg-[var(--app-accent)]'}`}
                            />
                            <span className="truncate">{team.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {/* Export Przyciski */}
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <button
                    onClick={exportToCSV}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] px-4 py-2 text-sm font-bold text-emerald-500 shadow-sm transition-all hover:border-emerald-500/50 hover:bg-[var(--app-bg-card)] sm:flex-none"
                  >
                    <FileSpreadsheet size={16} /> <span className="hidden sm:inline">CSV</span>
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] px-4 py-2 text-sm font-bold text-rose-500 shadow-sm transition-all hover:border-rose-500/50 hover:bg-[var(--app-bg-card)] sm:flex-none"
                  >
                    <Download size={16} /> <span className="hidden sm:inline">PDF</span>
                  </button>
                </div>
              </div>
            </div>

            {filteredParticipants.length === 0 ? (
              <div className="bg-[var(--app-bg-elevated)]/50 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-divider)] py-12 text-center">
                <AlertCircle size={32} className="text-[var(--app-text-muted)]/50 mb-3" />
                <p className="text-sm font-medium text-[var(--app-text-muted)]">
                  {t('timeTracker.dashboard.noResults', 'Brak wyników do wyświetlenia.')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-[var(--app-divider)]">
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] md:text-xs">
                        Członek Zespołu
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] md:text-xs">
                        Rola
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] md:text-xs">
                        Godziny
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] md:text-xs">
                        Punkty (PW)
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] md:text-xs">
                        Udział (%)
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] md:text-xs">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--app-divider)]">
                    {paginatedParticipants.map((p: any) => (
                      <tr
                        key={p.userId}
                        className="group transition-colors duration-200 hover:bg-[var(--app-bg-elevated)]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[var(--app-divider)] bg-gradient-to-br from-[var(--app-bg-elevated)] to-[var(--app-bg-card)] text-xs font-bold text-[var(--app-text-primary)]">
                              {p.image ? (
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                p.name?.charAt(0)?.toUpperCase() || '?'
                              )}
                            </div>
                            <span className="text-sm font-semibold text-[var(--app-text-primary)]">
                              {p.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-lg border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] px-2.5 py-1.5 text-xs font-bold text-[var(--app-text-secondary)]">
                            {p.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-bold text-[var(--app-text-primary)]">
                            {formatHours(p.totalHours)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-bold text-emerald-500">
                            +
                            {typeof p.contributionPoints === 'number'
                              ? p.contributionPoints % 1 === 0
                                ? p.contributionPoints
                                : p.contributionPoints.toFixed(2)
                              : p.contributionPoints}{' '}
                            pts
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-bold text-[var(--app-text-primary)]">
                            {p.hasThreshold ? `${p.sharePercent}%` : '0%'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.hasThreshold ? (
                            <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-transparent px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-500">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{' '}
                              {t('timeTracker.qualified', 'Zakwalifikowany')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-xl border border-[#F2CE88]/20 bg-transparent px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#F2CE88]">
                              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F2CE88]" />{' '}
                              {t('timeTracker.pending', 'W Trakcie')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between border-t border-[var(--app-divider)] pt-6">
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--app-text-muted)]">
                  {t('common.page', 'Strona')} {currentPage} {t('common.of', 'z')} {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((curr) => Math.max(1, curr - 1))}
                    disabled={currentPage === 1}
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
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`h-8 w-8 rounded-xl text-xs font-black transition-all ${
                              currentPage === page
                                ? 'bg-[var(--app-accent)] text-white shadow-lg shadow-blue-500/20'
                                : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
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
                    onClick={() => setCurrentPage((curr) => Math.min(totalPages, curr + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] p-2 text-[var(--app-text-primary)] transition-all hover:bg-[var(--app-bg-card)] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* NEW: GitHub-style Activity Heatmap */}
          {entries.length > 0 && (
            <div className="rounded-3xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] p-6 shadow-sm md:p-8">
              <h2 className="mb-6 flex items-center gap-3 text-base font-bold text-[var(--app-text-primary)] opacity-90">
                <HeatmapIcon />
                {t('timeTracker.projectActivity', 'Aktywność Projektowa')}
              </h2>
              <div className="custom-scrollbar overflow-x-auto pb-4">
                <div className="flex min-w-max flex-col">
                  {/* Month Labels */}
                  <div className="mb-2 ml-8 flex gap-1 text-[9px] font-extrabold uppercase tracking-tight text-[var(--app-text-muted)]">
                    {(() => {
                      const labels = []
                      let lastMonth = -1
                      for (let col = 0; col < Math.ceil(heatmapData.length / 7); col++) {
                        const day = heatmapData[col * 7]
                        const columnDays = heatmapData.slice(col * 7, col * 7 + 7)
                        // Szukamy pierwszego dnia, który nie jest paddingiem, lub używamy pierwszego dnia kolumny
                        const firstValidDay = columnDays.find((d) => !d.isPadding) || day
                        const month = firstValidDay.dateObj.getMonth()

                        if (month !== lastMonth) {
                          labels.push(
                            <div
                              key={col}
                              className="w-[14px] flex-shrink-0 overflow-visible whitespace-nowrap text-left text-[10px] font-black uppercase"
                            >
                              {firstValidDay.dateObj.toLocaleString('pl', { month: 'short' })}
                            </div>
                          )
                          lastMonth = month
                        } else {
                          labels.push(<div key={col} className="w-[14px] flex-shrink-0" />)
                        }
                      }
                      return labels
                    })()}
                  </div>

                  <div className="flex gap-1">
                    {/* Day Labels */}
                    <div className="flex h-[7.5rem] flex-col justify-between gap-1 py-0.5 pr-2 text-[8px] font-extrabold uppercase leading-none tracking-tight text-[var(--app-text-muted)]">
                      <span>Pon</span>
                      <span>Wt</span>
                      <span>Śr</span>
                      <span>Czw</span>
                      <span>Pt</span>
                      <span>Sob</span>
                      <span>Nie</span>
                    </div>

                    {/* Heatmap Columns */}
                    {Array.from({ length: Math.ceil(heatmapData.length / 7) }).map(
                      (_, colIndex) => (
                        <div key={colIndex} className="flex flex-col gap-1">
                          {heatmapData
                            .slice(colIndex * 7, Math.min(colIndex * 7 + 7, heatmapData.length))
                            .map((day, i) => {
                              // Logika kolorowania: 0h, 1-8h (modesta), 8-16h (pro), 16h+ (crunch)
                              let bgColor =
                                'bg-[var(--app-bg-elevated)] border-[var(--app-divider)]'
                              if (day.isPadding) bgColor = 'opacity-0 pointer-events-none'
                              else if (day.hours > 0 && day.hours <= 8)
                                bgColor = 'bg-emerald-500/20 border-emerald-500/10'
                              else if (day.hours > 8 && day.hours <= 16)
                                bgColor = 'bg-emerald-500/50 border-emerald-500/30'
                              else if (day.hours > 16 && day.hours <= 32)
                                bgColor = 'bg-emerald-500/80 border-emerald-500/50'
                              else if (day.hours > 32)
                                bgColor =
                                  'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] border-emerald-400'

                              return (
                                <div
                                  key={i}
                                  className={`h-2.5 w-2.5 rounded-[3px] border ${bgColor} ${!day.isPadding ? 'group relative cursor-crosshair shadow-inner transition-all hover:ring-2 hover:ring-blue-500' : ''}`}
                                >
                                  {!day.isPadding && (
                                    <div
                                      className={`pointer-events-none absolute z-[100] hidden min-w-max whitespace-nowrap rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] px-2 py-1.5 text-[10px] font-bold text-[var(--app-text-primary)] shadow-2xl backdrop-blur-md group-hover:block ${i < 3 ? 'top-full mt-2' : 'bottom-full mb-2'} ${colIndex < 3 ? 'left-0 origin-top-left' : colIndex > 50 ? 'right-0 origin-bottom-right' : 'left-1/2 -translate-x-1/2'}`}
                                    >
                                      {day.dateObj.toLocaleDateString('pl', {
                                        day: 'numeric',
                                        month: 'long',
                                      })}
                                      : {formatHours(day.hours)}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">
                <span>{t('timeTracker.less', 'Mniej')}</span>
                <div className="h-3 w-3 rounded-[2px] border border-[var(--app-divider)] bg-[var(--app-bg-elevated)]" />
                <div className="h-3 w-3 rounded-[2px] bg-emerald-500/30" />
                <div className="h-3 w-3 rounded-[2px] bg-emerald-500/60" />
                <div className="h-3 w-3 rounded-[2px] bg-emerald-500" />
                <span>{t('timeTracker.more', 'Więcej')}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ----------------------
// Custom SVG Icons (Matches Sidebar)
// ----------------------

const HoursIcon = () => (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
    <circle
      cx="16"
      cy="17"
      r="11"
      stroke="var(--app-accent-hover)"
      strokeWidth="2.5"
      opacity="0.3"
    />
    <circle cx="16" cy="17" r="8" stroke="var(--app-accent)" strokeWidth="2.5" />
    <path
      d="M16 12V17L19 20"
      stroke="var(--app-accent-hover)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M16 4V7" stroke="var(--app-accent)" strokeWidth="3" strokeLinecap="round" />
  </svg>
)

const PointsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
    <path
      d="M16 4L20 13H29L22 19L25 28L16 22L7 28L10 19L3 13H12L16 4Z"
      fill="var(--app-accent-hover)"
      opacity="0.2"
      stroke="var(--app-accent)"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="16" cy="16" r="3" fill="var(--app-accent)" />
  </svg>
)

const UsersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="10" r="6" stroke="var(--app-accent)" strokeWidth="2" />
    <path
      d="M6 26C6 20.4772 10.4772 16 16 16C21.5228 16 26 20.4772 26 26"
      stroke="var(--app-accent)"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="16" cy="10" r="3" fill="var(--app-accent-hover)" opacity="0.4" />
  </svg>
)

const TimelineIcon = () => (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
    <path
      d="M4 24L10 12L18 18L28 6"
      stroke="var(--app-accent)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="12" r="3" fill="var(--app-accent)" />
    <circle cx="18" cy="18" r="3" fill="var(--app-accent-hover)" opacity="0.5" />
  </svg>
)

const BreakdownIcon = () => (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="11" stroke="var(--app-accent)" strokeWidth="2.5" />
    <path d="M16 16L16 5" stroke="var(--app-accent)" strokeWidth="2.5" strokeLinecap="round" />
    <path
      d="M16 16L24 24"
      stroke="var(--app-accent-hover)"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.6"
    />
    <circle cx="16" cy="16" r="3" fill="var(--app-accent)" />
  </svg>
)

const HeatmapIcon = () => (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
    <rect x="5" y="7" width="5" height="5" rx="1.5" fill="var(--app-accent)" opacity="0.2" />
    <rect x="12" y="7" width="5" height="5" rx="1.5" fill="var(--app-accent)" opacity="0.4" />
    <rect x="19" y="7" width="5" height="5" rx="1.5" fill="var(--app-accent)" opacity="0.6" />
    <rect x="5" y="14" width="5" height="5" rx="1.5" fill="var(--app-accent)" opacity="0.4" />
    <rect x="12" y="14" width="5" height="5" rx="1.5" fill="var(--app-accent)" opacity="0.8" />
    <rect x="19" y="14" width="5" height="5" rx="1.5" fill="var(--app-accent)" />
    <rect x="5" y="21" width="5" height="5" rx="1.5" fill="var(--app-accent)" />
    <rect x="12" y="21" width="5" height="5" rx="1.5" fill="var(--app-accent)" opacity="0.5" />
    <rect x="19" y="21" width="5" height="5" rx="1.5" fill="var(--app-accent)" opacity="0.2" />
  </svg>
)

const TableIcon = () => (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
    <rect x="5" y="7" width="22" height="18" rx="3" stroke="var(--app-accent)" strokeWidth="2.5" />
    <path d="M5 13H27" stroke="var(--app-accent-hover)" strokeWidth="2" opacity="0.5" />
    <path d="M11 7V25" stroke="var(--app-accent-hover)" strokeWidth="2" opacity="0.5" />
    <circle cx="8" cy="10" r="1" fill="var(--app-accent)" />
    <circle cx="14" cy="10" r="1" fill="var(--app-accent)" />
  </svg>
)

function StatCard({
  icon,
  label,
  value,
  theme,
  tooltip,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  theme: 'blue' | 'emerald' | 'amber'
  tooltip?: string
}) {
  const themeStyles = {
    blue: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-500',
      glow: 'group-hover:bg-blue-500/5',
      border: 'hover:border-blue-500/30',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-500',
      glow: 'group-hover:bg-emerald-500/5',
      border: 'hover:border-emerald-500/30',
    },
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-500',
      glow: 'group-hover:bg-amber-500/5',
      border: 'hover:border-amber-500/30',
    },
  }
  const currentTheme = themeStyles[theme]

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] p-6 shadow-sm transition-all duration-300 hover:shadow-md ${currentTheme.border}`}
      title={tooltip}
    >
      <div className={`absolute inset-0 transition-colors duration-300 ${currentTheme.glow}`} />
      <div className="relative z-10">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex-shrink-0">{icon}</div>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--app-text-muted)] opacity-80">
            {label}
          </span>
        </div>
        <div className="text-3xl font-extrabold tracking-tight text-[var(--app-text-primary)]">
          {value}
        </div>
      </div>
    </div>
  )
}
