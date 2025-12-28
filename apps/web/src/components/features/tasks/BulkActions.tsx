import { useState, useRef, useEffect } from 'react'
import { cn } from '../../../lib/utils'

interface BulkActionsProps {
    selectedCount: number
    columns?: { id: string; title: string; color?: string }[]
    assignees?: { id: string; name: string; avatar?: string }[]
    onDelete?: () => void
    onMove?: (columnId: string) => void
    onAssign?: (assigneeIds: string[]) => void
    onClearSelection?: () => void
}

export function BulkActions({
    selectedCount,
    columns = [],
    assignees = [],
    onDelete,
    onMove,
    onAssign,
    onClearSelection,
}: BulkActionsProps) {
    const [showMoveMenu, setShowMoveMenu] = useState(false)
    const [showAssignMenu, setShowAssignMenu] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])

    const moveMenuRef = useRef<HTMLDivElement>(null)
    const assignMenuRef = useRef<HTMLDivElement>(null)

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
                setShowMoveMenu(false)
            }
            if (assignMenuRef.current && !assignMenuRef.current.contains(e.target as Node)) {
                setShowAssignMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (selectedCount === 0) return null

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1a24] border border-gray-700 rounded-2xl shadow-2xl">
                {/* Selected Count */}
                <div className="flex items-center gap-2 pr-3 border-r border-gray-700">
                    <div className="w-6 h-6 rounded-lg bg-[#F2CE88] flex items-center justify-center">
                        <span className="text-xs font-bold text-black">{selectedCount}</span>
                    </div>
                    <span className="text-sm text-gray-300">zaznaczonych</span>
                </div>

                {/* Move Button */}
                <div className="relative" ref={moveMenuRef}>
                    <button
                        onClick={() => {
                            setShowMoveMenu(!showMoveMenu)
                            setShowAssignMenu(false)
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] rounded-lg transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 9L12 2L19 9" />
                            <path d="M12 2V22" />
                        </svg>
                        Przenieś
                    </button>

                    {showMoveMenu && (
                        <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#1a1a24] border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                            <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase border-b border-gray-800">
                                Przenieś do
                            </div>
                            {columns.map((col) => (
                                <button
                                    key={col.id}
                                    onClick={() => {
                                        onMove?.(col.id)
                                        setShowMoveMenu(false)
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: col.color || '#6366f1' }}
                                    />
                                    {col.title}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Assign Button */}
                <div className="relative" ref={assignMenuRef}>
                    <button
                        onClick={() => {
                            setShowAssignMenu(!showAssignMenu)
                            setShowMoveMenu(false)
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] rounded-lg transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M20 21C20 16.5817 16.4183 13 12 13C7.58172 13 4 16.5817 4 21" />
                        </svg>
                        Przypisz
                    </button>

                    {showAssignMenu && (
                        <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#1a1a24] border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                            <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase border-b border-gray-800">
                                Przypisz do
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                {assignees.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => {
                                            const newSelection = selectedAssignees.includes(user.id)
                                                ? selectedAssignees.filter(id => id !== user.id)
                                                : [...selectedAssignees, user.id]
                                            setSelectedAssignees(newSelection)
                                        }}
                                        className={cn(
                                            'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors',
                                            selectedAssignees.includes(user.id)
                                                ? 'bg-gray-800 text-[#F2CE88]'
                                                : 'text-gray-300 hover:bg-gray-800'
                                        )}
                                    >
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                                            {user.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        {user.name}
                                        {selectedAssignees.includes(user.id) && (
                                            <svg className="ml-auto w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                            {selectedAssignees.length > 0 && (
                                <div className="p-2 border-t border-gray-800">
                                    <button
                                        onClick={() => {
                                            onAssign?.(selectedAssignees)
                                            setShowAssignMenu(false)
                                            setSelectedAssignees([])
                                        }}
                                        className="w-full px-3 py-2 text-sm font-medium text-black bg-[#F2CE88] rounded-lg hover:bg-[#d4b476] transition-colors"
                                    >
                                        Przypisz ({selectedAssignees.length})
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Delete Button */}
                <div className="relative">
                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-red-400 rounded-lg transition-colors group"
                        >
                            {/* Trash Icon - grey default, red on hover */}
                            <svg width="16" height="16" viewBox="0 0 32 32" fill="none" className="group-hover:hidden">
                                <path d="M6 10V24C6 26.2091 7.79086 28 10 28H22C24.2091 28 26 26.2091 26 24V10H6Z" fill="#545454" />
                                <path d="M12 16V22" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
                                <path d="M20 16V22" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
                                <rect x="4" y="6" width="24" height="4" rx="2" fill="#9E9E9E" />
                                <rect x="13" y="4" width="6" height="2" rx="1" fill="#9E9E9E" />
                            </svg>
                            <svg width="16" height="16" viewBox="0 0 32 32" fill="none" className="hidden group-hover:block">
                                <path d="M6 10V24C6 26.2091 7.79086 28 10 28H22C24.2091 28 26 26.2091 26 24V10H6Z" fill="#7f1d1d" />
                                <path d="M12 16V22" stroke="#f87171" strokeWidth="3" strokeLinecap="round" />
                                <path d="M20 16V22" stroke="#f87171" strokeWidth="3" strokeLinecap="round" />
                                <rect x="4" y="6" width="24" height="4" rx="2" fill="#f87171" />
                                <rect x="13" y="4" width="6" height="2" rx="1" fill="#f87171" />
                            </svg>
                            Usuń
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-red-400">Usunąć {selectedCount}?</span>
                            <button
                                onClick={() => {
                                    onDelete?.()
                                    setShowDeleteConfirm(false)
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                            >
                                Tak
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
                            >
                                Nie
                            </button>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-gray-700" />

                {/* Clear Selection */}
                <button
                    onClick={onClearSelection}
                    className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
                    title="Wyczyść zaznaczenie"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
