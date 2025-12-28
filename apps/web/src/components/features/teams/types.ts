export interface TeamMember {
    id: string
    name: string
    email: string
    role: string
    projects: string[]
    projectCount: number
    dateAdded: string
    lastActive: string
    avatar?: string
    position?: string
    teams?: string[]
}

export interface Team {
    id: string
    name: string
    color: string
    members: TeamMember[]
}
