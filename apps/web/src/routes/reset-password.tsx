import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { emailOtp } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'
import { DashboardMockup } from '@/components/auth/DashboardMockup'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>) => ({
    email: (search.email as string) || '',
  }),
})

function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { email: initialEmail } = Route.useSearch()

  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('auth.resetPassword.errorMismatch'))
      setError(t('resetPassword.error.mismatch'))
      return
    }

    if (password.length < 8) {
      setError(t('auth.resetPassword.errorLength'))
      setError(t('resetPassword.error.length'))
      return
    }

    if (otp.length !== 6) {
      setError(t('auth.resetPassword.errorCode'))
      setError(t('resetPassword.error.codeLength'))
      return
    }

    setLoading(true)

    try {
      const result = await emailOtp.resetPassword({
        email,
        otp,
        password,
      })

      if (result.error) {
        setError(result.error.message || t('auth.resetPassword.errorDefault'))
        setError(result.error.message || t('resetPassword.error.reset'))
      } else {
        setSuccess(true)
        setTimeout(() => {
          navigate({ to: '/login' })
        }, 3000)
      }
    } catch (err) {
      setError(t('auth.resetPassword.errorDefault'))
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
            <p className="mt-2 text-gray-400">{t('auth.resetPassword.newPasswordTitle')}</p>
            <p className="mt-2 text-gray-400">{t('resetPassword.title')}</p>
          </div>

          {success ? (
            <div className="rounded-lg bg-green-500/10 p-6 text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-xl font-semibold text-white mb-2">{t('auth.resetPassword.successResetTitle')}</h2>
              <p className="text-gray-400">
                {t('auth.resetPassword.successResetDesc')}
              <h2 className="text-xl font-semibold text-white mb-2">{t('resetPassword.successTitle')}</h2>
              <p className="text-gray-400">
                {t('resetPassword.successMessage')}
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
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
                  <Label htmlFor="otp" className="text-gray-400 text-sm">{t('auth.resetPassword.codeLabel')}</Label>
                  <Label htmlFor="otp" className="text-gray-400 text-sm">{t('resetPassword.code')}</Label>
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full border-0 border-b-2 border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pb-3 transition-colors outline-none shadow-none text-center text-2xl tracking-widest font-mono"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-400 text-sm">{t('auth.resetPassword.newPasswordLabel')}</Label>
                  <Label htmlFor="password" className="text-gray-400 text-sm">{t('resetPassword.password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border-0 border-b-2 border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pb-3 transition-colors outline-none shadow-none"
                      placeholder={t('auth.resetPassword.tip1')}
                      required
                      minLength={8}
                    />
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500">🔐</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-400 text-sm">{t('auth.resetPassword.confirmPasswordLabel')}</Label>
                  <Label htmlFor="confirmPassword" className="text-gray-400 text-sm">{t('resetPassword.confirmPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full border-0 border-b-2 border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 pb-3 transition-colors outline-none shadow-none"
                      placeholder={t('auth.resetPassword.confirmPasswordLabel')}
                      required
                      minLength={8}
                    />
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500">🔐</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 py-6 text-black font-medium hover:bg-amber-400 rounded-full"
                >
                  {loading ? t('auth.resetPassword.resetting') : t('auth.resetPassword.resetButton')}
                  {loading ? t('resetPassword.resetting') : t('resetPassword.submit')}
                </Button>

                <div className="mt-6 text-center">
                  <Link to="/forgot-password" className="text-sm text-amber-500 hover:underline">
                    {t('auth.resetPassword.resendCode')}
                    {t('resetPassword.resend')}
                  </Link>
                </div>

                <p className="mt-4 text-center text-gray-400">
                  {t('auth.resetPassword.rememberPassword')}{' '}
                  <Link to="/login" className="text-amber-500 hover:underline font-medium">
                    {t('auth.resetPassword.backToLogin')}
                  {t('auth.noAccount')}{' '}
                  <Link to="/login" className="text-amber-500 hover:underline font-medium">
                    {t('auth.backToLogin')}
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
            {t('auth.resetPassword.newPasswordSubtitle')}
          </h2>
          <p className="mt-6 text-lg text-gray-400">
            {t('auth.resetPassword.newPasswordDesc')}
            {t('resetPassword.marketingTitle')}
          </h2>
          <p className="mt-6 text-lg text-gray-400">
            {t('resetPassword.marketingDesc')}
          </p>

          {/* Tips */}
          <div className="mt-12 rounded-xl bg-gray-800/50 p-6 border border-gray-700">
            <h3 className="text-white font-semibold mb-4">💡 {t('auth.resetPassword.tipsTitle')}</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>✓ {t('auth.resetPassword.tip1')}</li>
              <li>✓ {t('auth.resetPassword.tip2')}</li>
              <li>✓ {t('auth.resetPassword.tip3')}</li>
              <li>✓ {t('auth.resetPassword.tip4')}</li>
            <h3 className="text-white font-semibold mb-4">{t('resetPassword.tips.title')}</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>{t('resetPassword.tips.length')}</li>
              <li>{t('resetPassword.tips.complexity')}</li>
              <li>{t('resetPassword.tips.common')}</li>
              <li>{t('resetPassword.tips.unique')}</li>
            </ul>
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
