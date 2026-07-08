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
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel - Floating Card Style */}
      <div
        className={`fixed inset-0 z-50 flex w-full max-w-none transform flex-col rounded-none border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-2xl transition-transform duration-300 ease-out sm:inset-auto sm:bottom-4 sm:right-4 sm:top-4 sm:w-[448px] sm:max-w-md sm:rounded-2xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full sm:translate-x-[calc(100%+2rem)]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-[var(--app-border)] bg-[var(--app-bg-sidebar)] p-6 transition-colors">
          <div>
            <h2 className="text-xl font-bold text-[var(--app-text-primary)]">
              {t('settings.title')}
            </h2>
            <p className="text-sm text-[var(--app-text-secondary)]">{t('settings.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-[var(--app-border)] bg-[var(--app-bg-sidebar)] px-6 transition-colors">
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
        <div className="custom-scrollbar flex-1 overflow-y-auto bg-[var(--app-bg-card)] p-6 transition-colors">
          {activeTab === 'account' && <AccountSettingsTab />}
          {activeTab === 'notification' && <NotificationSettingsTab />}
          {activeTab === 'privacy' && <PrivacySettingsTab />}
        </div>
      </div>
    </>,
    document.body
  )
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
        active
          ? 'border-[var(--app-accent)] text-[var(--app-text-primary)]'
          : 'border-transparent text-[var(--app-text-muted)] hover:border-[var(--app-border)] hover:text-[var(--app-text-secondary)]'
      }`}
    >
      {label}
    </button>
  )
}
