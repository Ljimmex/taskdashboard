import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePanelStore } from '../../../lib/panelStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TeamMember, TeamLevel } from './types'

interface EditMemberPanelProps {
    isOpen: boolean
    onClose: () => void
    member: TeamMember | null
    onSave: (id: string, updates: Partial<TeamMember>) => Promise<void>
    onDelete: (id: string) => Promise<void>
    currentTeamName?: string
    availableTeams?: string[]
    availableProjects?: string[]
}

export function EditMemberPanel({
    isOpen,
    onClose,
    member,
    onSave,
    onDelete,
    currentTeamName,
    availableTeams = [],
    availableProjects = []
}: EditMemberPanelProps) {
    const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)
    const panelRef = useRef<HTMLDivElement>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Form State
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [position, setPosition] = useState('')
    const [email, setEmail] = useState('')
    const [city, setCity] = useState('')
    const [country, setCountry] = useState('')
    const [teamLevel, setTeamLevel] = useState<TeamLevel | ''>('')

    // Arrays state
    const [teams, setTeams] = useState<string[]>([])
    const [projectNames, setProjectNames] = useState<string[]>([])

    // Adding state
    const [isAddingTeam, setIsAddingTeam] = useState(false)
    const [isAddingProject, setIsAddingProject] = useState(false)

    // Refs for click outside
    const addTeamWrapperRef = useRef<HTMLDivElement>(null)
    const addProjectWrapperRef = useRef<HTMLDivElement>(null)

    // Update form when member changes
    useEffect(() => {
        if (member) {
            // Split name if first/last not available separately
            const parts = member.name.split(' ')
            setFirstName(parts[0] || '')
            setLastName(parts.slice(1).join(' ') || '')

            setPosition(member.position || member.role || '')
            setEmail(member.email)
            setCity(member.city || '')
            setCountry(member.country || '')
            setTeamLevel(member.teamLevel || '')
            // If currentTeamName is provided, ensure it's in the list, otherwise defaults
            const initialTeams = currentTeamName ? [currentTeamName] : (member.teams || [])
            // Ensure unique
            setTeams(Array.from(new Set(initialTeams)))
            setProjectNames(member.projects || [])
        }
    }, [member, currentTeamName])

    // Sync global panel state
    useEffect(() => {
        setIsPanelOpen(isOpen)
    }, [isOpen, setIsPanelOpen])

    // Close on Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            return () => document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

    // Click outside for dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addTeamWrapperRef.current && !addTeamWrapperRef.current.contains(event.target as Node)) {
                setIsAddingTeam(false)
            }
            if (addProjectWrapperRef.current && !addProjectWrapperRef.current.contains(event.target as Node)) {
                setIsAddingProject(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSave = async () => {
        if (!member) return
        setIsLoading(true)
        try {
            await onSave(member.id, {
                name: `${firstName} ${lastName}`.trim(),
                firstName,
                lastName,
                position: position,
                city: city || undefined,
                country: country || undefined,
                teamLevel: teamLevel || undefined,
                projects: projectNames,
            } as any)
            onClose()
        } catch (error) {
            console.error('Failed to update member', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!member) return
        setIsDeleting(true)
        try {
            await onDelete(member.id)
            setShowDeleteConfirm(false)
            onClose()
        } catch (error) {
            console.error('Failed to delete member', error)
        } finally {
            setIsDeleting(false)
        }
    }

    const addTeam = (teamToAdd: string) => {
        setTeams([...teams, teamToAdd])
        setIsAddingTeam(false)
    }

    const addProject = (projectToAdd: string) => {
        setProjectNames([...projectNames, projectToAdd])
        setIsAddingProject(false)
    }

    const removeTeam = (teamToRemove: string) => {
        setTeams(teams.filter(t => t !== teamToRemove))
    }

    const removeProject = (projectToRemove: string) => {
        setProjectNames(projectNames.filter(p => p !== projectToRemove))
    }

    // Filter available options
    const unselectedTeams = availableTeams.filter(t => !teams.includes(t))
    const unselectedProjects = availableProjects.filter(p => !projectNames.includes(p))

    if (!isOpen) return null

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Main Edit Panel */}
            <div
                ref={panelRef}
                className={`fixed top-4 right-4 bottom-4 w-full max-w-md bg-[#12121a] rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'}`}
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-gray-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Edit Member</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                    {/* Photo Section */}
                    <div>
                        <Label className="text-gray-400 text-xs mb-2 block">Photo</Label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-xl font-bold text-white overflow-hidden">
                                {member?.avatar ? (
                                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                ) : (
                                    member?.name.charAt(0)
                                )}
                            </div>
                            <div>
                                <div className="flex gap-2 text-sm">
                                    <button className="text-amber-500 hover:text-amber-400 font-medium text-xs">Upload new photo</button>
                                    <span className="text-gray-600">·</span>
                                    <button className="text-gray-500 hover:text-white font-medium text-xs">Remove photo</button>
                                </div>
                                <p className="text-gray-500 text-[10px] mt-1">Pick a photo up to 4MB.</p>
                            </div>
                        </div>
                    </div>

                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-gray-400 text-xs">First Name</Label>
                            <Input
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="bg-[#1a1a24] border-gray-800 text-white rounded-lg focus:border-amber-500/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-400 text-xs">Last Name</Label>
                            <Input
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="bg-[#1a1a24] border-gray-800 text-white rounded-lg focus:border-amber-500/50"
                            />
                        </div>
                    </div>

                    {/* Job Title */}
                    <div className="space-y-2">
                        <Label className="text-gray-400 text-xs">Job title</Label>
                        <Input
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                            className="bg-[#1a1a24] border-gray-800 text-white rounded-lg focus:border-amber-500/50"
                            placeholder="e.g. Product Designer"
                        />
                    </div>

                    {/* Team Level */}
                    <div className="space-y-2">
                        <Label className="text-gray-400 text-xs">Team Level</Label>
                        <select
                            value={teamLevel}
                            onChange={(e) => setTeamLevel(e.target.value as TeamLevel | '')}
                            className="w-full px-3 py-2 bg-[#1a1a24] border border-gray-800 text-white rounded-lg focus:border-amber-500/50 focus:outline-none text-sm"
                        >
                            <option value="">Select level...</option>
                            <option value="team_lead">Team Lead</option>
                            <option value="senior">Senior</option>
                            <option value="mid">Mid-level</option>
                            <option value="junior">Junior</option>
                            <option value="intern">Intern</option>
                        </select>
                    </div>

                    {/* Location */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-gray-400 text-xs">City</Label>
                            <Input
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="bg-[#1a1a24] border-gray-800 text-white rounded-lg focus:border-amber-500/50"
                                placeholder="e.g. Warsaw"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-400 text-xs">Country</Label>
                            <Input
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="bg-[#1a1a24] border-gray-800 text-white rounded-lg focus:border-amber-500/50"
                                placeholder="e.g. Poland"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label className="text-gray-400 text-xs">Email</Label>
                            <button className="text-xs text-gray-500 hover:text-white">Change email</button>
                        </div>
                        <Input
                            value={email}
                            readOnly
                            className="bg-[#1a1a24] border-gray-800 text-gray-400 rounded-lg cursor-not-allowed"
                        />
                    </div>

                    {/* Team Groups */}
                    <div className="space-y-2 z-20 relative">
                        <Label className="text-gray-400 text-xs">Team groups</Label>
                        <div className="flex flex-wrap gap-2 min-h-[42px] p-2 bg-[#1a1a24] border border-gray-800 rounded-lg">
                            {teams.map((team, index) => (
                                <div key={index} className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-500 text-xs border border-amber-500/20 group">
                                    <span>{team}</span>
                                    <button onClick={() => removeTeam(team)} className="hover:text-amber-300 ml-1 opacity-50 group-hover:opacity-100">×</button>
                                </div>
                            ))}

                            {/* Add Team Dropdown Trigger */}
                            <div className="relative" ref={addTeamWrapperRef}>
                                <button
                                    onClick={() => setIsAddingTeam(!isAddingTeam)}
                                    className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 hover:bg-gray-800 rounded transition-colors"
                                >
                                    + Add
                                </button>

                                {isAddingTeam && (
                                    <div className="absolute top-full left-0 mt-1 w-48 bg-[#1f1f2e] border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                                        {unselectedTeams.length > 0 ? (
                                            <div className="max-h-48 overflow-y-auto py-1">
                                                {unselectedTeams.map(team => (
                                                    <button
                                                        key={team}
                                                        onClick={() => addTeam(team)}
                                                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                                                    >
                                                        {team}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="px-3 py-2 text-xs text-gray-500 italic">No available teams</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Projects */}
                    <div className="space-y-2 z-10 relative">
                        <Label className="text-gray-400 text-xs">Projects</Label>
                        <div className="flex flex-wrap gap-2 min-h-[42px] p-2 bg-[#1a1a24] border border-gray-800 rounded-lg">
                            {projectNames.map((proj, index) => (
                                <div key={index} className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20 group">
                                    <span>{proj}</span>
                                    <button onClick={() => removeProject(proj)} className="hover:text-blue-300 ml-1 opacity-50 group-hover:opacity-100">×</button>
                                </div>
                            ))}

                            {/* Add Project Dropdown Trigger */}
                            <div className="relative" ref={addProjectWrapperRef}>
                                <button
                                    onClick={() => setIsAddingProject(!isAddingProject)}
                                    className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 hover:bg-gray-800 rounded transition-colors"
                                >
                                    + Add Project
                                </button>

                                {isAddingProject && (
                                    <div className="absolute top-full left-0 mt-1 w-48 bg-[#1f1f2e] border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                                        {unselectedProjects.length > 0 ? (
                                            <div className="max-h-48 overflow-y-auto py-1">
                                                {unselectedProjects.map(proj => (
                                                    <button
                                                        key={proj}
                                                        onClick={() => addProject(proj)}
                                                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                                                    >
                                                        {proj}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="px-3 py-2 text-xs text-gray-500 italic">No available projects</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex-none p-6 border-t border-gray-800 flex items-center justify-between bg-[#12121a] rounded-b-2xl">
                    <Button
                        onClick={() => setShowDeleteConfirm(true)}
                        variant="ghost"
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10 px-4"
                    >
                        Delete
                    </Button>

                    <div className="flex gap-3">
                        <Button
                            onClick={onClose}
                            variant="ghost"
                            className="text-gray-400 hover:text-white hover:bg-gray-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6"
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal - Refined */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setShowDeleteConfirm(false)} />

                    {/* Simplified Modal */}
                    <div className="relative bg-[#0f0f14] rounded-xl shadow-2xl w-full max-w-sm border border-gray-800 overflow-hidden transform scale-100 transition-all">
                        <div className="p-6 text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-900/30 mb-4">
                                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg leading-6 font-medium text-white mb-2">Delete Member</h3>
                            <p className="text-sm text-gray-400 mb-6">
                                Are you sure you want to delete <span className="font-semibold text-white">{member?.name}</span>? This action cannot be undone.
                            </p>

                            <div className="flex gap-3 justify-center">
                                <Button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="bg-gray-800 hover:bg-gray-700 text-white w-full border border-gray-700 hover:border-gray-600"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="bg-red-600 hover:bg-red-500 text-white w-full border border-red-500/50"
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>,
        document.body
    )
}
