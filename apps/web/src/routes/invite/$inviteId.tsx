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
  const {
    data: wsInvite,
    isLoading: resolvingWs,
    error: wsError,
  } = useQuery({
    queryKey: ['resolve-invite', inviteId],
    queryFn: async () => {
      const res = await apiFetchJson<any>(`/api/workspaces/invites/resolve/${inviteId}`)
      return res.data
    },
    retry: false,
  })

  // Fallback for legacy Team Invites (if workspace resolution fails)
  const isLegacyTeamInvite =
    !wsInvite && !!new URLSearchParams(window.location.search).get('workspace')

  // Legacy Reconstruction logic
  const searchParams = new URLSearchParams(window.location.search)
  const teamName = wsInvite
    ? wsInvite.workspace?.name
    : inviteId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  const inviterName = wsInvite
    ? wsInvite.inviter?.name || 'Workspace Admin'
    : searchParams.get('inviter') || 'Team Admin'
  const inviterRole = searchParams.get('role') || 'Team Lead'
  const workspaceSlug = searchParams.get('workspace') || wsInvite?.workspace?.slug || 'demo'

  const handleJoin = async () => {
    if (!session?.user) {
      // User not logged in, redirect to login
      const searchParams = new URLSearchParams(window.location.search)
      searchParams.set('invite', inviteId)
      searchParams.set('workspace', workspaceSlug)
      searchParams.set('redirect', window.location.pathname)

      window.location.href = `/login?${searchParams.toString()}`
      return
    }

    setIsJoining(true)
    setError('')
    try {
      if (wsInvite) {
        // New Workspace Invite Flow
        const response = await apiFetch(`/api/workspaces/invites/accept/${inviteId}`, {
          method: 'POST',
          headers: { 'x-user-id': session.user.id },
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
            teamSlug: inviteId,
          }),
          headers: { 'x-user-id': session.user.id },
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
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent text-[#F2CE88]" />
      </div>
    )
  }

  if (joined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] p-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-[#12121a] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22C55E"
              strokeWidth="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div>
            <h1 className="mb-2 text-2xl font-bold text-white">Welcome!</h1>
            <p className="text-gray-400">
              You have successfully joined {wsInvite ? 'the workspace' : 'the team'}.
            </p>
          </div>
          <Link
            to="/$workspaceSlug"
            params={{ workspaceSlug: workspaceSlug }}
            className="block w-full rounded-xl bg-[#F2CE88] px-4 py-3 text-center font-semibold text-black transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-[#12121a] p-8">
        <div className="text-center">
          <div
            className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center overflow-hidden ${
              !wsInvite?.workspace?.logo
                ? 'rounded-2xl bg-gradient-to-br from-[#F2CE88] to-orange-400 text-3xl font-bold text-black shadow-lg shadow-orange-500/20'
                : ''
            }`}
          >
            {wsInvite?.workspace?.logo ? (
              <img
                src={wsInvite.workspace.logo}
                alt={teamName}
                className="h-full w-full object-contain"
              />
            ) : (
              teamName?.charAt(0)
            )}
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">
            Join {wsInvite ? 'Workspace' : 'Team'}
          </h1>
          <p className="text-sm text-gray-400">
            You've been invited to join <strong>{teamName}</strong>.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl bg-[#1a1a24] p-4">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
              {wsInvite?.inviter?.image ? (
                <img
                  src={wsInvite.inviter.image}
                  alt={inviterName}
                  className="h-full w-full object-cover"
                />
              ) : (
                inviterName?.charAt(0)
              )}
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

        {error && <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</div>}

        {wsError && !isLegacyTeamInvite && (
          <div className="rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-500">
            This invitation is invalid or has expired.
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleJoin}
            disabled={isJoining || sessionLoading || (!!wsError && !isLegacyTeamInvite)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F2CE88] px-4 py-3 font-semibold text-black transition-all disabled:opacity-50"
          >
            {isJoining ? (
              <>
                <svg
                  className="h-5 w-5 animate-spin text-black"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Joining...
              </>
            ) : session?.user ? (
              'Join Now'
            ) : (
              'Log In & Join'
            )}
          </button>

          {!session?.user && !sessionLoading && (
            <p className="text-center text-xs text-gray-500">
              New to Zadano?{' '}
              <Link
                to="/register"
                search={{
                  workspace: workspaceSlug,
                  invite: inviteId,
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
