import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { EncryptionProvider } from '@/context/EncryptionContext'
import { Toaster } from '@/components/ui/Toaster'

export const Route = createRootRoute({
    component: () => (
        <EncryptionProvider>
            <Outlet />
            <Toaster />
            <TanStackRouterDevtools />
        </EncryptionProvider>
    ),
})
