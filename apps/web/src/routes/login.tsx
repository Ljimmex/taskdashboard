import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { signIn } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/login')({
    component: LoginPage,
})

function LoginPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const result = await signIn.email({
                email,
                password,
            })

            if (result.error) {
                setError(result.error.message || 'Błąd logowania')
            } else {
                navigate({ to: '/dashboard' })
            }
        } catch (err) {
            setError('Wystąpił nieoczekiwany błąd')
        } finally {
            setLoading(false)
        }
    }

    const getCallbackURL = () => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
        return `${origin}/dashboard`
    }

    const handleOAuthLogin = async (provider: 'google' | 'github' | 'slack') => {
        try {
            await signIn.social({
                provider,
                callbackURL: getCallbackURL(),
            })
        } catch (err) {
            setError(`Błąd logowania przez ${provider}`)
        }
    }

    return (
        <div className="flex min-h-screen">
            {/* Left side - Form */}
            <div className="flex w-full flex-col justify-center px-8 py-12 lg:w-1/2 lg:px-16 bg-[#0a0a0f]">
                <div className="mx-auto w-full max-w-md">
                    {/* Logo */}
                    <div className="mb-10">
                        <h1 className="text-3xl font-bold text-white">
                            <img src="/Zadano/Zadano_Logo_Full_Dark.svg" alt="Zadano.app" className="h-8" />
                        </h1>
                        <p className="mt-2 text-gray-400">Zaloguj się do swojego konta</p>
                    </div>

                    {error && (
                        <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-400 text-sm">E-mail</Label>
                            <div className="relative">
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="border-0 border-b border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 pb-3"
                                    placeholder="twoj@email.com"
                                    required
                                />
                                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-amber-500">@</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-gray-400 text-sm">Hasło</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="border-0 border-b border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 pb-3"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-3 text-sm text-gray-400 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-5 h-5 border-2 border-gray-600 rounded bg-gray-800 peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-all flex items-center justify-center">
                                        {rememberMe && (
                                            <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                Zapamiętaj mnie na 30 dni
                            </label>
                            <Link to="/forgot-password" className="text-sm text-amber-500 hover:underline">
                                Zapomniałeś hasła?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-amber-500 py-6 text-black font-medium hover:bg-amber-400 rounded-full"
                        >
                            {loading ? 'Logowanie...' : 'Zaloguj się'}
                        </Button>

                        {/* OAuth buttons */}
                        <div className="mt-6">
                            <p className="text-sm text-gray-400 mb-4">Zaloguj się przez</p>
                            <div className="flex gap-3">
                                {/* GitHub */}
                                <button
                                    type="button"
                                    onClick={() => handleOAuthLogin('github')}
                                    className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                                    title="GitHub"
                                >
                                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                                </button>
                                {/* Google */}
                                <button
                                    type="button"
                                    onClick={() => handleOAuthLogin('google')}
                                    className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                                    title="Google"
                                >
                                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                </button>
                                {/* Slack - Coming Soon */}
                                <button
                                    type="button"
                                    disabled
                                    className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800/50 cursor-not-allowed opacity-50"
                                    title="Slack - Coming Soon"
                                >
                                    <svg className="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" /></svg>
                                </button>
                            </div>
                        </div>

                        <p className="mt-6 text-center text-gray-400">
                            Nie masz jeszcze konta?{' '}
                            <Link to="/register" className="text-amber-500 hover:underline font-medium">
                                Zarejestruj się
                            </Link>
                        </p>
                    </form>
                </div>
            </div>

            {/* Right side - Marketing */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 bg-[#0d0d12]">
                <div className="max-w-lg">
                    <h2 className="text-5xl font-bold text-white leading-tight">
                        Designed For <span className="text-amber-500">Task</span><br />
                        Management
                    </h2>
                    <p className="mt-6 text-lg text-gray-400">
                        Zarządzaj swoimi projektami i zadaniami z dowolnego miejsca.
                        Analizuj postępy i rozwijaj swój zespół!
                    </p>

                    {/* App Preview Image Placeholder */}
                    <div className="mt-12 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8 border border-gray-800">
                        <div className="aspect-video rounded-xl bg-[#0a0a0f] flex items-center justify-center border border-gray-800">
                            <div className="text-center">
                                <div className="text-6xl mb-4">📊</div>
                                <p className="text-gray-500">Dashboard Preview</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
