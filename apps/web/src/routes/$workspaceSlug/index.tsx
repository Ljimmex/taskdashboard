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
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useFiles } from '@/hooks/useFiles'
import { FileInfoPanel } from '@/components/features/files/FileInfoPanel'
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

  // File Modal State
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null)
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false)

  // Fetch Team Members for Chat
  const { members } = useTeamMembers(workspaceSlug)

  // Fetch Recent Files
  const { data: files } = useFiles(workspaceSlug, null, true)

  // Transform members to ChatSection format (limit to 10 for widget)
  const chatContacts = members.slice(0, 10).map(m => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    isOnline: m.isOnline
  }))

  // Fetch Projects
  const { data: projectsRes, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects', workspaceSlug],
    queryFn: async () => {
      return apiFetchJson<any>(`/api/projects?workspaceSlug=${workspaceSlug}`)
    }
  })

  // Fetch Calendar Events (events only, not tasks)
  const { data: eventsRes, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['calendar_events', workspaceSlug],
    queryFn: async () => {
      return apiFetchJson<any>(`/api/calendar?workspaceSlug=${workspaceSlug}`)
    }
  })

  // Filter and group projects
  const { ongoingProjects, pendingProjects } = useMemo(() => {
    if (!projectsRes?.data) return { ongoingProjects: [], pendingProjects: [] }

    const allProjects = projectsRes.data
    const userId = session?.user?.id

    // 1. Filter by participation (user must be a member or owner)
    const myProjects = allProjects.filter((p: any) =>
      p.members?.some((m: any) => m.user?.id === userId) || p.ownerId === userId
    )

    const now = new Date()

    // 2. Separate into Ongoing and Pending
    // A project is PENDING if:
    // - Status is 'pending'
    // - OR Status is 'active' but startDate is in the future
    const pending = myProjects.filter((p: any) =>
      p.status === 'pending' ||
      (p.status === 'active' && p.startDate && new Date(p.startDate) > now)
    )

    const ongoing = myProjects.filter((p: any) =>
      p.status === 'active' &&
      (!p.startDate || new Date(p.startDate) <= now)
    )

    return {
      ongoingProjects: ongoing,
      pendingProjects: pending
    }
  }, [projectsRes, session?.user?.id])

  const filteredProjects = projectFilter === 'active' ? ongoingProjects : pendingProjects
  const projectsPerPage = 2
  const totalProjectPages = Math.max(1, Math.ceil(filteredProjects.length / projectsPerPage))
  const currentProjectPage = Math.min(projectPage, totalProjectPages - 1)
  const visibleProjects = filteredProjects.slice(currentProjectPage * projectsPerPage, currentProjectPage * projectsPerPage + projectsPerPage)

  const projects = projectsRes?.data || []

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
    return filtered.sort((a: any, b: any) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  }, [eventsRes, session?.user?.id])

  // Handle meeting creation callback
  const handleEventCreated = async () => {
    await queryClient.invalidateQueries({ queryKey: ['calendar_events', workspaceSlug] })
    setIsEventPanelOpen(false)
  }

  // File Actions
  const handleFileClick = (fileId: string) => {
    const file = files?.find(f => f.id === fileId)
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-2 relative animate-fade-in">

      {/* Left Column Section (Tasks) - Spans 8 columns visually on large screens, internally split */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {/* ... Meetings and Projects sections ... */}
        {/* Top Row: Meetings Grid (1,2 / 3,4 pattern) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {isLoadingEvents ? (
            <>
              <div className="h-[140px] rounded-2xl bg-gray-800/20 animate-pulse" />
              <div className="h-[140px] rounded-2xl bg-gray-800/20 animate-pulse" />
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
                  assignees={(event.assignees || []).map((a: any) => ({ ...a, avatar: a.image || a.avatar }))}
                  onClick={() => { /* Open details? */ }}
                  // Actions mainly handled via onFullEdit usually, but here we pass direct handlers for the menu
                  onDuplicate={async () => {
                    if (confirm('Duplicate this event?')) {
                      try {
                        const payload = {
                          ...event,
                          id: undefined,
                          title: `${event.title} (Copy)`,
                          startAt: new Date(new Date(event.startAt).getTime() + 24 * 60 * 60 * 1000).toISOString(),
                          endAt: new Date(new Date(event.endAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
                        }
                        await apiFetch('/api/calendar', {
                          method: 'POST',
                          body: JSON.stringify(payload)
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
                      apiFetch(`/api/calendar/${event.id}`, { method: 'DELETE' }).then(() => window.location.reload())
                    }
                  }}
                  onDelete={async () => {
                    if (confirm('Delete this event?')) {
                      await apiFetch(`/api/calendar/${event.id}`, { method: 'DELETE' })
                      window.location.reload()
                    }
                  }}
                />
              ))}
              {events.length < 4 && (
                <AddTaskCard
                  label={t('dashboard.addMeeting')}
                  onClick={() => setIsEventPanelOpen(true)}
                />
              )}
            </>
          ) : (
            <>
              <div className="h-[140px] rounded-2xl bg-[#12121a] flex items-center justify-center border-2 border-dashed border-gray-800">
                <p className="text-gray-500 text-sm">{t('dashboard.noMeetings')}</p>
              </div>
              <AddTaskCard
                label={t('dashboard.addMeeting')}
                onClick={() => setIsEventPanelOpen(true)}
              />
            </>
          )}
        </div>

        {/* Middle Row: Projects Section */}
        <div className="rounded-2xl bg-[#12121a] p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-white">{t('dashboard.projects')}</h3>
              {/* Carousel arrows */}
              {filteredProjects.length > projectsPerPage && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setProjectPage(p => Math.max(0, p - 1))}
                    disabled={currentProjectPage === 0}
                    className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalProjectPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setProjectPage(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentProjectPage ? 'bg-amber-500 w-3' : 'bg-gray-600 hover:bg-gray-400'}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setProjectPage(p => Math.min(totalProjectPages - 1, p + 1))}
                    disabled={currentProjectPage >= totalProjectPages - 1}
                    className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex bg-[#1a1a24] p-1 rounded-full">
              <button
                onClick={() => { setProjectFilter('active'); setProjectPage(0) }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${projectFilter === 'active'
                  ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                  : 'text-gray-500 hover:text-white'
                  }`}
              >
                {t('dashboard.ongoing')}
              </button>
              <button
                onClick={() => { setProjectFilter('pending'); setProjectPage(0) }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${projectFilter === 'pending'
                  ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                  : 'text-gray-500 hover:text-white'
                  }`}
              >
                {t('dashboard.pending')}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoadingProjects ? (
              <>
                <div className="h-[180px] rounded-2xl bg-gray-800/20 animate-pulse" />
                <div className="h-[180px] rounded-2xl bg-gray-800/20 animate-pulse" />
              </>
            ) : filteredProjects.length > 0 ? (
              visibleProjects.map((p: any) => (
                <ProjectCard
                  key={p.id}
                  id={p.id}
                  title={p.name}
                  timeRange={p.deadline ? `${t('dashboard.until')} ${new Date(p.deadline).toLocaleDateString()}` : t('dashboard.noDeadline')}
                  progress={p.status === 'completed' ? 100 : 0}
                  daysLeft={p.deadline ? Math.max(0, Math.ceil((new Date(p.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0}
                  assignees={p.members?.map((m: any) => ({
                    id: m.user?.id || m.id,
                    name: m.user?.name || m.name,
                    avatar: m.user?.image || m.image || undefined
                  })) || []}
                  onViewProject={() => navigate({ to: `/${workspaceSlug}/projects/${p.id}` })}
                />
              ))
            ) : (
              <div className="col-span-2 py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-2xl">
                <p className="text-gray-500 mb-4">{projectFilter === 'active' ? t('dashboard.noProjectsActive') : t('dashboard.noProjectsPending')}</p>
                {projectFilter === 'active' && (
                  <button className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-medium">{t('dashboard.createProject')}</button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: Calendar component */}
        <div className="w-full animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <CalendarSection />
        </div>
      </div>

      {/* Right Column Section (Widgets) - Spans 4 columns */}
      <div className="lg:col-span-4 space-y-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <OverallProgress inProgress={projects.filter((p: any) => p.status === 'active').length} totalProjects={projects.length} upcoming={events.length} />

        <ChatSection
          contacts={chatContacts}
          onSeeAll={() => navigate({ to: `/${workspaceSlug}/messages` })}
          onContactClick={(userId) => {
            navigate({
              to: `/${workspaceSlug}/messages`,
              search: { userId }
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
      <CalendarEventPanel
        isOpen={isEventPanelOpen}
        onClose={() => setIsEventPanelOpen(false)}
        onCreate={handleEventCreated}
        defaultType={CalendarEventType.EVENT}
        workspaceSlug={workspaceSlug}
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
