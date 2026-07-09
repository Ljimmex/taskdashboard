import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { useTasks } from '@/hooks/useTasks'
import { useProjects } from '@/hooks/useProjects'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { UserSettingsPanel } from '@/components/features/settings/panels/UserSettingsPanel'
import { format, formatDistanceToNow } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import {
  Mail,
  MapPin,
  Clock,
  Calendar,
  Briefcase,
  User,
  Edit3,
  CheckCircle2,
  ListTodo,
  Timer,
  FolderKanban,
} from 'lucide-react'

export const Route = createFileRoute('/$workspaceSlug/profile/')({
  component: ProfilePage,
})

function ProfilePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
  const { data: session } = useSession()
  const locale = i18n.language === 'pl' ? pl : enUS
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const currentUserId = session?.user?.id

  const { data: workspaceData } = useQuery({
    queryKey: ['workspace', workspaceSlug],
    queryFn: async () => {
      if (!workspaceSlug) return null
      return apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`)
    },
    enabled: !!workspaceSlug,
  })

  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => apiFetchJson<any>('/api/users/me'),
    enabled: !!currentUserId,
  })

  const user = userData?.data || userData

  const { data: tasks = [], isLoading: isLoadingTasks } = useTasks(workspaceSlug)
  const { data: projects = [], isLoading: isLoadingProjects } = useProjects(workspaceSlug)
  const { data: timeEntries = [], isLoading: isLoadingTime } = useTimeEntries(workspaceSlug)

  const assignedTasks = useMemo(() => {
    if (!currentUserId) return []
    return tasks.filter((task: any) => {
      const list = task.assignees || task.assigneeDetails || []
      return list.some((a: any) =>
        typeof a === 'string' ? a === currentUserId : a.id === currentUserId
      )
    })
  }, [tasks, currentUserId])

  const completedTasks = useMemo(
    () => assignedTasks.filter((t: any) => t.status === 'done' || t.isCompleted),
    [assignedTasks]
  )

  const approvedHours = useMemo(() => {
    const approved = timeEntries.filter((e) => e.approvalStatus === 'approved')
    return approved.reduce((sum, e) => sum + (e.durationMinutes || 0), 0) / 60
  }, [timeEntries])

  const participatingProjects = useMemo(() => {
    const projectIds = new Set(assignedTasks.map((t: any) => t.projectId).filter(Boolean))
    return projects.filter((p) => projectIds.has(p.id)).length
  }, [assignedTasks, projects])

  const recentTasks = useMemo(() => {
    return [...assignedTasks]
      .sort(
        (a: any, b: any) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
      )
      .slice(0, 8)
  }, [assignedTasks])

  const recentTimeEntries = useMemo(() => {
    return [...timeEntries]
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 5)
  }, [timeEntries])

  const isOnline = useMemo(() => {
    if (!user?.lastActiveAt) return false
    return Date.now() - new Date(user.lastActiveAt).getTime() < 5 * 60 * 1000
  }, [user])

  const roleKey = workspaceData?.userRole || 'member'

  const formatDate = (value: string | Date | null | undefined) => {
    if (!value) return '-'
    return format(new Date(value), 'PPP', { locale })
  }

  const StatCard = ({
    icon: Icon,
    label,
    value,
    isLoading,
  }: {
    icon: React.ElementType
    label: string
    value: string | number
    isLoading?: boolean
  }) => (
    <div className="hover:border-[var(--app-accent)]/30 rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] p-5 transition-colors">
      <div className="bg-[var(--app-accent)]/10 mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-[var(--app-accent)]">
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold text-[var(--app-text-primary)]">{isLoading ? '…' : value}</p>
      <p className="text-sm text-[var(--app-text-secondary)]">{label}</p>
    </div>
  )

  if (isLoadingUser || !user) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-[var(--app-bg-page)] p-8">
        <div className="text-[var(--app-text-muted)]">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="custom-scrollbar flex h-full flex-1 flex-col overflow-y-auto p-6 text-[var(--app-text-primary)] lg:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col space-y-6 pb-12">
        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-bg-card)] p-6 lg:p-8">
          <div className="from-[var(--app-accent)]/20 absolute inset-x-0 top-0 h-24 bg-gradient-to-r to-transparent" />

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-xl bg-[var(--app-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--app-accent-text)] transition-opacity hover:opacity-90 lg:right-8 lg:top-8"
          >
            <Edit3 size={16} />
            {t('profile.edit')}
          </button>

          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-[var(--app-bg-card)] bg-gradient-to-br from-amber-400 to-orange-500 text-3xl font-bold text-black shadow-xl">
                {user.image ? (
                  <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  user.name?.charAt(0) || user.email?.charAt(0) || '?'
                )}
              </div>
              <span
                className={`absolute bottom-1 right-1 h-5 w-5 rounded-full border-4 border-[var(--app-bg-card)] ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}
              />
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-[var(--app-text-primary)]">
                  {user.name || t('profile.unknownUser')}
                </h2>
                <span className="bg-[var(--app-accent)]/10 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--app-accent)]">
                  {String(t(`profile.roles.${roleKey}`, roleKey))}
                </span>
              </div>
              <p className="mt-1 text-[var(--app-text-secondary)]">
                {user.position || t('profile.noPosition')}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--app-text-muted)]">
                <span className="flex items-center gap-1.5">
                  <Mail size={14} />
                  {user.email}
                </span>
                {user.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    {[user.city, user.country].filter(Boolean).join(', ')}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {isOnline
                    ? t('profile.online')
                    : user.lastActiveAt
                      ? t('profile.lastActive', {
                          date: formatDistanceToNow(new Date(user.lastActiveAt), {
                            addSuffix: true,
                            locale,
                          }),
                        })
                      : t('profile.offline')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={ListTodo}
            label={t('profile.stats.assignedTasks')}
            value={assignedTasks.length}
            isLoading={isLoadingTasks}
          />
          <StatCard
            icon={CheckCircle2}
            label={t('profile.stats.completedTasks')}
            value={completedTasks.length}
            isLoading={isLoadingTasks}
          />
          <StatCard
            icon={Timer}
            label={t('profile.stats.approvedHours')}
            value={Math.round(approvedHours * 10) / 10}
            isLoading={isLoadingTime}
          />
          <StatCard
            icon={FolderKanban}
            label={t('profile.stats.projects')}
            value={participatingProjects}
            isLoading={isLoadingProjects}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* About */}
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] p-6 lg:col-span-1">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--app-text-primary)]">
              <User size={18} className="text-[var(--app-accent)]" />
              {t('profile.about')}
            </h3>
            <div className="space-y-4 text-sm">
              {user.description ? (
                <p className="leading-relaxed text-[var(--app-text-secondary)]">
                  {user.description}
                </p>
              ) : (
                <p className="italic text-[var(--app-text-muted)]">{t('profile.noDescription')}</p>
              )}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-[var(--app-text-secondary)]">
                  <Briefcase size={16} className="text-[var(--app-text-muted)]" />
                  <span>{user.position || '-'}</span>
                </div>
                <div className="flex items-center gap-3 text-[var(--app-text-secondary)]">
                  <MapPin size={16} className="text-[var(--app-text-muted)]" />
                  <span>{[user.city, user.country].filter(Boolean).join(', ') || '-'}</span>
                </div>
                <div className="flex items-center gap-3 text-[var(--app-text-secondary)]">
                  <Clock size={16} className="text-[var(--app-text-muted)]" />
                  <span>{user.timezone || '-'}</span>
                </div>
                {user.birthDate && (
                  <div className="flex items-center gap-3 text-[var(--app-text-secondary)]">
                    <Calendar size={16} className="text-[var(--app-text-muted)]" />
                    <span>{formatDate(user.birthDate)}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-[var(--app-text-secondary)]">
                  <Calendar size={16} className="text-[var(--app-text-muted)]" />
                  <span>{t('profile.memberSince', { date: formatDate(user.createdAt) })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] p-6 lg:col-span-2">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--app-text-primary)]">
              <ListTodo size={18} className="text-[var(--app-accent)]" />
              {t('profile.recentTasks')}
            </h3>
            {recentTasks.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--app-text-muted)]">
                {t('profile.noTasks')}
              </div>
            ) : (
              <div className="space-y-2">
                {recentTasks.map((task: any) => {
                  const project = projects.find((p) => p.id === task.projectId)
                  return (
                    <button
                      key={task.id}
                      onClick={() =>
                        navigate({
                          to: `/${workspaceSlug}/projects/${task.projectId}`,
                          search: { taskId: task.id },
                        })
                      }
                      className="hover:bg-[var(--app-bg-elevated)]/80 flex w-full items-center justify-between rounded-xl bg-[var(--app-bg-elevated)] p-4 text-left transition-colors"
                    >
                      <div>
                        <p className="font-medium text-[var(--app-text-primary)]">{task.title}</p>
                        <p className="text-xs text-[var(--app-text-muted)]">
                          {project?.name || t('profile.unknownProject')} •{' '}
                          {String(t(`tasks.status.${task.status}`, task.status))}
                        </p>
                      </div>
                      {task.status === 'done' || task.isCompleted ? (
                        <CheckCircle2 size={18} className="text-green-500" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-[var(--app-accent)]" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Time Entries */}
        {recentTimeEntries.length > 0 && (
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--app-text-primary)]">
              <Timer size={18} className="text-[var(--app-accent)]" />
              {t('profile.recentTime')}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recentTimeEntries.map((entry) => (
                <div key={entry.id} className="rounded-xl bg-[var(--app-bg-elevated)] p-4 text-sm">
                  <p className="font-medium text-[var(--app-text-primary)]">
                    {entry.taskTitle || t('profile.generalTime')}
                  </p>
                  <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                    {format(new Date(entry.startedAt), 'PP', { locale })} •{' '}
                    {Math.round((entry.durationMinutes / 60) * 10) / 10} h
                  </p>
                  {entry.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-[var(--app-text-secondary)]">
                      {entry.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <UserSettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}
