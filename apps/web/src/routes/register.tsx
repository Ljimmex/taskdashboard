import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { signUp, signIn } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/register')({
    component: RegisterPage,
})

type Step = 1 | 2 | 3

function RegisterPage() {
    const navigate = useNavigate()
    const [step, setStep] = useState<Step>(1)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Step 1 data
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)

    // Step 2 data
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [birthDay, setBirthDay] = useState('')
    const [birthMonth, setBirthMonth] = useState('')
    const [birthYear, setBirthYear] = useState('')
    const [gender, setGender] = useState('')
    const [position, setPosition] = useState('') // Replaced phone with position

    // Step 3 data (Workspace)
    const [workspaceName, setWorkspaceName] = useState('')
    const [teamSize, setTeamSize] = useState('1-10')
    const [industry, setIndustry] = useState('Technology')

    // Auto-generate slug for internal logic?
    // We'll generate it on the fly or just let backend handle/backend expects it.
    // Spec says API requires slug.
    const generateSlug = (name: string) => {
        return name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'workspace'
    }

    const handleStep1 = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password.length < 8) {
            setError('Hasło musi mieć minimum 8 znaków')
            return
        }

        if (password !== confirmPassword) {
            setError('Hasła nie są identyczne')
            return
        }

        setStep(2)
    }

    const handleStep2 = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setStep(3) // Go to workspace step
    }

    const handleOAuthSignup = async (provider: 'google' | 'github' | 'slack') => {
        const getCallbackURL = () => {
            const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
            return `${origin}/dashboard`
        }

        try {
            await signIn.social({
                provider,
                callbackURL: getCallbackURL(),
            })
        } catch (err) {
            setError(`Błąd rejestracji przez ${provider}`)
        }
    }

    const handleStep3 = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // 1. Register User
            // Format birth date: YYYY-MM-DD
            const birthDateStr = birthYear && birthMonth && birthDay
                ? `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`
                : undefined

            const signUpResult = await signUp.email({
                email,
                password,
                name: `${firstName} ${lastName}`.trim(),
                // image removed
                position, // BetterAuth hook will catch this
                gender,
                birthDate: birthDateStr,
            } as any)

            if (signUpResult.error) {
                setError(signUpResult.error.message || 'Błąd rejestracji')
                setLoading(false)
                return
            }

            // 2. Login User (to get session for workspace creation)
            // Note: signUp.email with autoSignIn: true (default?) might work, 
            // but let's be explicit.
            const signInResult = await signIn.email({
                email,
                password,
            })

            if (signInResult.error) {
                setError('Konto utworzone, ale błąd logowania. Spróbuj się zalogować.')
                navigate({ to: '/login' })
                setLoading(false)
                return
            }

            // 3. Create Workspace
            // We need to fetch directly because we don't have a workspace client yet
            // Headers will be handled by browser cookies from BetterAuth
            const slug = generateSlug(workspaceName) + '-' + Math.random().toString(36).substring(2, 6)

            const wsResponse = await fetch('/api/workspaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: workspaceName,
                    slug: slug,
                    teamSize: teamSize,
                    industry: industry
                })
            })

            if (!wsResponse.ok) {
                // Non-blocking error? Or should we block?
                // If workspace fails, user is still registered.
                // Let's warn but redirect.
                console.error('Failed to create workspace', await wsResponse.text())
                // Verify if we should show error. 
                // Navigate anyway.
            }

            navigate({ to: `/${slug}` })

        } catch (err) {
            console.error(err)
            setError('Wystąpił nieoczekiwany błąd podczas rejestracji')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen">
            {/* Left side - Form */}
            <div className="flex w-full flex-col justify-center px-8 py-12 lg:w-1/2 lg:px-16 bg-[#0a0a0f]">
                <div className="mx-auto w-full max-w-md">
                    {/* Logo */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white">
                            <img src="/Zadano/Zadano_Logo_Full_Dark.svg" alt="Zadano.app" className="h-8" />
                        </h1>
                        <p className="mt-2 text-gray-400">Utwórz swoje konto</p>
                    </div>

                    {/* Step indicator */}
                    <div className="mb-8 flex items-center gap-4">
                        {/* Step 1 */}
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${step >= 1 ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-400'}`}>1</div>
                        <div className={`h-0.5 flex-1 ${step >= 2 ? 'bg-amber-500' : 'bg-gray-700'}`} />

                        {/* Step 2 */}
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${step >= 2 ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-400'}`}>2</div>
                        <div className={`h-0.5 flex-1 ${step >= 3 ? 'bg-amber-500' : 'bg-gray-700'}`} />

                        {/* Step 3 */}
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${step >= 3 ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-400'}`}>3</div>
                    </div>

                    {error && (
                        <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Account */}
                    {step === 1 && (
                        <form onSubmit={handleStep1} className="space-y-5">
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
                                        placeholder="8+ znaków"
                                        required
                                        minLength={8}
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

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-gray-400 text-sm">Powtórz hasło</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="border-0 border-b border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 pb-3"
                                        placeholder="8+ znaków"
                                        required
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                    >
                                        {showConfirmPassword ? (
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
                                className="w-full bg-amber-500 py-6 text-black font-medium hover:bg-amber-400 rounded-full"
                            >
                                Dalej →
                            </Button>

                            {/* OAuth buttons - inline layout */}
                            <div className="mt-6 flex items-center gap-4">
                                <span className="text-sm text-gray-400">Zarejestruj się przez</span>
                                <div className="flex gap-2">
                                    {/* GitHub */}
                                    <button
                                        type="button"
                                        onClick={() => handleOAuthSignup('github')}
                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/50 hover:bg-gray-700 transition-colors"
                                        title="GitHub"
                                    >
                                        <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                                    </button>
                                    {/* Google */}
                                    <button
                                        type="button"
                                        onClick={() => handleOAuthSignup('google')}
                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/50 hover:bg-gray-700 transition-colors"
                                        title="Google"
                                    >
                                        <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                    </button>
                                </div>
                            </div>

                            <p className="mt-6 text-center text-gray-400">
                                Masz już konto?{' '}
                                <Link to="/login" className="text-amber-500 hover:underline font-medium">
                                    Zaloguj się
                                </Link>
                            </p>
                        </form>
                    )}

                    {/* Step 2: Personal Info */}
                    {step === 2 && (
                        <form onSubmit={handleStep2} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="firstName" className="text-gray-400 text-sm">Imię</Label>
                                <Input
                                    id="firstName"
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="border-0 border-b border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 pb-3"
                                    placeholder="Jan"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lastName" className="text-gray-400 text-sm">Nazwisko</Label>
                                <Input
                                    id="lastName"
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="border-0 border-b border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 pb-3"
                                    placeholder="Kowalski"
                                    required
                                />
                            </div>

                            {/* Date of Birth */}
                            <div className="space-y-2">
                                <Label className="text-gray-400 text-sm">Data urodzenia</Label>
                                <div className="grid grid-cols-3 gap-3">
                                    <select
                                        value={birthDay}
                                        onChange={(e) => setBirthDay(e.target.value)}
                                        className="bg-gray-800/50 border-0 text-white rounded-lg px-3 py-3 focus:outline-none focus:ring-0 focus:bg-gray-800 transition-colors appearance-none cursor-pointer [&>option]:bg-[#0a0a0f]"
                                        required
                                    >
                                        <option value="">Dzień</option>
                                        {Array.from({ length: 31 }, (_, i) => (
                                            <option key={i + 1} value={i + 1}>{i + 1}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={birthMonth}
                                        onChange={(e) => setBirthMonth(e.target.value)}
                                        className="bg-gray-800/50 border-0 text-white rounded-lg px-3 py-3 focus:outline-none focus:ring-0 focus:bg-gray-800 transition-colors appearance-none cursor-pointer [&>option]:bg-[#0a0a0f]"
                                        required
                                    >
                                        <option value="">Miesiąc</option>
                                        {['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'].map((month, i) => (
                                            <option key={i + 1} value={i + 1}>{month}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={birthYear}
                                        onChange={(e) => setBirthYear(e.target.value)}
                                        className="bg-gray-800/50 border-0 text-white rounded-lg px-3 py-3 focus:outline-none focus:ring-0 focus:bg-gray-800 transition-colors appearance-none cursor-pointer [&>option]:bg-[#0a0a0f]"
                                        required
                                    >
                                        <option value="">Rok</option>
                                        {Array.from({ length: 100 }, (_, i) => {
                                            const year = new Date().getFullYear() - i - 10
                                            return <option key={year} value={year}>{year}</option>
                                        })}
                                    </select>
                                </div>
                            </div>

                            {/* Gender */}
                            <div className="space-y-2">
                                <Label htmlFor="gender" className="text-gray-400 text-sm">Płeć</Label>
                                <select
                                    id="gender"
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="w-full bg-gray-800/50 border-0 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-0 focus:bg-gray-800 transition-colors appearance-none cursor-pointer [&>option]:bg-[#0a0a0f]"
                                    required
                                >
                                    <option value="">Wybierz płeć</option>
                                    <option value="female">Kobieta</option>
                                    <option value="male">Mężczyzna</option>
                                    <option value="other">Inna</option>
                                    <option value="prefer_not_to_say">Wolę nie podawać</option>
                                </select>
                            </div>

                            {/* Position (Replaced Phone) */}
                            <div className="space-y-2">
                                <Label htmlFor="position" className="text-gray-400 text-sm">Stanowisko</Label>
                                <select
                                    id="position"
                                    value={position}
                                    onChange={(e) => setPosition(e.target.value)}
                                    className="w-full bg-gray-800/50 border-0 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-0 focus:bg-gray-800 transition-colors appearance-none cursor-pointer [&>option]:bg-[#0a0a0f]"
                                    required
                                >
                                    <option value="">Wybierz stanowisko</option>
                                    <option value="Programmer">Programmer</option>
                                    <option value="Web Designer">Web Designer</option>
                                    <option value="Project Manager">Project Manager</option>
                                    <option value="Marketing Specialist">Marketing Specialist</option>
                                    <option value="CEO / Founder">CEO / Founder</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    variant="ghost"
                                    className="flex-1 py-6 rounded-full bg-gray-800 text-white hover:bg-gray-700 hover:text-gray-200"
                                >
                                    ← Wstecz
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 bg-amber-500 py-6 text-black font-medium hover:bg-amber-400 rounded-full"
                                >
                                    Dalej →
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Step 3: Workspace Setup */}
                    {step === 3 && (
                        <form onSubmit={handleStep3} className="space-y-5">
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-semibold text-white">Skonfiguruj Workspace</h2>
                                <p className="text-sm text-gray-400">Stwórz przestrzeń dla swojego zespołu</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="workspaceName" className="text-gray-400 text-sm">Nazwa Workspace</Label>
                                <Input
                                    id="workspaceName"
                                    type="text"
                                    value={workspaceName}
                                    onChange={(e) => setWorkspaceName(e.target.value)}
                                    className="border-0 border-b border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 pb-3"
                                    placeholder="Moja Firma"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="teamSize" className="text-gray-400 text-sm">Rozmiar Zespołu</Label>
                                <select
                                    id="teamSize"
                                    value={teamSize}
                                    onChange={(e) => setTeamSize(e.target.value)}
                                    className="w-full bg-gray-800/50 border-0 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-0 focus:bg-gray-800 transition-colors appearance-none cursor-pointer [&>option]:bg-[#0a0a0f]"
                                    required
                                >
                                    <option value="1-10">1-10 osób</option>
                                    <option value="11-50">11-50 osób</option>
                                    <option value="51-200">51-200 osób</option>
                                    <option value="200+">200+ osób</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="industry" className="text-gray-400 text-sm">Branża</Label>
                                <select
                                    id="industry"
                                    value={industry}
                                    onChange={(e) => setIndustry(e.target.value)}
                                    className="w-full bg-gray-800/50 border-0 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-0 focus:bg-gray-800 transition-colors appearance-none cursor-pointer [&>option]:bg-[#0a0a0f]"
                                    required
                                >
                                    <option value="Technology">Technologia / IT</option>
                                    <option value="Marketing">Marketing / Agencja</option>
                                    <option value="Finance">Finanse</option>
                                    <option value="Education">Edukacja</option>
                                    <option value="Health">Zdrowie</option>
                                    <option value="E-commerce">E-commerce</option>
                                    <option value="Other">Inna</option>
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    variant="ghost"
                                    className="flex-1 py-6 rounded-full bg-gray-800 text-white hover:bg-gray-700 hover:text-gray-200"
                                >
                                    ← Wstecz
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-amber-500 py-6 text-black font-medium hover:bg-amber-400 rounded-full"
                                >
                                    {loading ? 'Konfigurowanie...' : 'Rozpocznij'}
                                </Button>
                            </div>
                        </form>
                    )}
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
