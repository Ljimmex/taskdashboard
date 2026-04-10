import { useState, useRef, useEffect } from 'react'
import { ChevronDoubleRightIcon } from '../tasks/components/TaskIcons'
import { usePanelStore } from '../../../lib/panelStore'
import { useTranslation } from 'react-i18next'

interface TeamMemberInvite {
    id: string
    email: string
    name: string
    role: 'team_lead' | 'senior' | 'mid' | 'junior' | 'intern' | 'member'
    avatar?: string
}

interface CreateTeamPanelProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (team: { name: string; description?: string; color: string; members: TeamMemberInvite[] }) => void
}

const TEAM_COLORS = [
    { id: 'red', value: '#EF4444', name: 'Red' },
    { id: 'orange', value: '#F97316', name: 'Orange' },
    { id: 'amber', value: '#F59E0B', name: 'Amber' },
    { id: 'yellow', value: '#EAB308', name: 'Yellow' },
    { id: 'lime', value: '#84CC16', name: 'Lime' },
    { id: 'green', value: '#22C55E', name: 'Green' },
    { id: 'emerald', value: '#10B981', name: 'Emerald' },
    { id: 'teal', value: '#14B8A6', name: 'Teal' },
    { id: 'cyan', value: '#06B6D4', name: 'Cyan' },
    { id: 'sky', value: '#0EA5E9', name: 'Sky' },
    { id: 'blue', value: '#3B82F6', name: 'Blue' },
    { id: 'indigo', value: '#6366F1', name: 'Indigo' },
    { id: 'violet', value: '#8B5CF6', name: 'Violet' },
    { id: 'purple', value: '#A855F7', name: 'Purple' },
    { id: 'fuchsia', value: '#D946EF', name: 'Fuchsia' },
    { id: 'pink', value: '#EC4899', name: 'Pink' },
    { id: 'rose', value: '#F43F5E', name: 'Rose' },
    { id: 'slate', value: '#64748B', name: 'Slate' },
]

// Mock users to search
const KNOWN_USERS = [
    { id: '1', name: 'Yauhen Rymaszewski', email: 'yauhen@example.com', role: 'Lead designer' },
    { id: '2', name: 'Hank Williams', email: 'hank@example.com', role: 'Illustrator' },
    { id: '3', name: 'Raul Dikenson', email: 'rauldikenson@gmail.com', role: 'UX Designer' },
    { id: '4', name: 'Sarah Connor', email: 'sarah@example.com', role: 'Product Manager' },
]

