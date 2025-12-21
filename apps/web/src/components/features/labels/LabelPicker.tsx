import { useState, useRef, useEffect } from 'react'
import { Label, LabelBadge } from './LabelBadge'

interface LabelPickerProps {
    selectedLabels: Label[]
    availableLabels: Label[]
    onSelect: (labels: Label[]) => void
    onCreateNew?: (name: string, color: string) => Promise<Label | void>
}

const PRESET_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#eab308', // yellow
    '#84cc16', // lime
    '#22c55e', // green
    '#10b981', // emerald
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#0ea5e9', // sky
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#a855f7', // purple
    '#d946ef', // fuchsia
    '#ec4899', // pink
]

export const LabelPicker = ({ selectedLabels, availableLabels, onSelect, onCreateNew }: LabelPickerProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [newLabelName, setNewLabelName] = useState('')
    const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0])
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                setIsCreating(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const filteredLabels = availableLabels.filter(label =>
        label.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleToggleLabel = (label: Label) => {
        const isSelected = selectedLabels.some(l => l.id === label.id)
        if (isSelected) {
            onSelect(selectedLabels.filter(l => l.id !== label.id))
        } else {
            onSelect([...selectedLabels, label])
        }
    }

    const handleCreateLabel = async () => {
        if (!newLabelName.trim() || !onCreateNew) return

        const newLabel = await onCreateNew(newLabelName.trim(), newLabelColor)
        if (newLabel) {
            onSelect([...selectedLabels, newLabel])
        }

        setNewLabelName('')
        setNewLabelColor(PRESET_COLORS[0])
        setIsCreating(false)
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                {selectedLabels.length > 0 ? (
                    <div className="flex items-center gap-1 flex-wrap">
                        {selectedLabels.slice(0, 3).map(label => (
                            <LabelBadge key={label.id} label={label} size="sm" />
                        ))}
                        {selectedLabels.length > 3 && (
                            <span className="text-xs text-gray-500">+{selectedLabels.length - 3}</span>
                        )}
                    </div>
                ) : (
                    'Add labels'
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-[#1a1a24] border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {!isCreating ? (
                        <>
                            {/* Search */}
                            <div className="p-3 border-b border-gray-800">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search labels..."
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-500/50"
                                    autoFocus
                                />
                            </div>

                            {/* Labels List */}
                            <div className="max-h-64 overflow-y-auto p-2">
                                {filteredLabels.length > 0 ? (
                                    filteredLabels.map(label => {
                                        const isSelected = selectedLabels.some(l => l.id === label.id)
                                        return (
                                            <button
                                                key={label.id}
                                                onClick={() => handleToggleLabel(label)}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                                            >
                                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-gray-600'}`}>
                                                    {isSelected && (
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <LabelBadge label={label} size="sm" />
                                            </button>
                                        )
                                    })
                                ) : (
                                    <div className="text-center py-6 text-gray-500 text-sm">
                                        No labels found
                                    </div>
                                )}
                            </div>

                            {/* Create New Button */}
                            {onCreateNew && (
                                <div className="p-2 border-t border-gray-800">
                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-amber-400 text-sm transition-colors"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        Create new label
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Create Form */
                        <div className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-white">Create Label</h3>
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="text-gray-500 hover:text-white transition-colors"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Name Input */}
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Name</label>
                                <input
                                    type="text"
                                    value={newLabelName}
                                    onChange={(e) => setNewLabelName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateLabel()}
                                    placeholder="e.g., Bug, Feature, Design"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-500/50"
                                    autoFocus
                                />
                            </div>

                            {/* Color Picker */}
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Color</label>
                                <div className="grid grid-cols-8 gap-2">
                                    {PRESET_COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setNewLabelColor(color)}
                                            className={`w-7 h-7 rounded-md transition-all ${newLabelColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a24] scale-110' : 'hover:scale-105'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Preview */}
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Preview</label>
                                <LabelBadge label={{ id: 'preview', name: newLabelName || 'Label name', color: newLabelColor }} size="md" />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleCreateLabel}
                                    disabled={!newLabelName.trim()}
                                    className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium rounded-lg transition-colors text-sm"
                                >
                                    Create
                                </button>
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
