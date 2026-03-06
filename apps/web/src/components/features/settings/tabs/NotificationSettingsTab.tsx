import { useTranslation } from 'react-i18next'

export function NotificationSettingsTab() {
    const { t } = useTranslation()
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-[var(--app-text-primary)]">{t('settings.notification.title')}</h3>
                <p className="text-sm text-[var(--app-text-secondary)]">{t('settings.notification.subtitle')}</p>
            </div>
            <div className="p-4 rounded-lg bg-[var(--app-bg-elevated)] border border-[var(--app-border)]">
                <p className="text-[var(--app-text-secondary)] text-sm">Notification settings content goes here.</p>
            </div>
        </div>
    )
}
