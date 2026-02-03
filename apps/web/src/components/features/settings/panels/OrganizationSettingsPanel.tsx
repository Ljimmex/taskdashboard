import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { apiFetchJson } from '@/lib/api'
import { useSession } from '@/lib/auth'
import { GeneralSettingsTab } from '../tabs/GeneralSettingsTab'
import { MembersSettingsTab } from '../tabs/MembersSettingsTab'

interface OrganizationSettingsPanelProps {
    isOpen: boolean
    onClose: () => void
}

export function OrganizationSettingsPanel({ isOpen, onClose }: OrganizationSettingsPanelProps) {
    const { data: session } = useSession()
    const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
    const [mounted, setMounted] = useState(false)

    // We can fetch the workspace details here to pass to tabs
    const [activeTab, setActiveTab] = useState<'general' | 'members'>('general')

    const { data: workspace, isLoading } = useQuery({
        queryKey: ['workspace', workspaceSlug],
        queryFn: async () => {
            if (!workspaceSlug) return null
            const res = await apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`)
            return res
        },
        enabled: !!workspaceSlug && isOpen
    })

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
                        <h2 className="text-xl font-bold text-white">Ustawienia organizacji</h2>
                        <p className="text-sm text-gray-400">Zarządzaj swoją przestrzenią roboczą</p>
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
                            active={activeTab === 'general'}
                            onClick={() => setActiveTab('general')}
                            label="Ogólne"
                        />
                        <TabButton
                            active={activeTab === 'members'}
                            onClick={() => setActiveTab('members')}
                            label="Członkowie"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                    {isLoading ? (
                        <div className="text-gray-500">Ładowanie...</div>
                    ) : workspace ? (
                        <>
                            {activeTab === 'general' && <GeneralSettingsTab workspace={workspace} />}
                            {activeTab === 'members' && <MembersSettingsTab workspace={workspace} />}
                        </>
                    ) : (
                        <div className="text-red-500">Nie udało się załadować danych organizacji.</div>
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
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${active
                    ? 'border-[#F2CE88] text-white'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
                }`}
        >
            {label}
        </button>
    )
}
