import { createPortal } from 'react-dom'
import { useState, useEffect, useRef } from 'react'
import { usePanelStore } from '../../../lib/panelStore'
import { ChevronDoubleRightIcon } from '../tasks/TaskIcons'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CreateWorkspacePanelProps {
    isOpen: boolean
    onClose: () => void
    onWorkspaceCreated?: () => void
}

export function CreateWorkspacePanel({ isOpen, onClose, onWorkspaceCreated }: CreateWorkspacePanelProps) {
    const navigate = useNavigate()
    const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)
    const panelRef = useRef<HTMLDivElement>(null)

    // Form Data
    const [workspaceName, setWorkspaceName] = useState('')
    const [teamSize, setTeamSize] = useState('1-10')
    const [industry, setIndustry] = useState('Technology')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Sync global panel state
    useEffect(() => {
        setIsPanelOpen(isOpen)
    }, [isOpen, setIsPanelOpen])

    // Close on Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            return () => document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

    const generateSlug = (name: string) => {
        return name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'workspace'
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const slug = generateSlug(workspaceName) + '-' + Math.random().toString(36).substring(2, 6)

            const wsResponse = await fetch('/api/workspaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: workspaceName,
                    slug: slug,
                    teamSize: teamSize,
                    industry: industry
                })
            })

            if (!wsResponse.ok) {
                const errorText = await wsResponse.text()
                throw new Error(`Failed to create workspace: ${errorText}`)
            }

            // Success
            setWorkspaceName('')
            setTeamSize('1-10')
            setIndustry('Technology')
            onClose()

            if (onWorkspaceCreated) {
                onWorkspaceCreated()
            }

            // Navigate to new workspace
            navigate({ to: `/${slug}` })

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Error creating workspace')
        } finally {
            setLoading(false)
        }
    }

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={`fixed top-4 right-4 bottom-4 w-full max-w-md bg-[#12121a] rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'}`}
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-gray-800">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            <ChevronDoubleRightIcon />
                        </button>
                        <div>
                            <h2 className="text-lg font-semibold text-white">New Workspace</h2>
                            <p className="text-xs text-gray-500">Create a new space for your team</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                    {error && (
                        <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="workspaceName" className="text-gray-400 text-sm">Workspace Name</Label>
                            <Input
                                id="workspaceName"
                                type="text"
                                value={workspaceName}
                                onChange={(e) => setWorkspaceName(e.target.value)}
                                className="border-gray-800 bg-[#1a1a24] text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded-xl py-5"
                                placeholder="My Company"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="teamSize" className="text-gray-400 text-sm">Team Size</Label>
                            <div className="relative">
                                <select
                                    id="teamSize"
                                    value={teamSize}
                                    onChange={(e) => setTeamSize(e.target.value)}
                                    className="w-full bg-[#1a1a24] border border-gray-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-colors appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="1-10">1-10 people</option>
                                    <option value="11-50">11-50 people</option>
                                    <option value="51-200">51-200 people</option>
                                    <option value="200+">200+ people</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M1 1L5 5L9 1" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="industry" className="text-gray-400 text-sm">Industry</Label>
                            <div className="relative">
                                <select
                                    id="industry"
                                    value={industry}
                                    onChange={(e) => setIndustry(e.target.value)}
                                    className="w-full bg-[#1a1a24] border border-gray-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-colors appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="Technology">Technology / IT</option>
                                    <option value="Marketing">Marketing / Agency</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Education">Education</option>
                                    <option value="Health">Health</option>
                                    <option value="E-commerce">E-commerce</option>
                                    <option value="Other">Other</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M1 1L5 5L9 1" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex-none p-6 bg-[#0f0f14] rounded-b-2xl border-t border-gray-800">
                    <div className="flex items-center justify-end gap-3">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="ghost"
                            className="text-gray-400 hover:text-white hover:bg-gray-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-amber-500 hover:bg-amber-400 text-black font-medium min-w-[100px]"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating
                                </div>
                            ) : (
                                'Create Workspace'
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    )
}
