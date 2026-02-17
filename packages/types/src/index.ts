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
    // E2E Keys
    publicKey?: string | null
    encryptedPrivateKey?: string | null
    keySalt?: string | null
    keyIv?: string | null
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
    title: string
    description: string | null
    status: TaskStatus
    priority: TaskPriority
    assigneeId: string | null
    reporterId: string
    dueDate: Date | null
    createdAt: Date
    updatedAt: Date
}

export type TaskStatus = 'todo' | 'inProgress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

// =============================================================================
// FILE TYPES
// =============================================================================

export interface FileRecord {
    id: string
    name: string
    path: string
    size: number | null
    mimeType: string | null
    uploadedBy: string
    workspaceId: string
    folderId: string | null
    thumbnailUrl?: string | null
    fileType?: string | null
    teamId?: string | null
    createdAt: Date | string
    updatedAt?: Date | string
}

export interface Folder {
    id: string
    name: string
    parentId: string | null
    workspaceId: string
    createdAt: Date | string
    updatedAt?: Date | string
}

// =============================================================================
// WORKSPACE TYPES
// =============================================================================

export interface Workspace {
    id: string
    name: string
    slug: string
    description?: string
    createdAt: Date
}

// =============================================================================
// TASK LINK TYPES
// =============================================================================

export interface TaskLink {
    id: string
    url: string
    title?: string
    description?: string
    addedBy: string
    addedAt: string
}

// =============================================================================
// CALENDAR TYPES
// =============================================================================

export interface CalendarEvent {
    id: string
    title: string
    description?: string
    startDate: Date
    endDate?: Date
    allDay?: boolean
    location?: string
    attendees?: string[]
    recurrence?: RecurrenceRule
    createdAt: Date
}

export interface RecurrenceRule {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number
    endDate?: Date
    count?: number
}

// =============================================================================
// CONVERSATION & MESSAGE TYPES
// =============================================================================

export interface Conversation {
    id: string
    teamId: string
    workspaceId?: string
    name?: string
    description?: string
    type: 'direct' | 'group' | 'channel'
    isPrivate: boolean
    messages: ConversationMessage[]
    participants: string[]
    participantStates: Record<string, { readAt?: string, deliveredAt?: string }>
    createdBy: string
    createdAt: string
    updatedAt: string
    lastMessageAt?: string
}

export interface EncryptedMessageEnvelope {
    v: number
    ct: string
    iv: string
    tag: string
    keys: Record<string, string>
}

export interface ConversationMessage {
    id: string
    senderId: string
    content: string | EncryptedMessageEnvelope
    timestamp: string
    edited: boolean
    editedAt?: string
    reactions: MessageReaction[]
    attachments: MessageAttachment[]
    isDeleted?: boolean
}

export interface MessageReaction {
    emoji: string
    userId: string
}

export interface MessageAttachment {
    id: string
    url: string
    name: string
    size?: number
    mimeType?: string
}

export interface EncryptionKey {
    id: string
    workspaceId: string
    publicKey: string
    encryptedPrivateKey: string
    createdAt: string
    rotatedAt?: string
    expiresAt?: string
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
