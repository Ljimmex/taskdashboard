import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { signIn, authClient, emailOtp } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LanguageSwitcher } from '@/components/language-switcher'
import { DashboardMockup } from '@/components/auth/DashboardMockup'

export const Route = createFileRoute('/login')({
    component: LoginPage,
})

function LoginPage() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // 2FA State
    const [isEmailVerification, setIsEmailVerification] = useState(false)
    const [emailVerificationSent, setEmailVerificationSent] = useState(false)

    // 2FA State
    const [isTwoFactor, setIsTwoFactor] = useState(false)
    const [twoFactorCode, setTwoFactorCode] = useState('')

    // Email Verification State
    const [isEmailVerification, setIsEmailVerification] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const result = await signIn.email({
                email,
                password,
                rememberMe,
            })

            console.log("Login result:", result)

            if (result.error) {
                // Check for email verification requirement FIRST
                if (result.error.code === "EMAIL_NOT_VERIFIED" ||
                    result.error.message?.toLowerCase().includes("verify") ||
                    result.error.message?.toLowerCase().includes("weryfik")) {
                    setIsEmailVerification(true)
                    setError('')
                    return
                }

                // Check for 2FA requirement in error
                if (result.error.message?.includes("2FA") ||
                    (result.error as any).code === "TWO_FACTOR_REQUIRED" ||
                    (result.error as any).code === "EMAIL_NOT_VERIFIED" ||
                    result.error.status === 403) {

                    // Handle Email Not Verified FIRST
                    if ((result.error as any).code === "EMAIL_NOT_VERIFIED" || result.error.message === "Email not verified") {
                        setIsEmailVerification(true)
                        setError('')
                        return
                    }

                    if (result.error.message === "Two factor authentication required" || result.error.status === 403) {
                        setIsTwoFactor(true)
                        setError('')
                        return
                    }
                    (result.error as any).code === "TWO_FACTOR_REQUIRED") {
                    setIsTwoFactor(true)
                    setError('')
                    return
                }



                // Try to translate error message if possible, otherwise fallback to server message
                setError(result.error.message || t('auth.error.login'))
            } else if ((result.data as any)?.twoFactor || (result.data as any)?.twoFactorRedirect) {
                // Handle 2FA
                console.log("2FA required, showing form...")
                setIsTwoFactor(true)
                setError('')
            } else {
                const params = new URLSearchParams(window.location.search)
                const workspaceSlug = params.get('workspace')
                const teamSlug = params.get('team')

                if (workspaceSlug && teamSlug) {
                    try {
                        const activeUserId = result.data?.user.id
                        await apiFetch('/api/teams/join', {
                            method: 'POST',
                            headers: {
                                'x-user-id': activeUserId || ''
                            },
                            body: JSON.stringify({
                                workspaceSlug,
                                teamSlug
                            })
                        })
                        navigate({ to: `/${workspaceSlug}` })
                        return
                    } catch (joinErr) {
                        console.error('Login auto-join failed', joinErr)
                    }
                }

                navigate({ to: '/dashboard' })
            }
        } catch (err) {
            // Catch explicit EMAIL_NOT_VERIFIED if thrown
            if ((err as any)?.code === "EMAIL_NOT_VERIFIED" || (err as any)?.message === "Email not verified") {
                setIsEmailVerification(true)
                setError('')
                return
            }
            setError(t('auth.error.default'))
        } finally {
            setLoading(false)
        }
    }

    const handle2FAVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await authClient.twoFactor.verifyTotp({
                code: twoFactorCode,
                trustDevice: rememberMe
            })

            if (res.error) {
                setError(res.error.message || t('auth.error.login'))
            } else {
                navigate({ to: '/dashboard' })
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const [otp, setOtp] = useState('')

    const handleVerifyEmail = async () => {
        setLoading(true)
        try {
            const res = await emailOtp.verifyEmail({
                email,
                otp
            })

            if (res.error) {
                setError(res.error.message || t('auth.error.default'))
            } else {
                // If verification successful, try to login again or redirect
                setError('')
                setIsEmailVerification(false)
                // Optionally auto-login if token is valid, but usually better to let them login again or continue session
                // For better-auth, verifyEmail might establish session? Check docs/implementation.
                // Assuming it might not auto-login, we could re-trigger handleSubmit or just let user login.
                // Let's try to just navigate or reload.
                // Re-attempt login logic:
                handleSubmit({ preventDefault: () => { } } as React.FormEvent)
            }
        } catch (err: any) {
            setError(err.message || t('auth.error.default'))
    const handleResendVerification = async () => {
        setLoading(true)
        setError('')
        try {
            await authClient.emailOtp.sendVerificationOtp({
                email,
                type: "email-verification"
            })
            setEmailVerificationSent(true)
        } catch (err) {
            setError('Failed to resend verification email')
        } finally {
            setLoading(false)
        }
    }

    const handleResendVerification = async () => {
        setLoading(true)
        try {
            await emailOtp.sendVerificationOtp({
                email,
                type: 'email-verification'
            })
            // Using a simple alert or toast if available. For now just set error to success message (or use error state with green color logic, but clearer to just use error field for feedback)
            // Or better, just show a success text.
            setError(t('auth.resentVerification'))
            // Clear error after 3s
            setTimeout(() => setError(''), 3000)
        } catch (err) {
            setError(t('auth.error.default'))
    const [verificationCode, setVerificationCode] = useState('')

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await authClient.emailOtp.verifyEmail({
                email,
                otp: verificationCode
            })

            if (res.error) {
                setError(res.error.message || t('auth.error.default'))
            } else {
                // Verification successful, now login
                const loginRes = await signIn.email({
                    email,
                    password,
                    rememberMe
                })

                if (loginRes.error) {
                    setError(loginRes.error.message || t('auth.error.login'))
                } else {
                    navigate({ to: '/dashboard' })
                }
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const getCallbackURL = () => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
        return `${origin}/dashboard`
    }

    const handleOAuthLogin = async (provider: 'google' | 'github' | 'slack') => {
        setError('')
        setLoading(true)
        try {
            const result = await signIn.social({
                provider,
                callbackURL: getCallbackURL(),
            })

            if (result?.error) {
                setError(t('auth.error.provider', { provider }))
            }
        } catch (err: any) {
            setError(t('auth.error.provider', { provider }))
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
                    <div className="mb-10">
                        <h1 className="text-3xl font-bold text-white">
                            <img src="/Zadano/Zadano_Logo_Full_Dark.svg" alt="Zadano.app" className="h-8" />
                        </h1>
                        <p className="mt-2 text-gray-400">
                            {isTwoFactor ? t('auth.title2FA') : isEmailVerification ? t('auth.verifyEmailTitle') : t('auth.title')}
                            {isTwoFactor ? t('auth.title2FA') :
                                isEmailVerification ? t('auth.verifyEmail.title') :
                                    t('auth.title')}
                        </p>
                    </div>

                    {error && (
                        <div className={`mb-4 rounded-lg p-3 text-sm ${error === t('auth.resentVerification') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {error}
                        </div>
                    )}

                    {isEmailVerification ? (
                        <div className="space-y-6">
                            <div className="flex justify-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>

                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-semibold text-white">{t('auth.verifyEmailTitle')}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    {t('auth.verifyEmailDescCode')}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="otp" className="text-gray-400 text-sm">{t('auth.enterCode')}</Label>
                                    <Input
                                        id="otp"
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="w-full border-0 border-b-2 border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pb-3 transition-colors outline-none shadow-none text-center tracking-widest text-xl"
                                        placeholder={t('auth.codePlaceholder')}
                                        autoFocus
                                    />
                                </div>

                                <Button
                                    onClick={handleVerifyEmail}
                                    disabled={loading || otp.length !== 6}
                                    className="w-full bg-amber-500 py-6 text-black font-medium hover:bg-amber-400 rounded-full"
                                >
                                    {loading ? t('auth.verifying') : t('auth.verify')}
                                </Button>

                                <button
                                    type="button"
                                    onClick={handleResendVerification}
                                    className="w-full text-sm text-gray-400 hover:text-white"
                                >
                                    {t('auth.resendVerification')}
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsEmailVerification(false)}
                                className="w-full text-sm text-gray-500 hover:text-white"
                            >
                                {t('auth.backToLogin')}
                            <div className="text-center">
                                <h2 className="text-xl font-semibold text-white mb-2">{t('auth.verifyEmail.title')}</h2>
                                <p className="text-gray-400 mb-6">
                                    {t('auth.verifyEmail.message')}
                                </p>
                                {emailVerificationSent ? (
                                    <div className="text-green-500 font-medium p-2 bg-green-500/10 rounded mb-4">
                                        {t('auth.verifyEmail.sent')}
                                    </div>
                                ) : null}

                                <form onSubmit={handleVerifyEmail} className="space-y-4">
                                    <div className="space-y-2 text-left">
                                        <Label htmlFor="verificationCode" className="text-gray-400 text-sm">{t('auth.code2FA')} (Email)</Label>
                                        <Input
                                            id="verificationCode"
                                            type="text"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className="w-full border-0 border-b-2 border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pb-3 transition-colors outline-none shadow-none text-center tracking-widest text-xl"
                                            placeholder="000 000"
                                            required
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={loading || verificationCode.length !== 6}
                                        className="w-full bg-amber-500 py-6 text-black font-medium hover:bg-amber-400 rounded-full"
                                    >
                                        {loading ? t('auth.verifying') : t('auth.verifyEmail.submit')}
                                    </Button>

                                    {!emailVerificationSent && (
                                        <Button
                                            type="button"
                                            onClick={handleResendVerification}
                                            disabled={loading}
                                            variant="ghost"
                                            className="w-full text-amber-500 hover:text-amber-400 hover:bg-transparent"
                                        >
                                            {t('auth.verifyEmail.resend')}
                                        </Button>
                                    )}
                                </form>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEmailVerification(false)
                                    setEmailVerificationSent(false)
                                }}
                                className="w-full text-sm text-gray-500 hover:text-white"
                            >
                                {t('auth.verifyEmail.back')}
                            </button>
                        </div>
                    ) : isTwoFactor ? (
                        <form onSubmit={handle2FAVerify} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="2fa" className="text-gray-400 text-sm">{t('auth.code2FA')}</Label>
                                <Input
                                    id="2fa"
                                    type="text"
                                    value={twoFactorCode}
                                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full border-0 border-b-2 border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pb-3 transition-colors outline-none shadow-none text-center tracking-widest text-xl"
                                    placeholder="000 000"
                                    autoFocus
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading || twoFactorCode.length !== 6}
                                className="w-full bg-amber-500 py-6 text-black font-medium hover:bg-amber-400 rounded-full"
                            >
                                {loading ? t('auth.verifying') : t('auth.verify2FA')}
                            </Button>

                            <button
                                type="button"
                                onClick={() => setIsTwoFactor(false)}
                                className="w-full text-sm text-gray-500 hover:text-white"
                            >
                                {t('auth.backToLogin')}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-400 text-sm">{t('auth.email')}</Label>
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
                                <Label htmlFor="password" className="text-gray-400 text-sm">{t('auth.password')}</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full border-0 border-b-2 border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pb-3 transition-colors outline-none shadow-none"
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
                                    {t('auth.rememberMe')}
                                </label>
                                <Link to="/forgot-password" className="text-sm text-amber-500 hover:underline">
                                    {t('auth.forgotPassword')}
                                </Link>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-amber-500 py-6 text-black font-medium hover:bg-amber-400 rounded-full"
                            >
                                {loading ? t('auth.verifying') : t('auth.submit')}
                            </Button>

                            {/* OAuth buttons */}
                            <div className="mt-6">
                                <p className="text-sm text-gray-400 mb-4">{t('auth.loginWith')}</p>
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
                                    {/* Slack */}
                                    <button
                                        type="button"
                                        onClick={() => handleOAuthLogin('slack')}
                                        className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                                        title="Slack"
                                    >
                                        <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" /></svg>
                                    </button>
                                </div>
                            </div>

                            <p className="mt-6 text-center text-gray-400">
                                {t('auth.noAccount')}{' '}
                                <Link to="/register" className="text-amber-500 hover:underline font-medium">
                                    {t('auth.register')}
                                </Link>
                            </p>
                        </form>
                    )}
                </div>
            </div>

            <div className="absolute top-4 right-4 z-50">
                <LanguageSwitcher />
            </div>
            {/* Right side - Marketing */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 bg-[#0d0d12]">
                <div className="max-w-lg">
                    <h2 className="text-5xl font-bold text-white leading-tight">
                        {t('auth.marketingTitle')} <span className="text-amber-500">{t('auth.marketingTitleStrong')}</span><br />
                        {t('auth.marketingTitle2')}
                    </h2>
                    <p className="mt-6 text-lg text-gray-400">
                        {t('auth.marketingDesc')}
                    </p>

                    {/* App Preview - Mockup */}
                    <div className="mt-12 w-full h-[300px] overflow-hidden">
                        <div className="w-[200%] origin-top-left transform scale-50">
                            <DashboardMockup />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
