import { useState, useEffect } from 'react'
import { useParams, useSearch } from '@tanstack/react-router'
import { useSession } from '@/lib/auth'
import { useQuery } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'
import { ConversationList } from '@/components/features/messages/ConversationList'
import { ChatWindow } from '@/components/features/messages/ChatWindow'
import { ChannelSettingsPanel } from '@/components/features/messages/ChannelSettingsPanel'

export function MessagesPage() {
    const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
    const search = useSearch({ strict: false }) as { userId?: string }
    const { data: session } = useSession()
    const [selectedUserId, setSelectedUserId] = useState<string | undefined>(search.userId)
    const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false)

    // Sync URL param changes to state
    useEffect(() => {
        if (search.userId) {
            setSelectedUserId(search.userId)
        }
    }, [search.userId])

    // Fetch workspace by slug to get the real ID
    const { data: workspace } = useQuery({
        queryKey: ['workspace', workspaceSlug],
        queryFn: async () => {
            if (!workspaceSlug) return null
            return apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`)
        },
        enabled: !!workspaceSlug
    })

    const workspaceId = workspace?.id

    if (!workspaceSlug || !session?.user || !workspaceId) {
        return <div className="flex items-center justify-center h-full">Loading...</div>
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] -m-4 -mb-24 lg:m-0 lg:h-[calc(100vh-112px)] lg:rounded-2xl lg:border lg:border-[var(--app-border)] relative overflow-hidden shadow-2xl">
            {/* Main Content - Flex Container */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Team Members List Sidebar */}
                <div className={`absolute md:static inset-0 z-20 bg-[var(--app-bg-sidebar)] transition-transform duration-300 md:translate-x-0 ${selectedUserId ? '-translate-x-full' : 'translate-x-0'} md:w-80 w-full flex-shrink-0 h-full border-r border-[var(--app-border)]`}>
                    <ConversationList
                        workspaceId={workspaceId}
                        workspaceSlug={workspaceSlug}
                        selectedConversationId={selectedUserId}
                        onSelectConversation={setSelectedUserId}
                    />
                </div>

                {/* Main Chat Area */}
                <div className={`flex-1 flex flex-col min-w-0 h-full bg-[var(--app-bg-deepest)] ${selectedUserId ? 'block' : 'hidden md:flex'}`}>
                    <ChatWindow
                        recipientUserId={selectedUserId}
                        currentUserId={session.user.id}
                        workspaceId={workspaceId}
                        workspaceSlug={workspaceSlug}
                        onBack={() => setSelectedUserId(undefined)}
                    />
                </div>
            </div>

            {/* Channel Settings Panel */}
            {selectedUserId && (
                <ChannelSettingsPanel
                    conversationId={selectedUserId}
                    isOpen={isSettingsPanelOpen}
                    onClose={() => setIsSettingsPanelOpen(false)}
                    onDelete={() => {
                        setIsSettingsPanelOpen(false)
                        setSelectedUserId(undefined)
                    }}
                />
            )}
        </div>
    )
}
