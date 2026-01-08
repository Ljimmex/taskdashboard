import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { OverallProgress } from '@/components/dashboard/OverallProgress'
import { TeamActivity } from '@/components/dashboard/TeamActivity'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { CalendarSection } from '@/components/dashboard/CalendarSection'
import { TaskCard, AddTaskCard } from '@/components/features/tasks/components/TaskCard'
import { ChatSection } from '@/components/dashboard/ChatSection'
import { CreateTaskPanel } from '@/components/features/tasks/panels/CreateTaskPanel'


export const Route = createFileRoute('/$workspaceSlug/')({
  component: DashboardHome,
})

// --- Mock Data ---

const mockActivities = [
  {
    id: '1',
    user: { name: 'Will Loqso', role: 'Backend Developer', avatar: undefined },
    message: 'How can I buy only the design?',
    likes: 34,
    comments: 14,
    timeAgo: '1h ago'
  },
  {
    id: '2',
    user: { name: 'Sareh Hosten', role: 'Project Manager', avatar: undefined },
    message: 'I need react version asap!',
    likes: 34,
    comments: 14,
    timeAgo: '20min ago'
  },
  {
    id: '3',
    user: { name: 'Will Loqso', role: 'Backend Developer', avatar: undefined },
    message: "Completed the task 'Fix API endpoint'",
    likes: 12,
    comments: 2,
    timeAgo: '2m ago'
  }
]

const mockContacts = [
  { id: '1', name: 'Tomas', isOnline: true },
  { id: '2', name: 'Elena', isOnline: false },
  { id: '3', name: 'Erick', isOnline: true },
  { id: '4', name: 'Tomas', isOnline: false },
  { id: '5', name: 'Elena', isOnline: true },
]

function DashboardHome() {
  const { workspaceSlug } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [projectFilter, setProjectFilter] = useState<'active' | 'pending'>('active')
  const [showMeetingPanel, setShowMeetingPanel] = useState(false)

  // Fetch Projects
  const { data: projectsRes, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects', workspaceSlug],
    queryFn: async () => {
      const res = await fetch(`/api/projects?workspaceSlug=${workspaceSlug}`)
      if (!res.ok) throw new Error('Failed to fetch projects')
      return res.json()
    }
  })

  // Fetch Meetings (tasks with type 'meeting')
  const { data: meetingsRes, isLoading: isLoadingMeetings } = useQuery({
    queryKey: ['meetings', workspaceSlug],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?workspaceSlug=${workspaceSlug}&type=meeting`)
      if (!res.ok) throw new Error('Failed to fetch meetings')
      return res.json()
    }
  })

  const projects = projectsRes?.data || []
  const meetings = meetingsRes?.data || []

  // Filter projects based on switch
  const filteredProjects = projects.filter((p: any) => p.status === projectFilter)

  // Handle meeting creation callback
  const handleMeetingCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['meetings', workspaceSlug] })
    setShowMeetingPanel(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-2">

      {/* Left Column Section (Tasks) - Spans 8 columns visually on large screens, internally split */}
      <div className="lg:col-span-8 flex flex-col gap-6">

        {/* Top Row: Meetings Grid (1,2 / 3,4 pattern) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoadingMeetings ? (
            <>
              <div className="h-[140px] rounded-2xl bg-gray-800/20 animate-pulse" />
              <div className="h-[140px] rounded-2xl bg-gray-800/20 animate-pulse" />
            </>
          ) : meetings.length > 0 ? (
            <>
              {meetings.slice(0, 4).map((meeting: any) => (
                <TaskCard
                  key={meeting.id}
                  id={meeting.id}
                  title={meeting.title}
                  description={meeting.description || 'Brak opisu spotkania.'}
                  priority={meeting.priority || 'medium'}
                  status={meeting.status || 'scheduled'}
                  assignees={meeting.assignee ? [meeting.assignee] : []}
                  type="meeting"
                />
              ))}
              {meetings.length < 4 && (
                <AddTaskCard
                  onClick={() => setShowMeetingPanel(true)}
                />
              )}
            </>
          ) : (
            <>
              <div className="h-[140px] rounded-2xl bg-[#12121a] flex items-center justify-center border-2 border-dashed border-gray-800">
                <p className="text-gray-500 text-sm">Brak nadchodzących spotkań</p>
              </div>
              <AddTaskCard
                onClick={() => setShowMeetingPanel(true)}
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
              filteredProjects.map((p: any) => (
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
        <OverallProgress inProgress={projects.filter((p: any) => p.status === 'active').length} totalProjects={projects.length} upcoming={meetings.length} />

        <ChatSection contacts={mockContacts} />

        <TeamActivity activities={mockActivities} />
      </div>

      {/* Meeting Creation Panel */}
      <CreateTaskPanel
        isOpen={showMeetingPanel}
        onClose={() => setShowMeetingPanel(false)}
        onCreate={handleMeetingCreated}
        defaultType="meeting"
        defaultProject={projects[0]?.id}
        projects={projects}
        workspaceSlug={workspaceSlug}
      />
    </div>
  )
}
