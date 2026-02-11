import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AccountSettingsTab } from '../tabs/AccountSettingsTab'
import { NotificationSettingsTab } from '../tabs/NotificationSettingsTab'
import { PrivacySettingsTab } from '../tabs/PrivacySettingsTab'

interface UserSettingsPanelProps {
    isOpen: boolean
    onClose: () => void
}

export function UserSettingsPanel({ isOpen, onClose }: UserSettingsPanelProps) {
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
            <div className={`fixed top-4 right-4 bottom-4 w-full max-w-xl bg-[#12121a] rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'
                }`}>
                {/* Header */}
                <div className="p-6 border-b border-gray-800/50 flex items-center justify-between bg-[#14141b] rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-white">User Settings</h2>
                        <p className="text-sm text-gray-400">Manage your personal preferences</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 border-b border-gray-800/50 bg-[#14141b]">
                    <div className="flex gap-2">
                        <TabButton
                            active={activeTab === 'account'}
                            onClick={() => setActiveTab('account')}
                            label="Account"
                        />
                        <TabButton
                            active={activeTab === 'notification'}
                            onClick={() => setActiveTab('notification')}
                            label="Notification"
                        />
                        <TabButton
                            active={activeTab === 'privacy'}
                            onClick={() => setActiveTab('privacy')}
                            label="Privacy & Security"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
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
                ? 'border-[#F2CE88] text-white'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
                }`}
        >
            {label}
        </button>
    )
}
