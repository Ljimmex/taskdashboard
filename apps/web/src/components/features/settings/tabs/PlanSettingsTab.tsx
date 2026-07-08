import { useState, useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useSearch } from '@tanstack/react-router'
import { apiFetchJson } from '@/lib/api'
import { useSession } from '@/lib/auth'
import {
  CreditCard,
  Crown,
  Users,
  HardDrive,
  Folder,
  UsersRound,
  FileText,
  SquareKanban,
  Upload,
  Loader,
  Check,
  ExternalLink,
  RotateCcw,
  XCircle,
  AlertCircle,
  Download,
  Receipt,
} from 'lucide-react'

interface PlanSettingsTabProps {
  workspace: any
}

type Plan = 'free' | 'plus' | 'pro' | 'enterprise'
type BillingPeriod = 'month' | 'quarter' | 'year'

const PLANS: Plan[] = ['free', 'plus', 'pro', 'enterprise']
const BILLING_PERIODS: BillingPeriod[] = ['month', 'quarter', 'year']

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const PLAN_STORAGE: Record<Plan, { baseStorageGB: number; storagePerSeatGB: number }> = {
  free: { baseStorageGB: 0, storagePerSeatGB: 0 },
  plus: { baseStorageGB: 50, storagePerSeatGB: 5 },
  pro: { baseStorageGB: 50, storagePerSeatGB: 15 },
  enterprise: { baseStorageGB: 0, storagePerSeatGB: 0 },
}

function getWorkspaceStorageLimitGB(workspace: any): number {
  const plan: Plan = workspace?.subscriptionPlan || 'free'
  if (plan === 'free') {
    return workspace?.maxStorageGB || 0.5
  }
  if (plan === 'enterprise') {
    return workspace?.maxStorageGB || 0
  }
  const limits = PLAN_STORAGE[plan]
  const seats = workspace?.currentSeatCount || 1
  return limits.baseStorageGB + limits.storagePerSeatGB * seats
}

function formatCurrency(cents: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

function LimitRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-[var(--app-text-secondary)]">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-[var(--app-text-primary)]">{value}</span>
    </div>
  )
}