export function CreateTeamPanel({ isOpen, onClose, onCreate }: CreateTeamPanelProps) {
    const { t } = useTranslation()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[10].value) // Default Blue
    const [members, setMembers] = useState<TeamMemberInvite[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [showMemberResults, setShowMemberResults] = useState(false)
    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null)

    const nameInputRef = useRef<HTMLInputElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)

    // Sync isOpen with global panel store
    useEffect(() => {
        setIsPanelOpen(isOpen)
    }, [isOpen, setIsPanelOpen])

    // Autofocus
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => nameInputRef.current?.focus(), 300)
        }
    }, [isOpen])

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            return () => document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

    const handleCreate = () => {
        if (!name.trim()) return
        onCreate({
            name: name.trim(),
            description: description.trim(),
            color: selectedColor,
            members
        })
        resetForm()
        onClose()
    }

    const resetForm = () => {
        setName('')
        setDescription('')
        setSelectedColor(TEAM_COLORS[10].value)
        setMembers([])
        setSearchQuery('')
        setActiveDropdownId(null)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            handleCreate()
        }
    }

    const addMember = (user: typeof KNOWN_USERS[0]) => {
        if (!members.find(m => m.id === user.id)) {
            setMembers([...members, {
                id: user.id,
                name: user.name,
                email: user.email,
                role: 'mid'
            }])
        }
        setSearchQuery('')
        setShowMemberResults(false)
    }

    const removeMember = (id: string) => {
        setMembers(members.filter(m => m.id !== id))
    }

    const updateMemberRole = (id: string, role: TeamMemberInvite['role']) => {
        setMembers(members.map(m => m.id === id ? { ...m, role } : m))
    }

    // Filtered search results
    const filteredUsers = KNOWN_USERS.filter(u =>
        !members.find(m => m.id === u.id) &&
        (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                onKeyDown={handleKeyDown}
                className={`fixed inset-0 sm:inset-auto sm:top-4 sm:right-4 sm:bottom-4 w-full sm:w-[448px] max-w-none sm:max-w-md bg-[var(--app-bg-deepest)] rounded-none sm:rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full sm:translate-x-[calc(100%+2rem)]'}`}
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-[var(--app-border)]">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-input)] transition-colors"
                            title="Close"
                        >
                            <ChevronDoubleRightIcon />
                        </button>
                        <h2 className="text-lg font-semibold text-[var(--app-text-primary)]">{t('teams.create_panel.title')}</h2>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Team Name */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-2">{t('teams.create_panel.team_name')}</label>
                        <input
                            ref={nameInputRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('teams.create_panel.team_name_placeholder')}
                            className="w-full text-lg font-semibold text-[var(--app-text-primary)] bg-[var(--app-bg-sidebar)] placeholder-gray-500 outline-none px-4 py-3 rounded-none sm:rounded-xl border border-transparent focus:border-amber-500/50 transition-colors"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-2">{t('teams.create_panel.description')}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('teams.create_panel.description_placeholder')}
                            rows={3}
                            className="w-full text-sm text-[var(--app-text-secondary)] bg-[var(--app-bg-sidebar)] rounded-none sm:rounded-xl p-4 placeholder-gray-500 outline-none resize-none border border-transparent focus:border-amber-500/50 transition-colors"
                        />
                    </div>

                    {/* Color Picker */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-3">{t('teams.create_panel.team_color')}</label>
                        <div className="grid grid-cols-6 gap-2">
                            {TEAM_COLORS.map(color => (
                                <button
                                    key={color.id}
                                    onClick={() => setSelectedColor(color.value)}
                                    className={`h-8 rounded-lg flex items-center justify-center transition-all ${selectedColor === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#12121a] scale-110' : 'hover:opacity-80'}`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                >
                                    {selectedColor === color.value && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--app-text-primary)" strokeWidth="3">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Add Members */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-2">{t('teams.create_panel.members')}</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    setShowMemberResults(true)
                                }}
                                onFocus={() => setShowMemberResults(true)}
                                placeholder={t('teams.create_panel.search_placeholder')}
                                className="w-full text-sm text-[var(--app-text-primary)] bg-[var(--app-bg-sidebar)] placeholder-gray-500 outline-none px-4 py-3 rounded-none sm:rounded-xl border border-[var(--app-border)] focus:border-amber-500/50 transition-colors"
                            />
                            {showMemberResults && searchQuery && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--app-bg-sidebar)] border border-[var(--app-border)] rounded-none sm:rounded-xl shadow-xl overflow-hidden z-20 max-h-48 overflow-y-auto">
                                    {filteredUsers.length > 0 ? (
                                        filteredUsers.map(user => (
                                            <button
                                                key={user.id}
                                                onClick={() => addMember(user)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--app-bg-input)]/50 transition-colors text-left"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-[var(--app-text-primary)]">{user.name}</div>
                                                    <div className="text-xs text-[var(--app-text-muted)]">{user.email}</div>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-[var(--app-text-muted)] text-center">{t('teams.create_panel.no_users_found')}</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Selected Members List */}
                        {members.length > 0 && (
                            <div className="mt-4 space-y-3">
                                {members.map(member => (
                                    <div key={member.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center overflow-hidden">
                                                {member.avatar ? (
                                                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-sm font-bold text-[var(--app-text-primary)]">{member.name.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-[var(--app-text-primary)]">{member.name}</div>
                                                <div className="text-xs text-[var(--app-text-muted)]">{member.email}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <button
                                                    onClick={() => setActiveDropdownId(activeDropdownId === member.id ? null : member.id)}
                                                    className="flex items-center gap-1 text-sm text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-colors font-medium outline-none"
                                                >
                                                    <span className="capitalize">{member.role.replace('_', ' ')}</span>
                                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" className={`transition-transform ${activeDropdownId === member.id ? 'rotate-180' : ''}`}>
                                                        <path d="M1 1L5 5L9 1" />
                                                    </svg>
                                                </button>

                                                {/* Custom Dropdown */}
                                                {activeDropdownId === member.id && (
                                                    <div className="absolute right-0 top-full mt-2 w-32 bg-[var(--app-bg-sidebar)] border border-[var(--app-border)] rounded-none sm:rounded-xl shadow-xl overflow-hidden z-30 py-1">
                                                        {['team_lead', 'senior', 'mid', 'junior', 'intern', 'member'].map((role) => (
                                                            <button
                                                                key={role}
                                                                onClick={() => {
                                                                    updateMemberRole(member.id, role as any)
                                                                    setActiveDropdownId(null)
                                                                }}
                                                                className={`w-full text-left px-3 py-2 text-sm transition-colors capitalize hover:bg-[var(--app-bg-input)] ${member.role === role ? 'text-amber-400 bg-amber-500/10' : 'text-[var(--app-text-secondary)]'}`}
                                                            >
                                                                {role.replace('_', ' ')}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Click outside handler */}
                                                {activeDropdownId === member.id && (
                                                    <div
                                                        className="fixed inset-0 z-20"
                                                        onClick={() => setActiveDropdownId(null)}
                                                    />
                                                )}
                                            </div>
                                            <button
                                                onClick={() => removeMember(member.id)}
                                                className="text-[var(--app-text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M18 6L6 18M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex-none p-6 bg-[var(--app-bg-deepest)] rounded-b-2xl">
                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-colors"
                        >
                            {t('teams.create_panel.cancel')}
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={!name.trim()}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${name.trim()
                                ? 'bg-[var(--app-accent)] hover:brightness-110 text-white'
                                : 'bg-[var(--app-bg-input)] text-[var(--app-text-muted)] cursor-not-allowed'
                                }`}
                        >
                            {t('teams.create_panel.create_button')}
                            <span className="text-xs opacity-75">⌘↵</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
