import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { AccountSettingsTab } from '../tabs/AccountSettingsTab'
import { NotificationSettingsTab } from '../tabs/NotificationSettingsTab'
import { PrivacySettingsTab } from '../tabs/PrivacySettingsTab'

interface UserSettingsPanelProps {
    isOpen: boolean
    onClose: () => void
}

export function UserSettingsPanel({ isOpen, onClose }: UserSettingsPanelProps) {
    const { t } = useTranslation()
    const [mounted, setMounted] = useState(false)
    const [activeTab, setActiveTab] = useState<'account' | 'notification' | 'privacy'>('account')

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!isOpen || !mounted) return null

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Panel - Floating Card Style */}
            <div className={`fixed top-4 right-4 bottom-4 w-full max-w-xl bg-[var(--app-bg-card)] rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out border border-[var(--app-border)] ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'
                }`}>
                {/* Header */}
                <div className="p-6 border-b border-[var(--app-border)] flex items-center justify-between bg-[var(--app-bg-sidebar)] rounded-t-2xl transition-colors">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--app-text-primary)]">{t('settings.title')}</h2>
                        <p className="text-sm text-[var(--app-text-secondary)]">{t('settings.subtitle')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--app-bg-elevated)] rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 border-b border-[var(--app-border)] bg-[var(--app-bg-sidebar)] transition-colors">
                    <div className="flex gap-2">
                        <TabButton
                            active={activeTab === 'account'}
                            onClick={() => setActiveTab('account')}
                            label={t('settings.tabs.account')}
                        />
                        <TabButton
                            active={activeTab === 'notification'}
                            onClick={() => setActiveTab('notification')}
                            label={t('settings.tabs.notification')}
                        />
                        <TabButton
                            active={activeTab === 'privacy'}
                            onClick={() => setActiveTab('privacy')}
                            label={t('settings.tabs.privacy')}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[var(--app-bg-card)] transition-colors">
                    {activeTab === 'account' && <AccountSettingsTab />}
                    {activeTab === 'notification' && <NotificationSettingsTab />}
                    {activeTab === 'privacy' && <PrivacySettingsTab />}
                </div>
            </div>
        </>,
        document.body
    )
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${active
                ? 'border-[var(--app-accent)] text-[var(--app-text-primary)]'
                : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)] hover:border-[var(--app-border)]'
                }`}
        >
            {label}
        </button>
    )
}
