import { useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePanelStore } from '../../../lib/panelStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { TeamMember } from './types'
import { ProgressBar } from '@/components/common/ProgressBar'
import {
    SubtaskCheckboxIcon,
    SendIcon,
    KanbanIconGrey
} from '../tasks/components/TaskIcons'

interface ViewMemberPanelProps {
    isOpen: boolean
    onClose: () => void
    member: TeamMember | null
    teamName?: string
}

export function ViewMemberPanel({ isOpen, onClose, member, teamName }: ViewMemberPanelProps) {
    const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)
    const panelRef = useRef<HTMLDivElement>(null)

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

    if (!isOpen || !member) return null

    // Determine displayed teams: prioritize member.teams, fall back to teamName if present
    const displayTeams = (member.teams && member.teams.length > 0)
        ? member.teams
        : (teamName ? [teamName] : [])

    // Mock Workload Data
    const completedTasks = 5
    const totalTasks = 8

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Main View Panel */}
            <div
                ref={panelRef}
                className={`fixed top-4 right-4 bottom-4 w-full max-w-md bg-[#12121a] rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'}`}
            >
                {/* Header: Compact & Productivity Focused */}
                <div className="flex-none p-6 border-b border-gray-800 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        {/* Avatar 48x48 */}
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-lg font-bold text-white overflow-hidden shadow-sm border border-gray-700">
                                {member.avatar ? (
                                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                ) : (
                                    member.name.charAt(0)
                                )}
                            </div>
                            {/* Presence Indicator Badge */}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#12121a] ${member.lastActive === 'Just now' ? 'bg-green-500' : 'bg-gray-500'}`} title={member.lastActive === 'Just now' ? 'Online' : 'Offline'}></div>
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-white leading-tight">{member.name}</h2>
                            <p className="text-gray-400 text-xs mb-1">{member.role || member.position || 'No title'}</p>

                            {/* NEW: Contact Info moved here */}
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer w-fit">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                                {member.email}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white transition-colors p-1"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 px-6 py-6 overflow-y-auto space-y-8">

                    {/* Workload Indicator (Moved to top as it's key info) */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label className="uppercase text-xs font-semibold text-gray-500 tracking-wider">Current Workload</Label>
                            <span className="text-xs text-gray-400">{completedTasks}/{totalTasks} tasks</span>
                        </div>
                        <ProgressBar
                            value={completedTasks}
                            max={totalTasks}
                            size="md"
                            showLabel={false}
                        />
                        <p className="text-[10px] text-gray-500 mt-1 text-right">62% capacity used</p>
                    </div>

                    {/* Quick Actions - Improved Styling + Project Icons */}
                    <div className="grid grid-cols-3 gap-3">
                        <Button
                            variant="default" // Changed from outline for better visibility
                            className="h-auto py-3 flex flex-col gap-2 bg-[#1f1f2e] border border-gray-800 hover:bg-gray-800 hover:border-gray-700 text-gray-300 hover:text-white transition-all shadow-sm"
                        >
                            <div className="opacity-80 group-hover:opacity-100 transition-opacity">
                                <SubtaskCheckboxIcon />
                            </div>
                            <span className="text-[10px] font-medium">Assign Task</span>
                        </Button>

                        <Button
                            variant="default"
                            className="h-auto py-3 flex flex-col gap-2 bg-[#1f1f2e] border border-gray-800 hover:bg-gray-800 hover:border-gray-700 text-gray-300 hover:text-white transition-all shadow-sm"
                        >
                            <div className="opacity-80 group-hover:opacity-100 transition-opacity">
                                <SendIcon />
                            </div>
                            <span className="text-[10px] font-medium">Message</span>
                        </Button>

                        <Button
                            variant="default"
                            className="h-auto py-3 flex flex-col gap-2 bg-[#1f1f2e] border border-gray-800 hover:bg-gray-800 hover:border-gray-700 text-gray-300 hover:text-white transition-all shadow-sm"
                        >
                            <div className="opacity-80 group-hover:opacity-100 transition-opacity">
                                <KanbanIconGrey />
                            </div>
                            <span className="text-[10px] font-medium">View Tasks</span>
                        </Button>
                    </div>

                    {/* Context: Teams & Projects */}
                    <div className="space-y-6">
                        {/* Teams */}
                        <div>
                            <Label className="uppercase text-xs font-semibold text-gray-500 tracking-wider mb-3 block">Teams</Label>
                            <div className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#1a1a24]">
                                <div className="flex flex-wrap gap-2">
                                    {displayTeams.length > 0 ? displayTeams.map((team, i) => (
                                        <div key={i} className="flex items-center gap-1 bg-[#2a2b36] pl-2 pr-2.5 py-1 rounded-lg text-xs font-medium text-gray-200 border border-gray-700/50">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                            {team}
                                        </div>
                                    )) : (
                                        <span className="text-gray-500 text-xs py-1">No teams</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Projects */}
                        <div>
                            <Label className="uppercase text-xs font-semibold text-gray-500 tracking-wider mb-3 block">Active Projects</Label>
                            <div className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#1a1a24]">
                                {(member.projects && member.projects.length > 0) ? (
                                    <div className="flex flex-wrap gap-2">
                                        {member.projects.map((proj, i) => (
                                            <div key={i} className="flex items-center gap-1 bg-[#2a2b36] px-2.5 py-1 rounded-lg text-xs font-medium text-gray-200 border border-gray-700/50">
                                                {proj}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 py-1">No active projects</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* System Information */}
                    <div className="pt-4 border-t border-gray-800 space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Member Since</span>
                            <span className="text-gray-400 font-medium">{member.dateAdded || 'Unknown'}</span>
                        </div>

                        {/* Location */}
                        {(member.city || member.country) && (
                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <span className="flex items-center gap-1.5">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    Location
                                </span>
                                <span className="text-gray-400 font-medium">
                                    {[member.city, member.country].filter(Boolean).join(', ')}
                                </span>
                            </div>
                        )}

                        {/* Team Level */}
                        {member.teamLevel && (
                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <span className="flex items-center gap-1.5">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                                    </svg>
                                    Team Level
                                </span>
                                <span className={`font-medium px-2 py-0.5 rounded text-[10px] ${member.teamLevel === 'team_lead' ? 'bg-amber-500/20 text-amber-400' :
                                    member.teamLevel === 'senior' ? 'bg-blue-500/20 text-blue-400' :
                                        member.teamLevel === 'mid' ? 'bg-green-500/20 text-green-400' :
                                            member.teamLevel === 'junior' ? 'bg-purple-500/20 text-purple-400' :
                                                'bg-gray-500/20 text-gray-400'
                                    }`}>
                                    {member.teamLevel === 'team_lead' ? 'Team Lead' :
                                        member.teamLevel === 'senior' ? 'Senior' :
                                            member.teamLevel === 'mid' ? 'Mid-level' :
                                                member.teamLevel === 'junior' ? 'Junior' : 'Intern'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>,
        document.body
    )
}