export function PlanSettingsTab({ workspace }: PlanSettingsTabProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
  const isPlatformOwner = workspace?.isPlatformOwner === true
  const search = useSearch({ strict: false }) as { checkout?: string }

  const currentPlan: Plan = workspace?.subscriptionPlan || 'free'
  const [selectedPlan, setSelectedPlan] = useState<Plan>(currentPlan)
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('month')
  const [useOverride, setUseOverride] = useState(!!workspace?.isOwnerOverride)
  const [seatsInput, setSeatsInput] = useState<number>(workspace?.currentSeatCount ?? 1)
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'success' | 'cancel' | 'pending'>(
    search.checkout === 'success' ? 'success' : search.checkout === 'cancel' ? 'cancel' : 'idle'
  )

  useEffect(() => {
    setSelectedPlan(currentPlan)
    setUseOverride(!!workspace?.isOwnerOverride)
    setSeatsInput(workspace?.currentSeatCount ?? 1)
  }, [workspace?.subscriptionPlan, workspace?.isOwnerOverride, workspace?.currentSeatCount])

  // Apply plan selected on the landing page
  useEffect(() => {
    if (!isPlatformOwner || workspace?.subscriptionPlan !== 'free') return

    const pendingPlan = localStorage.getItem('zadano_pending_plan') as Plan | null
    const pendingPeriod = localStorage.getItem('zadano_pending_period') as BillingPeriod | null

    if (pendingPlan && ['plus', 'pro'].includes(pendingPlan)) {
      setSelectedPlan(pendingPlan)
      if (pendingPeriod && BILLING_PERIODS.includes(pendingPeriod)) {
        setBillingPeriod(pendingPeriod)
      }
      localStorage.removeItem('zadano_pending_plan')
      localStorage.removeItem('zadano_pending_period')
    }
  }, [isPlatformOwner, workspace?.subscriptionPlan])

  // Poll workspace data after successful checkout
  useEffect(() => {
    if (checkoutStatus !== 'success') return

    setCheckoutStatus('pending')
    let attempts = 0
    const maxAttempts = 10
    const interval = setInterval(() => {
      attempts++
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceSlug] })
      if (attempts >= maxAttempts) {
        clearInterval(interval)
        setCheckoutStatus('success')
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [checkoutStatus, queryClient, workspaceSlug])

  const planDisplayName = (plan: Plan) =>
    t(`settings.organization.plan.plan_names.${plan}`, {
      defaultValue: plan.charAt(0).toUpperCase() + plan.slice(1),
    })

  const billingPeriodLabel = (period: BillingPeriod) =>
    t(`settings.organization.plan.billing_periods.${period}`, {
      defaultValue: period.charAt(0).toUpperCase() + period.slice(1),
    })

  const displayLimit = (value: number | null | undefined) =>
    value === null || value === undefined ? t('settings.organization.plan.unlimited') : value

  const limits = workspace?.limits
  const usage = workspace?.usage
  const membersUsed = usage?.members ?? workspace?.currentSeatCount ?? 1
  const storageUsed = usage?.usedStorageBytes ?? workspace?.usedStorageBytes ?? 0
  const projectsUsed = usage?.projects ?? 0
  const teamsUsed = usage?.teams ?? 0
  const docsUsed = usage?.docs ?? 0
  const whiteboardsUsed = usage?.whiteboards ?? 0
  const maxMembers = limits?.maxMembers ?? workspace?.maxMembers
  const maxProjects = limits?.maxProjects ?? workspace?.maxProjects
  const maxTeams = limits?.maxTeams ?? workspace?.maxTeams
  const maxDocs = limits?.maxDocs ?? workspace?.maxDocs
  const maxWhiteboards = limits?.maxWhiteboards ?? workspace?.maxWhiteboards
  const maxFileSizeMB = limits?.maxFileSizeMB ?? workspace?.maxFileSizeMB ?? 10
  const storageLimitGB = limits?.maxStorageGB ?? getWorkspaceStorageLimitGB(workspace)

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const successUrl = `${window.location.origin}/${workspaceSlug}/settings?checkout=success`
      const res = await apiFetchJson<{ data: { url: string; checkoutId: string } }>(
        '/api/billing/checkout',
        {
          method: 'POST',
          headers: { 'x-user-id': session?.user?.id || '' },
          body: JSON.stringify({
            workspaceId: workspace.id,
            plan: selectedPlan,
            billingPeriod,
            seats: workspace?.currentSeatCount || 1,
            successUrl,
          }),
        }
      )
      return res.data
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url
      }
    },
    onError: (error: any) => {
      console.error('Checkout failed:', error)
      alert(
        t('settings.organization.plan.checkout_error', {
          defaultValue: 'Failed to create checkout session',
        })
      )
    },
  })

  const portalMutation = useMutation({
    mutationFn: async () => {
      const returnUrl = window.location.href
      const res = await apiFetchJson<{ data: { url: string } }>('/api/billing/portal', {
        method: 'POST',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify({
          workspaceId: workspace.id,
          returnUrl,
        }),
      })
      return res.data
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, '_blank')
      }
    },
    onError: (error: any) => {
      console.error('Portal failed:', error)
      alert(
        t('settings.organization.plan.portal_error', {
          defaultValue: 'Failed to open customer portal',
        })
      )
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async ({ action }: { action: 'cancel' | 'uncancel' | 'revoke' }) => {
      return apiFetchJson('/api/billing/cancel', {
        method: 'POST',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify({ workspaceId: workspace.id, action }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceSlug] })
      if (workspace?.id) {
        queryClient.invalidateQueries({ queryKey: ['files', 'quota', workspace.id] })
        queryClient.invalidateQueries({ queryKey: ['files-quota', workspace.id] })
      }
    },
    onError: (error: any) => {
      console.error('Cancel failed:', error)
      alert(
        t('settings.organization.plan.cancel_error', {
          defaultValue: 'Failed to update subscription',
        })
      )
    },
  })

  const seatsMutation = useMutation({
    mutationFn: async ({ seats }: { seats: number }) => {
      const res = await apiFetchJson<{ data: { seats: number | null } }>('/api/billing/seats', {
        method: 'POST',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify({ workspaceId: workspace.id, seats }),
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceSlug] })
      if (workspace?.id) {
        queryClient.invalidateQueries({ queryKey: ['files', 'quota', workspace.id] })
        queryClient.invalidateQueries({ queryKey: ['files-quota', workspace.id] })
      }
    },
    onError: (error: any) => {
      console.error('Seats update failed:', error)
      alert(t('settings.organization.plan.seats_error', { defaultValue: 'Failed to update seats' }))
    },
  })

  const { data: invoicesData } = useQuery({
    queryKey: ['billing-invoices', workspace?.id],
    queryFn: async () => {
      const res = await apiFetchJson<{ data: any[] }>(
        `/api/billing/invoices?workspaceId=${workspace.id}`,
        {
          headers: { 'x-user-id': session?.user?.id || '' },
        }
      )
      return res.data
    },
    enabled: !!workspace?.id,
  })

  const overrideMutation = useMutation({
    mutationFn: async ({
      isOwnerOverride,
      overridePlan,
    }: {
      isOwnerOverride: boolean
      overridePlan?: Plan
    }) => {
      return apiFetchJson(`/api/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify({ isOwnerOverride, overridePlan }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspace?.slug] })
      if (workspaceSlug) {
        queryClient.invalidateQueries({ queryKey: ['workspace', workspaceSlug] })
      }
    },
    onError: (error: any) => {
      console.error('Owner override failed:', error)
      alert(
        t('settings.organization.plan.override_error', {
          defaultValue: 'Failed to apply plan override',
        })
      )
    },
  })

  const handleApplyOverride = () => {
    overrideMutation.mutate({ isOwnerOverride: true, overridePlan: selectedPlan })
  }

  const handleRemoveOverride = () => {
    overrideMutation.mutate({ isOwnerOverride: false })
  }

  const handleUpdateSeats = () => {
    if (seatsInput !== workspace?.currentSeatCount) {
      seatsMutation.mutate({ seats: seatsInput })
    }
  }

  const isPaidPlan = selectedPlan !== 'free'
  const overrideActive = !!workspace?.isOwnerOverride
  const hasActiveSubscription =
    workspace?.subscriptionStatus === 'active' && workspace?.polarSubscriptionId
  const isCancelingAtPeriodEnd = workspace?.cancelAtPeriodEnd ?? false

  return (
    <div className="space-y-6">
      {/* Checkout status messages */}
      {checkoutStatus === 'success' && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
          <Check className="mt-0.5 h-5 w-5 text-green-500" />
          <div>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              {t('settings.organization.plan.checkout_success_title', {
                defaultValue: 'Payment successful',
              })}
            </p>
            <p className="text-xs text-[var(--app-text-muted)]">
              {t('settings.organization.plan.checkout_success_desc', {
                defaultValue: 'We are syncing your subscription. This may take a few seconds.',
              })}
            </p>
          </div>
        </div>
      )}
      {checkoutStatus === 'cancel' && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {t('settings.organization.plan.checkout_cancel_title', {
                defaultValue: 'Checkout cancelled',
              })}
            </p>
            <p className="text-xs text-[var(--app-text-muted)]">
              {t('settings.organization.plan.checkout_cancel_desc', {
                defaultValue: 'You can try again at any time.',
              })}
            </p>
          </div>
        </div>
      )}
      {checkoutStatus === 'pending' && (
        <div className="bg-[var(--app-accent)]/10 border-[var(--app-accent)]/20 flex items-center gap-3 rounded-2xl border p-4">
          <Loader className="h-5 w-5 animate-spin text-[var(--app-accent)]" />
          <p className="text-sm font-medium text-[var(--app-accent)]">
            {t('settings.organization.plan.checkout_pending', {
              defaultValue: 'Activating your subscription...',
            })}
          </p>
        </div>
      )}

      {/* Current Plan */}
      <section className="rounded-2xl bg-[var(--app-bg-elevated)] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="bg-[var(--app-accent)]/10 flex h-10 w-10 items-center justify-center rounded-xl">
            <Crown className="h-5 w-5 text-[var(--app-accent)]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--app-text-primary)]">
              {planDisplayName(currentPlan)}
            </h3>
            <p className="text-sm text-[var(--app-text-muted)]">
              {t('settings.organization.plan.status', {
                status: workspace?.subscriptionStatus || 'trial',
              })}
            </p>
          </div>
          {overrideActive && (
            <span className="bg-[var(--app-accent)]/10 ml-auto rounded-lg px-2 py-1 text-xs font-bold text-[var(--app-accent)]">
              {t('settings.organization.plan.override_badge')}
            </span>
          )}
        </div>

        <div className="divide-[var(--app-border)]/50 space-y-0 divide-y">
          <LimitRow
            icon={<Users className="h-4 w-4" />}
            label={t('settings.organization.plan.members')}
            value={`${membersUsed} / ${String(displayLimit(maxMembers))}`}
          />
          <LimitRow
            icon={<HardDrive className="h-4 w-4" />}
            label={t('settings.organization.plan.storage')}
            value={
              storageLimitGB > 0
                ? `${formatBytes(storageUsed)} / ${storageLimitGB} GB`
                : `${formatBytes(storageUsed)} / ${t('settings.organization.plan.limited')}`
            }
          />
          <LimitRow
            icon={<Folder className="h-4 w-4" />}
            label={t('settings.organization.plan.projects')}
            value={`${projectsUsed} / ${String(displayLimit(maxProjects))}`}
          />
          <LimitRow
            icon={<UsersRound className="h-4 w-4" />}
            label={t('settings.organization.plan.teams')}
            value={`${teamsUsed} / ${String(displayLimit(maxTeams))}`}
          />
          <LimitRow
            icon={<FileText className="h-4 w-4" />}
            label={t('settings.organization.plan.docs')}
            value={`${docsUsed} / ${String(displayLimit(maxDocs))}`}
          />
          <LimitRow
            icon={<SquareKanban className="h-4 w-4" />}
            label={t('settings.organization.plan.whiteboards')}
            value={`${whiteboardsUsed} / ${String(displayLimit(maxWhiteboards))}`}
          />
          <LimitRow
            icon={<Upload className="h-4 w-4" />}
            label={t('settings.organization.plan.file_size')}
            value={`${maxFileSizeMB} MB`}
          />
        </div>
      </section>

      {/* Subscription management for active paid subscriptions */}
      {hasActiveSubscription && !overrideActive && (
        <section className="space-y-4 rounded-2xl bg-[var(--app-bg-elevated)] p-5">
          <h4 className="text-base font-semibold text-[var(--app-text-primary)]">
            {t('settings.organization.plan.manage_subscription', {
              defaultValue: 'Manage subscription',
            })}
          </h4>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              className="flex items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-card)] px-4 py-2.5 font-medium text-[var(--app-text-primary)] transition-colors hover:bg-[var(--app-bg-page)] disabled:opacity-60"
            >
              {portalMutation.isPending ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {t('settings.organization.plan.open_portal', { defaultValue: 'Open billing portal' })}
            </button>

            {isCancelingAtPeriodEnd ? (
              <button
                onClick={() => cancelMutation.mutate({ action: 'uncancel' })}
                disabled={cancelMutation.isPending}
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-card)] px-4 py-2.5 font-medium text-[var(--app-text-primary)] transition-colors hover:bg-[var(--app-bg-page)] disabled:opacity-60"
              >
                {cancelMutation.isPending ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                {t('settings.organization.plan.uncancel', { defaultValue: 'Resume subscription' })}
              </button>
            ) : (
              <button
                onClick={() => cancelMutation.mutate({ action: 'cancel' })}
                disabled={cancelMutation.isPending}
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-card)] px-4 py-2.5 font-medium text-[var(--app-text-primary)] transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-60"
              >
                {cancelMutation.isPending ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {t('settings.organization.plan.cancel', { defaultValue: 'Cancel at period end' })}
              </button>
            )}
          </div>

          <div className="border-[var(--app-border)]/50 border-t pt-2">
            <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
              {t('settings.organization.plan.seats', { defaultValue: 'Seats' })}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                value={seatsInput}
                onChange={(e) => setSeatsInput(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] px-3 py-2 text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)]"
              />
              <button
                onClick={handleUpdateSeats}
                disabled={seatsMutation.isPending || seatsInput === workspace?.currentSeatCount}
                className="flex items-center gap-2 rounded-xl bg-[var(--app-accent)] px-4 py-2 font-medium text-[var(--app-accent-text)] transition-colors hover:opacity-90 disabled:opacity-60"
              >
                {seatsMutation.isPending ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {t('common.save', { defaultValue: 'Save' })}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Invoices */}
      {invoicesData && invoicesData.length > 0 && (
        <section className="space-y-4 rounded-2xl bg-[var(--app-bg-elevated)] p-5">
          <h4 className="flex items-center gap-2 text-base font-semibold text-[var(--app-text-primary)]">
            <Receipt className="h-4 w-4" />
            {t('settings.organization.plan.invoices', { defaultValue: 'Invoices' })}
          </h4>
          <div className="space-y-2">
            {invoicesData.map((invoice: any) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between rounded-xl bg-[var(--app-bg-card)] p-3"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--app-text-primary)]">
                    {formatCurrency(invoice.amountCents, invoice.currency)}
                  </p>
                  <p className="text-xs text-[var(--app-text-muted)]">
                    {new Date(invoice.createdAt).toLocaleDateString()} · {invoice.status}
                  </p>
                </div>
                {invoice.polarInvoiceId && (
                  <a
                    href={`https://dashboard.polar.sh/invoices/${invoice.polarInvoiceId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-[var(--app-accent)] hover:opacity-80"
                  >
                    <Download className="h-4 w-4" />
                    {t('settings.organization.plan.download', { defaultValue: 'Download' })}
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Owner-only plan management */}
      {isPlatformOwner ? (
        <section className="space-y-4 rounded-2xl bg-[var(--app-bg-elevated)] p-5">
          <h4 className="text-base font-semibold text-[var(--app-text-primary)]">
            {t('settings.organization.plan.change_plan_title')}
          </h4>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
              {t('settings.organization.plan.select_plan')}
            </label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value as Plan)}
              className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] px-4 py-2 text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)]"
            >
              {PLANS.map((plan) => (
                <option key={plan} value={plan}>
                  {planDisplayName(plan)}
                </option>
              ))}
            </select>
          </div>

          {isPaidPlan && (
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
                {t('settings.organization.plan.billing_period')}
              </label>
              <select
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value as BillingPeriod)}
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] px-4 py-2 text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)]"
              >
                {BILLING_PERIODS.map((period) => (
                  <option key={period} value={period}>
                    {billingPeriodLabel(period)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-start gap-3">
            <input
              id="owner-override"
              type="checkbox"
              checked={useOverride}
              onChange={(e) => setUseOverride(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[var(--app-border)] text-[var(--app-accent)] focus:ring-[var(--app-accent)]"
            />
            <div>
              <label
                htmlFor="owner-override"
                className="cursor-pointer text-sm font-medium text-[var(--app-text-primary)]"
              >
                {t('settings.organization.plan.use_owner_override')}
              </label>
              <p className="text-xs text-[var(--app-text-muted)]">
                {t('settings.organization.plan.owner_override_hint')}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            {useOverride ? (
              <button
                onClick={handleApplyOverride}
                disabled={overrideMutation.isPending}
                className="flex items-center justify-center gap-2 rounded-xl bg-[var(--app-accent)] px-4 py-2.5 font-medium text-[var(--app-accent-text)] transition-colors hover:opacity-90 disabled:opacity-60"
              >
                {overrideMutation.isPending ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {t('settings.organization.plan.apply_override')}
              </button>
            ) : (
              <button
                onClick={() => checkoutMutation.mutate()}
                disabled={!isPaidPlan || checkoutMutation.isPending}
                className="flex items-center justify-center gap-2 rounded-xl bg-[var(--app-accent)] px-4 py-2.5 font-medium text-[var(--app-accent-text)] transition-colors hover:opacity-90 disabled:opacity-60"
              >
                {checkoutMutation.isPending ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                {isPaidPlan
                  ? t('settings.organization.plan.subscribe_with_polar')
                  : t('settings.organization.plan.free_selected')}
              </button>
            )}

            {overrideActive && (
              <button
                onClick={handleRemoveOverride}
                disabled={overrideMutation.isPending}
                className="flex items-center justify-center gap-2 rounded-xl bg-[var(--app-bg-card)] px-4 py-2.5 font-medium text-[var(--app-text-primary)] transition-colors hover:bg-[var(--app-bg-page)] disabled:opacity-60"
              >
                {t('settings.organization.plan.remove_override')}
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-[var(--app-bg-elevated)] p-5">
          <p className="text-sm text-[var(--app-text-muted)]">
            {t('settings.organization.plan.contact_owner')}
          </p>
        </section>
      )}
    </div>
  )
}
