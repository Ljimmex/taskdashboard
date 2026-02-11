import { useNavigate, createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
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



export const Route = createFileRoute('/$workspaceSlug/')({
  component: DashboardHome,
})

function DashboardHome() {
  const { workspaceSlug } = Route.useParams()
  const { data: session } = useSession() // Real session
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [projectFilter, setProjectFilter] = useState<'active' | 'pending'>('active')
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

  const projects = projectsRes?.data || []

  // Filter for actual events (exclude tasks/reminders if API returns them mixed)
  // Assuming API returns { data: [...] } and items have 'type' property
  const events = (eventsRes?.data || []).filter((e: any) => ['event', 'meeting'].includes(e.type))

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-2 relative">

      {/* Left Column Section (Tasks) - Spans 8 columns visually on large screens, internally split */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {/* ... Meetings and Projects sections ... */}
        {/* Top Row: Meetings Grid (1,2 / 3,4 pattern) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  assignees={event.assignees || []}
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
                  label="Add New Meeting"
                  onClick={() => setIsEventPanelOpen(true)}
                />
              )}
            </>
          ) : (
            <>
              <div className="h-[140px] rounded-2xl bg-[#12121a] flex items-center justify-center border-2 border-dashed border-gray-800">
                <p className="text-gray-500 text-sm">Brak nadchodzących spotkań</p>
              </div>
              <AddTaskCard
                label="Add New Meeting"
                onClick={() => setIsEventPanelOpen(true)}
              />
            </>
          )}
        </div>

        {/* Middle Row: Projects Section */}
        <div className="rounded-2xl bg-[#12121a] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white">Project</h3>
            <div className="flex bg-[#1a1a24] p-1 rounded-full">
              <button
                onClick={() => setProjectFilter('active')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${projectFilter === 'active'
                  ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                  : 'text-gray-500 hover:text-white'
                  }`}
              >
                Ongoing
              </button>
              <button
                onClick={() => setProjectFilter('pending')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${projectFilter === 'pending'
                  ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                  : 'text-gray-500 hover:text-white'
                  }`}
              >
                Pending
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
              filteredProjects.slice(0, 2).map((p: any) => (
                <ProjectCard
                  key={p.id}
                  id={p.id}
                  title={p.name}
                  timeRange={p.deadline ? `Do ${new Date(p.deadline).toLocaleDateString()}` : `Bez terminu`}
                  progress={p.status === 'completed' ? 100 : 0}
                  daysLeft={p.deadline ? Math.max(0, Math.ceil((new Date(p.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0}
                  assignees={p.members?.map((m: any) => ({
                    id: m.user.id,
                    name: m.user.name,
                    avatar: m.user.image || undefined
                  })) || []}
                  onViewProject={() => navigate({ to: `/${workspaceSlug}/projects/${p.id}` })}
                />
              ))
            ) : (
              <div className="col-span-2 py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-2xl">
                <p className="text-gray-500 mb-4">{projectFilter === 'active' ? 'Brak aktywnych projektów' : 'Brak oczekujących projektów'}</p>
                {projectFilter === 'active' && (
                  <button className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-medium">Utwórz pierwszy projekt</button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: Calendar component */}
        <div className="w-full">
          <CalendarSection />
        </div>
      </div>

      {/* Right Column Section (Widgets) - Spans 4 columns */}
      <div className="lg:col-span-4 space-y-6">
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
