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
    { value: 'standard', label: t('timeTracker.factors.difficulty.standard', 'Standardowy (×1.00)') },
    { value: 'advanced', label: t('timeTracker.factors.difficulty.advanced', 'Zaawansowany (×1.30)') },
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
  const [openDropdown, setOpenDropdown] = useState<{ id: string, type: 'diff' | 'bonus' } | null>(null)
  const [selectedValues, setSelectedValues] = useState<Record<string, { diff: string, bonus: string }>>({})

  const { data: pendingData, isLoading } = useQuery({
    queryKey: ['pending-time-entries', workspaceSlug],
    queryFn: () => apiFetchJson<{ success: boolean; data: any[] }>(`/api/time/pending?workspaceSlug=${workspaceSlug}`),
    enabled: !!workspaceSlug,
    refetchInterval: 5000,
  })
  const entries = pendingData?.data || []

  const approveMutation = useMutation({
    mutationFn: ({ id, difficultyLevel, bonusPoints }: any) =>
      apiFetchJson(`/api/time/${id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ difficultyLevel, bonusPoints })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revshare'] })
      queryClient.invalidateQueries({ queryKey: ['project-time-entries'] })
      toast.success(t('timeTracker.approveSuccess', 'Wpis został zatwierdzony.'))
    },
    onError: () => {
      toast.error(t('timeTracker.approveError', 'Błąd podczas zatwierdzania wpisu.'))
    }
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: any) =>
      apiFetchJson(`/api/time/${id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ rejectionReason: reason })
      }),
    onSuccess: () => {
      setRejectingId(null)
      setRejectionReason('')
      queryClient.invalidateQueries({ queryKey: ['pending-time-entries'] })
      toast.success(t('timeTracker.rejectSuccess', 'Wpis został odrzucony.'))
    },
    onError: () => {
      toast.error(t('timeTracker.rejectError', 'Błąd podczas odrzucania wpisu.'))
    }
  })

  if (isLoading) return <div className="text-center py-20 text-[var(--app-text-muted)]">{t('common.loading', 'Loading...')}</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--app-text-primary)]">{t('timeTracker.approval', 'Approval')}</h2>
          <p className="text-sm text-[var(--app-text-muted)]">{t('timeTracker.pending', 'Pending entries requiring review')}</p>
        </div>
        <div className="bg-[var(--app-accent)]/10 text-[var(--app-accent)] px-4 py-2 rounded-full font-bold text-sm">
          {entries.length} {t('timeTracker.pending', 'Pending')}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-[var(--app-bg-card)] rounded-2xl p-20 text-center shadow-sm">
          <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4 opacity-20" />
          <p className="text-[var(--app-text-muted)]">{t('timeTracker.noSessions', 'No pending entries to review.')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {entries.map((entry: any) => (
            <div key={entry.id} className="bg-[var(--app-bg-card)] rounded-2xl p-6 shadow-sm hover:bg-[var(--app-bg-elevated)]/30 transition-all flex flex-col gap-4">
              {/* Header: User Info & Role */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--app-bg-deepest)] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {entry.userImage ? <img src={entry.userImage} alt="" className="w-full h-full object-cover" /> : <div className="text-xs font-bold">{entry.userName?.[0]}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-[var(--app-text-primary)] text-sm">{entry.userName}</div>
                    <span className="px-2 py-0.5 rounded-lg bg-[var(--app-accent)]/10 text-[var(--app-accent)] text-[9px] uppercase font-black tracking-widest whitespace-nowrap">
                      {entry.projectRole?.replace('_', ' ')}
                    </span>
                    {!entry.endedAt && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-[#F2CE88]/20 text-[#F2CE88] bg-transparent text-[9px] uppercase font-black tracking-widest shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#F2CE88] animate-pulse" />
                        {t('timeTracker.pending', 'W Trakcie')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Info Row: Type, Task, Date, Duration */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm bg-[var(--app-bg-deepest)]/30 p-3 rounded-xl">
                <div className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shrink-0 ${entry.entryType === 'meeting'
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-blue-500/10 text-blue-500'
                  }`}>
                  {entry.entryType === 'meeting' ? t('timeTracker.isMeeting', 'Meeting') : t('timeTracker.task', 'Task')}
                </div>

                <span className="font-bold text-[var(--app-text-primary)] truncate max-w-[200px]" title={entry.taskTitle}>
                  {entry.taskTitle}
                </span>

                <div className="h-4 w-px bg-[var(--app-divider)]/20 mx-1 hidden md:block" />

                <div className="flex items-center gap-2 text-[var(--app-text-muted)] text-xs">
                  <Calendar size={14} className="opacity-50" />
                  <span>{new Date(entry.startedAt).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className="h-4 w-px bg-[var(--app-divider)]/20 mx-1 hidden md:block" />

                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-[var(--app-accent)] opacity-70" />
                  <span className="font-mono font-black text-[var(--app-accent)] tracking-tighter">
                    {formatMinutes(entry.durationMinutes)}
                  </span>
                  <span className="text-[10px] text-[var(--app-text-muted)] font-bold uppercase tracking-tighter">
                    {t('timeTracker.duration', 'Czas trwania')}
                  </span>
                </div>
              </div>

              {entry.description && (
                <div className="text-sm text-[var(--app-text-secondary)] bg-[var(--app-bg-deepest)]/10 p-3 rounded-xl italic">
                  "{entry.description}"
                </div>
              )}

              <div className="md:w-full flex items-end gap-4 mt-2 pt-4 border-t border-[var(--app-divider)]/10">
                {rejectingId === entry.id ? (
                  <div className="w-full space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <textarea
                      placeholder={t('timeTracker.rejectionReasonPlaceholder', 'Podaj powód odrzucenia (min. 5 znaków)...')}
                      className="w-full bg-[var(--app-bg-deepest)] rounded-xl p-3 text-sm text-[var(--app-text-primary)] focus:ring-1 focus:ring-rose-500 outline-none shadow-inner"
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => rejectMutation.mutate({ id: entry.id, reason: rejectionReason })}
                        disabled={rejectionReason.length < 5 || rejectMutation.isPending}
                        className="flex-1 bg-rose-500 text-white font-bold py-2.5 px-6 rounded-xl text-sm hover:bg-rose-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shadow-md"
                      >
                        <XCircle size={16} /> {t('timeTracker.reject', 'Odrzuć')}
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(null)
                          setRejectionReason('')
                        }}
                        className="flex-1 py-2.5 px-6 bg-[var(--app-bg-deepest)] text-[var(--app-text-muted)] rounded-xl text-sm hover:bg-[var(--app-bg-elevated)] transition-colors border border-[var(--app-divider)]/50"
                      >
                        {t('common.cancel', 'Anuluj')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-1 gap-3 min-w-0 h-full">
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase mb-1.5 ml-1">{t('timeTracker.difficulty', 'Trudność')}</div>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenDropdown(openDropdown?.id === entry.id && openDropdown?.type === 'diff' ? null : { id: entry.id, type: 'diff' })}
                            className={`w-full flex items-center justify-between px-4 py-2.5 bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] rounded-xl text-left transition-all outline-none text-xs font-bold ${openDropdown?.id === entry.id && openDropdown?.type === 'diff' ? 'ring-1 ring-[var(--app-accent)] border-[var(--app-accent)]' : 'hover:border-[var(--app-accent)]/50'
                              }`}
                          >
                            <span className="text-[var(--app-text-primary)] truncate">
                              {DIFFICULTIES.find(d => d.value === (selectedValues[entry.id]?.diff || 'standard'))?.label}
                            </span>
                            <ChevronDown size={14} className={`text-[var(--app-text-muted)] transition-transform duration-200 ${openDropdown?.id === entry.id && openDropdown?.type === 'diff' ? 'rotate-180' : ''}`} />
                          </button>
                          {openDropdown?.id === entry.id && openDropdown?.type === 'diff' && (
                            <div className="absolute z-50 w-full mt-2 bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                              {DIFFICULTIES.map(d => (
                                <button
                                  key={d.value}
                                  type="button"
                                  onClick={() => {
                                    setSelectedValues(prev => ({ ...prev, [entry.id]: { ...(prev[entry.id] || { diff: 'standard', bonus: '1.0' }), diff: d.value } }))
                                    setOpenDropdown(null)
                                  }}
                                  className={`w-full px-4 py-2.5 text-left text-xs font-bold transition-colors flex items-center justify-between ${(selectedValues[entry.id]?.diff || 'standard') === d.value ? 'text-[var(--app-accent)] bg-[var(--app-bg-deepest)]' : 'text-[var(--app-text-primary)] hover:bg-[var(--app-bg-deepest)]'
                                    }`}
                                >
                                  {d.label}
                                  {(selectedValues[entry.id]?.diff || 'standard') === d.value && <Check size={12} />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase mb-1.5 ml-1">{t('timeTracker.bonusFactor', 'Premia')}</div>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenDropdown(openDropdown?.id === entry.id && openDropdown?.type === 'bonus' ? null : { id: entry.id, type: 'bonus' })}
                            className={`w-full flex items-center justify-between px-4 py-2.5 bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] rounded-xl text-left transition-all outline-none text-xs font-bold ${openDropdown?.id === entry.id && openDropdown?.type === 'bonus' ? 'ring-1 ring-[var(--app-accent)] border-[var(--app-accent)]' : 'hover:border-[var(--app-accent)]/50'
                              }`}
                          >
                            <span className="text-[var(--app-text-primary)] truncate">
                              {BONUSES.find(b => b.value === (selectedValues[entry.id]?.bonus || '1.0'))?.label}
                            </span>
                            <ChevronDown size={14} className={`text-[var(--app-text-muted)] transition-transform duration-200 ${openDropdown?.id === entry.id && openDropdown?.type === 'bonus' ? 'rotate-180' : ''}`} />
                          </button>
                          {openDropdown?.id === entry.id && openDropdown?.type === 'bonus' && (
                            <div className="absolute z-50 w-full mt-2 bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                              {BONUSES.map(b => (
                                <button
                                  key={b.value}
                                  type="button"
                                  onClick={() => {
                                    setSelectedValues(prev => ({ ...prev, [entry.id]: { ...(prev[entry.id] || { diff: 'standard', bonus: '1.0' }), bonus: b.value } }))
                                    setOpenDropdown(null)
                                  }}
                                  className={`w-full px-4 py-2.5 text-left text-xs font-bold transition-colors flex items-center justify-between ${(selectedValues[entry.id]?.bonus || '1.0') === b.value ? 'text-[var(--app-accent)] bg-[var(--app-bg-deepest)]' : 'text-[var(--app-text-primary)] hover:bg-[var(--app-bg-deepest)]'
                                    }`}
                                >
                                  {b.label}
                                  {(selectedValues[entry.id]?.bonus || '1.0') === b.value && <Check size={12} />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const values = selectedValues[entry.id] || { diff: 'standard', bonus: '1.0' }
                            approveMutation.mutate({
                              id: entry.id,
                              difficultyLevel: values.diff,
                              bonusPoints: parseFloat(values.bonus)
                            })
                          }}
                          disabled={approveMutation.isPending || !entry.endedAt}
                          className="bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl text-sm hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 disabled:opacity-40"
                        >
                          <CheckCircle size={16} /> {t('timeTracker.approve', 'Zatwierdź')}
                        </button>
                        <button
                          onClick={() => setRejectingId(entry.id)}
                          className="py-2.5 px-4 bg-rose-500/10 text-rose-500 rounded-xl text-sm hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
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
