import { useState } from 'react'
import { Label, LabelBadge } from './LabelBadge'

interface LabelManagerProps {
  labels: Label[]
  onCreateLabel: (name: string, color: string) => Promise<void>
  onUpdateLabel: (id: string, name: string, color: string) => Promise<void>
  onDeleteLabel: (id: string) => Promise<void>
  getTaskCount?: (labelId: string) => number
}

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
]

export const LabelManager = ({
  labels,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
  getTaskCount,
}: LabelManagerProps) => {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState(PRESET_COLORS[0])

  const handleCreate = async () => {
    if (!formName.trim()) return
    await onCreateLabel(formName.trim(), formColor)
    setFormName('')
    setFormColor(PRESET_COLORS[0])
    setIsCreating(false)
  }

  const handleStartEdit = (label: Label) => {
    setEditingId(label.id)
    setFormName(label.name)
    setFormColor(label.color)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !formName.trim()) return
    await onUpdateLabel(editingId, formName.trim(), formColor)
    setEditingId(null)
    setFormName('')
    setFormColor(PRESET_COLORS[0])
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setFormName('')
    setFormColor(PRESET_COLORS[0])
  }

  const handleDelete = async (id: string) => {
    await onDeleteLabel(id)
    setDeleteConfirmId(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Manage Labels</h2>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400"
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
          New Label
        </button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="space-y-4 rounded-xl border border-gray-700 bg-gray-800/50 p-4">
          <h3 className="text-sm font-semibold text-white">Create New Label</h3>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g., Bug, Feature, Design"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-500/50"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-gray-500">Color</label>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setFormColor(color)}
                  className={`h-8 w-8 rounded-md transition-all ${formColor === color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-gray-800' : 'hover:scale-105'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-gray-500">Preview</label>
            <LabelBadge
              label={{ id: 'preview', name: formName || 'Label name', color: formColor }}
              size="md"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!formName.trim()}
              className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create Label
            </button>
            <button
              onClick={() => {
                setIsCreating(false)
                setFormName('')
                setFormColor(PRESET_COLORS[0])
              }}
              className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Labels List */}
      <div className="space-y-2">
        {labels.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-800 py-12 text-center">
            <svg
              className="mx-auto mb-3 h-12 w-12 text-gray-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <p className="text-sm text-gray-500">No labels yet</p>
            <p className="mt-1 text-xs text-gray-600">Create your first label to get started</p>
          </div>
        ) : (
          labels.map((label) => (
            <div
              key={label.id}
              className="rounded-xl border border-gray-800 bg-gray-800/30 p-4 transition-colors hover:border-gray-700"
            >
              {editingId === label.id ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase text-gray-500">
                      Color
                    </label>
                    <div className="grid grid-cols-8 gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setFormColor(color)}
                          className={`h-7 w-7 rounded-md transition-all ${formColor === color ? 'scale-110 ring-2 ring-white' : 'hover:scale-105'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={!formName.trim()}
                      className="flex-1 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : deleteConfirmId === label.id ? (
                /* Delete Confirmation */
                <div className="space-y-3">
                  <p className="text-sm text-white">
                    Delete label <span className="font-semibold">{label.name}</span>?
                    {getTaskCount && getTaskCount(label.id) > 0 && (
                      <span className="mt-1 block text-xs text-gray-400">
                        This label is used in {getTaskCount(label.id)} task(s)
                      </span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(label.id)}
                      className="flex-1 rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-400"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <LabelBadge label={label} size="md" />
                    {getTaskCount && (
                      <span className="text-xs text-gray-500">
                        {getTaskCount(label.id)} task{getTaskCount(label.id) !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEdit(label)}
                      className="p-2 text-gray-500 transition-colors hover:text-amber-400"
                      title="Edit"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(label.id)}
                      className="p-2 text-gray-500 transition-colors hover:text-red-400"
                      title="Delete"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
