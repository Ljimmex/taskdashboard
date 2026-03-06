import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Team, TeamMember } from './types'
import { PencilIcon, PencilIconGold, TrashIcon, TrashRedIcon } from '../tasks/components/TaskIcons'
import { useTranslation } from 'react-i18next'

// Sort indicator icon helper
const SortIcon = ({ direction }: { direction: 'asc' | 'desc' | null }) => (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-[var(--app-text-muted)]">
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

// Team Menu Component (3-dot)
function TeamMenu({ team, onEditTeam, onDeleteTeam }: { team: Team; onEditTeam?: (team: Team) => void; onDeleteTeam?: (team: Team) => void }) {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
    const { t } = useTranslation()

    const handleOpen = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setDropdownPosition({
                top: rect.bottom + 4,
                left: rect.right,
                width: 176 // w-44 = 176px
            })
        }
        setIsOpen(!isOpen)
    }

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <>
            <button
                ref={buttonRef}
                onClick={handleOpen}
                className="hover:text-[var(--app-text-primary)] transition-colors p-1 rounded hover:bg-[var(--app-bg-elevated)] relative z-10"
            >
                •••
            </button>

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    className="fixed bg-[var(--app-bg-sidebar)] rounded-xl shadow-2xl z-[100] py-1 animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        top: dropdownPosition.top,
                        left: dropdownPosition.left - dropdownPosition.width,
                        width: dropdownPosition.width
                    }}
                >
                    <button
                        onClick={() => {
                            onEditTeam?.(team)
                            setIsOpen(false)
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-input)]/80 hover:text-[var(--app-text-primary)] transition-colors flex items-center gap-3"
                    >
                        <PencilIcon />
                        {t('team_edit.menu.edit_team')}
                    </button>
                    <button
                        onClick={() => {
                            // Export members as CSV
                            const csv = ['Name,Email,Role,Date Added'].concat(
                                team.members.map(m => `${m.name},${m.email},${m.role},${m.dateAdded}`)
                            ).join('\n')
                            const blob = new Blob([csv], { type: 'text/csv' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `${team.name}-members.csv`
                            a.click()
                            setIsOpen(false)
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-input)]/80 hover:text-[var(--app-text-primary)] transition-colors flex items-center gap-3"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                        </svg>
                        {t('team_edit.menu.export_members')}
                    </button>
                    <div className="my-1 mx-2 h-px bg-[var(--app-bg-input)]" />
                    <button
                        onClick={() => {
                            onDeleteTeam?.(team)
                            setIsOpen(false)
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                    >
                        <TrashIcon />
                        {t('team_edit.menu.delete_team')}
                    </button>
                </div>,
                document.body
            )}
        </>
    )
}

type SortColumn = 'name' | 'email' | 'role' | 'dateAdded' | 'lastActive'

interface TeamTableProps {
    team: Team
    userRole?: string | null
    onInvite: (team: Team) => void
    onEditMember: (member: TeamMember) => void
    onViewMember: (member: TeamMember) => void
    onEditTeam?: (team: Team) => void
    onDeleteTeam?: (team: Team) => void
    onDeleteMember?: (member: TeamMember) => void
}

