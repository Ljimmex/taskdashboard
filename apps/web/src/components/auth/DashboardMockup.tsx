import { useTranslation } from 'react-i18next'
import { sidebarIcons as icons } from '@/components/dashboard/icons'
import { OverallProgress } from '@/components/dashboard/OverallProgress'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { TaskCard } from '@/components/features/tasks/components/TaskCard'

export function DashboardMockup() {
    const { t } = useTranslation()

    // Mock Data
    const mockProjects = [
        {
            id: '1',
            status: 'active',
            deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
            name: 'Website Redesign',
            members: [
                { id: '1', user: { id: '1', name: 'User 1', image: null } },
                { id: '2', user: { id: '2', name: 'User 2', image: null } }
            ]
        },
        {
            id: '2',
            status: 'active',
            deadline: new Date(Date.now() + 86400000 * 12).toISOString(),
            name: 'Mobile App',
            members: [
                { id: '1', user: { id: '1', name: 'User 1', image: null } }
            ]
        }
    ]

    const mockEvents = [
        {
            id: '1',
            title: 'Team Sync',
            description: 'Weekly sync with the team',
            startAt: new Date(Date.now() + 3600000).toISOString(),
            endAt: new Date(Date.now() + 7200000).toISOString(),
            type: 'meeting' as const,
            meetingLink: 'https://meet.google.com',
            assignees: [
                { id: '1', name: 'Alice', avatar: undefined },
                { id: '2', name: 'Bob', avatar: undefined }
            ]
        },
        {
            id: '2',
            title: 'Design Review',
            description: 'Reviewing new designs',
            startAt: new Date(Date.now() + 86400000).toISOString(),
            endAt: new Date(Date.now() + 90000000).toISOString(),
            type: 'meeting' as const,
            meetingLink: 'https://zoom.us',
            assignees: [
                { id: '3', name: 'Charlie', avatar: undefined }
            ]
        }
    ]

    const navItems = [
        { iconKey: 'dashboard', label: t('dashboard.title'), isActive: true },
        { iconKey: 'team', label: t('dashboard.team'), count: 5 },
        { iconKey: 'product', label: t('dashboard.projects') },
        { iconKey: 'messages', label: t('dashboard.messages'), count: 2 },
        { iconKey: 'calendar', label: t('dashboard.calendar') },
        { iconKey: 'files', label: t('dashboard.files') },
        { iconKey: 'contact', label: t('dashboard.contact') },
    ]

    return (
        <div className="relative w-full h-[600px] overflow-hidden rounded-xl bg-[#0a0a0f] border border-gray-800 shadow-2xl select-none pointer-events-none">
            {/* Overlay to prevent interaction (double safety) */}
            <div className="absolute inset-0 z-50 bg-transparent" />

            {/* Sidebar Mock */}
            <aside className={`absolute left-0 top-0 h-full w-56 bg-[#0d0d14] flex flex-col z-40 border-r border-gray-800`}>
                <div className="p-5">
                    <div className="flex items-center gap-2">
                        <img src="/Zadano/Zadano_Logo_Full_Dark.svg" alt="Zadano.app" className="h-6" />
                    </div>
                </div>

                <nav className="px-3 space-y-0.5">
                    {navItems.map((item) => {
                        const icon = icons[item.iconKey as keyof typeof icons]
                        return (
                            <div
                                key={item.iconKey}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg ${item.isActive ? 'bg-[#1a1a24]' : 'opacity-70'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 flex items-center justify-center">
                                        {item.isActive ? icon.gold : icon.gray}
                                    </div>
                                    <span className={`text-xs ${item.isActive ? 'text-[#F2CE88] font-medium' : 'text-gray-500'}`}>
                                        {item.label}
                                    </span>
                                </div>
                                {item.count && (
                                    <span className={`text-[10px] ${item.isActive ? 'text-[#F2CE88]/60' : 'text-gray-600'}`}>
                                        {item.count}
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </nav>

                <div className="mt-auto px-3 py-4 space-y-2">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-[#1a1a24]">
                        <div className="relative w-8 h-4 rounded-full bg-[#0d0d14] border border-gray-700">
                            <div className="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-[#F2CE88]" />
                        </div>
                        <span className="text-xs text-white">{t('dashboard.nightMode')}</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="ml-56 h-full flex flex-col">
                {/* Header Mock */}
                <header className="h-14 bg-[#0d0d14] flex items-center justify-between px-6 border-b border-gray-800">
                    <div className="w-64 h-8 bg-[#0a0a0f] rounded-lg border border-gray-800" />
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-gray-800" />
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500" />
                    </div>
                </header>

                {/* Dashboard Content */}
                <main className="flex-1 p-6 overflow-hidden bg-[#0a0a0f]">
                    <div className="grid grid-cols-12 gap-6 h-full">
                        {/* Left Column */}
                        <div className="col-span-8 flex flex-col gap-6">
                            {/* Stats/Meetings */}
                            <div className="grid grid-cols-2 gap-4">
                                {mockEvents.map(event => (
                                    <div key={event.id} className="scale-90 origin-top-left transform">
                                        <TaskCard
                                            id={event.id}
                                            title={event.title}
                                            description={event.description}
                                            type="meeting"
                                            priority="medium"
                                            status="todo"
                                            dueDate={event.startAt}
                                            meetingLink={event.meetingLink}
                                            assignees={event.assignees}
                                            onClick={() => { }}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Projects */}
                            <div className="rounded-2xl bg-[#12121a] p-4 border border-gray-800">
                                <h3 className="text-sm font-semibold text-white mb-4">{t('dashboard.projects')}</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {mockProjects.map(p => (
                                        <ProjectCard
                                            key={p.id}
                                            id={p.id}
                                            title={p.name}
                                            timeRange={`${t('dashboard.until')} ${new Date(p.deadline).toLocaleDateString()}`}
                                            progress={50}
                                            daysLeft={5}
                                            assignees={p.members.map(m => ({ id: m.user.id, name: m.user.name, avatar: undefined }))}
                                            onViewProject={() => { }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="col-span-4 space-y-6">
                            <OverallProgress
                                projects={mockProjects}
                                currentUserId="1"
                            />

                            {/* Chat Widget Mock */}
                            <div className="rounded-2xl bg-[#12121a] p-4 h-48 border border-gray-800">
                                <h3 className="text-sm font-semibold text-white mb-3">{t('dashboard.messages')}</h3>
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-700" />
                                            <div className="flex-1">
                                                <div className="h-3 w-20 bg-gray-800 rounded mb-1" />
                                                <div className="h-2 w-32 bg-gray-800/50 rounded" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
