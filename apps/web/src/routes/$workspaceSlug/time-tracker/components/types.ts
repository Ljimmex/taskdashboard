export interface MyTask {
  id: string
  title: string
  status: string
  priority: string
  projectId: string
  projectName: string
  subtasks: { id: string; title: string; isCompleted: boolean }[]
  meetings?: { id: string; title: string; taskId: string; date: string }[]
}

export interface TimeEntryRaw {
  id: string
  taskId: string
  subtaskId: string | null
  userId: string
  description: string | null
  durationMinutes: number
  startedAt: string
  endedAt: string | null
  taskTitle: string
  subtaskTitle: string | null
  userName: string
  userImage: string | null
  entryType?: 'task' | 'meeting'
  difficultyLevel?: string
  bonusPoints?: number
  isApproved?: boolean
  rejectedAt?: string
  rejectionReason?: string
}
