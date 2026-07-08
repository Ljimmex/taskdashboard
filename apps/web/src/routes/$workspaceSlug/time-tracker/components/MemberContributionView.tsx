import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetchJson } from '@/lib/api'
import {
  Clock,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from 'lucide-react'
import { toast } from '@/hooks/useToast'
import { formatMinutes, formatHours } from './utils'
import { PendingEntryModal, type PendingRecentEntry } from './PendingEntryModal'

export function MemberContributionView({
  userId,
  selectedProjectId,
  workspaceSlug,
}: {
  userId: string
  selectedProjectId: string | null
  workspaceSlug: string
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [editingEntry, setEditingEntry] = useState<PendingRecentEntry | null>(null)
  const itemsPerPage = 10

  const { data: contribData, isLoading } = useQuery({
    queryKey: ['revshare-member', selectedProjectId, userId],
    queryFn: () =>
      apiFetchJson<{
        success: boolean
        data: { summary: any; recentEntries: any[]; hourThreshold: number }
      }>(`/api/time/contribution/${selectedProjectId}/member?userId=${userId}`),
    enabled: !!selectedProjectId && !!userId,
    refetchInterval: 5000,
  })

  const { data: recentData, isLoading: isRecentLoading } = useQuery({
    queryKey: ['member-recent-activity', selectedProjectId, userId],
    queryFn: () =>
      apiFetchJson<{ success: boolean; data: any[] }>(
        `/api/time?projectId=${selectedProjectId}&userId=${userId}`
      ),
    enabled: !!selectedProjectId && !!userId,
    refetchInterval: 5000,
  })

  const summary = contribData?.data?.summary
  const recent = recentData?.data || []
  const hourThreshold = contribData?.data?.hourThreshold || 200

  const totalPages = Math.ceil(recent.length / itemsPerPage)
  const paginatedRecent = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return recent.slice(start, start + itemsPerPage)
  }, [recent, currentPage])

  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1)
      return
    }

    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const invalidateTimeQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['revshare-member', selectedProjectId, userId] })
    queryClient.invalidateQueries({
      queryKey: ['member-recent-activity', selectedProjectId, userId],
    })
    queryClient.invalidateQueries({ queryKey: ['revshare'] })
    queryClient.invalidateQueries({ queryKey: ['project-time-entries'] })
    queryClient.invalidateQueries({ queryKey: ['pending-time-entries'] })
  }

  const updateEntryMutation = useMutation({
    mutationFn: (payload: {
      id: string
      description: string
      durationMinutes: number
      startedAt: string
      endedAt: string
      entryType: 'task' | 'meeting'
      taskId: string | null
      subtaskId: string | null
    }) =>
      apiFetchJson<{ success: boolean; data?: any; error?: string }>(`/api/time/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          description: payload.description,
          durationMinutes: payload.durationMinutes,
          startedAt: payload.startedAt,
          endedAt: payload.endedAt,
          entryType: payload.entryType,
          taskId: payload.taskId,
          subtaskId: payload.subtaskId,
        }),
      }),
    onSuccess: (response) => {
      if (!response.success) {
        toast.error(
          response.error ||
            t('timeTracker.pendingEntryUpdateError', 'Nie udalo sie zapisac zmian wpisu.')
        )
        return
      }

      invalidateTimeQueries()
      setEditingEntry(null)
      toast.success(t('timeTracker.pendingEntryUpdateSuccess', 'Zmiany wpisu zostaly zapisane.'))
    },
    onError: () => {
      toast.error(t('timeTracker.pendingEntryUpdateError', 'Nie udalo sie zapisac zmian wpisu.'))
    },
  })

  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetchJson<{ success: boolean; message?: string; error?: string }>(`/api/time/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (response) => {
      if (!response.success) {
        toast.error(
          response.error || t('timeTracker.pendingEntryDeleteError', 'Nie udalo sie usunac wpisu.')
        )
        return
      }

      invalidateTimeQueries()
      setEditingEntry(null)
      toast.success(t('timeTracker.pendingEntryDeleteSuccess', 'Wpis zostal usuniety.'))
    },
    onError: () => {
      toast.error(t('timeTracker.pendingEntryDeleteError', 'Nie udalo sie usunac wpisu.'))
    },
  })

  if (!selectedProjectId) {
    return (
      <div className="bg-[var(--app-bg-card)]/50 flex flex-col items-center justify-center rounded-3xl py-24 backdrop-blur-sm">
        <div className="mb-4 rounded-full bg-[var(--app-bg-elevated)] p-4 shadow-sm">
          <AlertCircle size={40} className="text-[var(--app-text-muted)]" />
        </div>
        <h3 className="mb-1 text-lg font-bold text-[var(--app-text-primary)]">
          {t('timeTracker.noProject', 'Brak wybranego projektu')}
        </h3>
        <p className="text-sm font-medium text-[var(--app-text-muted)]">
          {t(
            'timeTracker.selectProjectToViewContrib',
            'Wybierz projekt z listy, aby zobaczyć swój wkład.'
          )}
        </p>
      </div>
    )
  }

  if (isLoading || isRecentLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-[var(--app-bg-card)]" />
          ))}
        </div>
        <div className="h-40 rounded-2xl bg-[var(--app-bg-card)]" />
        <div className="h-64 rounded-2xl bg-[var(--app-bg-card)]" />
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500 ease-out">
      {/* Sekcja Statystyk */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          value={
            summary?.hasThreshold
              ? t('timeTracker.qualified', 'Zakwalifikowany')
              : t('timeTracker.pending', 'W trakcie')
          }
          isStatus
          statusState={summary?.hasThreshold ? 'qualified' : 'pending'}
        />
      </div>

      {/* Pasek Postępu Kwalifikacji */}
      {!summary?.hasThreshold && (
        <div className="group relative overflow-hidden rounded-3xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] p-6 shadow-sm md:p-8">
          {/* Subtelny gradient w tle */}
          <div className="pointer-events-none absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-amber-500/5 blur-3xl transition-opacity group-hover:bg-amber-500/10" />

          <div className="relative z-10 mb-6 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div className="flex-1">
              <h3 className="mb-2 text-xl font-bold tracking-tight text-[var(--app-text-primary)]">
                {t('timeTracker.qualificationTitle', 'Droga do kwalifikacji')}
              </h3>
              <p className="max-w-lg text-sm text-[var(--app-text-muted)]">
                {t(
                  'timeTracker.qualificationDesc',
                  'Potrzebujesz {{threshold}} zatwierdzonych godzin pracy, aby odblokować pełny udział w RevShare dla tego projektu.',
                  { threshold: hourThreshold }
                )}
              </p>
            </div>
            <div className="flex-shrink-0 text-left md:text-right">
              <div className="flex items-baseline gap-1">
                <span className="bg-gradient-to-br from-amber-400 to-amber-600 bg-clip-text text-4xl font-extrabold text-transparent">
                  {formatHours(summary?.approvedBaseHoursTotal || 0)}
                </span>
                <span className="text-lg font-medium text-[var(--app-text-muted)]">
                  / {hourThreshold}h
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-2">
            <div className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
              <span>{t('timeTracker.progress', 'Postęp')}</span>
              <span className="text-amber-500">
                {Math.round(((summary?.approvedBaseHoursTotal || 0) / hourThreshold) * 100)}%
              </span>
            </div>
            <div className="inset-shadow-sm h-4 w-full overflow-hidden rounded-full border border-[var(--app-divider)] bg-[var(--app-bg-elevated)]">
              <div
                className="relative h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.min(((summary?.approvedBaseHoursTotal || 0) / hourThreshold) * 100, 100)}%`,
                }}
              >
                {/* Efekt połysku na pasku */}
                <div className="absolute bottom-0 left-0 right-0 top-0 bg-gradient-to-b from-white/20 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historia Aktywności */}
      <div className="rounded-3xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] p-6 shadow-sm md:p-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="flex items-center gap-3 text-lg font-bold text-[var(--app-text-primary)]">
            <HistoryIcon />
            {t('timeTracker.recentHistory', 'Ostatnia Aktywność')}
          </h2>
        </div>

        {recent.length === 0 ? (
          <div className="bg-[var(--app-bg-elevated)]/50 flex flex-col items-center justify-center rounded-2xl py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--app-divider)] bg-[var(--app-bg-card)]">
              <Clock size={20} className="text-[var(--app-text-muted)]" />
            </div>
            <p className="font-medium text-[var(--app-text-muted)]">
              {t('timeTracker.noRecentEntries', 'Brak zarejestrowanego czasu w tym projekcie.')}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedRecent.map((entry: any) => (
                <HistoryEntry
                  key={entry.id}
                  entry={entry}
                  onEdit={setEditingEntry}
                  onDelete={(entry) => {
                    if (
                      window.confirm(
                        t('timeTracker.confirmDeleteEntry', 'Czy na pewno chcesz usunąć ten wpis?')
                      )
                    ) {
                      deleteEntryMutation.mutate(entry.id)
                    }
                  }}
                />
              ))}
            </div>

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
          </>
        )}
      </div>

      <PendingEntryModal
        isOpen={!!editingEntry}
        entry={editingEntry}
        workspaceSlug={workspaceSlug}
        ownerUserId={editingEntry?.userId || userId}
        isSaving={updateEntryMutation.isPending}
        isDeleting={deleteEntryMutation.isPending}
        onClose={() => setEditingEntry(null)}
        onSave={(payload) => {
          if (!editingEntry) return
          updateEntryMutation.mutate({ id: editingEntry.id, ...payload })
        }}
        onDelete={() => {
          if (!editingEntry) return
          deleteEntryMutation.mutate(editingEntry.id)
        }}
      />
    </div>
  )
}

