import {
  CalendarDays,
  FolderKanban,
  Calendar,
  TrendingUp,
  MessageCircle,
  FileText,
  ListChecks,
  CalendarClock,
  Users,
  Clock,
  LayoutGrid,
} from 'lucide-react'
import { UpcomingMeetingsPanel } from './UpcomingMeetingsPanel'
import { ProjectsPanel } from './ProjectsPanel'
import { CalendarPanel } from './CalendarPanel'
import { OverallProgressPanel } from './OverallProgressPanel'
import { ChatSectionPanel } from './ChatSectionPanel'
import { LastResourcesPanel } from './LastResourcesPanel'
import { MyTasksPanel } from './MyTasksPanel'
import { TasksDueTodayPanel } from './TasksDueTodayPanel'
import { TeamMembersPanel } from './TeamMembersPanel'
import { TimeTrackerPanel } from './TimeTrackerPanel'
import { ProjectKanbanPanel } from './ProjectKanbanPanel'
import { CalendarCompactPanel } from './CalendarCompactPanel'
import { ProjectsViewPanel } from './ProjectsViewPanel'
import type { DashboardPanelDefinition } from '@/lib/dashboard'

export const DASHBOARD_PANELS: DashboardPanelDefinition[] = [
  {
    id: 'upcoming-meetings',
    titleKey: 'dashboard.upcomingMeetings',
    description: 'Nadchodzące spotkania i terminy w kalendarzu.',
    icon: CalendarDays,
    colSpan: 8,
    component: UpcomingMeetingsPanel,
  },
  {
    id: 'projects',
    titleKey: 'dashboard.projects',
    description: 'Lista projektów, ich postęp i członkowie.',
    icon: FolderKanban,
    colSpan: 8,
    component: ProjectsPanel,
  },
  {
    id: 'calendar',
    titleKey: 'dashboard.calendar',
    description: 'Widok kalendarza nadchodzących wydarzeń.',
    icon: Calendar,
    colSpan: 8,
    component: CalendarPanel,
  },
  {
    id: 'project-kanban',
    titleKey: 'dashboard.projectKanban',
    description: 'Mini widok Kanban wybranego projektu.',
    icon: LayoutGrid,
    colSpan: 8,
    component: ProjectKanbanPanel,
  },
  {
    id: 'my-tasks',
    titleKey: 'dashboard.myTasks',
    description: 'Twoje zadania do wykonania.',
    icon: ListChecks,
    colSpan: 6,
    component: MyTasksPanel,
  },
  {
    id: 'tasks-due-today',
    titleKey: 'dashboard.tasksDueToday',
    description: 'Zadania z terminem realizacji na dziś.',
    icon: CalendarClock,
    colSpan: 6,
    component: TasksDueTodayPanel,
  },
  {
    id: 'overall-progress',
    titleKey: 'dashboard.overallProgress',
    description: 'Ogólny postęp projektów i zadań.',
    icon: TrendingUp,
    colSpan: 4,
    component: OverallProgressPanel,
  },
  {
    id: 'chat-section',
    titleKey: 'dashboard.chat',
    description: 'Ostatnie wiadomości i czaty zespołowe.',
    icon: MessageCircle,
    colSpan: 4,
    component: ChatSectionPanel,
  },
  {
    id: 'last-resources',
    titleKey: 'dashboard.lastResources',
    description: 'Ostatnio dodane pliki i zasoby.',
    icon: FileText,
    colSpan: 4,
    component: LastResourcesPanel,
  },
  {
    id: 'team-members',
    titleKey: 'dashboard.team',
    description: 'Lista członków zespołu i ich statusy.',
    icon: Users,
    colSpan: 4,
    component: TeamMembersPanel,
  },
  {
    id: 'time-tracker',
    titleKey: 'dashboard.timeTracker',
    description: 'Śledzenie czasu pracy i aktywności.',
    icon: Clock,
    colSpan: 4,
    component: TimeTrackerPanel,
  },
  {
    id: 'calendar-compact',
    titleKey: 'dashboard.calendarCompact',
    description: 'Kompaktowy widok kalendarza.',
    icon: Calendar,
    colSpan: 4,
    component: CalendarCompactPanel,
  },
  {
    id: 'projects-view',
    titleKey: 'dashboard.projectsView',
    description: 'Kompaktowy widok projektów w obszarze roboczym.',
    icon: FolderKanban,
    colSpan: 4,
    component: ProjectsViewPanel,
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
  ProjectKanbanPanel,
  OverallProgressPanel,
  ChatSectionPanel,
  LastResourcesPanel,
  MyTasksPanel,
  TasksDueTodayPanel,
  TeamMembersPanel,
  TimeTrackerPanel,
  CalendarCompactPanel,
  ProjectsViewPanel,
}
