export interface Task {
    id: string
    title: string
    projectId?: string
    startDate: string | null
    endDate: string | null
    dueDate?: string | null
    assigneeId: string | null
    description?: string
    assignee?: { id: string; name: string; image?: string }
    subtasksCount?: number
    subtasksCompleted?: number
    commentsCount?: number
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    status: string
    type?: 'task' | 'meeting'
}
