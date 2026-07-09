import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from '@/components/ui/Toaster'
import { useEffect } from 'react'
import { getSession } from '@/lib/auth'

function TokenSync() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('bearer_token')) return
    // Try to refresh the bearer token from the existing session cookie.
    getSession().catch(() => {})
  }, [])
  return null
}

export const Route = createRootRoute({
  component: () => (
    <>
      <TokenSync />
      <Outlet />
      <Toaster />
      <TanStackRouterDevtools />
    </>
  ),
})
