import { useState, useEffect } from 'react'
import { X, Palette, Users, FolderOpen } from 'lucide-react'
import { DueDatePicker } from '../tasks/components/DueDatePicker'
import { useSession } from '@/lib/auth'
import { usePanelStore } from '@/lib/panelStore'
import { apiFetch, apiFetchJson } from '@/lib/api'

interface Team {
    id: string
    name: string
    color?: string
}

interface IndustryTemplate {
    id: string
    slug: string
    name: string
    nameEn?: string
    icon?: string
    description?: string
}

interface CreateProjectPanelProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    workspaceId?: string
}

const PROJECT_COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#EAB308', // Yellow
    '#84CC16', // Lime
    '#22C55E', // Green
    '#10B981', // Emerald
    '#14B8A6', // Teal
    '#06B6D4', // Cyan
    '#0EA5E9', // Sky
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#A855F7', // Purple
    '#D946EF', // Fuchsia
    '#EC4899', // Pink
    '#F43F5E', // Rose
    '#64748B', // Slate
]

export function CreateProjectPanel({ isOpen, onClose, onSuccess, workspaceId }: CreateProjectPanelProps) {
    const { data: session } = useSession()
    const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [color, setColor] = useState(PROJECT_COLORS[0])
    const [teamId, setTeamId] = useState<string>('')
    const [industryTemplateId, setIndustryTemplateId] = useState<string>('')
    const [startDate, setStartDate] = useState('')
    const [deadline, setDeadline] = useState('')
    const [teams, setTeams] = useState<Team[]>([])
    const [templates, setTemplates] = useState<IndustryTemplate[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Sync global panel state
    useEffect(() => {
        setIsPanelOpen(isOpen)
        return () => setIsPanelOpen(false)
    }, [isOpen, setIsPanelOpen])

    // Fetch teams and templates
    useEffect(() => {
        if (isOpen) {
            // Fetch teams (need workspaceId)
            const teamsUrl = workspaceId ? `/api/teams?workspaceId=${workspaceId}` : '/api/teams'
            apiFetchJson<any>(teamsUrl, {
                headers: { 'x-user-id': session?.user?.id || '' }
            })
                .then((data) => {
                    // API returns { data: [...] }
                    if (data.data && Array.isArray(data.data)) {
                        setTeams(data.data)
                        if (data.data.length > 0 && !teamId) {
                            setTeamId(data.data[0].id)
                        }
                    }
                })
                .catch(console.error)

            // Fetch industry templates
            apiFetchJson<any>('/api/industry-templates', {
                headers: { 'x-user-id': session?.user?.id || '' }
            })
                .then((data) => {
                    if (data.success && data.data) {
                        setTemplates(data.data)
                    }
                })
                .catch(console.error)

            // Fetch workspace to get default industry template
            if (workspaceId) {
                apiFetchJson<any>(`/api/workspaces/${workspaceId}`)
                    .then((workspace) => {
                        if (workspace?.defaultIndustryTemplateId) {
                            setIndustryTemplateId(workspace.defaultIndustryTemplateId)
                        }
                    })
                    .catch(console.error)
            }
        }
    }, [isOpen, workspaceId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !teamId) return

        setLoading(true)
        setError(null)

        try {
            const response = await apiFetch('/api/projects', {
                method: 'POST',
                headers: {
                    'x-user-id': session?.user?.id || ''
                },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || null,
                    color,
                    teamId,
                    workspaceId, // Add workspaceId for permission check
                    industryTemplateId: industryTemplateId || null,
                    startDate: startDate || null,
                    deadline: deadline || null,
                }),
            })

            const result = await response.json()

            if (result.success) {
                setName('')
                setDescription('')
                setColor(PROJECT_COLORS[0])
                setStartDate('')
                setDeadline('')
                onSuccess?.()
                onClose()
            } else {
                setError(result.error || 'Failed to create project')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed top-4 right-4 bottom-4 w-full max-w-md bg-[#12121a] rounded-2xl shadow-2xl z-50 flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <FolderOpen className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Create New Project</h2>
                            <p className="text-sm text-gray-500">Add a new project to organize your tasks</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Project Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Project Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Website Redesign"
                            className="w-full px-4 py-3 rounded-xl bg-[#1a1a24] border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of the project..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-[#1a1a24] border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all resize-none"
                        />
                    </div>

                    {/* Team Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            <Users size={14} className="inline mr-2" />
                            Team <span className="text-red-400">*</span>
                        </label>
                        <select
                            value={teamId}
                            onChange={(e) => setTeamId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-[#1a1a24] border border-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                            required
                        >
                            <option value="">Select a team</option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                        {teams.length === 0 && (
                            <p className="text-xs text-gray-500 mt-2">
                                No teams available. Create a team first.
                            </p>
                        )}
                    </div>

                    {/* Industry Template */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            🏢 Industry Template
                        </label>
                        <select
                            value={industryTemplateId}
                            onChange={(e) => setIndustryTemplateId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-[#1a1a24] border border-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                        >
                            <option value="">No template (custom stages)</option>
                            {templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                    {template.icon} {template.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                            Templates provide predefined stages for your workflow
                        </p>
                    </div>

                    {/* Project Color */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            <Palette size={14} className="inline mr-2" />
                            Project Color
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {PROJECT_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-lg transition-all ${color === c
                                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#12121a] scale-110'
                                        : 'hover:scale-110'
                                        }`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Start Date
                            </label>
                            <DueDatePicker
                                value={startDate}
                                onChange={(date) => setStartDate(date || '')}
                                placeholder="Select start date"
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Deadline
                            </label>
                            <DueDatePicker
                                value={deadline}
                                onChange={(date) => setDeadline(date || '')}
                                placeholder="Select deadline"
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-700 text-gray-300 font-medium hover:bg-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={loading || !name.trim() || !teamId}
                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
                    >
                        {loading ? 'Creating...' : 'Create Project'}
                    </button>
                </div>
            </div>
        </>
    )
}
