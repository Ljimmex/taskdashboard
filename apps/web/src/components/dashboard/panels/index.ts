import {
  CalendarDays,
  FolderKanban,
  Calendar,
  TrendingUp,
  MessageCircle,
  FileText,
  ListChecks,
  CalendarClock,
  Bell,
  Users,
  HardDrive,
} from 'lucide-react'
import { UpcomingMeetingsPanel } from './UpcomingMeetingsPanel'
import { ProjectsPanel } from './ProjectsPanel'
import { CalendarPanel } from './CalendarPanel'
import { OverallProgressPanel } from './OverallProgressPanel'
import { ChatSectionPanel } from './ChatSectionPanel'
import { LastResourcesPanel } from './LastResourcesPanel'
import { MyTasksPanel } from './MyTasksPanel'
import { TasksDueTodayPanel } from './TasksDueTodayPanel'
import { NotificationsPanel } from './NotificationsPanel'
import { TeamMembersPanel } from './TeamMembersPanel'
import { StorageQuotaPanel } from './StorageQuotaPanel'
import type { DashboardPanelDefinition } from '@/lib/dashboard'

export const DASHBOARD_PANELS: DashboardPanelDefinition[] = [
  {
    id: 'upcoming-meetings',
    titleKey: 'dashboard.upcomingMeetings',
    icon: CalendarDays,
    colSpan: 8,
    component: UpcomingMeetingsPanel,
  },
  {
    id: 'projects',
    titleKey: 'dashboard.projects',
    icon: FolderKanban,
    colSpan: 8,
    component: ProjectsPanel,
  },
  {
    id: 'calendar',
    titleKey: 'dashboard.calendar',
    icon: Calendar,
    colSpan: 8,
    component: CalendarPanel,
  },
  {
    id: 'overall-progress',
    titleKey: 'dashboard.overallProgress',
    icon: TrendingUp,
    colSpan: 4,
    component: OverallProgressPanel,
  },
  {
    id: 'chat-section',
    titleKey: 'dashboard.chat',
    icon: MessageCircle,
    colSpan: 4,
    component: ChatSectionPanel,
  },
  {
    id: 'last-resources',
    titleKey: 'dashboard.lastResources',
    icon: FileText,
    colSpan: 4,
    component: LastResourcesPanel,
  },
  {
    id: 'my-tasks',
    titleKey: 'dashboard.myTasks',
    icon: ListChecks,
    colSpan: 6,
    component: MyTasksPanel,
  },
  {
    id: 'tasks-due-today',
    titleKey: 'dashboard.tasksDueToday',
    icon: CalendarClock,
    colSpan: 6,
    component: TasksDueTodayPanel,
  },
  {
    id: 'notifications',
    titleKey: 'dashboard.notifications',
    icon: Bell,
    colSpan: 4,
    component: NotificationsPanel,
  },
  {
    id: 'team-members',
    titleKey: 'dashboard.team',
    icon: Users,
    colSpan: 4,
    component: TeamMembersPanel,
  },
  {
    id: 'storage-quota',
    titleKey: 'dashboard.storage',
    icon: HardDrive,
    colSpan: 4,
    component: StorageQuotaPanel,
  },
]

export function getPanelDefinition(id: string): DashboardPanelDefinition | undefined {
  return DASHBOARD_PANELS.find((p) => p.id === id)
}

export const DASHBOARD_PANELS_BY_ID = Object.fromEntries(
  DASHBOARD_PANELS.map((p) => [p.id, p])
) as Record<string, DashboardPanelDefinition>

export {
  UpcomingMeetingsPanel,
  ProjectsPanel,
  CalendarPanel,
  OverallProgressPanel,
  ChatSectionPanel,
  LastResourcesPanel,
  MyTasksPanel,
  TasksDueTodayPanel,
  NotificationsPanel,
  TeamMembersPanel,
  StorageQuotaPanel,
}
