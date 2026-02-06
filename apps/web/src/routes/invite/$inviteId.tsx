import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { useSession } from '@/lib/auth'
import { apiFetch, apiFetchJson } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/invite/$inviteId')({
    component: InvitePage,
})

function InvitePage() {
    const { inviteId } = useParams({ from: '/invite/$inviteId' })
    const { data: session, isPending: sessionLoading } = useSession()

    const [isJoining, setIsJoining] = useState(false)
    const [joined, setJoined] = useState(false)
    const [error, setError] = useState('')

    // Try to resolve as Workspace Invite first
    const { data: wsInvite, isLoading: resolvingWs, error: wsError } = useQuery({
        queryKey: ['resolve-invite', inviteId],
        queryFn: async () => {
            const res = await apiFetchJson<any>(`/api/workspaces/invites/resolve/${inviteId}`)
            return res.data
        },
        retry: false
    })

    // Fallback for legacy Team Invites (if workspace resolution fails)
    const isLegacyTeamInvite = !wsInvite && !!new URLSearchParams(window.location.search).get('workspace')

    // Legacy Reconstruction logic
    const searchParams = new URLSearchParams(window.location.search)
    const teamName = wsInvite ? wsInvite.workspace?.name : inviteId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const inviterName = wsInvite ? 'Workspace Admin' : (searchParams.get('inviter') || 'Team Admin')
    const inviterRole = searchParams.get('role') || 'Team Lead'
    const workspaceSlug = searchParams.get('workspace') || (wsInvite?.workspace?.slug) || 'demo'

    const handleJoin = async () => {
        if (!session?.user) {
            // User not logged in, redirect to login
            const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search)
            window.location.href = `/login?redirect=${redirectUrl}`
            return
        }

        setIsJoining(true)
        setError('')
        try {
            if (wsInvite) {
                // New Workspace Invite Flow
                const response = await apiFetch(`/api/workspaces/invites/accept/${inviteId}`, {
                    method: 'POST',
                    headers: { 'x-user-id': session.user.id }
                })

                if (!response.ok) {
                    const data = await response.json()
                    throw new Error(data.error || 'Failed to join workspace')
                }
            } else {
                // Legacy Team Invite Flow
                const response = await apiFetch('/api/teams/join', {
                    method: 'POST',
                    body: JSON.stringify({
                        workspaceSlug,
                        teamSlug: inviteId
                    }),
                    headers: { 'x-user-id': session.user.id }
                })

                if (!response.ok) {
                    const data = await response.json()
                    throw new Error(data.error || 'Failed to join team')
                }
            }

            setJoined(true)
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Wystąpił błąd podczas dołączania')
        } finally {
            setIsJoining(false)
        }
    }

    if (resolvingWs && !isLegacyTeamInvite) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
                <div className="animate-spin h-8 w-8 text-[#F2CE88] border-4 border-t-transparent rounded-full" />
            </div>
        )
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
                        <h1 className="text-2xl font-bold text-white mb-2">Welcome!</h1>
                        <p className="text-gray-400">You have successfully joined {wsInvite ? 'the workspace' : 'the team'}.</p>
                    </div>
                    <Link
                        to="/$workspaceSlug"
                        params={{ workspaceSlug: workspaceSlug }}
                        className="block w-full py-3 px-4 bg-[#F2CE88] text-black font-semibold rounded-xl transition-colors text-center"
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
                    <div className="w-20 h-20 bg-gradient-to-br from-[#F2CE88] to-orange-400 rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl font-bold text-black shadow-lg shadow-orange-500/20">
                        {teamName?.charAt(0)}
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Join {wsInvite ? 'Workspace' : 'Team'}</h1>
                    <p className="text-gray-400 text-sm">
                        You've been invited to join <strong>{teamName}</strong>.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#1a1a24] border border-gray-800 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                            {inviterName?.charAt(0)}
                        </div>
                        <div>
                            <div className="text-sm font-medium text-white">Invited by {inviterName}</div>
                            {wsInvite ? (
                                <div className="text-xs text-gray-500">Workspace Invitation</div>
                            ) : (
                                <div className="text-xs text-gray-500">{inviterRole}</div>
                            )}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm border border-red-500/20">
                        {error}
                    </div>
                )}

                {(wsError && !isLegacyTeamInvite) && (
                    <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm border border-red-500/20 text-center">
                        This invitation is invalid or has expired.
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={handleJoin}
                        disabled={isJoining || sessionLoading || (!!wsError && !isLegacyTeamInvite)}
                        className="w-full py-3 px-4 bg-[#F2CE88] text-black font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isJoining ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Joining...
                            </>
                        ) : (
                            session?.user ? 'Join Now' : 'Log In & Join'
                        )}
                    </button>

                    {!session?.user && !sessionLoading && (
                        <p className="text-center text-xs text-gray-500">
                            New to Zadano?{' '}
                            <Link
                                to="/register"
                                search={{
                                    workspace: workspaceSlug,
                                    invite: inviteId
                                }}
                                className="text-amber-500 hover:underline"
                            >
                                Create an account
                            </Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
