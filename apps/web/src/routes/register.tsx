import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { signUp, signIn } from '@/lib/auth'
import { apiFetch, apiFetchJson } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

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

        const params = new URLSearchParams(window.location.search)
        const workspaceSlug = params.get('workspace')
        const teamSlug = params.get('team')
        const inviteId = params.get('invite')

        if (inviteId) {
            handleInviteJoin(inviteId)
        } else if (workspaceSlug && teamSlug) {
            handleAutoJoin(workspaceSlug, teamSlug)
        } else {
            setStep(3)
        }
    }

    const handleInviteJoin = async (inviteId: string) => {
        setLoading(true)
        setError('')

        try {
            // 1. Register User
            const birthDateStr = birthYear && birthMonth && birthDay
                ? `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`
                : undefined

            const signUpResult = await signUp.email({
                email,
                password,
                name: `${firstName} ${lastName}`.trim(),
                position,
                gender,
                birthDate: birthDateStr,
            } as any)

            if (signUpResult.error) {
                setError(signUpResult.error.message || 'Błąd rejestracji')
                setLoading(false)
                return
            }

            // 2. Login User
            const signInResult = await signIn.email({ email, password })
            if (signInResult.error) {
                setError('Konto utworzone, ale błąd logowania. Spróbuj się zalogować.')
                navigate({ to: '/login' })
                setLoading(false)
                return
            }

            const activeUserId = signInResult.data?.user.id

            // 3. Accept Invite
            const acceptResponse = await apiFetchJson<any>(`/api/workspaces/invites/accept/${inviteId}`, {
                method: 'POST',
                headers: {
                    'x-user-id': activeUserId || ''
                }
            })

            if (!acceptResponse || acceptResponse.error) {
                console.error('Invite acceptance failed', acceptResponse?.error)
                // Maybe redirect to dashboard anyway?
                navigate({ to: '/dashboard' })
                return
            }

            const targetSlug = acceptResponse.workspaceSlug || acceptResponse.data?.workspaceSlug || 'dashboard'
            navigate({ to: `/${targetSlug}` })

        } catch (err) {
            console.error(err)
            setError('Wystąpił nieoczekiwany błąd podczas rejestracji z zaproszenia')
        } finally {
            setLoading(false)
        }
    }

    const handleAutoJoin = async (workspaceSlug: string, teamSlug: string) => {
        setLoading(true)
        setError('')

        try {
            // 1. Register User
            const birthDateStr = birthYear && birthMonth && birthDay
                ? `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`
                : undefined

            const signUpResult = await signUp.email({
                email,
                password,
                name: `${firstName} ${lastName}`.trim(),
                position,
                gender,
                birthDate: birthDateStr,
            } as any)

            if (signUpResult.error) {
                setError(signUpResult.error.message || 'Błąd rejestracji')
                setLoading(false)
                return
            }

            // 2. Login User
            const signInResult = await signIn.email({ email, password })
            if (signInResult.error) {
                setError('Konto utworzone, ale błąd logowania. Spróbuj się zalogować.')
                navigate({ to: '/login' })
                setLoading(false)
                return
            }

            const activeUserId = signInResult.data?.user.id

            // 3. Join Team
            const joinResponse = await apiFetch('/api/teams/join', {
                method: 'POST',
                headers: {
                    'x-user-id': activeUserId || ''
                },
                body: JSON.stringify({
                    workspaceSlug,
                    teamSlug
                })
            })

            if (!joinResponse.ok) {
                console.error('Auto-join failed', await joinResponse.text())
                // Still redirect to workspace even if join fails, user can try again
            }

            navigate({ to: `/${workspaceSlug}` })

        } catch (err) {
            console.error(err)
            setError('Wystąpił nieoczekiwany błąd podczas rejestracji')
        } finally {
            setLoading(false)
        }
    }

    const handleOAuthSignup = async (provider: 'google' | 'github' | 'slack') => {
        const getCallbackURL = () => {
            const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
            return `${origin}/dashboard`
        }

        setError('')
        setLoading(true)
        try {
            console.log(`[OAuth] Starting ${provider} signup...`)
            console.log(`[OAuth] API URL: ${import.meta.env.VITE_API_URL}`)
            console.log(`[OAuth] Callback URL: ${getCallbackURL()}`)

            const result = await signIn.social({
                provider,
                callbackURL: getCallbackURL(),
            })

            console.log(`[OAuth] Result:`, result)

            if (result?.error) {
                console.error(`[OAuth] Error:`, result.error)
                setError(`Błąd rejestracji przez ${provider}: ${result.error.message || 'Unknown error'}`)
            }
        } catch (err: any) {
            console.error(`[OAuth] Exception:`, err)
            setError(`Błąd rejestracji przez ${provider}: ${err?.message || 'Unknown error'}`)
        } finally {
            setLoading(false)
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

            const wsResponse = await apiFetch('/api/workspaces', {
                method: 'POST',
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
                                        className="w-full border-0 border-b-2 border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pb-3 transition-colors outline-none shadow-none"
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
                                        className="w-full border-0 border-b-2 border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pb-3 transition-colors outline-none shadow-none"
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
                                        className="w-full border-0 border-b-2 border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pb-3 transition-colors outline-none shadow-none"
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
                                    {/* Slack */}
                                    <button
                                        type="button"
                                        onClick={() => handleOAuthSignup('slack')}
                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/50 hover:bg-gray-700 transition-colors"
                                        title="Slack"
                                    >
                                        <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" /></svg>
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
                                    className="w-full border-0 border-b-2 border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pb-3 transition-colors outline-none shadow-none"
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
                                    className="w-full border-0 border-b-2 border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pb-3 transition-colors outline-none shadow-none"
                                    placeholder="Kowalski"
                                    required
                                />
                            </div>

                            {/* Date of Birth */}
                            <div className="space-y-2">
                                <Label className="text-gray-400 text-sm">Data urodzenia</Label>
                                <div className="grid grid-cols-3 gap-3">
                                    <Select value={birthDay} onValueChange={setBirthDay}>
                                        <SelectTrigger className="bg-transparent text-white border-0 border-b-2 border-gray-700 rounded-none focus:ring-0 focus:ring-offset-0 focus:border-amber-500 px-0 h-auto py-3">
                                            <SelectValue placeholder="Dzień" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#12121a] border-gray-800 text-white">
                                            {Array.from({ length: 31 }, (_, i) => (
                                                <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={birthMonth} onValueChange={setBirthMonth}>
                                        <SelectTrigger className="bg-transparent text-white border-0 border-b-2 border-gray-700 rounded-none focus:ring-0 focus:ring-offset-0 focus:border-amber-500 px-0 h-auto py-3">
                                            <SelectValue placeholder="Miesiąc" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#12121a] border-gray-800 text-white">
                                            {['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'].map((month, i) => (
                                                <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" key={i + 1} value={String(i + 1)}>{month}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={birthYear} onValueChange={setBirthYear}>
                                        <SelectTrigger className="bg-transparent text-white border-0 border-b-2 border-gray-700 rounded-none focus:ring-0 focus:ring-offset-0 focus:border-amber-500 px-0 h-auto py-3">
                                            <SelectValue placeholder="Rok" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#12121a] border-gray-800 text-white">
                                            {Array.from({ length: 100 }, (_, i) => {
                                                const year = new Date().getFullYear() - i - 10
                                                return <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" key={year} value={String(year)}>{year}</SelectItem>
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Gender */}
                            <div className="space-y-2">
                                <Label htmlFor="gender" className="text-gray-400 text-sm">Płeć</Label>
                                <Select value={gender} onValueChange={setGender}>
                                    <SelectTrigger className="w-full bg-transparent text-white border-0 border-b-2 border-gray-700 rounded-none focus:ring-0 focus:ring-offset-0 focus:border-amber-500 px-0 h-auto py-3">
                                        <SelectValue placeholder="Wybierz płeć" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#12121a] border-gray-800 text-white">
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="female">Kobieta</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="male">Mężczyzna</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="other">Inna</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="prefer_not_to_say">Wolę nie podawać</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Position (Replaced Phone) */}
                            <div className="space-y-2">
                                <Label htmlFor="position" className="text-gray-400 text-sm">Stanowisko</Label>
                                <Select value={position} onValueChange={setPosition}>
                                    <SelectTrigger className="w-full bg-transparent text-white border-0 border-b-2 border-gray-700 rounded-none focus:ring-0 focus:ring-offset-0 focus:border-amber-500 px-0 h-auto py-3">
                                        <SelectValue placeholder="Wybierz stanowisko" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#12121a] border-gray-800 text-white">
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Programmer">Programmer</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Web Designer">Web Designer</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Project Manager">Project Manager</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Marketing Specialist">Marketing Specialist</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="CEO / Founder">CEO / Founder</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Game Designer">Game Designer</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Game Developer">Game Developer</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="3D Artist">3D Artist</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="2D Artist">2D Artist / Concept Artist</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Animator">Animator</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Level Designer">Level Designer</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Sound Designer">Sound Designer</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="QA Tester">QA Tester</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Technical Artist">Technical Artist</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Producer">Producer</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
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
                                    className="w-full border-0 border-b-2 border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pb-3 transition-colors outline-none shadow-none"
                                    placeholder="Moja Firma"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="teamSize" className="text-gray-400 text-sm">Rozmiar Zespołu</Label>
                                <Select value={teamSize} onValueChange={setTeamSize}>
                                    <SelectTrigger className="w-full bg-transparent text-white border-0 border-b-2 border-gray-700 rounded-none focus:ring-0 focus:ring-offset-0 focus:border-amber-500 px-0 h-auto py-3">
                                        <SelectValue placeholder="Wybierz rozmiar zespołu" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#12121a] border-gray-800 text-white">
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="1-10">1-10 osób</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="11-50">11-50 osób</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="51-200">51-200 osób</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="200+">200+ osób</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="industry" className="text-gray-400 text-sm">Branża</Label>
                                <Select value={industry} onValueChange={setIndustry}>
                                    <SelectTrigger className="w-full bg-transparent text-white border-0 border-b-2 border-gray-700 rounded-none focus:ring-0 focus:ring-offset-0 focus:border-amber-500 px-0 h-auto py-3">
                                        <SelectValue placeholder="Wybierz branżę" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#12121a] border-gray-800 text-white">
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Technology">Technologia / IT</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Gamedev">Gamedev / Gry</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Marketing">Marketing / Agencja</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Finance">Finanse</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Education">Edukacja</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Health">Zdrowie</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="E-commerce">E-commerce</SelectItem>
                                        <SelectItem className="text-white focus:bg-gray-800 focus:text-white cursor-pointer" value="Other">Inna</SelectItem>
                                    </SelectContent>
                                </Select>
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
