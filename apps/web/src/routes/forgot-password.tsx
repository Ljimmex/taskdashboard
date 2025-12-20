import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { forgetPassword } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/forgot-password')({
    component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
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
                setError(result.error.message || 'Nie udało się wysłać kodu')
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
                        <p className="mt-2 text-gray-400">Zresetuj swoje hasło</p>
                    </div>

                    {success ? (
                        <div className="rounded-lg bg-green-500/10 p-6 text-center">
                            <div className="text-4xl mb-4">✅</div>
                            <h2 className="text-xl font-semibold text-white mb-2">Kod wysłany!</h2>
                            <p className="text-gray-400">
                                Sprawdź swoją skrzynkę pocztową. Za chwilę zostaniesz przekierowany...
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

                                <p className="text-sm text-gray-400">
                                    Wyślemy Ci 6-cyfrowy kod na podany adres email, którego użyjesz do zresetowania hasła.
                                </p>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-amber-500 py-6 text-black font-medium hover:bg-amber-400 rounded-full"
                                >
                                    {loading ? 'Wysyłanie...' : 'Wyślij kod resetujący'}
                                </Button>

                                <p className="mt-6 text-center text-gray-400">
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
                        Nie martw się!
                    </h2>
                    <p className="mt-6 text-lg text-gray-400">
                        Zresetowanie hasła jest proste. Wyślemy Ci kod na email,
                        a Ty ustawisz nowe hasło w kilka sekund.
                    </p>

                    {/* Steps */}
                    <div className="mt-12 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-black font-bold">1</div>
                            <p className="text-gray-300">Wpisz swój email</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-white font-bold">2</div>
                            <p className="text-gray-300">Odbierz kod z emaila</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-white font-bold">3</div>
                            <p className="text-gray-300">Ustaw nowe hasło</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
