import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { emailOtp } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>) => ({
    email: (search.email as string) || '',
  }),
})

function ResetPasswordPage() {
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
      setError('Hasła nie są identyczne')
      return
    }

    if (password.length < 8) {
      setError('Hasło musi mieć minimum 8 znaków')
      return
    }

    if (otp.length !== 6) {
      setError('Kod musi mieć 6 cyfr')
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
        setError(result.error.message || 'Nie udało się zresetować hasła')
      } else {
        setSuccess(true)
        setTimeout(() => {
          navigate({ to: '/login' })
        }, 3000)
      }
    } catch (err) {
      setError('Wystąpił nieoczekiwany błąd')
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
            <p className="mt-2 text-gray-400">Ustaw nowe hasło</p>
          </div>

          {success ? (
            <div className="rounded-lg bg-green-500/10 p-6 text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-xl font-semibold text-white mb-2">Hasło zmienione!</h2>
              <p className="text-gray-400">
                Możesz teraz zalogować się nowym hasłem. Za chwilę zostaniesz przekierowany...
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
                  <Label htmlFor="otp" className="text-gray-400 text-sm">Kod z emaila (6 cyfr)</Label>
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="border-0 border-b border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 pb-3 text-center text-2xl tracking-widest font-mono"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-400 text-sm">Nowe hasło</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-0 border-b border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 pb-3"
                      placeholder="Minimum 8 znaków"
                      required
                      minLength={8}
                    />
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500">🔐</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-400 text-sm">Potwierdź hasło</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="border-0 border-b border-gray-700 bg-transparent text-white placeholder-gray-500 rounded-none focus:border-amber-500 focus:ring-0 pb-3"
                      placeholder="Powtórz hasło"
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
                  {loading ? 'Resetowanie...' : 'Zresetuj hasło'}
                </Button>

                <div className="mt-6 text-center">
                  <Link to="/forgot-password" className="text-sm text-amber-500 hover:underline">
                    Nie dostałeś kodu? Wyślij ponownie
                  </Link>
                </div>

                <p className="mt-4 text-center text-gray-400">
                  Pamiętasz hasło?{' '}
                  <Link to="/login" className="text-amber-500 hover:underline font-medium">
                    Zaloguj się
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Right side - Marketing */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 bg-[#0d0d12]">
        <div className="max-w-lg">
          <h2 className="text-5xl font-bold text-white leading-tight">
            Prawie gotowe!
          </h2>
          <p className="mt-6 text-lg text-gray-400">
            Wpisz kod który otrzymałeś na email i ustaw nowe, bezpieczne hasło.
          </p>

          {/* Tips */}
          <div className="mt-12 rounded-xl bg-gray-800/50 p-6 border border-gray-700">
            <h3 className="text-white font-semibold mb-4">💡 Wskazówki dot. hasła</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>✓ Minimum 8 znaków</li>
              <li>✓ Użyj kombinacji liter, cyfr i symboli</li>
              <li>✓ Unikaj oczywistych słów</li>
              <li>✓ Nie używaj tego samego hasła w innych miejscach</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
