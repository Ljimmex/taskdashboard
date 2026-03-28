import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetchJson } from '@/lib/api'
import {
    XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
    LineChart, Line, PieChart as RechartsPieChart, Pie, Cell
} from 'recharts'
import {
    PieChart as PieChartIcon, Download, AlertCircle,
    Search, Filter, FileSpreadsheet
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatHours } from './utils'
import { TimeEntryRaw } from './types'

export function OwnerDashboardView({ selectedProjectId, projects }: { selectedProjectId: string | null; projects: any[] }) {
    const { t } = useTranslation()
    const activeProjectName = useMemo(() => projects.find(p => p.id === selectedProjectId)?.name || t('timeTracker.projectDashboard', 'Dashboard Projektu'), [projects, selectedProjectId, t])
    const [dashboardMode, setDashboardMode] = useState<'monthly' | 'cumulative' | 'custom'>('monthly')

    // Nowe stany dla filtrów
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState('ALL')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    // Fetch data
    const { data: revshareData, isLoading: revshareLoading } = useQuery({
        queryKey: ['revshare', selectedProjectId, dashboardMode],
        queryFn: () => apiFetchJson<{ success: boolean; data: { participants: any[]; totalPW: number } }>(
            `/api/time/contribution/${selectedProjectId}${dashboardMode === 'monthly' ? '/monthly' : '/cumulative'}`
        ),
        enabled: !!selectedProjectId,
    })

    const { data: entriesData } = useQuery({
        queryKey: ['project-time-entries', selectedProjectId],
        queryFn: () => apiFetchJson<{ success: boolean; data: TimeEntryRaw[] }>(`/api/time/project/${selectedProjectId}`),
        enabled: !!selectedProjectId,
    })

    const participants = revshareData?.data?.participants || []
    const totalPW = revshareData?.data?.totalPW || 0
    const entries = entriesData?.data || []

    // ----------------------------------------------------
    // LOGIKA: Filtrowanie
    // ----------------------------------------------------
    const uniqueRoles = useMemo(() => Array.from(new Set(participants.map((p: any) => p.role))), [participants])

    const filteredParticipants = useMemo(() => {
        return participants.filter((p: any) => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesRole = roleFilter === 'ALL' || p.role === roleFilter
            return matchesSearch && matchesRole
        })
    }, [participants, searchTerm, roleFilter])

    // ----------------------------------------------------
    // LOGIKA: Przetwarzanie danych dla wykresów
    // ----------------------------------------------------
    const roleBreakdownData = useMemo(() => {
        const breakdown = participants.reduce((acc: any, p: any) => {
            acc[p.role] = (acc[p.role] || 0) + p.totalHours
            return acc
        }, {})
        return Object.entries(breakdown).map(([name, value]) => ({
            name: name.replace('_', ' '),
            value: Number(value)
        })).sort((a, b) => b.value - a.value)
    }, [participants])

    const timelineData = useMemo(() => {
        if (!entries.length) return []

        const formatDateLocal = (d: Date) => {
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
        }

        const daily = entries.reduce((acc: any, e: any) => {
            const dateStr = formatDateLocal(new Date(e.startedAt))
            acc[dateStr] = (acc[dateStr] || 0) + (e.durationMinutes / 60)
            return acc
        }, {})
        return Object.entries(daily)
            .map(([date, hours]) => ({ date, hours: Number((hours as number).toFixed(1)) }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }, [entries])

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
                const day = days.find(d => !d.isPadding && d.date === dateStr)
                if (day) day.hours += (e.durationMinutes / 60)
            })
        }
        return days
    }, [entries])

    // ----------------------------------------------------
    // LOGIKA: Eksporty
    // ----------------------------------------------------
    const exportToCSV = () => {
        const headers = ['Członek Zespołu', 'Rola', 'Godziny', 'Punkty (PW)', 'Udział (%)', 'Zatwierdzone Godziny', 'Kwalifikacja']
        const rows = filteredParticipants.map((p: any) => [
            p.name, p.role.replace('_', ' '), p.totalHours, p.contributionPoints, p.sharePercent, p.approvedBaseHoursTotal, p.has200h ? 'TAK' : 'NIE'
        ])

        // BOM (\uFEFF) wymusza poprawne kodowanie polskich znaków w Excelu
        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `raport_wkladu_${selectedProjectId}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const exportToPDF = async () => {
        const doc = new jsPDF()
        try {
            const fontRes = await fetch("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf")
            const buffer = await fontRes.arrayBuffer()
            const fontBase64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))
            doc.addFileToVFS("Roboto-Regular.ttf", fontBase64)
            doc.addFont("Roboto-Regular.ttf", "Roboto", "normal")
            doc.setFont("Roboto")
        } catch (e) {
            console.warn("Failed to load PDF font", e)
        }

        doc.setFontSize(18)
        doc.text('Raport Revenue Share', 14, 22)
        doc.setFontSize(11)
        doc.setTextColor(100)
        doc.text(`Całkowite Punkty Wkładu (PW): ${totalPW}`, 14, 30)

        const tableColumn = ['Członek zespołu', 'Rola', 'Godziny', 'Punkty (PW)', 'Udział (%)', 'Kwalifikacja']
        const tableRows = filteredParticipants.map((p: any) => [
            p.name, p.role.replace('_', ' ').toUpperCase(), `${p.totalHours}h`, p.contributionPoints.toString(), `${p.sharePercent}%`, p.has200h ? 'TAK' : 'NIE'
        ])

        autoTable(doc, {
            startY: 40,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246], font: "Roboto", fontStyle: "normal" },
            styles: { fontSize: 10, cellPadding: 5, font: "Roboto", fontStyle: "normal" }
        })
        doc.save(`revshare_raport.pdf`)
    }

    // Kolory do wykresów
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316']

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out pb-12">

            {/* Header & Controls */}
            {selectedProjectId && (
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-2 px-2">
                    <h1 className="text-xl font-bold text-[var(--app-text-primary)] tracking-tight">
                        {activeProjectName}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex bg-[var(--app-bg-card)] p-1 rounded-full border border-[var(--app-border)] shadow-sm">
                            <button
                                onClick={() => setDashboardMode('monthly')}
                                className={`px-5 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all duration-300 ${dashboardMode === 'monthly' ? 'bg-[var(--app-accent)] text-white shadow-md' : 'text-[var(--app-text-primary)] opacity-60 hover:opacity-100 hover:bg-[var(--app-bg-deepest)]'}`}
                            >{t('timeTracker.monthly', 'Miesięczny')}</button>
                            <button
                                onClick={() => setDashboardMode('cumulative')}
                                className={`px-5 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all duration-300 ${dashboardMode === 'cumulative' ? 'bg-[var(--app-accent)] text-white shadow-md' : 'text-[var(--app-text-primary)] opacity-60 hover:opacity-100 hover:bg-[var(--app-bg-deepest)]'}`}
                            >{t('timeTracker.cumulative', 'Skumulowany')}</button>
                            <button
                                onClick={() => setDashboardMode('custom')}
                                className={`px-5 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all duration-300 ${dashboardMode === 'custom' ? 'bg-[var(--app-accent)] text-white shadow-md' : 'text-[var(--app-text-primary)] opacity-60 hover:opacity-100 hover:bg-[var(--app-bg-deepest)]'}`}
                            >{t('timeTracker.custom', 'Własny')}</button>
                        </div>

                        {dashboardMode === 'custom' && (
                            <div className="flex items-center gap-2 bg-[var(--app-bg-elevated)] p-1.5 rounded-2xl border border-[var(--app-border)]">
                                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-[var(--app-bg-card)] border border-[var(--app-border)] text-[var(--app-text-primary)] text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500" />
                                <span className="text-[var(--app-text-muted)]">-</span>
                                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-[var(--app-bg-card)] border border-[var(--app-border)] text-[var(--app-text-primary)] text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!selectedProjectId && (
                <div className="flex flex-col items-center justify-center py-24 bg-[var(--app-bg-card)]/50 rounded-3xl border border-dashed border-[var(--app-border)] backdrop-blur-sm mt-8">
                    <div className="p-4 bg-[var(--app-bg-elevated)] rounded-full mb-4 shadow-sm border border-[var(--app-border)]/50">
                        <PieChartIcon size={40} className="text-[var(--app-text-muted)]" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--app-text-primary)] mb-1">Wybierz projekt z listy</h3>
                    <p className="text-sm text-[var(--app-text-muted)] font-medium">Kliknij projekt w panelu bocznym, aby zobaczyć analitykę.</p>
                </div>
            )}

            {selectedProjectId && !revshareLoading && (
                <>
                    {/* Summary Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard icon={<UsersIcon />} label={t('timeTracker.participantsCount', 'Uczestnicy')} value={participants.length} theme="blue" />
                        <StatCard icon={<PointsIcon />} label={t('timeTracker.approvedPoints', 'Zatwierdzone Punkty (PW)')} value={typeof totalPW === 'number' ? (totalPW % 1 === 0 ? totalPW : totalPW.toFixed(2)) : totalPW} theme="emerald" />
                        <StatCard icon={<HoursIcon />} label={t('timeTracker.hoursWorked', 'Przepracowane Godziny')} value={formatHours(participants.reduce((acc: number, p: any) => acc + p.totalHours, 0))} theme="amber" />
                    </div>

                    {/* NEW: Analytics Row (Timeline + Role Breakdown) */}
                    {entries.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Line Chart */}
                            <div className="lg:col-span-2 bg-[var(--app-bg-card)] rounded-3xl p-6 md:p-8 border border-[var(--app-border)] shadow-sm">
                                <h2 className="text-base font-bold text-[var(--app-text-primary)] mb-6 flex items-center gap-3 opacity-90">
                                    <TimelineIcon />
                                    {t('timeTracker.workTimeline', 'Analiza Czasu Pracy')}
                                </h2>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={timelineData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--app-border)" opacity={0.5} />
                                            <XAxis dataKey="date" stroke="var(--app-text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                            <YAxis stroke="var(--app-text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => formatHours(val)} />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: 'var(--app-bg-card)', borderColor: 'var(--app-border)', borderRadius: '16px', fontSize: '12px', border: '1px solid var(--app-border)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value: any) => [formatHours(Number(value) || 0), t('timeTracker.hours', 'Godziny')]}
                                            />
                                            <Line type="monotone" dataKey="hours" stroke="var(--app-accent)" strokeWidth={3} dot={{ r: 4, fill: 'var(--app-accent)', strokeWidth: 2, stroke: 'var(--app-bg-card)' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Donut Chart (Roles) */}
                            <div className="bg-[var(--app-bg-card)] rounded-3xl p-6 md:p-8 border border-[var(--app-border)] shadow-sm">
                                <h2 className="text-base font-bold text-[var(--app-text-primary)] mb-6 flex items-center gap-3 opacity-90">
                                    <BreakdownIcon />
                                    {t('timeTracker.roleBreakdown', 'Rozkład Ról')}
                                </h2>
                                <div className="h-64 w-full flex items-center justify-center relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsPieChart>
                                            <Pie data={roleBreakdownData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                {roleBreakdownData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: 'var(--app-bg-card)', border: '1px solid var(--app-border)', borderRadius: '12px', color: 'var(--app-text-primary)' }}
                                                formatter={(value: any) => [formatHours(Number(value) || 0), t('timeTracker.hours', 'Godziny')]}
                                            />
                                        </RechartsPieChart>
                                    </ResponsiveContainer>
                                    {/* Środek Donuta */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-xl font-bold text-[var(--app-text-primary)]">{formatHours(participants.reduce((a: number, p: any) => a + p.totalHours, 0))}</span>
                                        <span className="text-[10px] text-[var(--app-text-muted)] uppercase tracking-widest font-bold">Łącznie</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Revenue Share Table Card with Filters */}
                    <div className="bg-[var(--app-bg-card)] rounded-3xl p-6 md:p-8 border border-[var(--app-border)] shadow-sm">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
                            <h2 className="text-base font-bold text-[var(--app-text-primary)] flex items-center gap-3 opacity-90">
                                <TableIcon />
                                {t('timeTracker.revenueShareDetails', 'Szczegóły Udziałów RevShare')}
                            </h2>

                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                {/* Pasek Szukania */}
                                <div className="relative w-full sm:w-auto">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]" />
                                    <input
                                        type="text"
                                        placeholder="Szukaj osoby..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full sm:w-56 pl-9 pr-4 py-2 bg-[var(--app-bg-elevated)] border border-[var(--app-border)] text-[var(--app-text-primary)] text-sm rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                                {/* Filtr Ról */}
                                <div className="relative w-full sm:w-auto flex items-center">
                                    <Filter size={16} className="absolute left-3 text-[var(--app-text-muted)]" />
                                    <select
                                        value={roleFilter}
                                        onChange={(e) => setRoleFilter(e.target.value)}
                                        className="w-full sm:w-auto pl-9 pr-8 py-2 bg-[var(--app-bg-elevated)] border border-[var(--app-border)] text-[var(--app-text-primary)] text-sm rounded-xl focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                                    >
                                        <option value="ALL">Wszystkie Role</option>
                                        {uniqueRoles.map((role: any) => (
                                            <option key={role} value={role}>{role.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* Export Przyciski */}
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <button onClick={exportToCSV} className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 rounded-xl bg-[var(--app-bg-elevated)] hover:bg-[var(--app-bg-card)] border border-[var(--app-border)] transition-all shadow-sm text-sm font-bold text-emerald-500 hover:border-emerald-500/50">
                                        <FileSpreadsheet size={16} /> <span className="hidden sm:inline">CSV</span>
                                    </button>
                                    <button onClick={exportToPDF} className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 rounded-xl bg-[var(--app-bg-elevated)] hover:bg-[var(--app-bg-card)] border border-[var(--app-border)] transition-all shadow-sm text-sm font-bold text-rose-500 hover:border-rose-500/50">
                                        <Download size={16} /> <span className="hidden sm:inline">PDF</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {filteredParticipants.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center bg-[var(--app-bg-elevated)]/50 rounded-2xl border border-dashed border-[var(--app-border)]">
                                <AlertCircle size={32} className="text-[var(--app-text-muted)]/50 mb-3" />
                                <p className="text-[var(--app-text-muted)] font-medium text-sm">Brak wyników do wyświetlenia.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full whitespace-nowrap">
                                    <thead>
                                        <tr className="border-b border-[var(--app-border)]">
                                            <th className="text-left py-3 px-4 text-[10px] md:text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wider">Członek Zespołu</th>
                                            <th className="text-left py-3 px-4 text-[10px] md:text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wider">Rola</th>
                                            <th className="text-right py-3 px-4 text-[10px] md:text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wider">Godziny</th>
                                            <th className="text-right py-3 px-4 text-[10px] md:text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wider">Punkty (PW)</th>
                                            <th className="text-right py-3 px-4 text-[10px] md:text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wider">Udział (%)</th>
                                            <th className="text-right py-3 px-4 text-[10px] md:text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--app-border)]/50">
                                        {filteredParticipants.map((p: any) => (
                                            <tr key={p.userId} className="hover:bg-[var(--app-bg-elevated)] transition-colors duration-200 group">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--app-bg-elevated)] to-[var(--app-bg-card)] flex items-center justify-center text-xs font-bold text-[var(--app-text-primary)] overflow-hidden border border-[var(--app-border)]">
                                                            {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : p.name?.charAt(0)?.toUpperCase() || '?'}
                                                        </div>
                                                        <span className="text-sm font-semibold text-[var(--app-text-primary)]">{p.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] border border-[var(--app-border)]">
                                                        {p.role.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right"><span className="text-sm font-bold text-[var(--app-text-primary)]">{formatHours(p.totalHours)}</span></td>
                                                <td className="py-3 px-4 text-right"><span className="text-sm font-bold text-emerald-500">+{typeof p.contributionPoints === 'number' ? (p.contributionPoints % 1 === 0 ? p.contributionPoints : p.contributionPoints.toFixed(2)) : p.contributionPoints} pts</span></td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <div className="w-24 h-2 rounded-full bg-[var(--app-bg-elevated)] overflow-hidden border border-[var(--app-border)]/50">
                                                            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 relative" style={{ width: `${Math.min(p.sharePercent, 100)}%` }}></div>
                                                        </div>
                                                        <span className="text-sm font-bold text-[var(--app-text-primary)] min-w-[3rem] text-right">{p.has200h ? `${p.sharePercent}%` : '0%'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {p.has200h ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] uppercase font-bold border border-emerald-500/20">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Zakwalifikowany
                                                        </span>
                                                    ) : (
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500 text-[10px] uppercase font-bold border border-amber-500/20">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> W Trakcie
                                                            </span>
                                                            <span className="text-[10px] text-[var(--app-text-muted)] font-bold">{formatHours(p.approvedBaseHoursTotal)} / 200h</span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* NEW: GitHub-style Activity Heatmap */}
                    {entries.length > 0 && (
                        <div className="bg-[var(--app-bg-card)] rounded-3xl p-6 md:p-8 border border-[var(--app-border)] shadow-sm">
                            <h2 className="text-base font-bold text-[var(--app-text-primary)] mb-6 flex items-center gap-3 opacity-90">
                                <HeatmapIcon />
                                {t('timeTracker.projectActivity', 'Aktywność Projektowa')}
                            </h2>
                            <div className="overflow-x-auto pb-4 custom-scrollbar">
                                <div className="flex flex-col min-w-max">
                                    {/* Month Labels */}
                                    <div className="flex gap-1 mb-2 ml-8 text-[9px] font-extrabold text-[var(--app-text-muted)] uppercase tracking-tight">
                                        {(() => {
                                            const labels = []
                                            let lastMonth = -1
                                            for (let col = 0; col < Math.ceil(heatmapData.length / 7); col++) {
                                                const day = heatmapData[col * 7]
                                                const columnDays = heatmapData.slice(col * 7, col * 7 + 7)
                                                // Szukamy pierwszego dnia, który nie jest paddingiem, lub używamy pierwszego dnia kolumny
                                                const firstValidDay = columnDays.find(d => !d.isPadding) || day
                                                const month = firstValidDay.dateObj.getMonth()

                                                if (month !== lastMonth) {
                                                    labels.push(<div key={col} className="w-[14px] flex-shrink-0 text-[10px] font-black uppercase text-left overflow-visible whitespace-nowrap">{firstValidDay.dateObj.toLocaleString('pl', { month: 'short' })}</div>)
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
                                        <div className="flex flex-col gap-1 pr-2 text-[8px] font-extrabold text-[var(--app-text-muted)] uppercase tracking-tight justify-between py-0.5 h-[7.5rem] leading-none">
                                            <span>Pon</span>
                                            <span>Wt</span>
                                            <span>Śr</span>
                                            <span>Czw</span>
                                            <span>Pt</span>
                                            <span>Sob</span>
                                            <span>Nie</span>
                                        </div>

                                        {/* Heatmap Columns */}
                                        {Array.from({ length: Math.ceil(heatmapData.length / 7) }).map((_, colIndex) => (
                                            <div key={colIndex} className="flex flex-col gap-1">
                                                {heatmapData.slice(colIndex * 7, Math.min(colIndex * 7 + 7, heatmapData.length)).map((day, i) => {
                                                    // Logika kolorowania: 0h, 1-8h (modesta), 8-16h (pro), 16h+ (crunch)
                                                    let bgColor = 'bg-[var(--app-bg-elevated)] border-[var(--app-border)]'
                                                    if (day.isPadding) bgColor = 'opacity-0 pointer-events-none'
                                                    else if (day.hours > 0 && day.hours <= 8) bgColor = 'bg-emerald-500/20 border-emerald-500/10'
                                                    else if (day.hours > 8 && day.hours <= 16) bgColor = 'bg-emerald-500/50 border-emerald-500/30'
                                                    else if (day.hours > 16 && day.hours <= 32) bgColor = 'bg-emerald-500/80 border-emerald-500/50'
                                                    else if (day.hours > 32) bgColor = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] border-emerald-400'

                                                    return (
                                                        <div
                                                            key={i}
                                                            className={`w-2.5 h-2.5 rounded-[3px] border ${bgColor} ${!day.isPadding ? 'hover:ring-2 hover:ring-blue-500 cursor-crosshair group relative shadow-inner transition-all' : ''}`}
                                                        >
                                                            {!day.isPadding && (
                                                                <div className={`absolute z-[100] hidden group-hover:block bg-[var(--app-bg-card)] border border-[var(--app-border)] text-[var(--app-text-primary)] text-[10px] px-2 py-1.5 rounded-xl shadow-2xl backdrop-blur-md pointer-events-none font-bold min-w-max whitespace-nowrap ${i < 3 ? 'top-full mt-2' : 'bottom-full mb-2'} ${colIndex < 3 ? 'left-0 origin-top-left' : (colIndex > 50 ? 'right-0 origin-bottom-right' : 'left-1/2 -translate-x-1/2')}`}>
                                                                    {day.dateObj.toLocaleDateString('pl', { day: 'numeric', month: 'long' })}: {formatHours(day.hours)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-widest justify-end">
                                <span>{t('timeTracker.less', 'Mniej')}</span>
                                <div className="w-3 h-3 rounded-[2px] bg-[var(--app-bg-elevated)] border border-[var(--app-border)]" />
                                <div className="w-3 h-3 rounded-[2px] bg-emerald-500/30" />
                                <div className="w-3 h-3 rounded-[2px] bg-emerald-500/60" />
                                <div className="w-3 h-3 rounded-[2px] bg-emerald-500" />
                                <span>{t('timeTracker.more', 'Więcej')}</span>
                            </div>
                        </div>
                    )}
                </>
            )
            }
        </div >
    )
}

// ----------------------
// Custom SVG Icons (Matches Sidebar)
// ----------------------

const HoursIcon = () => (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="17" r="11" stroke="var(--app-accent-hover)" strokeWidth="2.5" opacity="0.3" />
        <circle cx="16" cy="17" r="8" stroke="var(--app-accent)" strokeWidth="2.5" />
        <path d="M16 12V17L19 20" stroke="var(--app-accent-hover)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 4V7" stroke="var(--app-accent)" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

const PointsIcon = () => (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
        <path d="M16 4L20 13H29L22 19L25 28L16 22L7 28L10 19L3 13H12L16 4Z" fill="var(--app-accent-hover)" opacity="0.2" stroke="var(--app-accent)" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="16" cy="16" r="3" fill="var(--app-accent)" />
    </svg>
)

const UsersIcon = () => (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="10" r="6" stroke="var(--app-accent)" strokeWidth="2" />
        <path d="M6 26C6 20.4772 10.4772 16 16 16C21.5228 16 26 20.4772 26 26" stroke="var(--app-accent)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="16" cy="10" r="3" fill="var(--app-accent-hover)" opacity="0.4" />
    </svg>
)

const TimelineIcon = () => (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
        <path d="M4 24L10 12L18 18L28 6" stroke="var(--app-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="12" r="3" fill="var(--app-accent)" />
        <circle cx="18" cy="18" r="3" fill="var(--app-accent-hover)" opacity="0.5" />
    </svg>
)

const BreakdownIcon = () => (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="11" stroke="var(--app-accent)" strokeWidth="2.5" />
        <path d="M16 16L16 5" stroke="var(--app-accent)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M16 16L24 24" stroke="var(--app-accent-hover)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
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

function StatCard({ icon, label, value, theme }: { icon: React.ReactNode, label: string, value: string | number, theme: 'blue' | 'emerald' | 'amber' }) {
    const themeStyles = {
        blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', glow: 'group-hover:bg-blue-500/5', border: 'hover:border-blue-500/30' },
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', glow: 'group-hover:bg-emerald-500/5', border: 'hover:border-emerald-500/30' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', glow: 'group-hover:bg-amber-500/5', border: 'hover:border-amber-500/30' },
    }
    const currentTheme = themeStyles[theme]

    return (
        <div className={`relative overflow-hidden bg-[var(--app-bg-card)] p-6 rounded-3xl border border-[var(--app-border)] transition-all duration-300 group shadow-sm hover:shadow-md`}>
            <div className={`absolute inset-0 transition-colors duration-300 ${currentTheme.glow}`} />
            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-5">
                    <div className="flex-shrink-0">{icon}</div>
                    <span className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-[0.15em] opacity-80">{label}</span>
                </div>
                <div className="text-3xl font-extrabold text-[var(--app-text-primary)] tracking-tight">{value}</div>
            </div>
        </div>
    )
}