import { createFileRoute } from '@tanstack/react-router'
import { OverallProgress } from '@/components/dashboard/OverallProgress'
import { TeamActivity } from '@/components/dashboard/TeamActivity'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { CalendarSection } from '@/components/dashboard/CalendarSection'
import { TaskCard, AddNewTaskCard } from '@/components/dashboard/TaskCard'
import { ChatSection } from '@/components/dashboard/ChatSection'

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
    message: 'Completed the task "Fix API endpoint"',
    likes: 12,
    comments: 2,
    timeAgo: '2m ago'
  }
]

const mockProjects = [
  {
    id: '1',
    title: 'Startup Web with responsive',
    timeRange: '12:00 PM - 8:30 PM',
    progress: 78,
    daysLeft: 6,
    assignees: [
      { id: '1', name: 'Will Loqso', avatar: undefined },
      { id: '2', name: 'Sareh Hosten', avatar: undefined },
      { id: '3', name: 'User Three', avatar: undefined }
    ]
  },
  {
    id: '2',
    title: 'Product Design & App Design',
    timeRange: '13:00 PM - 9:20 PM',
    progress: 53,
    daysLeft: 6,
    assignees: [
      { id: '2', name: 'Sareh Hosten', avatar: undefined },
      { id: '4', name: 'User Four', avatar: undefined }
    ]
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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-2">

      {/* Left Column Section (Tasks) - Spans 8 columns visually on large screens, internally split */}
      <div className="lg:col-span-8 flex flex-col gap-6">

        {/* Top Row: Task Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <TaskCard
              id="1"
              title="Design Meeting"
              description="Development Task Assign for the project, collaboration with the design team."
              priority="high"
              assignees={[{ id: '1', name: 'User 1' }, { id: '2', name: 'User 2' }, { id: '3', name: 'User 3' }, { id: '4', name: 'User 4' }]}
            />
            <TaskCard
              id="2"
              title="Dribble Shot"
              description="Creating the main UI Assets and illustration for the upcoming landing page screens."
              priority="low"
              assignees={[{ id: '1', name: 'User 1' }, { id: '2', name: 'User 2' }, { id: '3', name: 'User 3' }]}
              type="call"
            />
          </div>
          <div className="space-y-6">
            <TaskCard
              id="3"
              title="Client Meeting"
              description="Updating the current User Interface of header in the picko Designe project."
              priority="medium"
              assignees={[{ id: '1', name: 'User 1' }, { id: '2', name: 'User 2' }, { id: '3', name: 'User 3' }, { id: '4', name: 'User 4' }, { id: '5', name: 'User 5' }]}
            />
            <AddNewTaskCard />
          </div>
        </div>

        {/* Middle Row: Projects Section */}
        <div className="rounded-2xl bg-[#12121a] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white">Project</h3>
            <div className="flex bg-[#1a1a24] rounded-lg p-1">
              <button className="px-3 py-1 text-xs font-medium bg-amber-500 text-black rounded-md">Ongoing</button>
              <button className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-white transition-colors">Pending</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockProjects.map((p, i) => (
              <ProjectCard key={i} {...p} />
            ))}
          </div>
        </div>

        {/* Bottom Row: Calendar component */}
        <div className="w-full">
          <CalendarSection />
        </div>
      </div>

      {/* Right Column Section (Widgets) - Spans 4 columns */}
      <div className="lg:col-span-4 space-y-6">
        <OverallProgress inProgress={24} totalProjects={45} upcoming={12} />

        <ChatSection contacts={mockContacts} />

        <TeamActivity activities={mockActivities} />
      </div>
    </div>
  )
}