// ----------------------
// Komponenty Pomocnicze
// ----------------------

function StatCard({ icon, label, value, isStatus = false, statusState }: any) {
  return (
    <div
      className={`group relative overflow-hidden rounded-[24px] border border-[var(--app-divider)] bg-[var(--app-bg-card)] p-6 transition-all duration-300 hover:shadow-xl hover:shadow-black/10`}
    >
      <div className="relative z-10">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex-shrink-0">{icon}</div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--app-text-muted)]">
            {label}
          </span>
        </div>

        {isStatus ? (
          <div className="mt-1">
            <span
              className={`inline-flex items-center gap-2.5 rounded-xl border bg-transparent px-4 py-2 text-[10px] font-black uppercase tracking-wider shadow-sm ${
                statusState === 'qualified'
                  ? 'border-emerald-500/20 text-emerald-500'
                  : 'border-[#F2CE88]/20 text-[#F2CE88]'
              }`}
            >
              <div
                className={`h-1.5 w-1.5 rounded-full ${statusState === 'qualified' ? 'bg-emerald-500' : 'bg-[#F2CE88]'} ${statusState === 'pending' ? 'animate-pulse' : ''}`}
              />
              {value}
            </span>
          </div>
        ) : (
          <div className="text-3xl font-black tracking-tight text-[var(--app-text-primary)]">
            {value}
          </div>
        )}
      </div>
    </div>
  )
}

