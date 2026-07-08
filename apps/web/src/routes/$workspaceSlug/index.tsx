import { useNavigate, createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/lib/auth'
import { OverallProgress } from '@/components/dashboard/OverallProgress'
import { LastResources } from '@/components/dashboard/LastResources'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { CalendarSection, CalendarEventType } from '@/components/dashboard/CalendarSection'
import { TaskCard, AddTaskCard } from '@/components/features/tasks/components/TaskCard'
import { ChatSection } from '@/components/dashboard/ChatSection'
import { apiFetchJson, apiFetch } from '@/lib/api'
import { CalendarEventPanel } from '@/components/features/calendar/CalendarEventPanel'
import { EditEventPanel } from '@/components/features/calendar/EditEventPanel'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useFiles } from '@/hooks/useFiles'
import { FileInfoPanel } from '@/components/features/files/FileInfoPanel'
import { CreateProjectPanel } from '@/components/features/projects/CreateProjectPanel'
import { FileRecord } from '@taskdashboard/types'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/$workspaceSlug/')({
  component: DashboardHome,
})

function DashboardHome() {
  const { t } = useTranslation()
  const { workspaceSlug } = Route.useParams()
  const { data: session } = useSession() // Real session
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [projectFilter, setProjectFilter] = useState<'active' | 'pending'>('active')
  const [projectPage, setProjectPage] = useState(0)
  const [isEventPanelOpen, setIsEventPanelOpen] = useState(false)
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any | null>(null)
  const [isEditEventPanelOpen, setIsEditEventPanelOpen] = useState(false)

  // File Modal State
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null)
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false)

  // Fetch Team Members for Chat
  const { members } = useTeamMembers(workspaceSlug)

  // Fetch Recent Files
  const { data: files } = useFiles(workspaceSlug, null, true)

  // Transform members to ChatSection format (limit to 10 for widget)
  const chatContacts = members.slice(0, 10).map((m) => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    isOnline: m.isOnline,
  }))

  // Fetch Projects
  const {
    data: projectsRes,
    isLoading: isLoadingProjects,
    error: projectsQueryError,
  } = useQuery({
    queryKey: ['projects', workspaceSlug],
    queryFn: async () => {
      const json = await apiFetchJson<any>(`/api/projects?workspaceSlug=${workspaceSlug}`)
      if (json?.success === false) throw new Error(json.error || 'Failed to fetch projects')
      return json?.data || []
    },
  })

  // Fetch Calendar Events (events only, not tasks)
  const { data: eventsRes, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['calendar_events', workspaceSlug],
    queryFn: async () => {
      return apiFetchJson<any>(`/api/calendar?workspaceSlug=${workspaceSlug}`)
    },
  })

  const { data: workspaceData } = useQuery({
    queryKey: ['workspace', workspaceSlug, session?.user?.id],
    queryFn: async () => {
      if (!workspaceSlug || !session?.user?.id) return null
      return apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`, {
        headers: { 'x-user-id': session?.user?.id || '' },
      })
    },
    enabled: !!workspaceSlug && !!session?.user?.id,
  })

  const projectsError = projectsQueryError?.message || null

  // Filter and group projects
  // Backend already filters projects by user permissions; we just split them by status here.
  const { ongoingProjects, pendingProjects } = useMemo(() => {
    if (!projectsRes || !Array.isArray(projectsRes) || projectsRes.length === 0)
      return { ongoingProjects: [], pendingProjects: [] }

    const allProjects = projectsRes
    const now = new Date()

    // A project is PENDING if:
    // - Status is 'pending'
    // - OR Status is 'active' but startDate is in the future
    const pending = allProjects.filter(
      (p: any) =>
        p.status === 'pending' ||
        (p.status === 'active' && p.startDate && new Date(p.startDate) > now)
    )

    // ONGOING includes active and on-hold projects that have already started
    const ongoing = allProjects.filter(
      (p: any) =>
        (p.status === 'active' || p.status === 'on_hold') &&
        (!p.startDate || new Date(p.startDate) <= now)
    )

    return {
      ongoingProjects: ongoing,
      pendingProjects: pending,
    }
  }, [projectsRes])

  const filteredProjects = projectFilter === 'active' ? ongoingProjects : pendingProjects
  const projectsPerPage = 2
  const totalProjectPages = Math.max(1, Math.ceil(filteredProjects.length / projectsPerPage))
  const currentProjectPage = Math.min(projectPage, totalProjectPages - 1)
  const visibleProjects = filteredProjects.slice(
    currentProjectPage * projectsPerPage,
    currentProjectPage * projectsPerPage + projectsPerPage
  )

  const projects = Array.isArray(projectsRes) ? projectsRes : []

  const events = useMemo(() => {
    const now = new Date()
    const userId = session?.user?.id
    const filtered = (eventsRes?.data || []).filter((e: any) => {
      // 1. Only events and meetings (no tasks/reminders)
      if (!e.type || !['event', 'meeting'].includes(e.type)) return false
      // 2. Only upcoming or ongoing (hide past events)
      if (e.endAt && new Date(e.endAt) < now) return false
      if (!e.endAt && e.startAt && new Date(e.startAt) < now) return false
      // 3. Only events the user participates in (is assignee or creator)
      const isCreator = e.createdBy === userId || e.creator?.id === userId
      const isAssignee = e.assignees?.some((a: any) => a.id === userId)
      if (!isCreator && !isAssignee) return false
      return true
    })

    // Sort by start date ASC (nearest first)
    return filtered.sort(
      (a: any, b: any) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    )
  }, [eventsRes, session?.user?.id])

  const canCreateCalendarEvents = workspaceData?.userRole
    ? !['member', 'guest'].includes(workspaceData.userRole)
    : true

  // Handle meeting creation callback
  const handleEventCreated = async () => {
    await queryClient.invalidateQueries({ queryKey: ['calendar_events', workspaceSlug] })
    setIsEventPanelOpen(false)
  }

  const handleProjectCreated = async () => {
    await queryClient.invalidateQueries({ queryKey: ['projects', workspaceSlug] })
    setIsCreateProjectOpen(false)
  }

  const handleEditEvent = (eventId: string) => {
    const event = events.find((e: any) => e.id === eventId)
    if (event) {
      setEditingEvent(event)
      setIsEditEventPanelOpen(true)
    }
  }

  const handleEventUpdated = async () => {
    await queryClient.invalidateQueries({ queryKey: ['calendar_events', workspaceSlug] })
    setIsEditEventPanelOpen(false)
    setEditingEvent(null)
  }

  // File Actions
  const handleFileClick = (fileId: string) => {
    const file = files?.find((f) => f.id === fileId)
    if (file) {
      setSelectedFile(file)
      setIsInfoPanelOpen(true)
    }
  }

  const handleDownload = async (id: string) => {
    try {
      const json = await apiFetchJson<any>(`/api/files/${id}/download`)
      const { downloadUrl } = json
      window.open(downloadUrl, '_blank')
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  // NOTE: Rename and Delete are complex to duplicate here fully without hooks logic.
  // For the dashboard widget, we might purely want to View details.
  // If we pass generic handlers that just alert or do nothing for dangerous actions, or we implement them.
  // Ideally we should extract these handlers to a hook but for now implementing minimal versions or empty handlers.
  const handleRename = (id: string) => {
    // TODO: Implement renaming if needed or redirect to files page
    console.log('Rename requested for', id)
  }

  const handleDelete = async (id: string) => {
    // TODO: Implement delete if needed
    console.log('Delete requested for', id)
  }

  return (
    <div className="animate-fade-in relative grid grid-cols-1 gap-6 p-2 lg:grid-cols-12">
      {/* Left Column Section (Tasks) - Spans 8 columns visually on large screens, internally split */}
      <div className="flex flex-col gap-6 lg:col-span-8">
        {/* ... Meetings and Projects sections ... */}
        {/* Top Row: Meetings Grid (1,2 / 3,4 pattern) */}
        <div
          className="animate-fade-in grid grid-cols-1 gap-6 md:grid-cols-2"
          style={{ animationDelay: '0.1s' }}
        >
          {isLoadingEvents ? (
            <>
              <div className="h-[140px] animate-pulse rounded-2xl bg-gray-800/20" />
              <div className="h-[140px] animate-pulse rounded-2xl bg-gray-800/20" />
            </>
          ) : events.length > 0 ? (
            <>
              {events.slice(0, 4).map((event: any) => (
                <TaskCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  description={event.description}
                  type="meeting"
                  priority="medium" // Events don't have priority, default to medium to satisfy prop
                  status="todo" // Events don't have status
                  dueDate={event.startAt}
                  meetingLink={event.meetingLink} // Pass meeting link
                  assignees={(event.assignees || []).map((a: any) => ({
                    ...a,
                    avatar: a.image || a.avatar,
                  }))}
                  onClick={() => {
                    /* Open details? */
                  }}
                  // Actions mainly handled via onFullEdit usually, but here we pass direct handlers for the menu
                  onDuplicate={async () => {
                    if (confirm('Duplicate this event?')) {
                      try {
                        const payload = {
                          ...event,
                          id: undefined,
                          title: `${event.title} (Copy)`,
                          startAt: new Date(
                            new Date(event.startAt).getTime() + 24 * 60 * 60 * 1000
                          ).toISOString(),
                          endAt: new Date(
                            new Date(event.endAt).getTime() + 24 * 60 * 60 * 1000
                          ).toISOString(),
                        }
                        await apiFetch('/api/calendar', {
                          method: 'POST',
                          body: JSON.stringify(payload),
                        })
                        window.location.reload()
                      } catch (e) {
                        console.error(e)
                        alert('Failed to duplicate')
                      }
                    }
                  }}
                  onArchive={() => {
                    if (confirm('Archive this event?')) {
                      apiFetch(`/api/calendar/${event.id}`, { method: 'DELETE' }).then(() =>
                        window.location.reload()
                      )
                    }
                  }}
                  onFullEdit={() => handleEditEvent(event.id)}
                  onDelete={async () => {
                    if (confirm('Delete this event?')) {
                      await apiFetch(`/api/calendar/${event.id}`, { method: 'DELETE' })
                      window.location.reload()
                    }
                  }}
                />
              ))}
              {events.length < 4 && canCreateCalendarEvents && (
                <AddTaskCard
                  key="add-meeting"
                  label={t('dashboard.addMeeting')}
                  onClick={() => setIsEventPanelOpen(true)}
                />
              )}
            </>
          ) : (
            <>
              <div className="flex h-[140px] items-center justify-center rounded-2xl bg-[var(--app-bg-card)]">
                <p className="text-sm text-gray-500">{t('dashboard.noMeetings')}</p>
              </div>
              {canCreateCalendarEvents && (
                <AddTaskCard
                  label={t('dashboard.addMeeting')}
                  onClick={() => setIsEventPanelOpen(true)}
                />
              )}
            </>
          )}
        </div>

        {/* Middle Row: Projects Section */}
        <div
          className="animate-fade-in rounded-2xl bg-[var(--app-bg-card)] p-6"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-[var(--app-text-primary)]">
                {t('dashboard.projects')}
              </h3>
              {/* Carousel arrows */}
              {filteredProjects.length > projectsPerPage && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setProjectPage((p) => Math.max(0, p - 1))}
                    disabled={currentProjectPage === 0}
                    className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalProjectPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setProjectPage(i)}
                        className={`h-1.5 w-1.5 rounded-full transition-all ${i === currentProjectPage ? 'w-3 bg-amber-500' : 'bg-gray-600 hover:bg-gray-400'}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setProjectPage((p) => Math.min(totalProjectPages - 1, p + 1))}
                    disabled={currentProjectPage >= totalProjectPages - 1}
                    className="rounded-lg p-1 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex rounded-full bg-[var(--app-bg-elevated)] p-1">
              <button
                onClick={() => {
                  setProjectFilter('active')
                  setProjectPage(0)
                }}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  projectFilter === 'active'
                    ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)] shadow-lg shadow-amber-500/10'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'
                }`}
              >
                {t('dashboard.ongoing')} ({ongoingProjects.length})
              </button>
              <button
                onClick={() => {
                  setProjectFilter('pending')
                  setProjectPage(0)
                }}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  projectFilter === 'pending'
                    ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)] shadow-lg shadow-amber-500/10'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'
                }`}
              >
                {t('dashboard.pending')} ({pendingProjects.length})
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {isLoadingProjects ? (
              <>
                <div className="h-[180px] animate-pulse rounded-2xl bg-gray-800/20" />
                <div className="h-[180px] animate-pulse rounded-2xl bg-gray-800/20" />
              </>
            ) : projectsError ? (
              <div className="col-span-2 flex flex-col items-center justify-center rounded-2xl border border-red-500/10 bg-red-500/5 py-12">
                <p className="mb-2 font-medium text-red-500">
                  {t('dashboard.projectsError', 'Nie udało się wczytać projektów')}
                </p>
                <p className="text-sm text-gray-500">{projectsError}</p>
              </div>
            ) : filteredProjects.length > 0 ? (
              visibleProjects.map((p: any) => (
                <ProjectCard
                  key={p.id}
                  id={p.id}
                  title={p.name}
                  timeRange={
                    p.deadline
                      ? `${t('dashboard.until')} ${new Date(p.deadline).toLocaleDateString()}`
                      : t('dashboard.noDeadline')
                  }
                  progress={p.status === 'completed' ? 100 : 0}
                  daysLeft={
                    p.deadline
                      ? Math.max(
                          0,
                          Math.ceil(
                            (new Date(p.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                          )
                        )
                      : 0
                  }
                  assignees={
                    p.members?.map((m: any) => ({
                      id: m.user?.id || m.id,
                      name: m.user?.name || m.name,
                      avatar: m.user?.image || m.image || undefined,
                    })) || []
                  }
                  onViewProject={() => navigate({ to: `/${workspaceSlug}/projects/${p.id}` })}
                />
              ))
            ) : (
              <div className="col-span-2 flex flex-col items-center justify-center rounded-2xl py-12">
                <p className="mb-4 text-gray-500">
                  {projects.length === 0
                    ? t('dashboard.noProjects')
                    : projectFilter === 'active'
                      ? t('dashboard.noProjectsActive')
                      : t('dashboard.noProjectsPending')}
                </p>
                {projects.length === 0 &&
                  workspaceData?.userRole &&
                  !['member', 'guest'].includes(workspaceData.userRole) && (
                    <button
                      onClick={() => setIsCreateProjectOpen(true)}
                      className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black"
                    >
                      {t('dashboard.createProject')}
                    </button>
                  )}
                {projects.length > 0 && (
                  <div className="flex gap-3">
                    {projectFilter === 'active' && pendingProjects.length > 0 && (
                      <button
                        onClick={() => {
                          setProjectFilter('pending')
                          setProjectPage(0)
                        }}
                        className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--app-text-primary)] transition-colors hover:border-[var(--app-accent)]"
                      >
                        {t('dashboard.showPendingProjects')} ({pendingProjects.length})
                      </button>
                    )}
                    {projectFilter === 'pending' && ongoingProjects.length > 0 && (
                      <button
                        onClick={() => {
                          setProjectFilter('active')
                          setProjectPage(0)
                        }}
                        className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--app-text-primary)] transition-colors hover:border-[var(--app-accent)]"
                      >
                        {t('dashboard.showActiveProjects')} ({ongoingProjects.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: Calendar component */}
        <div className="animate-fade-in w-full" style={{ animationDelay: '0.3s' }}>
          <CalendarSection />
        </div>
      </div>

      {/* Right Column Section (Widgets) - Spans 4 columns */}
      <div
        className="animate-fade-in custom-scrollbar space-y-6 lg:col-span-4"
        style={{ animationDelay: '0.4s' }}
      >
        <OverallProgress
          projects={projects}
          currentUserId={session?.user?.id}
          workspaceSlug={workspaceSlug}
        />
        <ChatSection
          contacts={chatContacts}
          onSeeAll={() => navigate({ to: `/${workspaceSlug}/messages` })}
          onContactClick={(userId) => {
            navigate({
              to: `/${workspaceSlug}/messages`,
              search: { userId },
            })
          }}
        />

        <LastResources
          files={files || []}
          onSeeAll={() => navigate({ to: `/${workspaceSlug}/files` })}
          onFileClick={handleFileClick}
        />
      </div>

      {/* Meeting Creation Panel (CalendarEventPanel) */}
      {canCreateCalendarEvents && (
        <CalendarEventPanel
          isOpen={isEventPanelOpen}
          onClose={() => setIsEventPanelOpen(false)}
          onCreate={handleEventCreated}
          defaultType={CalendarEventType.EVENT}
          workspaceSlug={workspaceSlug}
          canCreateEvents={canCreateCalendarEvents}
          userRole={workspaceData?.userRole}
        />
      )}

      {/* Edit Event Panel */}
      <EditEventPanel
        event={editingEvent}
        isOpen={isEditEventPanelOpen}
        onClose={() => {
          setIsEditEventPanelOpen(false)
          setEditingEvent(null)
        }}
        workspaceSlug={workspaceSlug}
        onUpdated={handleEventUpdated}
        canCreateTeamEvents={canCreateCalendarEvents}
      />

      {/* Create Project Panel */}
      <CreateProjectPanel
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onSuccess={handleProjectCreated}
        workspaceId={workspaceData?.id}
      />

      {/* File Info Panel (Modal-like) */}
      <FileInfoPanel
        file={selectedFile}
        isOpen={isInfoPanelOpen}
        onClose={() => {
          setIsInfoPanelOpen(false)
          setSelectedFile(null)
        }}
        onDownload={handleDownload}
        onRename={handleRename}
        onDelete={handleDelete}
      />
    </div>
  )
}
