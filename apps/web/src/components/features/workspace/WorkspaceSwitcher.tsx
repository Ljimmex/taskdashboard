import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { CreateWorkspacePanel } from './CreateWorkspacePanel'
import { apiFetchJson } from '@/lib/api'

interface Workspace {
  id: string
  name: string
  slug: string
  logo?: string
  subscriptionPlan?: 'free' | 'plus' | 'pro' | 'enterprise'
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
      if (Array.isArray(json?.data)) {
        setWorkspaces(json.data)
      } else {
        console.error('Unexpected workspaces response', json)
        setWorkspaces([])
      }
    } catch (error) {
      console.error('Failed to load workspaces', error)
      setWorkspaces([])
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

  const currentWorkspace = workspaces.find((w) => w.slug === workspaceSlug) || workspaces[0]

  if (!currentWorkspace) return null

  return (
    <div className="px-3 pb-6" ref={containerRef}>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-input)] p-2 transition-colors hover:bg-[var(--app-bg-elevated)]"
        >
          <div
            className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg text-sm font-bold text-black ${currentWorkspace.logo ? '' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}
          >
            {currentWorkspace.logo ? (
              <img
                src={currentWorkspace.logo}
                alt={currentWorkspace.name}
                className="h-full w-full object-cover"
              />
            ) : (
              currentWorkspace.name.substring(0, 2).toUpperCase()
            )}
          </div>

          <div className="flex-1 overflow-hidden text-left">
            <h4 className="truncate text-sm font-medium text-[var(--app-text-primary)]">
              {currentWorkspace.name}
            </h4>
            <span className="block text-[10px] capitalize text-[var(--app-text-muted)]">
              {currentWorkspace.subscriptionPlan ?? 'Free'} Plan
            </span>
          </div>

          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-[var(--app-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute bottom-full left-0 z-50 mb-2 w-full overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-xl">
            <div className="space-y-1 p-2">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    navigate({ to: `/${ws.slug}/` })
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg p-2 transition-colors ${
                    ws.slug === workspaceSlug
                      ? 'bg-[var(--app-accent)]/10'
                      : 'hover:bg-[var(--app-bg-elevated)]'
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded text-[10px] font-bold ${ws.logo ? '' : 'bg-[var(--app-bg-sidebar)]'} ${ws.slug === workspaceSlug && !ws.logo ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-muted)]'}`}
                  >
                    {ws.logo ? (
                      <img src={ws.logo} alt={ws.name} className="h-full w-full object-cover" />
                    ) : (
                      ws.name.substring(0, 1).toUpperCase()
                    )}
                  </div>
                  <span
                    className={`truncate text-sm ${ws.slug === workspaceSlug ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-secondary)]'}`}
                  >
                    {ws.name}
                  </span>
                  {ws.slug === workspaceSlug && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--app-accent)]" />
                  )}
                </button>
              ))}

              <div className="my-1 h-px bg-[var(--app-border)]" />

              <button
                onClick={() => {
                  setIsOpen(false)
                  setIsCreatePanelOpen(true)
                }}
                className="flex w-full items-center gap-2 rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded border border-dashed border-[var(--app-border)] text-xs">
                  +
                </span>
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
