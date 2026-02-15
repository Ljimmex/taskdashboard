import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { forgetPassword } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'
import { DashboardMockup } from '@/components/auth/DashboardMockup'

export const Route = createFileRoute('/forgot-password')({
    component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const result = await forgetPassword.emailOtp({
                email,
            })

            if (result.error) {
                setError(result.error.message || t('auth.error.send'))
            } else {
                setSuccess(true)
                setTimeout(() => {
                    navigate({
                        to: '/reset-password',
                        search: { email }
                    })
                }, 2000)
            }
        } catch (err) {
            setError(t('auth.error.default'))
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
                        <p className="mt-2 text-gray-400">{t('auth.resetPassword.title')}</p>
                    </div>

                    {success ? (
                        <div className="rounded-lg bg-green-500/10 p-6 text-center">
                            <div className="text-4xl mb-4">✅</div>
                            <h2 className="text-xl font-semibold text-white mb-2">{t('auth.resetPassword.successTitle')}</h2>
                            <p className="text-gray-400">
                                {t('auth.resetPassword.successDesc')}
                            </p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-gray-400 text-sm">{t('auth.resetPassword.emailLabel')}</Label>
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

                                <p className="text-sm text-gray-400">
                                    {t('auth.resetPassword.descInput')}
                                </p>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-amber-500 py-6 text-black font-medium hover:bg-amber-400 rounded-full"
                                >
                                    {loading ? t('auth.resetPassword.sending') : t('auth.resetPassword.sendCode')}
                                </Button>

                                <p className="mt-6 text-center text-gray-400">
                                    {t('auth.resetPassword.rememberPassword')}{' '}
                                    <Link to="/login" className="text-amber-500 hover:underline font-medium">
                                        {t('auth.resetPassword.backToLogin')}
                                    </Link>
                                </p>
                            </form>
                        </>
                    )}
                </div>
            </div>

            {/* Right side - Marketing */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 bg-[#0d0d12]">
                <div className="max-w-lg mb-8">
                    <h2 className="text-5xl font-bold text-white leading-tight">
                        {t('auth.resetPassword.subtitle')}
                    </h2>
                    <p className="mt-6 text-lg text-gray-400">
                        {t('auth.resetPassword.desc')}
                    </p>

                    {/* Steps */}
                    <div className="mt-12 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-black font-bold">1</div>
                            <p className="text-gray-300">{t('auth.resetPassword.step1')}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-white font-bold">2</div>
                            <p className="text-gray-300">{t('auth.resetPassword.step2')}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-white font-bold">3</div>
                            <p className="text-gray-300">{t('auth.resetPassword.step3')}</p>
                        </div>
                    </div>
                </div>

                {/* App Preview - Mockup */}
                <div className="mt-12 w-full h-[300px] overflow-hidden">
                    <div className="w-[200%] origin-top-left transform scale-50">
                        <DashboardMockup />
                    </div>
                </div>
            </div>
        </div>
    )
}
