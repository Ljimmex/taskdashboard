import { useState, useRef, useEffect } from 'react'
import { ChevronDoubleRightIcon } from '../tasks/components/TaskIcons'
import { usePanelStore } from '../../../lib/panelStore'
import { useTranslation } from 'react-i18next'

interface Team {
    id: string
    name: string
    description?: string | null
    color?: string | null
}

interface EditTeamPanelProps {
    isOpen: boolean
    onClose: () => void
    team: Team | null
    onSave: (id: string, updates: { name: string; description?: string; color: string }) => void
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

export function EditTeamPanel({ isOpen, onClose, team, onSave }: EditTeamPanelProps) {
    const { t } = useTranslation()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[10].value)

    const nameInputRef = useRef<HTMLInputElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)

    // Sync isOpen with global panel store
    useEffect(() => {
        setIsPanelOpen(isOpen)
    }, [isOpen, setIsPanelOpen])

    useEffect(() => {
        if (isOpen && team) {
            setName(team.name || '')
            setDescription(team.description || '')
            setSelectedColor(team.color || TEAM_COLORS[10].value)
            setTimeout(() => nameInputRef.current?.focus(), 300)
        }
    }, [isOpen, team])

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

    const handleSave = () => {
        if (!name.trim() || !team) return
        onSave(team.id, {
            name: name.trim(),
            description: description.trim(),
            color: selectedColor,
        })
        onClose()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            handleSave()
        }
    }

    if (!isOpen || !team) return null

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
                className={`fixed top-4 right-4 bottom-4 w-full max-w-md bg-[var(--app-bg-deepest)] rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'}`}
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
                        <h2 className="text-lg font-semibold text-[var(--app-text-primary)]">{t('teams.edit_panel.title')}</h2>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Team Name */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-2">{t('teams.edit_panel.team_name')}</label>
                        <input
                            ref={nameInputRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('teams.edit_panel.team_name_placeholder')}
                            className="w-full text-lg font-semibold text-[var(--app-text-primary)] bg-[var(--app-bg-sidebar)] placeholder-gray-500 outline-none px-4 py-3 rounded-xl border border-transparent focus:border-amber-500/50 transition-colors"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-2">{t('teams.edit_panel.description')}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('teams.edit_panel.description_placeholder')}
                            rows={3}
                            className="w-full text-sm text-[var(--app-text-secondary)] bg-[var(--app-bg-sidebar)] rounded-xl p-4 placeholder-gray-500 outline-none resize-none border border-transparent focus:border-amber-500/50 transition-colors"
                        />
                    </div>

                    {/* Color Picker */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-3">{t('teams.edit_panel.team_color')}</label>
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
                </div>

                {/* Footer */}
                <div className="flex-none p-6 bg-[var(--app-bg-deepest)] rounded-b-2xl">
                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-colors"
                        >
                            {t('teams.edit_panel.cancel')}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!name.trim() || name === team.name && description === (team.description || '') && selectedColor === team.color}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${name.trim() && (name !== team.name || description !== (team.description || '') || selectedColor !== team.color)
                                ? 'bg-[var(--app-accent)] hover:brightness-110 text-white'
                                : 'bg-[var(--app-bg-input)] text-[var(--app-text-muted)] cursor-not-allowed'
                                }`}
                        >
                            {t('teams.edit_panel.save_button')}
                            <span className="text-xs opacity-75">⌘↵</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
