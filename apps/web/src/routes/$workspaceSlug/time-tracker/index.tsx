import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetchJson } from '@/lib/api'
import { useSession } from '@/lib/auth'
import {
    Activity,
    Clock,
    UserCircle,
    ClipboardCheck,
    LayoutDashboard,
    ChevronDown
} from 'lucide-react'

// Import modular components
import { MemberTimerView } from './components/MemberTimerView'
import { ManualEntryView } from './components/ManualEntryView'
import { HRApprovalView } from './components/HRApprovalView'
import { MemberContributionView } from './components/MemberContributionView'
import { OwnerDashboardView } from './components/OwnerDashboardView'

export const Route = createFileRoute('/$workspaceSlug/time-tracker/')({
    component: TimeTrackerPage,
})

export function TimeTrackerPage() {
    const { workspaceSlug } = Route.useParams()
    const { t } = useTranslation()

    // Auth & Permissions
    const { data: sessionData } = useSession()
    const user = sessionData?.user
    const userId = user?.id

    const { data: workspaceData } = useQuery({
        queryKey: ['workspace', workspaceSlug],
        queryFn: () => apiFetchJson<{ success: boolean; data: any; userRole: string }>(`/api/workspaces/slug/${workspaceSlug}`),
        enabled: !!workspaceSlug,
    })
    const role = workspaceData?.userRole

    const canManageEntries = ['owner', 'admin', 'hr_manager'].includes(role || '')
    const canApproveEntries = ['owner', 'admin', 'hr_manager', 'project_manager'].includes(role || '')

    // Navigation state
    const [view, setView] = useState<'timer' | 'manual' | 'approval' | 'contribution' | 'dashboard'>('timer')
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [projectsDropdownOpen, setProjectsDropdownOpen] = useState(false)

    // Fetch projects
    const { data: projectsData } = useQuery({
        queryKey: ['projects', workspaceSlug],
        queryFn: () => apiFetchJson<{ success: boolean; data: any[] }>(`/api/projects?workspaceSlug=${workspaceSlug}`),
        enabled: !!workspaceSlug,
    })
    const projects = projectsData?.data || []

    // Auto-select first project if only one exists or if none selected
    useMemo(() => {
        if (projects.length > 0 && !selectedProjectId) {
            setSelectedProjectId(projects[0].id)
        }
    }, [projects, selectedProjectId])

    const selectedProject = projects.find((p: any) => p.id === selectedProjectId)

    if (!user || !workspaceSlug) return null

    const navItems = [
        { id: 'timer', label: t('timeTracker.myTimer', 'My Timer'), icon: Clock, show: true },
        { id: 'manual', label: t('timeTracker.manualEntry', 'Manual Entry'), icon: Activity, show: true },
        { id: 'approval', label: t('timeTracker.approvals', 'Approvals'), icon: ClipboardCheck, show: canApproveEntries },
        { id: 'contribution', label: t('timeTracker.myContribution', 'My Contribution'), icon: UserCircle, show: true },
        { id: 'dashboard', label: t('timeTracker.ownerDashboard', 'Owner Dashboard'), icon: LayoutDashboard, show: canManageEntries },
    ]

    return (
        <div className="min-h-screen bg-[var(--app-bg-deepest)] text-[var(--app-text-primary)] pb-20">
            {/* Header - Minimalist & Compact */}
            <div className="relative">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* View Switcher - Labeled, Pill Style, positioned on the left */}
                        <div className="bg-[var(--app-bg-card)] p-1 rounded-full flex gap-0.5 border border-[var(--app-border)] shadow-sm">
                            {navItems.filter(i => i.show).map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setView(item.id as any)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 text-[10px] font-bold uppercase tracking-wider ${view === item.id
                                        ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)] shadow-md'
                                        : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-deepest)]'
                                        }`}
                                >
                                    <item.icon size={14} strokeWidth={view === item.id ? 2.5 : 2} />
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center">
                        {/* Project Selector - Only visible in Contribution and Dashboard */}
                        {projects.length > 1 && (view === 'contribution' || view === 'dashboard') && (
                            <div className="relative">
                                <button
                                    onClick={() => setProjectsDropdownOpen(!projectsDropdownOpen)}
                                    className="flex items-center gap-2 px-3 py-1.5 h-9 bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-full hover:border-[var(--app-accent)]/50 transition-all text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider"
                                >
                                    <div className="w-1 h-1 rounded-full bg-[var(--app-accent)]" />
                                    <span>{selectedProject?.name || t('common.selectProject', 'Select Project')}</span>
                                    <ChevronDown size={12} className={`transition-transform duration-200 ${projectsDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {projectsDropdownOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-[var(--app-bg-elevated)] rounded-xl shadow-2xl z-50 overflow-hidden">
                                        <div className="p-1.5">
                                            {projects.map((p: any) => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        setSelectedProjectId(p.id)
                                                        setProjectsDropdownOpen(false)
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${selectedProjectId === p.id
                                                        ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]'
                                                        : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-deepest)] hover:text-[var(--app-text-primary)]'
                                                        }`}
                                                >
                                                    <div className={`w-1 h-1 rounded-full ${selectedProjectId === p.id ? 'bg-white' : 'bg-[var(--app-accent)]'}`} />
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 mt-8">
                {view === 'timer' && userId && <MemberTimerView workspaceSlug={workspaceSlug} userId={userId} />}
                {view === 'manual' && userId && <ManualEntryView workspaceSlug={workspaceSlug} userId={userId} canManage={canManageEntries} />}
                {view === 'approval' && <HRApprovalView workspaceSlug={workspaceSlug} />}
                {view === 'contribution' && userId && <MemberContributionView userId={userId} selectedProjectId={selectedProjectId} />}
                {view === 'dashboard' && <OwnerDashboardView selectedProjectId={selectedProjectId} projects={projects} />}
            </div>
        </div>
    )
}
