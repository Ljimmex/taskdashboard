import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getSession } from '@/lib/auth'
import { FloatingTimer } from '@/components/features/time/FloatingTimer'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

// Protected route layout - requires authentication AND workspace access
export const Route = createFileRoute('/$workspaceSlug')({
    beforeLoad: async ({ params }) => {
        const session = await getSession()

        if (!session?.data?.session) {
            throw redirect({
                to: '/login',
                search: {
                    redirect: window.location.pathname,
                },
            })
        }

        // TODO: Validate if user has access to this workspaceSlug
        // For now, we assume if they are logged in, they can try to access.
        // The API calls inside will fail 403 if they don't have access.
        // Ideally we fetch workspace details here.

        return {
            user: session.data.user,
            session: session.data.session,
            slug: params.workspaceSlug
        }
    },
    component: WorkspaceAuthLayout,
})

function WorkspaceAuthLayout() {
    return (
        <DashboardLayout>
            <Outlet />
            <FloatingTimer />
        </DashboardLayout>
    )
}
