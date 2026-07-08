import { useState, useRef, useEffect } from 'react'
import { Label, LabelBadge } from './LabelBadge'
import { useTranslation } from 'react-i18next'

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

export const LabelPicker = ({
  selectedLabels,
  availableLabels,
  onSelect,
  onCreateNew,
}: LabelPickerProps) => {
  const { t } = useTranslation()
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

  const filteredLabels = availableLabels.filter((label) =>
    label.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleToggleLabel = (label: Label) => {
    const isSelected = selectedLabels.some((l) => l.id === label.id)
    if (isSelected) {
      onSelect(selectedLabels.filter((l) => l.id !== label.id))
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg bg-transparent px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-800/50"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
        {selectedLabels.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1">
            {selectedLabels.slice(0, 3).map((label) => (
              <LabelBadge key={label.id} label={label} size="sm" />
            ))}
            {selectedLabels.length > 3 && (
              <span className="text-xs text-gray-500">+{selectedLabels.length - 3}</span>
            )}
          </div>
        ) : (
          t('tasks.labels.add_labels')
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-gray-800 bg-[#1a1a24] shadow-2xl">
          {!isCreating ? (
            <>
              {/* Search */}
              <div className="border-b border-gray-800 p-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('tasks.labels.search')}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-500/50"
                  autoFocus
                />
              </div>

              {/* Labels List */}
              <div className="max-h-64 overflow-y-auto p-2">
                {filteredLabels.length > 0 ? (
                  filteredLabels.map((label) => {
                    const isSelected = selectedLabels.some((l) => l.id === label.id)
                    return (
                      <button
                        key={label.id}
                        onClick={() => handleToggleLabel(label)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-800"
                      >
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded border-2 ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-gray-600'}`}
                        >
                          {isSelected && (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="black"
                              strokeWidth="3"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <LabelBadge label={label} size="sm" />
                      </button>
                    )
                  })
                ) : (
                  <div className="py-6 text-center text-sm text-gray-500">
                    {t('tasks.labels.no_results')}
                  </div>
                )}
              </div>

              {/* Create New Button */}
              {onCreateNew && (
                <div className="border-t border-gray-800 p-2">
                  <button
                    onClick={() => setIsCreating(true)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-400 transition-colors hover:bg-gray-800"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {t('tasks.labels.create_new')}
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Create Form */
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  {t('tasks.labels.create_header')}
                </h3>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-gray-500 transition-colors hover:text-white"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Name Input */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                  {t('tasks.labels.name')}
                </label>
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateLabel()}
                  placeholder={t('tasks.labels.placeholder')}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-500/50"
                  autoFocus
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-gray-500">
                  {t('tasks.labels.color')}
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewLabelColor(color)}
                      className={`h-7 w-7 rounded-md transition-all ${newLabelColor === color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#1a1a24]' : 'hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-gray-500">
                  {t('tasks.labels.preview')}
                </label>
                <LabelBadge
                  label={{
                    id: 'preview',
                    name: newLabelName || t('tasks.labels.name'),
                    color: newLabelColor,
                  }}
                  size="md"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCreateLabel}
                  disabled={!newLabelName.trim()}
                  className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('tasks.labels.add')}
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700"
                >
                  {t('tasks.labels.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
