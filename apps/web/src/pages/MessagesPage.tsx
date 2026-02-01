import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { useSession } from '@/lib/auth'
import { useQuery } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'
import { ConversationList } from '@/components/features/messages/ConversationList'
import { ChatWindow } from '@/components/features/messages/ChatWindow'
import { ChannelSettingsPanel } from '@/components/features/messages/ChannelSettingsPanel'

export function MessagesPage() {
    const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
    const { data: session } = useSession()
    const [selectedUserId, setSelectedUserId] = useState<string | undefined>()
    const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false)

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
        <div className="flex flex-col h-full">
            {/* Main Content - Flex Container */}
            <div className="flex flex-1 overflow-hidden">
                {/* Team Members List Sidebar */}
                <ConversationList
                    workspaceId={workspaceSlug}
                    selectedConversationId={selectedUserId}
                    onSelectConversation={setSelectedUserId}
                />

                {/* Main Chat Area */}
                <ChatWindow
                    recipientUserId={selectedUserId}
                    currentUserId={session.user.id}
                    workspaceId={workspaceId}
                    workspaceSlug={workspaceSlug}
                    onSettingsClick={() => setIsSettingsPanelOpen(true)}
                />
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
