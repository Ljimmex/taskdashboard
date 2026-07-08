import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { forgetPassword } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
            search: { email },
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
      <div className="flex w-full flex-col justify-center bg-[#0a0a0f] px-8 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Logo */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-white">
              <img src="/Zadano/Zadano_Logo_Full_Dark.svg" alt="Zadano.app" className="h-8" />
            </h1>
            <p className="mt-2 text-gray-400">{t('forgotPassword.title')}</p>
          </div>

          {success ? (
            <div className="rounded-lg bg-green-500/10 p-6 text-center">
              <div className="mb-4 text-4xl">✅</div>
              <h2 className="mb-2 text-xl font-semibold text-white">
                {t('forgotPassword.successTitle')}
              </h2>
              <p className="text-gray-400">{t('forgotPassword.successMessage')}</p>
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
                  <Label htmlFor="email" className="text-sm text-gray-400">
                    {t('forgotPassword.email')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-none border-0 border-b-2 border-gray-700 bg-transparent pb-3 text-white placeholder-gray-500 shadow-none outline-none transition-colors focus:border-amber-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="twoj@email.com"
                      required
                    />
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-amber-500">
                      @
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-400">{t('forgotPassword.subtitle')}</p>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-amber-500 py-6 font-medium text-black hover:bg-amber-400"
                >
                  {loading ? t('forgotPassword.sending') : t('forgotPassword.submit')}
                </Button>

                <p className="mt-6 text-center text-gray-400">
                  {t('forgotPassword.backToLogin')}{' '}
                  <Link to="/login" className="font-medium text-amber-500 hover:underline">
                    {t('forgotPassword.login')}
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Right side - Marketing */}
      <div className="hidden flex-col justify-center bg-[#0d0d12] px-16 lg:flex lg:w-1/2">
        <div className="mb-8 max-w-lg">
          <h2 className="text-5xl font-bold leading-tight text-white">
            {t('forgotPassword.marketingTitle')}
          </h2>
          <p className="mt-6 text-lg text-gray-400">{t('forgotPassword.marketingDesc')}</p>

          {/* Steps */}
          <div className="mt-12 space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 font-bold text-black">
                1
              </div>
              <p className="text-gray-300">{t('forgotPassword.step1')}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 font-bold text-white">
                2
              </div>
              <p className="text-gray-300">{t('forgotPassword.step2')}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 font-bold text-white">
                3
              </div>
              <p className="text-gray-300">{t('forgotPassword.step3')}</p>
            </div>
          </div>
        </div>

        {/* App Preview - Mockup */}
        <div className="mt-12 h-[300px] w-full overflow-hidden">
          <div className="w-[200%] origin-top-left scale-50 transform">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </div>
  )
}
