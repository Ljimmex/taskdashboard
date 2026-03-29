import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetchJson } from '@/lib/api'
import { Clock, AlertCircle, Activity } from 'lucide-react'
import { formatMinutes, formatHours } from './utils'

export function MemberContributionView({ userId, selectedProjectId }: { userId: string; selectedProjectId: string | null }) {
  const { t } = useTranslation()

  const { data: contribData, isLoading } = useQuery({
    queryKey: ['revshare-member', selectedProjectId, userId],
    queryFn: () => apiFetchJson<{ success: boolean; data: { summary: any; recentEntries: any[]; hourThreshold: number } }>(`/api/time/contribution/${selectedProjectId}/member?userId=${userId}`),
    enabled: !!selectedProjectId && !!userId,
    refetchInterval: 5000,
  })

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-[var(--app-bg-card)]/50 rounded-3xl border border-dashed border-[var(--app-border)] backdrop-blur-sm">
        <div className="p-4 bg-[var(--app-bg-elevated)] rounded-full mb-4 shadow-sm">
          <AlertCircle size={40} className="text-[var(--app-text-muted)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--app-text-primary)] mb-1">
          {t('timeTracker.noProject', 'Brak wybranego projektu')}
        </h3>
        <p className="text-[var(--app-text-muted)] font-medium text-sm">
          {t('timeTracker.selectProjectToViewContrib', 'Wybierz projekt z listy, aby zobaczyć swój wkład.')}
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-[var(--app-bg-card)] rounded-2xl border border-[var(--app-border)]/50" />
          ))}
        </div>
        <div className="h-40 bg-[var(--app-bg-card)] rounded-2xl border border-[var(--app-border)]/50" />
        <div className="h-64 bg-[var(--app-bg-card)] rounded-2xl border border-[var(--app-border)]/50" />
      </div>
    )
  }

  const summary = contribData?.data?.summary
  const recent = contribData?.data?.recentEntries || []
  const hourThreshold = contribData?.data?.hourThreshold || 200

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* Sekcja Statystyk */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<HoursIcon />}
          label={t('timeTracker.myHours', 'Moje Godziny')}
          value={formatHours(summary?.totalHours || 0)}
        />
        <StatCard
          icon={<PointsIcon />}
          label={t('timeTracker.contributionPoints', 'Punkty Wkładu')}
          value={`${summary?.contributionPoints || 0}`}
        />
        <StatCard
          icon={<ShareIcon />}
          label={t('timeTracker.revshareShare', 'Udział (Share)')}
          value={`${summary?.sharePercent || 0}%`}
        />
        <StatCard
          icon={<StatusIcon />}
          label={t('timeTracker.status', 'Status')}
          value={summary?.hasThreshold ? 'Zakwalifikowany' : 'W trakcie'}
          isStatus
          statusState={summary?.hasThreshold ? 'qualified' : 'pending'}
        />
      </div>

      {/* Pasek Postępu Kwalifikacji */}
      {!summary?.hasThreshold && (
        <div className="relative overflow-hidden bg-[var(--app-bg-card)] p-6 md:p-8 rounded-3xl border border-[var(--app-border)] shadow-sm group">
          {/* Subtelny gradient w tle */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-opacity group-hover:bg-amber-500/10" />

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-[var(--app-text-primary)] mb-2 tracking-tight">
                {t('timeTracker.qualificationTitle', 'Droga do kwalifikacji')}
              </h3>
              <p className="text-sm text-[var(--app-text-muted)] max-w-lg">
                {t('timeTracker.qualificationDesc', 'Potrzebujesz {{threshold}} zatwierdzonych godzin pracy, aby odblokować pełny udział w RevShare dla tego projektu.', { threshold: hourThreshold })}
              </p>
            </div>
            <div className="text-left md:text-right flex-shrink-0">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold bg-gradient-to-br from-amber-400 to-amber-600 bg-clip-text text-transparent">
                  {formatHours(summary?.approvedBaseHoursTotal || 0)}
                </span>
                <span className="text-lg font-medium text-[var(--app-text-muted)]">/ {hourThreshold}h</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 relative z-10">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)] mb-1">
              <span>Postęp</span>
              <span className="text-amber-500">{Math.round(((summary?.approvedBaseHoursTotal || 0) / hourThreshold) * 100)}%</span>
            </div>
            <div className="h-4 w-full bg-[var(--app-bg-elevated)] rounded-full overflow-hidden border border-[var(--app-border)] inset-shadow-sm">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 transition-all duration-1000 ease-out rounded-full relative"
                style={{ width: `${Math.min(((summary?.approvedBaseHoursTotal || 0) / hourThreshold) * 100, 100)}%` }}
              >
                {/* Efekt połysku na pasku */}
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-b from-white/20 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historia Aktywności */}
      <div className="bg-[var(--app-bg-card)] rounded-3xl p-6 md:p-8 border border-[var(--app-border)] shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold text-[var(--app-text-primary)] flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--app-bg-elevated)] border border-[var(--app-border)] shadow-sm">
              <Activity size={18} className="text-[var(--app-text-primary)]" />
            </div>
            {t('timeTracker.recentHistory', 'Ostatnia Aktywność')}
          </h2>
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-[var(--app-bg-elevated)]/50 rounded-2xl border border-dashed border-[var(--app-border)]">
            <div className="w-12 h-12 rounded-full bg-[var(--app-bg-card)] flex items-center justify-center mb-4 border border-[var(--app-border)]">
              <Clock size={20} className="text-[var(--app-text-muted)]" />
            </div>
            <p className="text-[var(--app-text-muted)] font-medium">
              {t('timeTracker.noRecentEntries', 'Brak zarejestrowanego czasu w tym projekcie.')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map((entry: any) => (
              <HistoryEntry key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ----------------------
// Komponenty Pomocnicze
// ----------------------

function StatCard({ icon, label, value, isStatus = false, statusState }: any) {
  return (
    <div className={`relative overflow-hidden bg-[var(--app-bg-card)] p-6 rounded-[24px] border border-[var(--app-border)] transition-all duration-300 group hover:shadow-xl hover:shadow-black/10`}>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-shrink-0">
            {icon}
          </div>
          <span className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-[0.2em]">{label}</span>
        </div>

        {isStatus ? (
          <div className="mt-1">
            <span className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm border bg-transparent ${statusState === 'qualified'
              ? 'text-emerald-500 border-emerald-500/20'
              : 'text-[#F2CE88] border-[#F2CE88]/20'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${statusState === 'qualified' ? 'bg-emerald-500' : 'bg-[#F2CE88]'} ${statusState === 'pending' ? 'animate-pulse' : ''}`} />
              {value}
            </span>
          </div>
        ) : (
          <div className="text-3xl font-black text-[var(--app-text-primary)] tracking-tight">
            {value}
          </div>
        )}
      </div>
    </div>
  )
}

function HistoryEntry({ entry }: { entry: any }) {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/10', label: 'Zatwierdzone' }
      case 'rejected':
        return { color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/10', label: 'Odrzucone' }
      default:
        return { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/10', label: 'Oczekujące' }
    }
  }

  const status = getStatusConfig(entry.approvalStatus)

  return (
    <div className="group flex flex-col md:flex-row md:items-center justify-between p-5 rounded-[20px] bg-[var(--app-bg-card)] border border-[var(--app-border)] hover:bg-[var(--app-bg-elevated)] transition-all duration-300 hover:shadow-lg hover:shadow-black/5 cursor-default">
      <div className="flex-1 mb-3 md:mb-0 pr-4">
        <h3 className="text-[15px] font-bold text-[var(--app-text-primary)] group-hover:text-[var(--app-accent)] transition-colors line-clamp-1 mb-2">
          {entry.taskTitle || "Zadanie bez tytułu"}
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          <span className="flex items-center gap-1.5 text-[var(--app-text-primary)] bg-[var(--app-bg-elevated)] px-2.5 py-1.5 rounded-lg border border-[var(--app-border)]">
            <Clock size={12} className="text-[var(--app-accent)]" />
            {formatMinutes(entry.durationMinutes)}
          </span>
          <span className="text-[var(--app-text-muted)] opacity-60">
            {new Date(entry.startedAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <span className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.1em] ${status.bg} ${status.color} ${status.border} shadow-sm`}>
            <span className="flex items-center gap-1.5">
              <div className={`w-1 h-1 rounded-full ${status.color.replace('text-', 'bg-')}`} />
              {status.label}
            </span>
          </span>
        </div>

        {entry.description && (
          <div className="mt-4 text-[11px] font-medium text-[var(--app-text-secondary)] bg-[var(--app-bg-elevated)]/30 px-3 py-2.5 rounded-xl border-l-[3px] border-[var(--app-accent)]/20 line-clamp-2 max-w-2xl leading-relaxed">
            {entry.description}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 justify-between md:justify-end border-t md:border-t-0 border-[var(--app-border)] pt-4 md:pt-0">
        <div className="text-right flex flex-col items-end">
          <div className="text-base font-black text-[var(--app-text-primary)] bg-gradient-to-br from-[var(--app-text-primary)] to-[var(--app-text-muted)] bg-clip-text">
            +{entry.points} pts
          </div>
          <div className="text-[9px] uppercase font-black text-[var(--app-text-muted)] tracking-[0.2em] opacity-40">
            Wkład
          </div>
        </div>
      </div>
    </div>
  )
}

// ----------------------
// Custom Styled Icons
// (Matching Sidebar Theme)
// ----------------------

const HoursIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="17" r="11" stroke="var(--app-accent-hover)" strokeWidth="2.5" opacity="0.3" />
    <circle cx="16" cy="17" r="8" stroke="var(--app-accent)" strokeWidth="2.5" />
    <path d="M16 12V17L19 20" stroke="var(--app-accent-hover)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 4V7" stroke="var(--app-accent)" strokeWidth="3" strokeLinecap="round" />
  </svg>
)

const PointsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
    <path d="M16 4L20 13H29L22 19L25 28L16 22L7 28L10 19L3 13H12L16 4Z" fill="var(--app-accent-hover)" opacity="0.2" stroke="var(--app-accent)" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="16" cy="16" r="3" fill="var(--app-accent)" />
  </svg>
)

const ShareIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="11" r="8" stroke="var(--app-accent)" strokeWidth="2" />
    <circle cx="16" cy="11" r="4" fill="var(--app-accent-hover)" opacity="0.4" />
    <path d="M12 18L10 28L16 25L22 28L20 18" fill="var(--app-accent)" />
    <path d="M16 11V15" stroke="var(--app-accent-hover)" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
)

const StatusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
    <rect x="6" y="8" width="20" height="18" rx="4" stroke="var(--app-accent)" strokeWidth="2.5" />
    <path d="M6 13H26" stroke="var(--app-accent-hover)" strokeWidth="3" opacity="0.3" />
    <path d="M11 19L14 22L21 15" stroke="var(--app-accent-hover)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)