// =============================================================================
// USER TYPES
// =============================================================================

export interface User {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
    role: UserRole
    status: UserStatus
    createdAt: Date
    updatedAt: Date
}

export type UserRole = 'admin' | 'manager' | 'member'
export type UserStatus = 'active' | 'inactive' | 'pending'

// =============================================================================
// TEAM TYPES
// =============================================================================

export interface Team {
    id: string
    name: string
    description: string | null
    ownerId: string
    createdAt: Date
}

export interface TeamMember {
    id: string
    teamId: string
    userId: string
    role: TeamMemberRole
    joinedAt: Date
}

export type TeamMemberRole = 'owner' | 'admin' | 'member'

// =============================================================================
// PROJECT TYPES
// =============================================================================

export interface Project {
    id: string
    teamId: string
    name: string
    description: string | null
    status: ProjectStatus
    deadline: Date | null
    createdAt: Date
}

export type ProjectStatus = 'active' | 'archived' | 'completed'

// =============================================================================
// TASK TYPES
// =============================================================================

export interface Task {
    id: string
    projectId: string
    parentId: string | null
    title: string
    description: string | null
    status: TaskStatus
    priority: TaskPriority
    assigneeId: string | null
    reporterId: string
    dueDate: Date | null
    estimatedHours: number | null
    progress: number
    position: number
    createdAt: Date
    updatedAt: Date
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface TaskComment {
    id: string
    taskId: string
    userId: string
    content: string
    createdAt: Date
}

// =============================================================================
// FILE TYPES
// =============================================================================

export interface FileRecord {
    id: string
    name: string
    path: string
    size: number
    mimeType: string
    uploadedBy: string
    teamId: string
    taskId: string | null
    createdAt: Date
}

// =============================================================================
// MESSAGE TYPES
// =============================================================================

export interface Conversation {
    id: string
    teamId: string
    name: string | null
    type: ConversationType
    createdAt: Date
}

export type ConversationType = 'direct' | 'group' | 'channel'

export interface Message {
    id: string
    conversationId: string
    senderId: string
    content: string
    readAt: Date | null
    createdAt: Date
}

// =============================================================================
// CALENDAR TYPES
// =============================================================================

export interface CalendarEvent {
    id: string
    title: string
    description: string | null
    startAt: Date
    endAt: Date
    allDay: boolean
    recurrence: RecurrenceRule | null
    taskId: string | null
    teamId: string
    createdBy: string
    createdAt: Date
}

export interface RecurrenceRule {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number
    endDate?: Date
    count?: number
}

// =============================================================================
// API TYPES
// =============================================================================

export interface ApiResponse<T> {
    data: T
    success: true
}

export interface ApiError {
    error: {
        code: string
        message: string
        details?: Record<string, unknown>
    }
    success: false
}

export type ApiResult<T> = ApiResponse<T> | ApiError

export interface PaginatedResponse<T> {
    data: T[]
    pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
    }
}
