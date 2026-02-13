import { useTranslation } from 'react-i18next'
import { Shield, RefreshCw, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { useKeyRotation } from '@/hooks/useKeyRotation'

interface SecuritySettingsTabProps {
    workspace: any
}

export function SecuritySettingsTab({ workspace }: SecuritySettingsTabProps) {
    const { t } = useTranslation()
    const { isExpired, isCheckingExpiration, rotateKeys, isRotating } = useKeyRotation(workspace.id)

    const handleRotateKeys = async () => {
        if (!confirm(t('settings.organization.security.confirmRotate'))) return

        try {
            const results = await rotateKeys()
            alert(t('settings.organization.security.success', { count: results.messagesReEncrypted }))
        } catch (err: any) {
            console.error('Rotation failed:', err)
            alert(err.message || 'Failed to rotate keys')
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                    {t('settings.organization.security.title')}
                </h3>
                <p className="text-sm text-gray-400">
                    {t('settings.organization.security.subtitle')}
                </p>
            </div>

            <section className="bg-[#1a1a24] border border-gray-800/50 rounded-xl overflow-hidden">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Shield className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-md font-medium text-white mb-1">
                                {t('settings.organization.security.encryptionTitle')}
                            </h4>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6">
                                {t('settings.organization.security.encryptionDesc')}
                            </p>

                            <div className="flex items-center gap-6 p-4 bg-[#12121a] rounded-lg border border-gray-800">
                                <div className="flex-1">
                                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                        Status
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isCheckingExpiration ? (
                                            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                        ) : isExpired ? (
                                            <>
                                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                                <span className="text-sm text-amber-500">
                                                    {t('settings.organization.security.statusExpired')}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                <span className="text-sm text-green-500">
                                                    {t('settings.organization.security.statusActive')}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleRotateKeys}
                                    disabled={isRotating || isCheckingExpiration}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#F2CE88] hover:bg-[#d9b877] disabled:bg-gray-800 disabled:text-gray-500 text-black text-sm font-semibold rounded-lg transition-all shadow-sm"
                                >
                                    {isRotating ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            {t('settings.organization.security.rotating')}
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-4 h-4" />
                                            {t('settings.organization.security.rotateButton')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#14141d]/50 px-6 py-4 border-t border-gray-800/50">
                    <p className="text-[11px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        Technologia End-to-End Encryption (RSA-OAEP + AES-GCM)
                    </p>
                </div>
            </section>
        </div>
    )
}
