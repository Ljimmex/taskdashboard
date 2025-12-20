import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
    component: HomePage,
})

function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[hsl(222,47%,6%)] to-[hsl(222,47%,11%)] text-white">
            {/* Hero Section */}
            <div className="container mx-auto px-4">
                {/* Navigation */}
                <nav className="flex items-center justify-between py-6">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-amber-500" />
                        <span className="text-xl font-bold">FlowBoard</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            to="/login"
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            Zaloguj się
                        </Link>
                        <Link
                            to="/register"
                            className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-black hover:bg-amber-400 transition-colors"
                        >
                            Rozpocznij za darmo
                        </Link>
                    </div>
                </nav>

                {/* Hero */}
                <main className="flex flex-col items-center justify-center py-24 text-center">
                    <span className="mb-4 rounded-full bg-amber-500/10 px-4 py-1 text-sm text-amber-500">
                        ⚡ Ultra-szybki task management
                    </span>
                    <h1 className="mb-6 text-5xl font-bold leading-tight md:text-7xl">
                        Zarządzaj projektami
                        <br />
                        <span className="gradient-text">szybciej niż kiedykolwiek</span>
                    </h1>
                    <p className="mb-8 max-w-2xl text-lg text-gray-400">
                        FlowBoard to nowoczesna platforma do zarządzania zadaniami
                        dla zespołów. Kanban board, real-time chat, kalendarz i wiele więcej.
                    </p>
                    <div className="flex gap-4">
                        <Link
                            to="/register"
                            className="rounded-lg bg-amber-500 px-8 py-3 font-medium text-black hover:bg-amber-400 transition-colors"
                        >
                            Rozpocznij za darmo →
                        </Link>
                        <a
                            href="#features"
                            className="rounded-lg border border-gray-700 px-8 py-3 font-medium text-gray-300 hover:bg-gray-800 transition-colors"
                        >
                            Zobacz funkcje
                        </a>
                    </div>
                </main>

                {/* Features */}
                <section id="features" className="py-24">
                    <h2 className="mb-12 text-center text-3xl font-bold">
                        Wszystko czego potrzebujesz
                    </h2>
                    <div className="grid gap-6 md:grid-cols-3">
                        <FeatureCard
                            icon="📋"
                            title="Kanban Board"
                            description="Przeciągaj i upuszczaj zadania między kolumnami. Intuicyjne zarządzanie workflow."
                        />
                        <FeatureCard
                            icon="💬"
                            title="Real-time Chat"
                            description="Komunikuj się z zespołem w czasie rzeczywistym. Wbudowany system wiadomości."
                        />
                        <FeatureCard
                            icon="📅"
                            title="Kalendarz"
                            description="Planuj zadania i spotkania. Widok dzienny, tygodniowy i miesięczny."
                        />
                        <FeatureCard
                            icon="👥"
                            title="Zarządzanie zespołem"
                            description="Zapraszaj członków, przypisuj role, śledź postępy."
                        />
                        <FeatureCard
                            icon="📁"
                            title="Pliki"
                            description="Przechowuj i udostępniaj pliki projektowe. Drag & drop upload."
                        />
                        <FeatureCard
                            icon="📊"
                            title="Analityka"
                            description="Śledź postępy zespołu, generuj raporty, eksportuj dane."
                        />
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-gray-800 py-8 text-center text-gray-500">
                    <p>© 2024 FlowBoard. Zbudowane z ❤️ używając Vite + React + Hono</p>
                </footer>
            </div>
        </div>
    )
}

function FeatureCard({
    icon,
    title,
    description,
}: {
    icon: string
    title: string
    description: string
}) {
    return (
        <div className="glass rounded-xl border border-gray-800 p-6 transition-colors hover:border-amber-500/50">
            <div className="mb-4 text-4xl">{icon}</div>
            <h3 className="mb-2 text-xl font-semibold">{title}</h3>
            <p className="text-gray-400">{description}</p>
        </div>
    )
}
