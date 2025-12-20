import { createFileRoute } from '@tanstack/react-router'
import { useSession, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_dashboard/dashboard')({
    component: DashboardPage,
})

function DashboardPage() {
    const { data: session, isPending } = useSession()

    if (isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-white">Ładowanie...</div>
            </div>
        )
    }

    const user = session?.user

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-gray-400">Witaj, {user?.name || user?.email}!</p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => signOut()}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                    Wyloguj się
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-gray-800 bg-[hsl(222,47%,9%)]">
                    <CardHeader>
                        <CardTitle className="text-white">📋 Zadania</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-amber-500">0</p>
                        <p className="text-gray-400">aktywnych zadań</p>
                    </CardContent>
                </Card>

                <Card className="border-gray-800 bg-[hsl(222,47%,9%)]">
                    <CardHeader>
                        <CardTitle className="text-white">👥 Zespoły</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-amber-500">0</p>
                        <p className="text-gray-400">zespołów</p>
                    </CardContent>
                </Card>

                <Card className="border-gray-800 bg-[hsl(222,47%,9%)]">
                    <CardHeader>
                        <CardTitle className="text-white">📁 Projekty</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-amber-500">0</p>
                        <p className="text-gray-400">projektów</p>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-8">
                <Card className="border-gray-800 bg-[hsl(222,47%,9%)]">
                    <CardHeader>
                        <CardTitle className="text-white">🚧 W budowie</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-400">
                            Dashboard jest w trakcie budowy. Funkcje zostaną dodane w kolejnych sprintach.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
