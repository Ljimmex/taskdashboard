export interface Task {
    id: string
    title: string
    projectId?: string
    startDate: string | null
    endDate: string | null
    dueDate?: string | null
    description?: string
    assignees?: string[]
    assigneeDetails?: { id: string; name: string; avatar?: string; image?: string }[]
    subtasksCount?: number
    subtasksCompleted?: number
    commentsCount?: number
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    status: string
}
