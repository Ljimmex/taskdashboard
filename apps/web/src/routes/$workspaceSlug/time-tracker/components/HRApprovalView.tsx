import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetchJson } from '@/lib/api'
import { CheckCircle, Calendar, Clock, XCircle } from 'lucide-react'
import { formatMinutes } from './utils'

export function HRApprovalView({ workspaceSlug }: { workspaceSlug: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const { data: pendingData, isLoading } = useQuery({
    queryKey: ['pending-time-entries', workspaceSlug],
    queryFn: () => apiFetchJson<{ success: boolean; data: any[] }>(`/api/time/pending?workspaceSlug=${workspaceSlug}`),
    enabled: !!workspaceSlug,
  })
  const entries = pendingData?.data || []

  const approveMutation = useMutation({
    mutationFn: ({ id, difficultyLevel, bonusPoints }: any) =>
      apiFetchJson(`/api/time/${id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ difficultyLevel, bonusPoints })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-time-entries'] })
      queryClient.invalidateQueries({ queryKey: ['revshare'] })
      queryClient.invalidateQueries({ queryKey: ['project-time-entries'] })
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
                    <div className="font-bold text-[var(--app-text-primary)]">{entry.userName}</div>
                    <span className="px-2 py-0.5 rounded-lg bg-[var(--app-accent)]/10 text-[var(--app-accent)] text-[9px] uppercase font-black tracking-widest whitespace-nowrap">
                      {entry.projectRole?.replace('_', ' ')}
                    </span>
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

                <div className="h-4 w-px bg-[var(--app-border)]/20 mx-1 hidden md:block" />

                <div className="flex items-center gap-2 text-[var(--app-text-muted)] text-xs">
                  <Calendar size={14} className="opacity-50" />
                  <span>{new Date(entry.startedAt).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className="h-4 w-px bg-[var(--app-border)]/20 mx-1 hidden md:block" />

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

              <div className="md:w-full flex items-end gap-4 mt-2 pt-4 border-t border-[var(--app-border)]/10">
                {rejectingId === entry.id ? (
                  <div className="w-full space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <textarea
                      placeholder={t('timeTracker.rejectionReasonPlaceholder', 'Podaj powód odrzucenia...')}
                      className="w-full bg-[var(--app-bg-deepest)] rounded-xl p-3 text-sm text-[var(--app-text-primary)] focus:ring-1 focus:ring-rose-500 outline-none shadow-inner"
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => rejectMutation.mutate({ id: entry.id, reason: rejectionReason })}
                        disabled={rejectionReason.length < 5 || rejectMutation.isPending}
                        className="bg-rose-500 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-rose-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shadow-md"
                      >
                        <XCircle size={16} /> {t('timeTracker.reject', 'Odrzuć wpis')}
                      </button>
                      <button
                        onClick={() => setRejectingId(null)}
                        className="px-6 py-2.5 bg-[var(--app-bg-deepest)] text-[var(--app-text-muted)] rounded-xl text-sm hover:bg-[var(--app-bg-elevated)] transition-colors"
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
                        <select
                          id={`diff-${entry.id}`}
                          className="w-full bg-[var(--app-bg-deepest)] rounded-xl px-4 py-2.5 text-sm text-[var(--app-text-primary)] outline-none hover:bg-[var(--app-bg-elevated)] transition-all appearance-none cursor-pointer shadow-inner"
                          defaultValue="standard"
                        >
                          <option value="basic">Podstawowy (×0.75)</option>
                          <option value="standard">Standardowy (×1.00)</option>
                          <option value="advanced">Zaawansowany (×1.30)</option>
                          <option value="critical">Krytyczny (×1.50)</option>
                        </select>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase mb-1.5 ml-1">{t('timeTracker.bonusFactor', 'Premia')}</div>
                        <select
                          id={`bonus-factor-${entry.id}`}
                          className="w-full bg-[var(--app-bg-deepest)] rounded-xl px-4 py-2.5 text-sm text-[var(--app-text-primary)] outline-none hover:bg-[var(--app-bg-elevated)] transition-all appearance-none cursor-pointer shadow-inner"
                          defaultValue="1.0"
                        >
                          <option value="1.0">Brak (×1.00)</option>
                          <option value="1.1">Standard (×1.10)</option>
                          <option value="1.25">Sążna (×1.25)</option>
                          <option value="1.5">MEGA (×1.50)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 h-[42px] mb-[1px]">
                      <button
                        onClick={() => {
                          const diff = (document.getElementById(`diff-${entry.id}`) as HTMLSelectElement).value
                          const factorStr = (document.getElementById(`bonus-factor-${entry.id}`) as HTMLSelectElement).value
                          const factor = parseFloat(factorStr)
                          const hours = entry.durationMinutes / 60
                          const bonusPoints = factor > 1.0 ? Math.round(hours * (factor - 1) * 10) : 0
                          approveMutation.mutate({ id: entry.id, difficultyLevel: diff, bonusPoints })
                        }}
                        disabled={approveMutation.isPending}
                        className="min-w-[140px] h-full bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.25)] font-bold py-2 px-4 rounded-xl text-sm hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                      >
                        <CheckCircle size={18} /> {t('timeTracker.approve', 'Zatwierdź')}
                      </button>
                      <button
                        onClick={() => setRejectingId(entry.id)}
                        className="h-full bg-rose-500/10 text-rose-500 font-bold px-4 rounded-xl text-sm hover:bg-rose-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shrink-0"
                        title={t('timeTracker.reject', 'Odrzuć')}
                      >
                        <XCircle size={18} />
                      </button>
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
