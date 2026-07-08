import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetchJson } from '@/lib/api'
import { CheckCircle, Calendar, Clock, XCircle, ChevronDown, Check } from 'lucide-react'
import { formatMinutes } from './utils'
import { toast } from '@/hooks/useToast'

export function HRApprovalView({ workspaceSlug }: { workspaceSlug: string }) {
  const { t } = useTranslation()

  const DIFFICULTIES = [
    { value: 'basic', label: t('timeTracker.factors.difficulty.basic', 'Podstawowy (×0.75)') },
    {
      value: 'standard',
      label: t('timeTracker.factors.difficulty.standard', 'Standardowy (×1.00)'),
    },
    {
      value: 'advanced',
      label: t('timeTracker.factors.difficulty.advanced', 'Zaawansowany (×1.30)'),
    },
    { value: 'critical', label: t('timeTracker.factors.difficulty.critical', 'Krytyczny (×1.50)') },
  ]

  const BONUSES = [
    { value: '1.0', label: t('timeTracker.factors.bonus.none', 'Brak (×1.00)') },
    { value: '1.1', label: t('timeTracker.factors.bonus.standard', 'Standard (×1.10)') },
    { value: '1.25', label: t('timeTracker.factors.bonus.vast', 'Sążna (×1.25)') },
    { value: '1.5', label: t('timeTracker.factors.bonus.mega', 'MEGA (×1.50)') },
  ]

  const queryClient = useQueryClient()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [openDropdown, setOpenDropdown] = useState<{ id: string; type: 'diff' | 'bonus' } | null>(
    null
  )
  const [selectedValues, setSelectedValues] = useState<
    Record<string, { diff: string; bonus: string }>
  >({})

  const { data: pendingData, isLoading } = useQuery({
    queryKey: ['pending-time-entries', workspaceSlug],
    queryFn: () =>
      apiFetchJson<{ success: boolean; data: any[] }>(
        `/api/time/pending?workspaceSlug=${workspaceSlug}`
      ),
    enabled: !!workspaceSlug,
    refetchInterval: 5000,
  })
  const entries = pendingData?.data || []

  const approveMutation = useMutation({
    mutationFn: ({ id, difficultyLevel, bonusPoints }: any) =>
      apiFetchJson(`/api/time/${id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ difficultyLevel, bonusPoints }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revshare'] })
      queryClient.invalidateQueries({ queryKey: ['project-time-entries'] })
      toast.success(t('timeTracker.approveSuccess', 'Wpis został zatwierdzony.'))
    },
    onError: () => {
      toast.error(t('timeTracker.approveError', 'Błąd podczas zatwierdzania wpisu.'))
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: any) =>
      apiFetchJson(`/api/time/${id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ rejectionReason: reason }),
      }),
    onSuccess: () => {
      setRejectingId(null)
      setRejectionReason('')
      queryClient.invalidateQueries({ queryKey: ['pending-time-entries'] })
      toast.success(t('timeTracker.rejectSuccess', 'Wpis został odrzucony.'))
    },
    onError: () => {
      toast.error(t('timeTracker.rejectError', 'Błąd podczas odrzucania wpisu.'))
    },
  })

  if (isLoading)
    return (
      <div className="py-20 text-center text-[var(--app-text-muted)]">
        {t('common.loading', 'Loading...')}
      </div>
    )

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--app-text-primary)]">
            {t('timeTracker.approval', 'Approval')}
          </h2>
          <p className="text-sm text-[var(--app-text-muted)]">
            {t('timeTracker.pending', 'Pending entries requiring review')}
          </p>
        </div>
        <div className="bg-[var(--app-accent)]/10 rounded-full px-4 py-2 text-sm font-bold text-[var(--app-accent)]">
          {entries.length} {t('timeTracker.pending', 'Pending')}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl bg-[var(--app-bg-card)] p-20 text-center shadow-sm">
          <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500 opacity-20" />
          <p className="text-[var(--app-text-muted)]">
            {t('timeTracker.noSessions', 'No pending entries to review.')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {entries.map((entry: any) => (
            <div
              key={entry.id}
              className="hover:bg-[var(--app-bg-elevated)]/30 flex flex-col gap-4 rounded-2xl bg-[var(--app-bg-card)] p-6 shadow-sm transition-all"
            >
              {/* Header: User Info & Role */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--app-bg-deepest)] shadow-inner">
                    {entry.userImage ? (
                      <img src={entry.userImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-xs font-bold">{entry.userName?.[0]}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-[var(--app-text-primary)]">
                      {entry.userName}
                    </div>
                    <span className="bg-[var(--app-accent)]/10 whitespace-nowrap rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[var(--app-accent)]">
                      {entry.projectRole?.replace('_', ' ')}
                    </span>
                    {!entry.endedAt && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#F2CE88]/20 bg-transparent px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#F2CE88] shadow-sm">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F2CE88]" />
                        {t('timeTracker.pending', 'W Trakcie')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Info Row: Type, Task, Date, Duration */}
              <div className="bg-[var(--app-bg-deepest)]/30 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl p-3 text-sm">
                <div
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                    entry.entryType === 'meeting'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-blue-500/10 text-blue-500'
                  }`}
                >
                  {entry.entryType === 'meeting'
                    ? t('timeTracker.isMeeting', 'Meeting')
                    : t('timeTracker.task', 'Task')}
                </div>

                <span
                  className="max-w-[200px] truncate font-bold text-[var(--app-text-primary)]"
                  title={entry.taskTitle}
                >
                  {entry.taskTitle}
                </span>

                <div className="bg-[var(--app-divider)]/20 mx-1 hidden h-4 w-px md:block" />

                <div className="flex items-center gap-2 text-xs text-[var(--app-text-muted)]">
                  <Calendar size={14} className="opacity-50" />
                  <span>
                    {new Date(entry.startedAt).toLocaleString('pl-PL', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="bg-[var(--app-divider)]/20 mx-1 hidden h-4 w-px md:block" />

                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-[var(--app-accent)] opacity-70" />
                  <span className="font-mono font-black tracking-tighter text-[var(--app-accent)]">
                    {formatMinutes(entry.durationMinutes)}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-[var(--app-text-muted)]">
                    {t('timeTracker.duration', 'Czas trwania')}
                  </span>
                </div>
              </div>

              {entry.description && (
                <div className="bg-[var(--app-bg-deepest)]/10 rounded-xl p-3 text-sm italic text-[var(--app-text-secondary)]">
                  "{entry.description}"
                </div>
              )}

              <div className="border-[var(--app-divider)]/10 mt-2 flex items-end gap-4 border-t pt-4 md:w-full">
                {rejectingId === entry.id ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2 w-full space-y-3">
                    <textarea
                      placeholder={t(
                        'timeTracker.rejectionReasonPlaceholder',
                        'Podaj powód odrzucenia (min. 5 znaków)...'
                      )}
                      className="w-full rounded-xl bg-[var(--app-bg-deepest)] p-3 text-sm text-[var(--app-text-primary)] shadow-inner outline-none focus:ring-1 focus:ring-rose-500"
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          rejectMutation.mutate({ id: entry.id, reason: rejectionReason })
                        }
                        disabled={rejectionReason.length < 5 || rejectMutation.isPending}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-rose-600 disabled:opacity-40"
                      >
                        <XCircle size={16} /> {t('timeTracker.reject', 'Odrzuć')}
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(null)
                          setRejectionReason('')
                        }}
                        className="border-[var(--app-divider)]/50 flex-1 rounded-xl border bg-[var(--app-bg-deepest)] px-6 py-2.5 text-sm text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)]"
                      >
                        {t('common.cancel', 'Anuluj')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex h-full min-w-0 flex-1 gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 ml-1 text-[10px] font-bold uppercase text-[var(--app-text-muted)]">
                          {t('timeTracker.difficulty', 'Trudność')}
                        </div>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenDropdown(
                                openDropdown?.id === entry.id && openDropdown?.type === 'diff'
                                  ? null
                                  : { id: entry.id, type: 'diff' }
                              )
                            }
                            className={`flex w-full items-center justify-between rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] px-4 py-2.5 text-left text-xs font-bold outline-none transition-all ${
                              openDropdown?.id === entry.id && openDropdown?.type === 'diff'
                                ? 'border-[var(--app-accent)] ring-1 ring-[var(--app-accent)]'
                                : 'hover:border-[var(--app-accent)]/50'
                            }`}
                          >
                            <span className="truncate text-[var(--app-text-primary)]">
                              {
                                DIFFICULTIES.find(
                                  (d) => d.value === (selectedValues[entry.id]?.diff || 'standard')
                                )?.label
                              }
                            </span>
                            <ChevronDown
                              size={14}
                              className={`text-[var(--app-text-muted)] transition-transform duration-200 ${openDropdown?.id === entry.id && openDropdown?.type === 'diff' ? 'rotate-180' : ''}`}
                            />
                          </button>
                          {openDropdown?.id === entry.id && openDropdown?.type === 'diff' && (
                            <div className="animate-in fade-in zoom-in-95 absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] shadow-[0_10px_40px_rgba(0,0,0,0.8)] duration-200">
                              {DIFFICULTIES.map((d) => (
                                <button
                                  key={d.value}
                                  type="button"
                                  onClick={() => {
                                    setSelectedValues((prev) => ({
                                      ...prev,
                                      [entry.id]: {
                                        ...(prev[entry.id] || { diff: 'standard', bonus: '1.0' }),
                                        diff: d.value,
                                      },
                                    }))
                                    setOpenDropdown(null)
                                  }}
                                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-bold transition-colors ${
                                    (selectedValues[entry.id]?.diff || 'standard') === d.value
                                      ? 'bg-[var(--app-bg-deepest)] text-[var(--app-accent)]'
                                      : 'text-[var(--app-text-primary)] hover:bg-[var(--app-bg-deepest)]'
                                  }`}
                                >
                                  {d.label}
                                  {(selectedValues[entry.id]?.diff || 'standard') === d.value && (
                                    <Check size={12} />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 ml-1 text-[10px] font-bold uppercase text-[var(--app-text-muted)]">
                          {t('timeTracker.bonusFactor', 'Premia')}
                        </div>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenDropdown(
                                openDropdown?.id === entry.id && openDropdown?.type === 'bonus'
                                  ? null
                                  : { id: entry.id, type: 'bonus' }
                              )
                            }
                            className={`flex w-full items-center justify-between rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] px-4 py-2.5 text-left text-xs font-bold outline-none transition-all ${
                              openDropdown?.id === entry.id && openDropdown?.type === 'bonus'
                                ? 'border-[var(--app-accent)] ring-1 ring-[var(--app-accent)]'
                                : 'hover:border-[var(--app-accent)]/50'
                            }`}
                          >
                            <span className="truncate text-[var(--app-text-primary)]">
                              {
                                BONUSES.find(
                                  (b) => b.value === (selectedValues[entry.id]?.bonus || '1.0')
                                )?.label
                              }
                            </span>
                            <ChevronDown
                              size={14}
                              className={`text-[var(--app-text-muted)] transition-transform duration-200 ${openDropdown?.id === entry.id && openDropdown?.type === 'bonus' ? 'rotate-180' : ''}`}
                            />
                          </button>
                          {openDropdown?.id === entry.id && openDropdown?.type === 'bonus' && (
                            <div className="animate-in fade-in zoom-in-95 absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] shadow-[0_10px_40px_rgba(0,0,0,0.8)] duration-200">
                              {BONUSES.map((b) => (
                                <button
                                  key={b.value}
                                  type="button"
                                  onClick={() => {
                                    setSelectedValues((prev) => ({
                                      ...prev,
                                      [entry.id]: {
                                        ...(prev[entry.id] || { diff: 'standard', bonus: '1.0' }),
                                        bonus: b.value,
                                      },
                                    }))
                                    setOpenDropdown(null)
                                  }}
                                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-bold transition-colors ${
                                    (selectedValues[entry.id]?.bonus || '1.0') === b.value
                                      ? 'bg-[var(--app-bg-deepest)] text-[var(--app-accent)]'
                                      : 'text-[var(--app-text-primary)] hover:bg-[var(--app-bg-deepest)]'
                                  }`}
                                >
                                  {b.label}
                                  {(selectedValues[entry.id]?.bonus || '1.0') === b.value && (
                                    <Check size={12} />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const values = selectedValues[entry.id] || {
                              diff: 'standard',
                              bonus: '1.0',
                            }
                            approveMutation.mutate({
                              id: entry.id,
                              difficultyLevel: values.diff,
                              bonusPoints: parseFloat(values.bonus),
                            })
                          }}
                          disabled={approveMutation.isPending || !entry.endedAt}
                          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/10 transition-all hover:bg-emerald-600 disabled:opacity-40"
                        >
                          <CheckCircle size={16} /> {t('timeTracker.approve', 'Zatwierdź')}
                        </button>
                        <button
                          onClick={() => setRejectingId(entry.id)}
                          className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-500 transition-all hover:bg-rose-500 hover:text-white"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
