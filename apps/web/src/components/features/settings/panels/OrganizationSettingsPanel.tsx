import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetchJson } from '@/lib/api'
import { GeneralSettingsTab } from '../tabs/GeneralSettingsTab'
import { MembersSettingsTab } from '../tabs/MembersSettingsTab'
import { LabelsSettingsTab } from '../tabs/LabelsSettingsTab'
import { WorkspaceDefaultsTab } from '../tabs/WorkspaceDefaultsTab'
import { IntegrationsTab } from '../tabs/IntegrationsTab'
import { SecuritySettingsTab } from '../tabs/SecuritySettingsTab'

interface OrganizationSettingsPanelProps {
    isOpen: boolean
    onClose: () => void
}

export function OrganizationSettingsPanel({ isOpen, onClose }: OrganizationSettingsPanelProps) {
    const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
    const { t } = useTranslation()
    const [mounted, setMounted] = useState(false)
    const tabsRef = useRef<HTMLDivElement>(null)
    const [showLeftArrow, setShowLeftArrow] = useState(false)
    const [showRightArrow, setShowRightArrow] = useState(false)

    // We can fetch the workspace details here to pass to tabs
    const [activeTab, setActiveTab] = useState<'general' | 'members' | 'labels' | 'defaults' | 'integrations' | 'security'>('general')

    const { data: workspace, isLoading } = useQuery({
        queryKey: ['workspace', workspaceSlug],
        queryFn: async () => {
            if (!workspaceSlug) return null
            const res = await apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`)
            return res
        },
        enabled: !!workspaceSlug && isOpen
    })

    const checkScroll = () => {
        if (tabsRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current
            // Use a small buffer (5px) to handle sub-pixel issues
            setShowLeftArrow(scrollLeft > 5)
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5)
        }
    }

    useEffect(() => {
        const timer = setTimeout(checkScroll, 100)
        window.addEventListener('resize', checkScroll)
        return () => {
            window.removeEventListener('resize', checkScroll)
            clearTimeout(timer)
        }
    }, [workspace, isOpen, activeTab])

    const scroll = (direction: 'left' | 'right') => {
        if (tabsRef.current) {
            const scrollAmount = tabsRef.current.clientWidth * 0.6
            tabsRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            })
        }
    }

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
                        <h2 className="text-xl font-bold text-white">{t('dashboard.settings_panel.title')}</h2>
                        <p className="text-sm text-gray-400">{t('dashboard.settings_panel.subtitle')}</p>
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
                <div className="relative px-6 border-b border-gray-800/50 bg-[#14141b] group/tabs">
                    {/* Left Mask & Arrow */}
                    <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-12 z-20 pointer-events-none transition-opacity duration-300 bg-gradient-to-r from-[#14141b] to-transparent",
                        showLeftArrow ? "opacity-100" : "opacity-0"
                    )} />
                    {showLeftArrow && (
                        <button
                            onClick={() => scroll('left')}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-[#1a1a24] border border-gray-800 rounded-full z-30 text-gray-400 hover:text-white transition-all shadow-xl hover:scale-110 active:scale-95"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    )}

                    <div
                        ref={tabsRef}
                        onScroll={checkScroll}
                        className="flex gap-1 overflow-x-auto scrollbar-none py-1 no-scrollbar w-full"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        <style>{`
                            .no-scrollbar::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>
                        <TabButton
                            active={activeTab === 'general'}
                            onClick={() => setActiveTab('general')}
                            label={t('dashboard.settings_tabs.general')}
                        />
                        <TabButton
                            active={activeTab === 'members'}
                            onClick={() => setActiveTab('members')}
                            label={t('dashboard.settings_tabs.members')}
                        />
                        <TabButton
                            active={activeTab === 'labels'}
                            onClick={() => setActiveTab('labels')}
                            label={t('dashboard.settings_tabs.labels')}
                        />
                        <TabButton
                            active={activeTab === 'defaults'}
                            onClick={() => setActiveTab('defaults')}
                            label={t('dashboard.settings_tabs.defaults')}
                        />
                        <TabButton
                            active={activeTab === 'integrations'}
                            onClick={() => setActiveTab('integrations')}
                            label={t('dashboard.settings_tabs.integrations')}
                        />
                        <TabButton
                            active={activeTab === 'security'}
                            onClick={() => setActiveTab('security')}
                            label={t('dashboard.settings_tabs.security')}
                        />
                    </div>

                    {/* Right Mask & Arrow */}
                    <div className={cn(
                        "absolute right-0 top-0 bottom-0 w-12 z-20 pointer-events-none transition-opacity duration-300 bg-gradient-to-l from-[#14141b] to-transparent",
                        showRightArrow ? "opacity-100" : "opacity-0"
                    )} />
                    {showRightArrow && (
                        <button
                            onClick={() => scroll('right')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-[#1a1a24] border border-gray-800 rounded-full z-30 text-gray-400 hover:text-white transition-all shadow-xl hover:scale-110 active:scale-95"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                    {isLoading ? (
                        <div className="text-gray-500">{t('common.loading')}</div>
                    ) : workspace ? (
                        <>
                            {activeTab === 'general' && <GeneralSettingsTab workspace={workspace} />}
                            {activeTab === 'members' && <MembersSettingsTab workspace={workspace} />}
                            {activeTab === 'labels' && <LabelsSettingsTab workspace={workspace} />}
                            {activeTab === 'defaults' && <WorkspaceDefaultsTab workspace={workspace} />}
                            {activeTab === 'integrations' && <IntegrationsTab workspace={workspace} />}
                            {activeTab === 'security' && <SecuritySettingsTab workspace={workspace} />}
                        </>
                    ) : (
                        <div className="text-red-500">{t('dashboard.settings_panel.error')}</div>
                    )}
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
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${active
                ? 'border-[#F2CE88] text-white'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
                }`}
        >
            {label}
        </button>
    )
}
