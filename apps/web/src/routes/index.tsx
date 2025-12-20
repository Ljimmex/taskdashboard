import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useSession } from '@/lib/auth'

export const Route = createFileRoute('/')({
    component: HomePage,
})

function HomePage() {
    const { data: session, isPending } = useSession()
    const navigate = useNavigate()

    useEffect(() => {
        if (!isPending && session) {
            navigate({ to: '/dashboard' })
        }
    }, [session, isPending, navigate])

    if (isPending || session) {
        return <div className="min-h-screen bg-[#0a0a0f]" /> // Loading state or empty to prevent flash
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
            {/* Navigation - OUTSIDE containers */}
            <nav className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl">
                <div className="container mx-auto flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-8">
                        <Link to="/" className="flex items-center gap-2">
                            <img src="/Zadano/Zadano_Logo_Full_Dark.svg" alt="Zadano.app" className="h-8" />
                        </Link>
                        <div className="hidden md:flex items-center gap-6">
                            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Funkcje</a>
                            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Cennik</a>
                            <a href="#faq" className="text-sm text-gray-400 hover:text-white transition-colors">FAQ</a>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            to="/login"
                            className="text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Zaloguj się
                        </Link>
                        <Link
                            to="/register"
                            className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-medium text-black hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/25"
                        >
                            Rozpocznij za darmo
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Main Content - with side padding for container gaps */}
            <main className="flex-1 px-4 py-4 space-y-4">
                {/* Hero Section - IN CONTAINER */}
                <section className="rounded-3xl bg-[#12121a] overflow-hidden min-h-[85vh] flex items-center relative">
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent" />
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-amber-500/10 rounded-full blur-[120px]" />

                    <div className="relative w-full px-8 md:px-12 py-16">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            {/* Left side - Text */}
                            <div className="text-left">
                                <span className="inline-flex items-center gap-2 mb-8 rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 text-sm text-amber-400">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                    Nowa wersja dostępna
                                </span>

                                <h1 className="mb-8 text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
                                    Kompleksowe{' '}
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500">
                                        zarządzanie
                                    </span>
                                    <br />
                                    projektami
                                </h1>

                                <p className="mb-10 text-xl text-gray-400 max-w-xl">
                                    Upraszczaj spotkania, efektywnie zarządzaj projektami
                                    i optymalizuj workflow – wszystko w jednym miejscu.
                                </p>

                                <div className="flex flex-wrap gap-4">
                                    <Link
                                        to="/register"
                                        className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-10 py-5 text-lg font-semibold text-black hover:from-amber-400 hover:to-amber-500 transition-all shadow-2xl shadow-amber-500/30"
                                    >
                                        Rozpocznij
                                    </Link>
                                    <a
                                        href="#features"
                                        className="rounded-xl bg-gray-800/50 px-10 py-5 text-lg font-semibold text-gray-300 hover:bg-gray-800 transition-all"
                                    >
                                        Zobacz funkcje
                                    </a>
                                </div>
                            </div>

                            {/* Right side - Dashboard Wireframe */}
                            <div className="relative">
                                <div className="rounded-2xl bg-gray-900/80 p-4 backdrop-blur-xl shadow-2xl">
                                    <DashboardWireframe />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature Cards Section - 3 SEPARATE CONTAINERS */}
                <section id="features" className="grid md:grid-cols-3 gap-4">
                    {/* Card 1 - Manage Tasks */}
                    <div className="rounded-3xl bg-[#12121a] p-6">
                        <h3 className="text-lg font-semibold mb-2">Efektywne zarządzanie zadaniami</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Organizuj, priorytetyzuj i śledź postępy dzięki precyzyjnym narzędziom.
                        </p>
                        <div className="bg-[#0a0a0f] rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <div className="w-4 h-4 rounded bg-amber-500" />
                                <span className="text-sm">Analiza rynku</span>
                                <span className="ml-auto text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">Done</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50">
                                <div className="w-4 h-4 rounded bg-blue-500" />
                                <span className="text-sm">Projektowanie UI</span>
                                <span className="ml-auto text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">In Progress</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50">
                                <div className="w-4 h-4 rounded bg-purple-500" />
                                <span className="text-sm">Review logotypu</span>
                                <span className="ml-auto text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">Pending</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 2 - Calendar */}
                    <div className="rounded-3xl bg-[#12121a] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-lg font-semibold">MAJ 2024</span>
                            <span className="text-sm text-gray-400">45 Projektów</span>
                        </div>
                        <div className="bg-[#0a0a0f] rounded-xl p-4">
                            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
                                <span>Pn</span><span>Wt</span><span>Śr</span><span>Cz</span><span>Pt</span><span>Sb</span><span>Nd</span>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center text-sm">
                                {[...Array(31)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`py-2 rounded ${i === 6 || i === 13 ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-gray-800'}`}
                                    >
                                        {i + 1}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-4">
                            <h4 className="font-medium mb-1">Bądź na bieżąco</h4>
                            <p className="text-gray-400 text-sm">Synchronizuj z kalendarzem, aby nie przegapić żadnego deadline'a.</p>
                        </div>
                    </div>

                    {/* Card 3 - Analytics */}
                    <div className="rounded-3xl bg-[#12121a] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Insightful Analytics</h3>
                            <div className="flex items-center gap-2">
                                <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent relative flex items-center justify-center">
                                    <span className="text-xs font-bold">68%</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">
                            Szczegółowe raporty pomagają mierzyć wydajność i optymalizować produktywność.
                        </p>
                        <div className="bg-[#0a0a0f] rounded-xl p-4 h-24 flex items-end gap-1">
                            {[40, 60, 35, 80, 50, 70, 45].map((h, i) => (
                                <div key={i} className="flex-1 bg-gradient-to-t from-amber-500/60 to-amber-500/20 rounded-t" style={{ height: `${h}%` }} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Unleash Efficiency Section */}
                <section className="rounded-3xl bg-[#12121a] p-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Uwolnij efektywność w
                            <br />
                            zarządzaniu projektami
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Planuj i organizuj cały projekt od początku do końca.
                            Komunikuj się i współpracuj ze swoim zespołem.
                        </p>
                    </div>

                    {/* Feature Images Grid */}
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <FeatureImageCard
                            title="Usprawnij Workflow"
                            description="Uprość zarządzanie projektami dzięki intuicyjnym narzędziom."
                            gradient="from-purple-500/30 to-blue-500/30"
                        />
                        <FeatureImageCard
                            title="Bezproblemowa współpraca"
                            description="Aktualizacje w czasie rzeczywistym i narzędzia komunikacyjne."
                            gradient="from-pink-500/30 to-orange-500/30"
                        />
                        <FeatureImageCard
                            title="Optymalizuj zarządzanie"
                            description="Priorytetyzuj zadania i zapewnij terminową realizację."
                            gradient="from-cyan-500/30 to-green-500/30"
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <FeatureImageCard
                            title="Zwiększ wydajność zespołu"
                            description="Jasne cele, usprawnione procesy i insightful analytics."
                            gradient="from-amber-500/30 to-red-500/30"
                            large
                        />
                        <FeatureImageCard
                            title="Monitoruj postępy"
                            description="Śledź postępy projektów w czasie rzeczywistym."
                            gradient="from-green-500/30 to-teal-500/30"
                            large
                        />
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="rounded-3xl bg-[#12121a] p-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Wybierz idealny plan
                            <br />
                            dla swojego workflow
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Niezależnie od tego, czy jesteś freelancerem, startupem czy enterprise - mamy plan dla Ciebie.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        <PricingCard
                            name="Free"
                            price="0 zł"
                            period="na zawsze"
                            description="Idealny na start dla małych zespołów"
                            features={[
                                "Do 5 projektów",
                                "Do 3 członków zespołu",
                                "Podstawowa analityka",
                                "Wsparcie email"
                            ]}
                        />
                        <PricingCard
                            name="Pro"
                            price="49 zł"
                            period="miesięcznie"
                            description="Dla rosnących zespołów i startupów"
                            features={[
                                "Nielimitowane projekty",
                                "Do 50 członków zespołu",
                                "Zaawansowana analityka",
                                "Priorytetowe wsparcie",
                                "Integracje API"
                            ]}
                            popular
                        />
                        <PricingCard
                            name="Enterprise"
                            price="Kontakt"
                            period=""
                            description="Dla dużych organizacji"
                            features={[
                                "Wszystko z Pro",
                                "Nielimitowani użytkownicy",
                                "SSO / SAML",
                                "Dedykowany manager",
                                "SLA 99.99%"
                            ]}
                        />
                    </div>
                </section>

                {/* FAQ Section */}
                <section id="faq" className="rounded-3xl bg-[#12121a] p-8">
                    <div className="grid lg:grid-cols-2 gap-12">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                Masz pytania?
                                <br />
                                Mamy odpowiedzi.
                            </h2>
                            <p className="text-gray-400 mb-8">
                                Jeśli nie znajdziesz odpowiedzi na swoje pytanie,
                                napisz do nas - chętnie pomożemy.
                            </p>
                            <a
                                href="mailto:support@zadano.app"
                                className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors"
                            >
                                Skontaktuj się z nami →
                            </a>
                        </div>

                        <div className="space-y-4">
                            <FAQItem
                                question="Czy mogę anulować subskrypcję w każdej chwili?"
                                answer="Tak, możesz anulować subskrypcję w dowolnym momencie. Nie ma żadnych ukrytych opłat ani kar za wcześniejsze zakończenie."
                            />
                            <FAQItem
                                question="Jak zainstalować oprogramowanie?"
                                answer="Zadano.app działa w przeglądarce - wystarczy się zarejestrować i możesz zacząć korzystać od razu. Nie wymaga instalacji."
                            />
                            <FAQItem
                                question="Czy mogę zacząć korzystać za darmo?"
                                answer="Absolutnie! Nasz plan Free jest darmowy na zawsze i zawiera wszystkie podstawowe funkcje potrzebne do zarządzania projektami."
                            />
                            <FAQItem
                                question="Jakie integracje są dostępne?"
                                answer="Obsługujemy integracje z ponad 50 narzędziami, w tym Slack, GitHub, Jira, Notion, Google Drive i wiele więcej."
                            />
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="rounded-3xl bg-[#12121a] p-12 md:p-16 text-center overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-orange-500/5" />
                    <div className="relative">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Uprość swój workflow z
                            <br />
                            <img src="/Zadano/Zadano_Logo_Full_Dark.svg" alt="Zadano.app" className="inline-block h-10 md:h-12 mt-2" />
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto mb-8">
                            Zacznij bezpłatnie i przekonaj się, dlaczego tysiące zespołów
                            wybrało Zadano.app jako swoje narzędzie do zarządzania projektami.
                        </p>
                        <Link
                            to="/register"
                            className="inline-flex rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-4 font-semibold text-black hover:from-amber-400 hover:to-amber-500 transition-all shadow-2xl shadow-amber-500/30"
                        >
                            Rozpocznij za darmo →
                        </Link>
                    </div>
                </section>
            </main>

            {/* Footer - OUTSIDE containers */}
            <footer className="bg-[#0a0a0f] mt-4">
                <div className="container mx-auto px-6 py-12">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <img src="/Zadano/Zadano_Logo_Full_Dark.svg" alt="Zadano.app" className="h-6 mb-4" />
                            <p className="text-gray-500 text-sm">
                                Zarządzaj projektami efektywniej dzięki narzędziom zaprojektowanym dla Twojego zespołu.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium mb-4">Przegląd</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><a href="#features" className="hover:text-white transition-colors">Funkcje</a></li>
                                <li><a href="#pricing" className="hover:text-white transition-colors">Cennik</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium mb-4">Zasoby</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Wsparcie</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium mb-4">Newsletter</h4>
                            <p className="text-gray-400 text-sm mb-4">
                                Otrzymuj najnowsze wiadomości i porady.
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="twoj@email.com"
                                    className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm focus:outline-none focus:border-amber-500"
                                />
                                <button className="px-4 py-2 rounded-lg bg-amber-500 text-black font-medium text-sm hover:bg-amber-400 transition-colors">
                                    Sub
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-gray-500 text-sm">
                            © 2024 Zadano.app. Wszystkie prawa zastrzeżone.
                        </p>
                        <div className="flex items-center gap-6">
                            <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                            </a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}

// Dashboard Wireframe Component
function DashboardWireframe() {
    return (
        <div className="rounded-xl overflow-hidden bg-[#0a0a0f] p-4">
            {/* Top bar */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-4 text-gray-500 text-xs">Zadano.app</span>
            </div>

            <div className="grid grid-cols-12 gap-3">
                {/* Sidebar */}
                <div className="col-span-3 bg-gray-800/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-4">
                        <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center text-xs">📊</div>
                        Projekty
                    </div>
                    <div className="h-2 bg-gray-700 rounded w-full" />
                    <div className="h-2 bg-gray-700 rounded w-3/4" />
                    <div className="h-2 bg-gray-700 rounded w-5/6" />
                    <div className="h-2 bg-gray-700 rounded w-2/3" />
                </div>

                {/* Main content */}
                <div className="col-span-9 space-y-3">
                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-2">
                        {['24', '156', '89', '12'].map((num, i) => (
                            <div key={i} className="bg-gray-800/50 rounded-lg p-3">
                                <div className="h-1.5 bg-gray-700 rounded w-1/2 mb-2" />
                                <span className="text-lg font-bold">{num}</span>
                            </div>
                        ))}
                    </div>

                    {/* Chart area */}
                    <div className="bg-gray-800/50 rounded-lg p-3 h-32 flex items-end gap-1">
                        {[40, 65, 45, 80, 55, 70, 85, 60, 75, 90, 50, 95].map((h, i) => (
                            <div key={i} className="flex-1 bg-gradient-to-t from-amber-500/50 to-amber-500/20 rounded-t" style={{ height: `${h}%` }} />
                        ))}
                    </div>

                    {/* Task list preview */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                            <div className="h-2 bg-gray-700 rounded w-1/2" />
                            <div className="h-2 bg-amber-500/30 rounded w-full" />
                            <div className="h-2 bg-gray-700 rounded w-3/4" />
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                            <div className="h-2 bg-gray-700 rounded w-1/2" />
                            <div className="h-2 bg-gray-700 rounded w-full" />
                            <div className="h-2 bg-amber-500/30 rounded w-2/3" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Feature Image Card
function FeatureImageCard({
    title,
    description,
    gradient,
    large = false,
}: {
    title: string
    description: string
    gradient: string
    large?: boolean
}) {
    return (
        <div className={`rounded-2xl bg-gray-900/80 overflow-hidden ${large ? '' : ''}`}>
            <div className={`bg-gradient-to-br ${gradient} h-40 flex items-center justify-center`}>
                <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20" />
            </div>
            <div className="p-5">
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-gray-400 text-sm">{description}</p>
            </div>
        </div>
    )
}

// Pricing Card
function PricingCard({
    name,
    price,
    period,
    description,
    features,
    popular = false,
}: {
    name: string
    price: string
    period: string
    description: string
    features: string[]
    popular?: boolean
}) {
    return (
        <div className={`relative rounded-2xl p-6 ${popular ? 'bg-gradient-to-b from-amber-500/10 to-transparent' : 'bg-gray-900/80'}`}>
            {popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold">
                    Najpopularniejszy
                </div>
            )}
            <h3 className="text-xl font-bold mb-2">{name}</h3>
            <div className="mb-1">
                <span className="text-3xl font-bold">{price}</span>
                {period && <span className="text-gray-400 ml-1 text-sm">/{period}</span>}
            </div>
            <p className="text-gray-400 text-sm mb-4">{description}</p>
            <ul className="space-y-2 mb-6">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-amber-400">✓</span>
                        {feature}
                    </li>
                ))}
            </ul>
            <Link
                to="/register"
                className={`block text-center rounded-xl py-3 font-medium transition-all ${popular
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500'
                    : 'border border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-600'
                    }`}
            >
                {price === 'Kontakt' ? 'Skontaktuj się' : 'Rozpocznij'}
            </Link>
        </div>
    )
}

// FAQ Item
function FAQItem({ question, answer }: { question: string; answer: string }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="rounded-xl bg-gray-900/80 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800 transition-colors"
            >
                <span className="font-medium">{question}</span>
                <span className={`text-amber-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>↓</span>
            </button>
            {isOpen && <div className="px-4 pb-4 text-gray-400">{answer}</div>}
        </div>
    )
}
