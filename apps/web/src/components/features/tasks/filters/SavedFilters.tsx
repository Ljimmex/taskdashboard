import { useState, useRef, useEffect } from 'react'
import type { FilterState } from '../views/KanbanBoardHeader'

interface SavedFilter {
    id: string
    name: string
    filters: FilterState
    isDefault: boolean
    isShared: boolean
    isOwner: boolean
    user: {
        id: string
        name: string
        image?: string
    }
}

interface SavedFiltersProps {
    workspaceSlug: string
    userId?: string
    currentFilters: FilterState
    onApplyFilter: (filters: FilterState) => void
    onFiltersLoaded?: (defaultFilter: FilterState | null) => void
}

// Icon components
const BookmarkIcon = ({ active = false }: { active?: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
)

const StarIcon = ({ filled = false }: { filled?: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "#F2CE88" : "none"} stroke={filled ? "#F2CE88" : "currentColor"} strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
)

const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
)

const ShareIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
)

const PlusIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
)

export function SavedFilters({
    workspaceSlug,
    userId,
    currentFilters,
    onApplyFilter,
    onFiltersLoaded
}: SavedFiltersProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
    const [loading, setLoading] = useState(false)
    const [showSaveModal, setShowSaveModal] = useState(false)
    const [newFilterName, setNewFilterName] = useState('')
    const [saveAsShared, setSaveAsShared] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // Fetch saved filters
    const fetchFilters = async () => {
        if (!workspaceSlug) return
        setLoading(true)
        try {
            const res = await fetch(`/api/filters?workspaceSlug=${workspaceSlug}`, {
                credentials: 'include',
                headers: {
                    'x-user-id': userId || '',
                }
            })
            const data = await res.json()
            if (data.success) {
                setSavedFilters(data.data)
                // Apply default filter on load
                const defaultFilter = data.data.find((f: SavedFilter) => f.isDefault)
                if (defaultFilter && onFiltersLoaded) {
                    onFiltersLoaded(defaultFilter.filters)
                }
            }
        } catch (e) {
            console.error('Failed to fetch saved filters:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (userId) {
            fetchFilters()
        }
    }, [workspaceSlug, userId])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                setShowSaveModal(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const hasActiveFilters = () => {
        return currentFilters.assignedToMe ||
            currentFilters.overdue ||
            currentFilters.priorities.length > 0 ||
            currentFilters.statuses.length > 0 ||
            currentFilters.labels.length > 0 ||
            currentFilters.assigneeIds.length > 0 ||
            currentFilters.dueDateRange !== 'all'
    }

    const handleSaveFilter = async () => {
        if (!newFilterName.trim()) return

        try {
            const res = await fetch('/api/filters', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId || '',
                },
                body: JSON.stringify({
                    workspaceSlug,
                    name: newFilterName,
                    filters: currentFilters,
                    isShared: saveAsShared,
                })
            })
            const data = await res.json()
            if (data.success) {
                await fetchFilters()
                setNewFilterName('')
                setSaveAsShared(false)
                setShowSaveModal(false)
            }
        } catch (e) {
            console.error('Failed to save filter:', e)
        }
    }

    const handleSetDefault = async (id: string) => {
        try {
            await fetch(`/api/filters/${id}/default`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'x-user-id': userId || '',
                }
            })
            await fetchFilters()
        } catch (e) {
            console.error('Failed to set default filter:', e)
        }
    }

    const handleDeleteFilter = async (id: string) => {
        try {
            await fetch(`/api/filters/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'x-user-id': userId || '',
                }
            })
            await fetchFilters()
        } catch (e) {
            console.error('Failed to delete filter:', e)
        }
    }

    return (
        <div className="relative" ref={menuRef}>
            {/* Saved Filters Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${savedFilters.length > 0
                    ? 'bg-[#1a1a24] text-gray-400 hover:text-white'
                    : 'bg-[#1a1a24] text-gray-500 hover:text-gray-400'
                    }`}
            >
                <BookmarkIcon active={savedFilters.some(f => f.isDefault)} />
                <span className="hidden sm:inline">Presets</span>
                {savedFilters.length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-gray-700 text-[10px] flex items-center justify-center">
                        {savedFilters.length}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-12 z-40 w-72 bg-[#1a1a24] rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
                    {/* Header with Save button */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-800">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Zapisane filtry
                        </span>
                        {hasActiveFilters() && (
                            <button
                                onClick={() => setShowSaveModal(true)}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                            >
                                <PlusIcon />
                                Zapisz aktualny
                            </button>
                        )}
                    </div>

                    {/* Save Modal */}
                    {showSaveModal && (
                        <div className="p-3 border-b border-gray-800 bg-gray-900/50">
                            <input
                                type="text"
                                value={newFilterName}
                                onChange={(e) => setNewFilterName(e.target.value)}
                                placeholder="Nazwa filtra..."
                                className="w-full px-3 py-2 bg-[#12121a] text-white text-sm rounded-lg border border-gray-700 focus:border-amber-500 focus:outline-none mb-2"
                                autoFocus
                            />
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer group/check">
                                    <button
                                        type="button"
                                        onClick={() => setSaveAsShared(!saveAsShared)}
                                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${saveAsShared
                                            ? 'bg-amber-500 border-amber-500'
                                            : 'border-gray-600 hover:border-gray-500'
                                            }`}
                                    >
                                        {saveAsShared && (
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </button>
                                    <ShareIcon />
                                    Udostępnij zespołowi
                                </label>
                                <button
                                    onClick={handleSaveFilter}
                                    disabled={!newFilterName.trim()}
                                    className="px-3 py-1 text-xs bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Zapisz
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Filters List */}
                    <div className="max-h-60 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                Ładowanie...
                            </div>
                        ) : savedFilters.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                Brak zapisanych filtrów
                            </div>
                        ) : (
                            savedFilters.map(filter => (
                                <div
                                    key={filter.id}
                                    className="group flex items-center gap-2 px-3 py-2 hover:bg-gray-800 transition-colors"
                                >
                                    {/* Apply button */}
                                    <button
                                        onClick={() => {
                                            onApplyFilter(filter.filters)
                                            setIsOpen(false)
                                        }}
                                        className="flex-1 text-left text-sm text-gray-300 hover:text-white truncate"
                                    >
                                        {filter.name}
                                    </button>

                                    {/* Indicators */}
                                    {filter.isShared && (
                                        <span className="text-gray-500" title="Udostępniony">
                                            <ShareIcon />
                                        </span>
                                    )}

                                    {/* Actions */}
                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                        {filter.isOwner && (
                                            <>
                                                <button
                                                    onClick={() => handleSetDefault(filter.id)}
                                                    className="p-1 text-gray-500 hover:text-amber-400 transition-colors"
                                                    title={filter.isDefault ? 'Domyślny' : 'Ustaw jako domyślny'}
                                                >
                                                    <StarIcon filled={filter.isDefault} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteFilter(filter.id)}
                                                    className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                                    title="Usuń"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* Default indicator */}
                                    {filter.isDefault && (
                                        <span className="text-amber-400" title="Domyślny">
                                            <StarIcon filled />
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