export function TeamTable({ team, userRole, onInvite, onEditMember, onViewMember, onEditTeam, onDeleteTeam, onDeleteMember }: TeamTableProps) {
    const { t } = useTranslation()
    const [isExpanded, setIsExpanded] = useState(true)
    const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

    // Permission Check
    const canManage = useMemo(() => {
        if (!userRole) return false
        return ['owner', 'admin', 'hr_manager'].includes(userRole)
    }, [userRole])

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
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${checked || indeterminate ? 'bg-amber-500 border-amber-500' : 'border-[var(--app-border)] bg-transparent hover:border-[var(--app-border)]'}`}
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
            <div className="flex-1 bg-[var(--app-bg-card)] rounded-r-xl overflow-hidden relative">

                {/* Bulk Actions Toolbar Overlay */}
                {canManage && selectedMemberIds.size > 0 && (
                    <div className="absolute inset-x-0 top-0 z-10 h-[52px] bg-[var(--app-bg-sidebar)] flex items-center justify-between px-4 border-b border-[var(--app-border)] animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-4">
                            <Checkbox checked={true} onClick={toggleSelectAll} />
                            <span className="text-sm font-medium text-[var(--app-text-primary)]">{selectedMemberIds.size} {t('teams.table.selected')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="px-3 py-1.5 text-xs font-medium text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] bg-[var(--app-bg-input)] hover:bg-[var(--app-bg-elevated)] rounded-lg transition-colors flex items-center gap-2">
                                <TrashIcon /> {t('teams.table.delete')}
                            </button>
                            <button className="px-3 py-1.5 text-xs font-medium text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] bg-[var(--app-bg-input)] hover:bg-[var(--app-bg-elevated)] rounded-lg transition-colors flex items-center gap-2">
                                <span className="text-[var(--app-text-secondary)]">{t('teams.table.move_to')}</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Header Row (Team Name) */}
                <div
                    className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[var(--app-bg-elevated)]/50 transition-colors ${selectedMemberIds.size > 0 ? 'opacity-0 pointer-events-none' : ''}`}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <h3 className="text-sm font-semibold text-[var(--app-text-secondary)]">{team.name}</h3>

                    <div className="flex items-center gap-4">
                        {isExpanded && (
                            <div className="flex items-center gap-1 text-xs text-[var(--app-text-muted)]">
                                {/* Add Member */}
                                {canManage && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onInvite(team)
                                        }}
                                        className="p-1.5 hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] rounded transition-colors"
                                        title="Add Member"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 5v14M5 12h14" />
                                        </svg>
                                    </button>
                                )}
                                {/* Team Menu (3-dot) */}
                                <TeamMenu
                                    team={team}
                                    onEditTeam={onEditTeam}
                                    onDeleteTeam={onDeleteTeam}
                                />
                                {/* Expand/Fullscreen */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        // Toggle expanded view / fullscreen for this team
                                        setIsExpanded(!isExpanded)
                                    }}
                                    className="p-1.5 hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] rounded transition-colors"
                                    title={isExpanded ? "Collapse" : "Expand"}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            className={`text-[var(--app-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        >
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </div>
                </div>

                {/* Members List (Collapsible) */}
                {isExpanded && team.members.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--app-bg-elevated)]/80 text-xs text-[var(--app-text-muted)] font-medium">
                                <tr>
                                    {canManage && (
                                        <th className="w-12 p-3 text-left">
                                            <div className="flex justify-center">
                                                <Checkbox
                                                    checked={isAllSelected}
                                                    // indeterminate={false} // User requested to not show indeterminate state here
                                                    onClick={toggleSelectAll}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    <th
                                        className="p-3 text-left cursor-pointer hover:text-[var(--app-text-primary)] transition-colors"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center gap-2">{t('teams.table.name')} <SortIcon direction={getSortDirection('name')} /></div>
                                    </th>
                                    <th
                                        className="p-3 text-left cursor-pointer hover:text-[var(--app-text-primary)] transition-colors"
                                        onClick={() => handleSort('email')}
                                    >
                                        <div className="flex items-center gap-2">{t('teams.table.email')} <SortIcon direction={getSortDirection('email')} /></div>
                                    </th>
                                    <th
                                        className="p-3 text-left cursor-pointer hover:text-[var(--app-text-primary)] transition-colors"
                                        onClick={() => handleSort('role')}
                                    >
                                        <div className="flex items-center gap-2">{t('teams.table.job_title')} <SortIcon direction={getSortDirection('role')} /></div>
                                    </th>
                                    <th className="p-3 text-left">{t('teams.table.current_projects')}</th>
                                    <th
                                        className="p-3 text-left cursor-pointer hover:text-[var(--app-text-primary)] transition-colors"
                                        onClick={() => handleSort('dateAdded')}
                                    >
                                        <div className="flex items-center gap-2">{t('teams.table.date_added')} <SortIcon direction={getSortDirection('dateAdded')} /></div>
                                    </th>
                                    <th
                                        className="p-3 text-left cursor-pointer hover:text-[var(--app-text-primary)] transition-colors"
                                        onClick={() => handleSort('lastActive')}
                                    >
                                        <div className="flex items-center gap-2">{t('teams.table.last_active')} <SortIcon direction={getSortDirection('lastActive')} /></div>
                                    </th>
                                    <th className="w-24 p-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--app-border)]">
                                {sortedMembers.map((member: TeamMember) => {
                                    const isSelected = selectedMemberIds.has(member.id)
                                    return (
                                        <tr
                                            key={member.id}
                                            className={`group transition-colors ${isSelected ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-[var(--app-bg-elevated)]/50'}`}
                                            onClick={() => toggleSelectMember(member.id)}
                                        >
                                            {canManage && (
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
                                            )}
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[var(--app-text-primary)] overflow-hidden ${member.avatar ? 'bg-transparent' : 'bg-gradient-to-br from-gray-700 to-gray-600'}`}>
                                                        {member.avatar ? (
                                                            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            member.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <span className={`text-sm font-medium ${isSelected ? 'text-amber-100' : 'text-[var(--app-text-primary)]'}`}>{member.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm text-[var(--app-text-secondary)]">{member.email}</td>
                                            <td className="p-3 text-sm text-[var(--app-text-secondary)]">{member.role}</td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1.5">
                                                    {member.projects.slice(0, 2).map((proj: string, i: number) => (
                                                        <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium text-[var(--app-text-secondary)] bg-[var(--app-bg-input)] max-w-[120px]">
                                                            <span className="truncate">{proj}</span>
                                                        </span>
                                                    ))}
                                                    {member.projects.length > 2 && (
                                                        <div className="relative group/more">
                                                            <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-[var(--app-bg-input)] text-[var(--app-text-secondary)] cursor-default">
                                                                +{member.projects.length - 2}
                                                            </span>
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/more:block z-50">
                                                                <div className="bg-[var(--app-bg-sidebar)] border border-[var(--app-border)]/80 rounded-lg shadow-xl shadow-black/40 px-3 py-2 whitespace-nowrap">
                                                                    {member.projects.slice(2).map((proj: string, i: number) => (
                                                                        <div key={i} className="text-[11px] text-[var(--app-text-secondary)] py-0.5">{proj}</div>
                                                                    ))}
                                                                </div>
                                                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[var(--app-bg-sidebar)] border-r border-b border-[var(--app-border)]/80 transform rotate-45 -mt-1" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm text-[var(--app-text-secondary)] font-medium">{member.dateAdded}</td>
                                            <td className="p-3 text-sm text-[var(--app-text-secondary)] font-medium">{member.lastActive}</td>
                                            <td className="p-3">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => onViewMember(member)}
                                                        className="p-1.5 text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] rounded transition-all group/btn relative"
                                                        title={t('teams.table.actions.view_profile')}
                                                    >
                                                        <div className="group-hover/btn:hidden"><EyeIcon /></div>
                                                        <div className="hidden group-hover/btn:block"><EyeIconGold /></div>
                                                    </button>
                                                    {canManage && (
                                                        <>
                                                            <button
                                                                onClick={() => onEditMember(member)}
                                                                className="p-1.5 text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] rounded transition-all group/btn relative"
                                                                title={t('teams.table.actions.edit_member')}
                                                            >
                                                                <div className="group-hover/btn:hidden"><PencilIcon /></div>
                                                                <div className="hidden group-hover/btn:block"><PencilIconGold /></div>
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    if (confirm(t('teams.table.actions.confirm_remove', { name: member.name }))) {
                                                                        onDeleteMember?.(member)
                                                                    }
                                                                }}
                                                                className="p-1.5 text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] rounded transition-all group/btn relative"
                                                                title={t('teams.table.actions.remove_member')}
                                                            >
                                                                <div className="group-hover/btn:hidden"><TrashIcon /></div>
                                                                <div className="hidden group-hover/btn:block"><TrashRedIcon /></div>
                                                            </button>
                                                        </>
                                                    )}
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
                    <div className="p-8 flex flex-col items-center justify-center text-[var(--app-text-muted)] text-sm">
                        <p>{t('teams.table.empty_state')}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
