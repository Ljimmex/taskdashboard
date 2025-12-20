import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getSession } from '@/lib/auth'

// Protected route layout - requires authentication
export const Route = createFileRoute('/_dashboard')({
    beforeLoad: async () => {
        const session = await getSession()

        if (!session?.data?.session) {
            throw redirect({
                to: '/login',
                search: {
                    redirect: window.location.pathname,
                },
            })
        }

        return {
            user: session.data.user,
            session: session.data.session,
        }
    },
    component: DashboardLayout,
})

function DashboardLayout() {
    return (
        <div className="min-h-screen bg-[hsl(222,47%,6%)]">
            {/* Sidebar will go here */}
            <Outlet />
        </div>
    )
}
