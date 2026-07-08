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
        { id: '2', user: { id: '2', name: 'User 2', image: null } },
      ],
    },
    {
      id: '2',
      status: 'active',
      deadline: new Date(Date.now() + 86400000 * 12).toISOString(),
      name: 'Mobile App',
      members: [{ id: '1', user: { id: '1', name: 'User 1', image: null } }],
    },
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
        { id: '2', name: 'Bob', avatar: undefined },
      ],
    },
    {
      id: '2',
      title: 'Design Review',
      description: 'Reviewing new designs',
      startAt: new Date(Date.now() + 86400000).toISOString(),
      endAt: new Date(Date.now() + 90000000).toISOString(),
      type: 'meeting' as const,
      meetingLink: 'https://zoom.us',
      assignees: [{ id: '3', name: 'Charlie', avatar: undefined }],
    },
  ]

  const navItems = [
    { iconKey: 'dashboard', label: t('dashboard.title'), isActive: true },
    { iconKey: 'team', label: t('dashboard.team'), count: 5 },
    { iconKey: 'product', label: t('dashboard.projects') },
    { iconKey: 'messages', label: t('dashboard.messages'), count: 2 },
    { iconKey: 'calendar', label: t('dashboard.calendar') },
    { iconKey: 'files', label: t('dashboard.files') },
    { iconKey: 'board', label: t('dashboard.board') },
  ]

  return (
    <div className="pointer-events-none relative h-[600px] w-full select-none overflow-hidden rounded-xl border border-gray-800 bg-[#0a0a0f] shadow-2xl">
      {/* Overlay to prevent interaction (double safety) */}
      <div className="absolute inset-0 z-50 bg-transparent" />

      {/* Sidebar Mock */}
      <aside
        className={`absolute left-0 top-0 z-40 flex h-full w-56 flex-col border-r border-gray-800 bg-[#0d0d14]`}
      >
        <div className="p-5">
          <div className="flex items-center gap-2">
            <img src="/Zadano/Zadano_Logo_Full_Dark.svg" alt="Zadano.app" className="h-6" />
          </div>
        </div>

        <nav className="space-y-0.5 px-3">
          {navItems.map((item) => {
            const icon = icons[item.iconKey as keyof typeof icons]
            return (
              <div
                key={item.iconKey}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${item.isActive ? 'bg-[#1a1a24]' : 'opacity-70'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-5 w-5 items-center justify-center">
                    {item.isActive ? icon.gold : icon.gray}
                  </div>
                  <span
                    className={`text-xs ${item.isActive ? 'font-medium text-[#F2CE88]' : 'text-gray-500'}`}
                  >
                    {item.label}
                  </span>
                </div>
                {item.count && (
                  <span
                    className={`text-[10px] ${item.isActive ? 'text-[#F2CE88]/60' : 'text-gray-600'}`}
                  >
                    {item.count}
                  </span>
                )}
              </div>
            )
          })}
        </nav>

        <div className="mt-auto space-y-2 px-3 py-4">
          <div className="flex items-center gap-3 rounded-xl bg-[#1a1a24] p-2">
            <div className="relative h-4 w-8 rounded-full border border-gray-700 bg-[#0d0d14]">
              <div className="absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-[#F2CE88]" />
            </div>
            <span className="text-xs text-white">{t('dashboard.nightMode')}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-56 flex h-full flex-col">
        {/* Header Mock */}
        <header className="flex h-14 items-center justify-between border-b border-gray-800 bg-[#0d0d14] px-6">
          <div className="h-8 w-64 rounded-lg border border-gray-800 bg-[#0a0a0f]" />
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-gray-800" />
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500" />
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-hidden bg-[#0a0a0f] p-6">
          <div className="grid h-full grid-cols-12 gap-6">
            {/* Left Column */}
            <div className="col-span-8 flex flex-col gap-6">
              {/* Stats/Meetings */}
              <div className="grid grid-cols-2 gap-4">
                {mockEvents.map((event) => (
                  <div key={event.id} className="origin-top-left scale-90 transform">
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
                      onClick={() => {}}
                    />
                  </div>
                ))}
              </div>

              {/* Projects */}
              <div className="rounded-2xl border border-gray-800 bg-[#12121a] p-4">
                <h3 className="mb-4 text-sm font-semibold text-white">{t('dashboard.projects')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  {mockProjects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      id={p.id}
                      title={p.name}
                      timeRange={`${t('dashboard.until')} ${new Date(p.deadline).toLocaleDateString()}`}
                      progress={50}
                      daysLeft={5}
                      assignees={p.members.map((m) => ({
                        id: m.user.id,
                        name: m.user.name,
                        avatar: undefined,
                      }))}
                      onViewProject={() => {}}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="col-span-4 space-y-6">
              <OverallProgress projects={mockProjects} currentUserId="1" />

              {/* Chat Widget Mock */}
              <div className="h-48 rounded-2xl border border-gray-800 bg-[#12121a] p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">{t('dashboard.messages')}</h3>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-700" />
                      <div className="flex-1">
                        <div className="mb-1 h-3 w-20 rounded bg-gray-800" />
                        <div className="h-2 w-32 rounded bg-gray-800/50" />
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
