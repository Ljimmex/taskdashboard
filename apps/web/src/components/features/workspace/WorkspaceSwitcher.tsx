import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { CreateWorkspacePanel } from './CreateWorkspacePanel'
import { apiFetchJson } from '@/lib/api'

interface Workspace {
    id: string
    name: string
    slug: string
    logo?: string
}

export function WorkspaceSwitcher() {
    const navigate = useNavigate()
    const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Fetch workspaces
    const fetchWorkspaces = useCallback(async () => {
        try {
            const json = await apiFetchJson<any>('/api/workspaces')
            setWorkspaces(json.data)
        } catch (error) {
            console.error('Failed to load workspaces', error)
        }
    }, [])

    useEffect(() => {
        fetchWorkspaces()
    }, [fetchWorkspaces])

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const currentWorkspace = workspaces.find(w => w.slug === workspaceSlug) || workspaces[0]

    if (!currentWorkspace) return null

    return (
        <div className="px-3 pb-6" ref={containerRef}>
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-3 w-full p-2 rounded-xl bg-[#1a1a24] hover:bg-[#252530] transition-colors border border-gray-800/50"
                >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-black font-bold text-sm overflow-hidden ${currentWorkspace.logo ? '' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}>
                        {currentWorkspace.logo ? (
                            <img src={currentWorkspace.logo} alt={currentWorkspace.name} className="w-full h-full object-cover" />
                        ) : (
                            currentWorkspace.name.substring(0, 2).toUpperCase()
                        )}
                    </div>

                    <div className="flex-1 text-left overflow-hidden">
                        <h4 className="text-sm font-medium text-white truncate">{currentWorkspace.name}</h4>
                        <span className="text-[10px] text-gray-500 block">Free Plan</span>
                    </div>

                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    >
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </button>

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute bottom-full left-0 w-full mb-2 bg-[#1a1a24] border border-gray-800 rounded-xl shadow-xl overflow-hidden z-50">
                        <div className="p-2 space-y-1">
                            {workspaces.map(ws => (
                                <button
                                    key={ws.id}
                                    onClick={() => {
                                        navigate({ to: `/${ws.slug}/` })
                                        setIsOpen(false)
                                    }}
                                    className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors ${ws.slug === workspaceSlug ? 'bg-amber-500/10' : 'hover:bg-gray-800'
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold overflow-hidden ${ws.logo ? '' : 'bg-gray-700'} ${ws.slug === workspaceSlug && !ws.logo ? 'text-amber-400' : 'text-gray-400'}`}>
                                        {ws.logo ? (
                                            <img src={ws.logo} alt={ws.name} className="w-full h-full object-cover" />
                                        ) : (
                                            ws.name.substring(0, 1).toUpperCase()
                                        )}
                                    </div>
                                    <span className={`text-sm truncate ${ws.slug === workspaceSlug ? 'text-amber-400' : 'text-gray-300'}`}>
                                        {ws.name}
                                    </span>
                                    {ws.slug === workspaceSlug && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    )}
                                </button>
                            ))}

                            <div className="h-px bg-gray-800 my-1" />

                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    setIsCreatePanelOpen(true)
                                }}
                                className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                            >
                                <span className="w-6 h-6 rounded border border-dashed border-gray-600 flex items-center justify-center text-xs">+</span>
                                <span className="text-sm">Create Workspace</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <CreateWorkspacePanel
                isOpen={isCreatePanelOpen}
                onClose={() => setIsCreatePanelOpen(false)}
                onWorkspaceCreated={() => {
                    fetchWorkspaces()
                    setIsOpen(false)
                }}
            />
        </div>
    )
}
