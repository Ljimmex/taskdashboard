import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSession } from '@/lib/auth'
import { authClient } from '@/lib/auth'
import { Laptop, Shield, Phone, XCircle, Loader2 } from 'lucide-react'
import { UAParser } from 'ua-parser-js'
import { countryCodes } from '@/constants/countryCodes'

interface Session {
    id: string
    ipAddress: string
    userAgent: string
    createdAt: Date
    expiresAt: Date
    isCurrent: boolean
}

export function PrivacySettingsTab() {
    const { t } = useTranslation()
    const { data: session } = useSession()

    // UI States
    const [isChangingPassword, setIsChangingPassword] = useState(false)
    const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
    const [showPasswordForm, setShowPasswordForm] = useState(false)

    const [isChangingEmail, setIsChangingEmail] = useState(false)
    const [newEmail, setNewEmail] = useState('')

    // Phone state
    const [phoneNumber, setPhoneNumber] = useState((session?.user as any)?.phoneNumber?.replace(/^\+\d+\s*/, '') || '')
    const [countryCode, setCountryCode] = useState(() => {
        const phone = (session?.user as any)?.phoneNumber
        if (phone && phone.startsWith('+')) {
            return phone.substring(0, 3)
        }
        return '+48'
    })
    const [isSavingPhone, setIsSavingPhone] = useState(false)

    const [isEnable2FA, setIsEnable2FA] = useState(false)
    const [twoFactorSeamless, setTwoFactorSeamless] = useState(false)
    const [isDisabling2FA, setIsDisabling2FA] = useState(false)
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [twoFactorCode, setTwoFactorCode] = useState('')
    const [isVerifying2FA, setIsVerifying2FA] = useState(false)

    // 2FA Password Prompt State
    const [show2FAPasswordPrompt, setShow2FAPasswordPrompt] = useState(false)
    const [twoFactorPassword, setTwoFactorPassword] = useState('')
    const [isLoading2FA, setIsLoading2FA] = useState(false)

    const [sessions, setSessions] = useState<Session[]>([])
    const [isLoadingSessions, setIsLoadingSessions] = useState(false)

    const fetchSessions = useCallback(async () => {
        setIsLoadingSessions(true)
        try {
            const { data } = await authClient.listSessions()
            if (data) {
                // Map to our interface and mark current session
                const formattedSessions = data.map((s: any) => ({
                    ...s,
                    isCurrent: s.isCurrent // better-auth usually provides this
                }))
                setSessions(formattedSessions)
            }
        } catch (error) {
            console.error("Failed to fetch sessions", error)
        } finally {
            setIsLoadingSessions(false)
        }
    }, [])

    useEffect(() => {
        fetchSessions()
    }, [fetchSessions])

    // Load existing phone number if available
    useEffect(() => {
        const user = session?.user as any
        if (user?.phoneNumber) {
            const rawNumber = user.phoneNumber as string
            // Attempt to find the matching country code
            // Sort by length descending to match longest code first (e.g. +1 vs +1-246)
            const sortedCodes = [...countryCodes].sort((a, b) => b.code.length - a.code.length)
            const matched = sortedCodes.find(c => rawNumber.startsWith(c.code))

            if (matched) {
                setCountryCode(matched.code)
                setPhoneNumber(rawNumber.replace(matched.code, ''))
            } else {
                // Fallback: assume +48 or just show full number if odd
                if (rawNumber.startsWith('+')) {
                    // Try basic length 3 fallback
                    const potentialCode = rawNumber.substring(0, 3) // e.g. +48
                    setCountryCode(potentialCode)
                    setPhoneNumber(rawNumber.substring(3))
                } else {
                    setPhoneNumber(rawNumber)
                }
            }
        }
    }, [session])

    // Handlers
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (passwordForm.new !== passwordForm.confirm) {
            alert("New passwords don't match")
            return
        }
        setIsChangingPassword(true)
        try {
            await authClient.changePassword({
                newPassword: passwordForm.new,
                currentPassword: passwordForm.current,
                revokeOtherSessions: true
            })
            alert("Password updated successfully")
            setPasswordForm({ current: '', new: '', confirm: '' })
            setShowPasswordForm(false)
        } catch (err: any) {
            alert(err.message || "Failed to update password")
        } finally {
            setIsChangingPassword(false)
        }
    }

    const handleChangeEmail = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsChangingEmail(true)
        try {
            await authClient.changeEmail({
                newEmail: newEmail,
                callbackURL: window.location.href
            })
            alert("Verification email sent to new address")
            setNewEmail('')
        } catch (err: any) {
            alert(err.message || "Failed to initiate email change")
        } finally {
            setIsChangingEmail(false)
        }
    }

    const handleSavePhone = async () => {
        setIsSavingPhone(true)
        const fullNumber = `${countryCode}${phoneNumber}`
        try {
            await authClient.updateUser({
                // @ts-ignore - phoneNumber is in DB schema but might be missing from types if plugin is disabled
                phoneNumber: fullNumber,
            })
            alert("Phone number saved")
        } catch (err: any) {
            console.error(err)
            alert(err.message || "Failed to update phone number")
        } finally {
            setIsSavingPhone(false)
        }
    }

    const handleStart2FA = () => {
        setShow2FAPasswordPrompt(true)
    }

    const confirmEnable2FA = async () => {
        setIsLoading2FA(true)
        try {
            const { data, error } = await authClient.twoFactor.enable({
                password: twoFactorPassword
            })
            if (error) throw error
            if (data?.totpURI) {
                // Attempt to add logo for authenticators that support it (Authy often ignores this)
                const totpWithLogo = `${data.totpURI}&image=https://zadanoapp.com/logo.png`
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpWithLogo)}`
                setQrCode(qrUrl)
                setIsEnable2FA(true)
                setShow2FAPasswordPrompt(false)
            }
        } catch (err: any) {
            console.error("2FA enable failed", err)
            alert(err.message || "Failed to enable 2FA")
        } finally {
            setIsLoading2FA(false)
        }
    }

    const handleVerify2FA = async () => {
        setIsVerifying2FA(true)
        try {
            const { error } = await authClient.twoFactor.verifyTotp({
                code: twoFactorCode
            })
            if (error) throw error

            alert("2FA Enabled Successfully")
            setIsEnable2FA(false)
            setTwoFactorSeamless(true)
        } catch (err: any) {
            console.error(err)
            alert(err.message || "Invalid code")
        } finally {
            setIsVerifying2FA(false)
        }
    }

    const confirmDisable2FA = async () => {
        setIsLoading2FA(true)
        try {
            const { error } = await authClient.twoFactor.disable({
                password: twoFactorPassword
            })
            if (error) throw error
            alert("2FA Disabled")
            setIsDisabling2FA(false)
            setTwoFactorSeamless(false)
            setTwoFactorPassword('')
            // Refresh session to update UI state
            // @ts-ignore
            await session?.refresh?.() || window.location.reload()

            // Re-fetch sessions to be sure
            await fetchSessions()
        } catch (err: any) {
            console.error(err)
            alert(err.message || "Failed to disable 2FA")
        } finally {
            setIsLoading2FA(false)
        }
    }

    const handleRevokeSession = async (sessionId: string) => {
        try {
            await authClient.revokeSession({ token: sessionId })
            await fetchSessions()
        } catch (err: any) {
            console.error(err)
            alert(err.message || "Failed to revoke session")
        }
    }

    const handleRevokeAllSessions = async () => {
        if (!confirm(t('settings.privacy.sessions.confirmRevokeAll'))) return

        try {
            // Revoke others
            await authClient.revokeOtherSessions()
            // Sign out current
            await authClient.signOut()

            window.location.href = '/'
        } catch (err: any) {
            console.error(err)
            alert(err.message || "Failed to revoke sessions")
        }
    }

    const parseUserAgent = (uaString: string) => {
        const parser = new UAParser(uaString)
        const browser = parser.getBrowser()
        const os = parser.getOS()
        const device = parser.getDevice()

        const deviceName = device.model ? `${device.vendor || ''} ${device.model}` : (device.type === 'mobile' ? t('settings.privacy.sessions.device.mobile') : t('settings.privacy.sessions.device.desktop'))
        const browserName = `${browser.name || t('settings.privacy.sessions.device.browser')}`
        const osName = `${os.name || t('settings.privacy.sessions.device.os')}`

        return {
            name: `${browserName} on ${osName}`,
            type: device.type === 'mobile' || os.name === 'iOS' || os.name === 'Android' ? 'mobile' : 'desktop',
            desc: deviceName
        }
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h3 className="text-xl font-semibold text-white">{t('settings.privacy.title')}</h3>
                <p className="text-sm text-gray-400 mt-1">{t('settings.privacy.subtitle')}</p>
            </div>

            {/* Log In Preferences (Account Security) */}
            <section className="space-y-4">
                <h4 className="text-md font-medium text-white flex items-center gap-2">
                    {t('settings.privacy.loginPreferences')}
                </h4>
                <div className="bg-[#1a1a24] rounded-xl border border-gray-800/50 divide-y divide-gray-800">

                    {/* Password Row */}
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <h5 className="text-sm font-medium text-white">{t('settings.privacy.password')}</h5>
                            <button
                                onClick={() => setShowPasswordForm(!showPasswordForm)}
                                className="text-sm font-medium text-[#F2CE88] hover:text-[#d9b877] transition-colors"
                            >
                                {showPasswordForm ? t('settings.privacy.cancel') : t('settings.privacy.changePassword')}
                            </button>
                        </div>

                        {showPasswordForm && (
                            <form onSubmit={handleChangePassword} className="mt-6 space-y-4 bg-[#12121a] p-4 rounded-lg border border-gray-800">
                                <input
                                    type="password"
                                    placeholder={t('settings.privacy.currentPassword')}
                                    value={passwordForm.current}
                                    onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                                    className="w-full bg-[#0a0a0f] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:border-[#F2CE88] text-sm transition-colors"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="password"
                                        placeholder={t('settings.privacy.newPassword')}
                                        value={passwordForm.new}
                                        onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })}
                                        className="w-full bg-[#0a0a0f] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:border-[#F2CE88] text-sm transition-colors"
                                    />
                                    <input
                                        type="password"
                                        placeholder={t('settings.privacy.confirmNewPassword')}
                                        value={passwordForm.confirm}
                                        onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                        className="w-full bg-[#0a0a0f] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:border-[#F2CE88] text-sm transition-colors"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isChangingPassword || !passwordForm.current || !passwordForm.new}
                                        className="px-6 py-2 bg-[#F2CE88] hover:bg-[#d9b877] text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {isChangingPassword ? t('settings.privacy.updating') : t('settings.privacy.updatePassword')}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Email Row */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <h5 className="text-sm font-medium text-white">{t('settings.privacy.email')}</h5>
                        <div className="md:col-span-2">
                            <form onSubmit={handleChangeEmail} className="flex gap-3">
                                <input
                                    type="email"
                                    value={newEmail || session?.user?.email || ''}
                                    onChange={e => setNewEmail(e.target.value)}
                                    placeholder={session?.user?.email || t('settings.privacy.emailPlaceholder')}
                                    className="flex-1 bg-[#12121a] border border-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:border-[#F2CE88] text-sm transition-colors"
                                />
                                {newEmail && (
                                    <button
                                        type="submit"
                                        disabled={isChangingEmail}
                                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        {t('settings.privacy.save')}
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* Phone Row */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <h5 className="text-sm font-medium text-white">{t('settings.privacy.phoneNumber')}</h5>
                        <div className="md:col-span-2 flex gap-3 min-w-0">
                            <select
                                value={countryCode}
                                onChange={(e) => setCountryCode(e.target.value)}
                                className="bg-[#12121a] border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F2CE88] w-24 shrink-0 transition-colors"
                            >
                                {countryCodes.map((c) => (
                                    <option key={`${c.code}-${c.iso}`} value={c.code}>
                                        {c.code}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder={t('settings.privacy.phonePlaceholder')}
                                className="flex-1 w-full min-w-0 bg-[#12121a] border border-gray-800 rounded-lg px-4 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#F2CE88] transition-colors"
                            />
                            <button
                                onClick={handleSavePhone}
                                disabled={isSavingPhone}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shrink-0"
                            >
                                {isSavingPhone ? '...' : t('settings.privacy.save')}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Two-Factor Authentication (kept mostly as is but cleaned up container if needed) */}
            <section className="space-y-4">
                <h4 className="text-md font-medium text-white flex items-center gap-2">
                    {t('settings.privacy.twoFactor.title')}
                </h4>
                <div className="bg-[#1a1a24] rounded-xl p-6 border border-gray-800/50">
                    <div className="space-y-3">
                        <h5 className="text-sm font-medium text-white">{t('settings.privacy.twoFactor.securityTitle')}</h5>
                        <p className="text-xs text-gray-400">{t('settings.privacy.twoFactor.securityDescription')}</p>

                        <div className="pt-3">
                            {(session?.user?.twoFactorEnabled || twoFactorSeamless) ? (
                                isDisabling2FA ? (
                                    <div className="bg-[#12121a] p-6 rounded-lg border border-red-500/20 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h6 className="text-white text-sm font-medium">{t('settings.privacy.twoFactor.disableTitle')}</h6>
                                                <p className="text-xs text-gray-500">{t('settings.privacy.twoFactor.disableDescription')}</p>
                                            </div>
                                            <button onClick={() => { setIsDisabling2FA(false); setTwoFactorPassword(''); }} className="text-gray-500 hover:text-white"><XCircle className="w-5 h-5" /></button>
                                        </div>
                                        <div className="flex gap-3">
                                            <input
                                                type="password"
                                                placeholder={t('settings.privacy.twoFactor.passwordPlaceholder')}
                                                value={twoFactorPassword}
                                                onChange={e => setTwoFactorPassword(e.target.value)}
                                                className="flex-1 bg-[#0a0a0f] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-[#F2CE88]"
                                                onKeyDown={e => e.key === 'Enter' && confirmDisable2FA()}
                                            />
                                            <button
                                                onClick={confirmDisable2FA}
                                                disabled={!twoFactorPassword || isLoading2FA}
                                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                                            >
                                                {isLoading2FA && <Loader2 className="w-4 h-4 animate-spin" />}
                                                {t('settings.privacy.twoFactor.disable')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-[#12121a] p-4 rounded-lg border border-gray-800">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                                                    <p className="text-sm font-medium text-white">{t('settings.privacy.twoFactor.enabledTitle')}</p>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">{t('settings.privacy.twoFactor.enabledDescription')}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setIsDisabling2FA(true); setTwoFactorPassword(''); }}
                                            className="px-4 py-2 bg-[#1a1a24] hover:bg-red-500/10 text-gray-300 hover:text-red-500 text-sm font-medium rounded-lg transition-colors border border-gray-800 hover:border-red-500/50"
                                        >
                                            {t('settings.privacy.twoFactor.turnOff')}
                                        </button>
                                    </div>
                                )
                            ) : isEnable2FA ? (
                                <div className="bg-[#12121a] p-6 rounded-lg border border-gray-800 space-y-6">
                                    <div className="flex justify-between items-start">
                                        <h6 className="text-white text-sm font-medium">{t('settings.privacy.twoFactor.title')}</h6>
                                        <button onClick={() => { setIsEnable2FA(false); setQrCode(null); setTwoFactorPassword(''); setShow2FAPasswordPrompt(false); }} className="text-gray-500 hover:text-white"><XCircle className="w-5 h-5" /></button>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-8 items-center">
                                        <div className="bg-white p-2 rounded-lg">
                                            {qrCode ? <img src={qrCode} alt="2FA QR Code" className="w-32 h-32" /> : <div className="w-32 h-32 bg-gray-200 animate-pulse" />}
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <p className="text-sm text-gray-400">{t('settings.privacy.twoFactor.scanCode')}</p>
                                            <p className="text-sm text-gray-400">{t('settings.privacy.twoFactor.enterCode')}</p>
                                            <div className="flex gap-3">
                                                <input
                                                    type="text"
                                                    placeholder={t('settings.privacy.twoFactor.codePlaceholder')}
                                                    value={twoFactorCode}
                                                    onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    className="w-32 bg-[#0a0a0f] border border-gray-800 rounded-lg px-3 py-2 text-center text-white tracking-widest outline-none focus:border-[#F2CE88]"
                                                />
                                                <button
                                                    onClick={handleVerify2FA}
                                                    disabled={twoFactorCode.length !== 6 || isVerifying2FA}
                                                    className="px-4 py-2 bg-[#F2CE88] hover:bg-[#d9b877] text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {isVerifying2FA && <Loader2 className="w-4 h-4 animate-spin" />}
                                                    {isVerifying2FA ? t('settings.privacy.twoFactor.verifying') : t('settings.privacy.twoFactor.verify')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : show2FAPasswordPrompt ? (
                                <div className="bg-[#12121a] p-6 rounded-lg border border-gray-800 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h6 className="text-white text-sm font-medium">{t('settings.privacy.twoFactor.confirmPasswordTitle')}</h6>
                                            <p className="text-xs text-gray-500">{t('settings.privacy.twoFactor.confirmPasswordDescription')}</p>
                                        </div>
                                        <button onClick={() => setShow2FAPasswordPrompt(false)} className="text-gray-500 hover:text-white"><XCircle className="w-5 h-5" /></button>
                                    </div>
                                    <div className="flex gap-3">
                                        <input
                                            type="password"
                                            placeholder={t('settings.privacy.twoFactor.passwordPlaceholder')}
                                            value={twoFactorPassword}
                                            onChange={e => setTwoFactorPassword(e.target.value)}
                                            className="flex-1 bg-[#0a0a0f] border border-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:border-[#F2CE88]"
                                            onKeyDown={e => e.key === 'Enter' && confirmEnable2FA()}
                                        />
                                        <button
                                            onClick={confirmEnable2FA}
                                            disabled={!twoFactorPassword || isLoading2FA}
                                            className="px-4 py-2 bg-[#F2CE88] hover:bg-[#d9b877] text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isLoading2FA && <Loader2 className="w-4 h-4 animate-spin" />}
                                            {t('settings.privacy.twoFactor.continue')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-[#12121a] p-5 rounded-lg border border-gray-800">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center text-gray-400">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{t('settings.privacy.twoFactor.authenticatorAppTitle')}</p>
                                            <p className="text-xs text-gray-500">{t('settings.privacy.twoFactor.authenticatorAppDescription')}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleStart2FA}
                                        className="px-4 py-2 bg-[#F2CE88] hover:bg-[#d9b877] text-black text-sm font-medium rounded-lg transition-colors"
                                    >
                                        {t('settings.privacy.twoFactor.enable')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Active Sessions */}
            <section className="space-y-4">
                <h4 className="text-md font-medium text-white flex items-center gap-2">
                    {t('settings.privacy.sessions.title')} ({sessions.length})
                </h4>
                <div className="bg-[#1a1a24] rounded-xl border border-gray-800/50">
                    <div className="p-6">
                        <div className="space-y-6">
                            {isLoadingSessions ? (
                                <div className="p-4 flex justify-center text-gray-500">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            ) : sessions.length === 0 ? (
                                <div className="text-center text-gray-500 text-sm">
                                    {t('settings.privacy.sessions.noActive')}
                                </div>
                            ) : (
                                sessions.map(session => {
                                    const ua = parseUserAgent(session.userAgent)
                                    const IsMobile = ua.type === 'mobile'

                                    return (
                                        <div key={session.id} className="flex items-center justify-between pb-6 border-b border-gray-800 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-4">
                                                {IsMobile ? (
                                                    <Phone className="w-6 h-6 text-gray-400" />
                                                ) : (
                                                    <Laptop className="w-6 h-6 text-gray-400" />
                                                )}

                                                <div>
                                                    <p className="text-sm font-medium text-white flex items-center gap-2">
                                                        {ua.desc}
                                                        {session.isCurrent ? (
                                                            <span className="text-xs text-blue-500 font-normal"> • {t('settings.privacy.sessions.current')}</span>
                                                        ) : (
                                                            <span className="text-xs text-gray-500 font-normal"> • {session.ipAddress}</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {ua.name} • {new Date(session.createdAt).toLocaleDateString()} • {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => session.isCurrent ? (async () => { await authClient.signOut(); window.location.href = '/'; })() : handleRevokeSession(session.id)}
                                                className="text-[#F2CE88] hover:text-[#d9b877] font-medium text-sm transition-colors"
                                            >
                                                {t('settings.privacy.sessions.revoke')}
                                            </button>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-800">
                        <button
                            onClick={handleRevokeAllSessions}
                            className="text-sm font-medium text-red-500 hover:text-red-400 transition-colors"
                        >
                            {t('settings.privacy.sessions.revokeAll')}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    )
}