export type TeamLevel = 'team_lead' | 'senior' | 'mid' | 'junior' | 'intern'

export interface TeamMember {
    id: string
    name: string
    email: string
    role: string
    projects: string[]
    projectCount: number
    dateAdded: string
    dateAddedRaw?: Date | null
    lastActive: string
    lastActiveDate?: Date | null
    avatar?: string
    position?: string
    teams?: string[]
    status?: 'active' | 'inactive' | 'pending'
    // Location
    city?: string
    country?: string
    // Team level
    teamLevel?: TeamLevel
}

export interface Team {
    id: string
    name: string
    color: string
    members: TeamMember[]
    projects?: { id: string; name: string }[]
}
