import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { EncryptionProvider } from '@/context/EncryptionContext'

export const Route = createRootRoute({
    component: () => (
        <EncryptionProvider>
            <Outlet />
            <TanStackRouterDevtools />
        </EncryptionProvider>
    ),
})
