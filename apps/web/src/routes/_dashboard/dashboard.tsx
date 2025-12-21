import { createFileRoute } from '@tanstack/react-router'
import { useSession } from '@/lib/auth'
import {
    DashboardLayout,
    TaskCard,
    AddNewTaskCard,
    ProjectCard,
    OverallProgress,
    ChatSection,
    TeamActivity,
    CalendarSection,
} from '@/components/dashboard'

export const Route = createFileRoute('/_dashboard/dashboard')({
    component: DashboardPage,
})

// Mock data - replace with real API data later
const mockTasks = [
    {
        id: '1',
        title: 'Design Meeting',
        description: 'Development Task Assign for the product Page project, collaboration with the designer.',
        priority: 'high' as const,
        assignees: [
            { id: '1', name: 'Will Loqso' },
            { id: '2', name: 'Elena Smith' },
            { id: '3', name: 'Tomas Green' },
            { id: '4', name: 'Erick Brown' },
        ],
        type: 'call' as const,
    },
    {
        id: '2',
        title: 'Client Meeting',
        description: 'Updating the current User Interface of header in the picko Designe project.',
        priority: 'medium' as const,
        assignees: [
            { id: '5', name: 'Sarah Johnson' },
            { id: '6', name: 'Mike Wilson' },
        ],
        type: 'call' as const,
    },
    {
        id: '3',
        title: 'Dribble Shot',
        description: 'Creating the main UI Assets and Illustration for the upcoming landing page screens.',
        priority: 'low' as const,
        assignees: [
            { id: '7', name: 'Anna Lee' },
            { id: '8', name: 'Chris Davis' },
            { id: '9', name: 'Olivia White' },
        ],
        type: 'task' as const,
    },
]

const mockProjects = [
    {
        id: '1',
        title: 'Startup Web with responsive',
        icon: '🎨',
        timeRange: '12:00 PM - 8:30 PM',
        progress: 78,
        daysLeft: 6,
        assignees: [
            { id: '1', name: 'Will Loqso' },
            { id: '2', name: 'Sara Hosten' },
        ],
    },
    {
        id: '2',
        title: 'Product Design & App Design',
        icon: '📱',
        timeRange: '13:00 PM - 9:20 PM',
        progress: 53,
        daysLeft: 6,
        assignees: [
            { id: '3', name: 'Tomas Green' },
            { id: '4', name: 'Elena Smith' },
        ],
    },
]

const mockChatContacts = [
    { id: '1', name: 'Tomas Green', isOnline: true },
    { id: '2', name: 'Elena Smith', isOnline: true },
    { id: '3', name: 'Erick Brown', isOnline: false },
    { id: '4', name: 'Anna Lee', isOnline: true },
    { id: '5', name: 'Elena White', isOnline: false },
]

const mockActivities = [
    {
        id: '1',
        user: { name: 'Will Loqso', role: 'Backend Developer' },
        message: 'How can i buy only the design?',
        likes: 34,
        comments: 3,
        timeAgo: '5min ago',
    },
    {
        id: '2',
        user: { name: 'Sareh Hosten', role: 'Project Manager' },
        message: 'I need react version asap!',
        likes: 14,
        comments: 3,
        timeAgo: '1hour ago',
    },
    {
        id: '3',
        user: { name: 'Will Loqso', role: 'Backend Developer' },
        message: 'Working on the new API endpoints',
        likes: 8,
        comments: 1,
        timeAgo: '20min ago',
    },
]

function DashboardPage() {
    const { isPending } = useSession()

    if (isPending) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="text-white">Ładowanie...</div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Top Row: Tasks + Overall Progress side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Tasks - takes 2/3 */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {mockTasks.map((task) => (
                            <TaskCard key={task.id} {...task} />
                        ))}
                        <AddNewTaskCard onClick={() => console.log('Add new task')} />
                    </div>

                    {/* Overall Progress - takes 1/3 */}
                    <div>
                        <OverallProgress
                            inProgress={24}
                            totalProjects={45}
                            upcoming={12}
                        />
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Projects + Calendar */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Projects Section - Unified Container */}
                        <section className="rounded-2xl bg-[#12121a] p-5">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-white">Project</h2>

                                {/* Unified Switch Toggle */}
                                <div className="flex bg-[#0a0a0f] p-1 rounded-full">
                                    <button className="px-4 py-1.5 rounded-full bg-[#F2CE88] text-[#0a0a0f] text-xs font-bold transition-all shadow-lg shadow-amber-500/10">
                                        Ongoing
                                    </button>
                                    <button className="px-4 py-1.5 rounded-full text-gray-500 text-xs font-medium hover:text-white transition-all">
                                        Pending
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {mockProjects.map((project) => (
                                    <ProjectCard
                                        key={project.id}
                                        {...project}
                                        onViewProject={() => console.log('View project', project.id)}
                                    />
                                ))}
                            </div>
                        </section>

                        {/* Calendar Section */}
                        <CalendarSection />
                    </div>

                    {/* Right Column: Chat + Activity */}
                    <div className="space-y-6">
                        <ChatSection
                            contacts={mockChatContacts}
                            onSeeAll={() => console.log('See all chats')}
                        />
                        <TeamActivity activities={mockActivities} />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
