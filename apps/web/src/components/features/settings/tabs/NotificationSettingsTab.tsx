import { useTranslation } from 'react-i18next'

export function NotificationSettingsTab() {
    const { t } = useTranslation()
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-white">{t('settings.notification.title')}</h3>
                <p className="text-sm text-gray-400">{t('settings.notification.subtitle')}</p>
            </div>
            <div className="p-4 rounded-lg bg-[#1a1a24] border border-gray-800">
                <p className="text-gray-400 text-sm">Notification settings content goes here.</p>
            </div>
        </div>
    )
}
