import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/invite/$inviteId')({
    component: InvitePage,
})

function InvitePage() {
    const { inviteId } = useParams({ from: '/invite/$inviteId' })
    const [isJoining, setIsJoining] = useState(false)
    const [joined, setJoined] = useState(false)

    // Mock data based on the ID (slug)
    const teamName = inviteId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Read query params for mock data
    const searchParams = new URLSearchParams(window.location.search)
    const inviterName = searchParams.get('inviter') || 'Team Admin'
    const inviterRole = searchParams.get('role') || 'Team Lead'
    const workspaceSlug = searchParams.get('workspace') || 'demo'

    const handleJoin = () => {
        setIsJoining(true)
        // Simulate API call
        setTimeout(() => {
            setIsJoining(false)
            setJoined(true)
        }, 1500)
    }

    if (joined) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[#12121a] border border-gray-800 rounded-2xl p-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">Welcome to {teamName}!</h1>
                        <p className="text-gray-400">You have successfully joined the team.</p>
                    </div>
                    <Link
                        to="/$workspaceSlug/team"
                        params={{ workspaceSlug: workspaceSlug }}
                        className="block w-full py-3 px-4 bg-[#0F4C75] hover:bg-[#0F4C75]/80 text-white font-medium rounded-xl transition-colors"
                    >
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#12121a] border border-gray-800 rounded-2xl p-8 space-y-8">
                <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-orange-500/20">
                        {teamName.charAt(0)}
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Join {teamName}</h1>
                    <p className="text-gray-400 text-sm">
                        You've been invited to join the <strong>{teamName}</strong> team on <strong>{workspaceSlug}</strong>.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#1a1a24] border border-gray-800 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                            {inviterName.charAt(0)}
                        </div>
                        <div>
                            <div className="text-sm font-medium text-white">Invited by {inviterName}</div>
                            <div className="text-xs text-gray-500">{inviterRole}</div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleJoin}
                    disabled={isJoining}
                    className="w-full py-3 px-4 bg-[#0F4C75] hover:bg-[#0F4C75]/80 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    {isJoining ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Joining...
                        </>
                    ) : (
                        'Join Team'
                    )}
                </button>
            </div>
        </div>
    )
}
