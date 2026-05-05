import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from '@/components/ui/Toaster'

export const Route = createRootRoute({
    component: () => (
        <>
            <Outlet />
            <Toaster />
            <TanStackRouterDevtools />
        </>
    ),
})
