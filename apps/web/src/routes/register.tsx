import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/register')({
    component: RegisterPage,
})

function RegisterPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[hsl(222,47%,6%)] to-[hsl(222,47%,11%)]">
            <div className="w-full max-w-md rounded-xl border border-gray-800 bg-[hsl(222,47%,9%)] p-8">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-amber-500" />
                    <h1 className="text-2xl font-bold text-white">Utwórz konto</h1>
                    <p className="text-gray-400">Dołącz do TaskDashboard</p>
                </div>

                <form className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-2 block text-sm text-gray-300">Imię</label>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-gray-700 bg-[hsl(222,47%,11%)] px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                                placeholder="Jan"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm text-gray-300">Nazwisko</label>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-gray-700 bg-[hsl(222,47%,11%)] px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                                placeholder="Kowalski"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm text-gray-300">Email</label>
                        <input
                            type="email"
                            className="w-full rounded-lg border border-gray-700 bg-[hsl(222,47%,11%)] px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                            placeholder="twoj@email.com"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm text-gray-300">Hasło</label>
                        <input
                            type="password"
                            className="w-full rounded-lg border border-gray-700 bg-[hsl(222,47%,11%)] px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full rounded-lg bg-amber-500 py-3 font-medium text-black hover:bg-amber-400 transition-colors"
                    >
                        Zarejestruj się
                    </button>
                </form>

                <div className="mt-6 text-center text-gray-400">
                    Masz już konto?{' '}
                    <Link to="/login" className="text-amber-500 hover:underline">
                        Zaloguj się
                    </Link>
                </div>
            </div>
        </div>
    )
}