function HistoryEntry({
  entry,
  onEdit,
  onDelete,
}: {
  entry: any
  onEdit: (entry: PendingRecentEntry) => void
  onDelete: (entry: PendingRecentEntry) => void
}) {
  const { t, i18n } = useTranslation()
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return {
          color: 'text-emerald-500',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/10',
          label: t('timeTracker.history.approved', 'Zatwierdzone'),
        }
      case 'rejected':
        return {
          color: 'text-rose-500',
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/10',
          label: t('timeTracker.history.rejected', 'Odrzucone'),
        }
      default:
        return {
          color: 'text-amber-500',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/10',
          label: t('timeTracker.history.pending', 'Oczekujące'),
        }
    }
  }

  const status = getStatusConfig(entry.approvalStatus)
  const canManagePending = entry.approvalStatus === 'pending' && !!entry.endedAt

  return (
    <div className="group flex cursor-default flex-col justify-between rounded-[20px] border border-[var(--app-divider)] bg-[var(--app-bg-card)] p-5 transition-all duration-300 hover:bg-[var(--app-bg-elevated)] hover:shadow-lg hover:shadow-black/5 md:flex-row md:items-center">
      <div className="mb-3 flex-1 pr-4 md:mb-0">
        <h3 className="mb-2 line-clamp-1 text-[15px] font-bold text-[var(--app-text-primary)] transition-colors group-hover:text-[var(--app-accent)]">
          {entry.taskTitle || t('timeTracker.history.noTitle', 'Zadanie bez tytułu')}
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          <span className="flex items-center gap-1.5 rounded-lg border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] px-2.5 py-1.5 text-[var(--app-text-primary)]">
            <Clock size={12} className="text-[var(--app-accent)]" />
            {formatMinutes(entry.rawDurationMinutes ?? entry.durationMinutes)}
          </span>
          <div className="flex items-center gap-2 text-xs text-[var(--app-text-muted)]">
            <Calendar size={14} className="opacity-50" />
            <span>
              {new Date(entry.startedAt).toLocaleString(i18n.language, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <span
            className={`rounded-full border px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] ${status.bg} ${status.color} ${status.border} shadow-sm`}
          >
            <span className="flex items-center gap-1.5">
              <div className={`h-1 w-1 rounded-full ${status.color.replace('text-', 'bg-')}`} />
              {status.label}
            </span>
          </span>
        </div>

        {entry.description && (
          <div className="bg-[var(--app-bg-elevated)]/30 border-[var(--app-accent)]/20 mt-4 line-clamp-2 max-w-2xl rounded-xl border-l-[3px] px-3 py-2.5 text-[11px] font-medium leading-relaxed text-[var(--app-text-secondary)]">
            {entry.description}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-[var(--app-divider)] pt-4 md:justify-end md:border-t-0 md:pt-0">
        {canManagePending && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(entry)}
              className="hover:border-[var(--app-accent)]/40 inline-flex items-center gap-2 rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] px-3 py-2 text-xs font-bold text-[var(--app-text-primary)] transition-colors hover:text-[var(--app-accent)]"
            >
              <Pencil size={14} />
              {t('common.edit', 'Edytuj')}
            </button>
            <button
              type="button"
              onClick={() => onDelete(entry)}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-500 transition-colors hover:bg-rose-500/15"
            >
              <Trash2 size={14} />
              {t('common.delete', 'Usuń')}
            </button>
          </div>
        )}
        <div className="flex flex-col items-end text-right">
          <div className="bg-gradient-to-br from-[var(--app-text-primary)] to-[var(--app-text-muted)] bg-clip-text text-base font-black text-[var(--app-text-primary)]">
            +{entry.points} pts
          </div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--app-text-muted)] opacity-40">
            {t('timeTracker.history.pointsLabel', 'Wkład')}
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
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
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
    <path
      d="M11 19L14 22L21 15"
      stroke="var(--app-accent-hover)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const HistoryIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
    <path
      d="M16 4C9.37 4 4 9.37 4 16C4 22.63 9.37 28 16 28C22.63 28 28 22.63 28 16"
      stroke="var(--app-accent)"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.3"
    />
    <path
      d="M16 8V16L22 20"
      stroke="var(--app-accent)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 28C19.1826 28 22.2348 26.7357 24.4853 24.4853C26.7357 22.2348 28 19.1826 28 16"
      stroke="var(--app-accent)"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
)
