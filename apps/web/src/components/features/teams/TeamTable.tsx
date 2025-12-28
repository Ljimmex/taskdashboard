import { useState, useMemo } from 'react'
import { Team, TeamMember } from './types'
import { PencilIcon, PencilIconGold, TrashIcon, TrashRedIcon } from '../tasks/TaskIcons'

// Sort indicator icon helper
const SortIcon = ({ direction }: { direction: 'asc' | 'desc' | null }) => (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-gray-500">
        <path d="M6 2L9 5H3L6 2Z" fill={direction === 'asc' ? '#F2CE88' : 'currentColor'} />
        <path d="M6 10L3 7H9L6 10Z" fill={direction === 'desc' ? '#F2CE88' : 'currentColor'} />
    </svg>
)

const EyeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
)

const EyeIconGold = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#7A664E" />
        <circle cx="12" cy="12" r="3" stroke="#F2CE88" />
    </svg>
)

type SortColumn = 'name' | 'email' | 'role' | 'dateAdded' | 'lastActive'

export function TeamTable({ team, onInvite, onEditMember, onViewMember }: { team: Team; onInvite: (team: Team) => void; onEditMember: (member: TeamMember) => void; onViewMember: (member: TeamMember) => void }) {
    const [isExpanded, setIsExpanded] = useState(true)
    const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

    // Selection State
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }

    const getSortDirection = (column: SortColumn): 'asc' | 'desc' | null => {
        return sortColumn === column ? sortDirection : null
    }

    const sortedMembers = useMemo(() => {
        if (!sortColumn) return team.members

        return [...team.members].sort((a, b) => {
            let comparison = 0
            switch (sortColumn) {
                case 'name':
                    comparison = a.name.localeCompare(b.name)
                    break
                case 'email':
                    comparison = a.email.localeCompare(b.email)
                    break
                case 'role':
                    comparison = a.role.localeCompare(b.role)
                    break
                case 'dateAdded':
                    comparison = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime()
                    break
                case 'lastActive':
                    comparison = a.lastActive.localeCompare(b.lastActive)
                    break
            }
            return sortDirection === 'asc' ? comparison : -comparison
        })
    }, [team.members, sortColumn, sortDirection])

    // Selection Handlers
    const toggleSelectAll = () => {
        if (selectedMemberIds.size === team.members.length) {
            setSelectedMemberIds(new Set())
        } else {
            setSelectedMemberIds(new Set(team.members.map(m => m.id)))
        }
    }

    const toggleSelectMember = (id: string) => {
        const newSelected = new Set(selectedMemberIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedMemberIds(newSelected)
    }

    const isAllSelected = team.members.length > 0 && selectedMemberIds.size === team.members.length

    // Checkbox component (Interactive)
    const Checkbox = ({ checked, indeterminate, onClick }: { checked?: boolean; indeterminate?: boolean; onClick?: () => void }) => (
        <div
            onClick={(e) => { e.stopPropagation(); onClick?.() }}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${checked || indeterminate ? 'bg-amber-500 border-amber-500' : 'border-gray-600 bg-transparent hover:border-gray-500'}`}
        >
            {checked && !indeterminate && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            )}
            {indeterminate && (
                <div className="w-2 h-0.5 bg-black rounded-full" />
            )}
        </div>
    )

    return (
        <div className="mb-6 rounded-tl-xl rounded-bl-xl overflow-hidden flex relative">
            {/* Colored Left Bar */}
            <div className={`w-1.5 flex-shrink-0 rounded-l-md`} style={{ backgroundColor: team.color }}></div>

            {/* Main Content */}
            <div className="flex-1 bg-[#12121a] rounded-r-xl overflow-hidden relative">

                {/* Bulk Actions Toolbar Overlay */}
                {selectedMemberIds.size > 0 && (
                    <div className="absolute inset-x-0 top-0 z-10 h-[52px] bg-[#1a1a24] flex items-center justify-between px-4 border-b border-gray-800 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-4">
                            <Checkbox checked={true} onClick={toggleSelectAll} />
                            <span className="text-sm font-medium text-white">{selectedMemberIds.size} selected</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
                                <TrashIcon /> Delete
                            </button>
                            <button className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
                                <span className="text-gray-400">Move to...</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Header Row (Team Name) */}
                <div
                    className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-800/30 transition-colors ${selectedMemberIds.size > 0 ? 'opacity-0 pointer-events-none' : ''}`} // Hide when bulk actions visible
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <h3 className="text-sm font-semibold text-gray-300">{team.name}</h3>

                    <div className="flex items-center gap-4">
                        {team.members.length > 0 && isExpanded && (
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onInvite(team)
                                    }}
                                    className="hover:text-white transition-colors text-lg leading-none"
                                    title="Invite Members"
                                >
                                    +
                                </button>
                                <button className="hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}>•••</button>
                            </div>
                        )}
                        <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        >
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </div>
                </div>

                {/* Members List (Collapsible) */}
                {isExpanded && team.members.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#1a1a24]/50 text-xs text-gray-500 font-medium">
                                <tr>
                                    <th className="w-12 p-3 text-left">
                                        <div className="flex justify-center">
                                            <Checkbox
                                                checked={isAllSelected}
                                                // indeterminate={false} // User requested to not show indeterminate state here
                                                onClick={toggleSelectAll}
                                            />
                                        </div>
                                    </th>
                                    <th
                                        className="p-3 text-left cursor-pointer hover:text-white transition-colors"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center gap-2">Name <SortIcon direction={getSortDirection('name')} /></div>
                                    </th>
                                    <th
                                        className="p-3 text-left cursor-pointer hover:text-white transition-colors"
                                        onClick={() => handleSort('email')}
                                    >
                                        <div className="flex items-center gap-2">Email <SortIcon direction={getSortDirection('email')} /></div>
                                    </th>
                                    <th
                                        className="p-3 text-left cursor-pointer hover:text-white transition-colors"
                                        onClick={() => handleSort('role')}
                                    >
                                        <div className="flex items-center gap-2">Job Title <SortIcon direction={getSortDirection('role')} /></div>
                                    </th>
                                    <th className="p-3 text-left">Current Projects</th>
                                    <th
                                        className="p-3 text-left cursor-pointer hover:text-white transition-colors"
                                        onClick={() => handleSort('dateAdded')}
                                    >
                                        <div className="flex items-center gap-2">Date Added <SortIcon direction={getSortDirection('dateAdded')} /></div>
                                    </th>
                                    <th
                                        className="p-3 text-left cursor-pointer hover:text-white transition-colors"
                                        onClick={() => handleSort('lastActive')}
                                    >
                                        <div className="flex items-center gap-2">Last Active <SortIcon direction={getSortDirection('lastActive')} /></div>
                                    </th>
                                    <th className="w-24 p-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {sortedMembers.map((member: TeamMember) => {
                                    const isSelected = selectedMemberIds.has(member.id)
                                    return (
                                        <tr
                                            key={member.id}
                                            className={`group transition-colors ${isSelected ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-gray-800/30'}`}
                                            onClick={() => toggleSelectMember(member.id)}
                                        >
                                            <td className="p-3 relative">
                                                {/* Selection Line */}
                                                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500"></div>}
                                                <div className="flex justify-center">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onClick={() => toggleSelectMember(member.id)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                                                        {member.avatar ? (
                                                            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            member.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <span className={`text-sm font-medium ${isSelected ? 'text-amber-100' : 'text-gray-200'}`}>{member.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm text-gray-400">{member.email}</td>
                                            <td className="p-3 text-sm text-gray-300">{member.role}</td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {member.projects.map((proj: string, i: number) => (
                                                        <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                            {proj}
                                                        </span>
                                                    ))}
                                                    {member.projectCount > 0 && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                            +{member.projectCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm text-gray-400 font-medium">{member.dateAdded}</td>
                                            <td className="p-3 text-sm text-gray-400 font-medium">{member.lastActive}</td>
                                            <td className="p-3">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => onViewMember(member)}
                                                        className="p-1.5 text-gray-500 hover:bg-gray-800 rounded transition-all group/btn relative"
                                                        title="View Profile"
                                                    >
                                                        <div className="group-hover/btn:hidden"><EyeIcon /></div>
                                                        <div className="hidden group-hover/btn:block"><EyeIconGold /></div>
                                                    </button>
                                                    <button
                                                        onClick={() => onEditMember(member)}
                                                        className="p-1.5 text-gray-500 hover:bg-gray-800 rounded transition-all group/btn relative"
                                                        title="Edit Member"
                                                    >
                                                        <div className="group-hover/btn:hidden"><PencilIcon /></div>
                                                        <div className="hidden group-hover/btn:block"><PencilIconGold /></div>
                                                    </button>
                                                    <button
                                                        className="p-1.5 text-gray-500 hover:bg-gray-800 rounded transition-all group/btn relative"
                                                        title="Delete Member"
                                                    >
                                                        <div className="group-hover/btn:hidden"><TrashIcon /></div>
                                                        <div className="hidden group-hover/btn:block"><TrashRedIcon /></div>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {/* Empty State for Expanded but no members */}
                {isExpanded && team.members.length === 0 && (
                    <div className="p-8 flex flex-col items-center justify-center text-gray-500 text-sm">
                        <p>No members in this team yet.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
