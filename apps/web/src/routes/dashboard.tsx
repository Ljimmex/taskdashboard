import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { getSession, signOut } from '@/lib/auth'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/dashboard')({
    beforeLoad: async () => {
        const session = await getSession()

        if (!session?.data?.session) {
            throw redirect({ to: '/login' })
        }

        // Fetch user's workspaces
        // We can't use hooks here easily, so we might need a direct fetch 
        // or rely on a utility. For now, let's fetch from our API.
        // But beforeLoad runs on client too.

        try {
            // We can assume valid session means we can query API
            // But fetch requires absolute URL if server-side? 
            // TanStack router runs on client mostly for SPA.
            // However, let's just create a component that does this effect.
        } catch (e) {
            throw redirect({ to: '/login' })
        }
    },
    component: DashboardRedirector
})

function DashboardRedirector() {
    // Client-side redirector
    // Fetch workspaces and redirect to the first one
    return <DashboardRedirectLogic />
}

function DashboardRedirectLogic() {
    const navigate = useNavigate()
    const [noWorkspace, setNoWorkspace] = useState(false)

    useEffect(() => {
        let mounted = true

        async function resolveWorkspace() {
            try {
                const res = await fetch('/api/workspaces')
                if (!res.ok) throw new Error('Failed to fetch workspaces')
                const json = await res.json()
                const workspaces = json.data

                if (!mounted) return

                if (workspaces && workspaces.length > 0) {
                    // Redirect to the first workspace
                    navigate({ to: `/${workspaces[0].slug}/` })
                } else {
                    setNoWorkspace(true)
                }
            } catch (error) {
                console.error('Error resolving workspace:', error)
                if (mounted) setNoWorkspace(true)
            }
        }
        resolveWorkspace()

        return () => { mounted = false }
    }, [navigate])

    if (noWorkspace) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f] text-white">
                <div className="text-center space-y-4">
                    <h2 className="text-xl font-semibold">Nie znaleziono Workspace'a</h2>
                    <p className="text-gray-400">Wygląda na to, że nie masz dostępu do żadnego workspace'a.</p>
                    <div className="flex gap-4 justify-center">
                        <a href="/register" className="px-4 py-2 bg-amber-500 rounded text-black font-medium">Utwórz nowy</a>
                        <button onClick={async () => { await signOut(); window.location.href = '/' }} className="px-4 py-2 bg-gray-800 rounded text-gray-300">Wyloguj</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f] text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400">Ładowanie Twojego workspace'a...</p>
            </div>
        </div>
    )
}
