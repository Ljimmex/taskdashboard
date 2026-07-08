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
        <h3 className="mb-2 text-lg font-semibold text-white">
          {t('settings.organization.security.title')}
        </h3>
        <p className="text-sm text-gray-400">{t('settings.organization.security.subtitle')}</p>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-800/50 bg-[#1a1a24]">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-md mb-1 font-medium text-white">
                {t('settings.organization.security.encryptionTitle')}
              </h4>
              <p className="mb-6 text-sm leading-relaxed text-gray-400">
                {t('settings.organization.security.encryptionDesc')}
              </p>

              <div className="flex items-center gap-6 rounded-lg border border-gray-800 bg-[#12121a] p-4">
                <div className="flex-1">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </div>
                  <div className="flex items-center gap-2">
                    {isCheckingExpiration ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : isExpired ? (
                      <>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-amber-500">
                          {t('settings.organization.security.statusExpired')}
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
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
                  className="flex items-center gap-2 rounded-lg bg-[#F2CE88] px-4 py-2 text-sm font-semibold text-black shadow-sm transition-all hover:bg-[#d9b877] disabled:bg-gray-800 disabled:text-gray-500"
                >
                  {isRotating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      {t('settings.organization.security.rotating')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      {t('settings.organization.security.rotateButton')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800/50 bg-[#14141d]/50 px-6 py-4">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-500">
            <AlertTriangle className="h-3 w-3" />
            Technologia End-to-End Encryption (RSA-OAEP + AES-GCM)
          </p>
        </div>
      </section>
    </div>
  )
}
