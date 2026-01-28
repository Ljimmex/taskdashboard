import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { ConversationList } from '@/components/features/messages/ConversationList'
import { ChatWindow } from '@/components/features/messages/ChatWindow'
import { ChannelSettingsPanel } from '@/components/features/messages/ChannelSettingsPanel'
import { useSession } from '@/lib/auth'

export function MessagesPage() {
    const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
    const { data: session } = useSession()
    const [selectedUserId, setSelectedUserId] = useState<string | undefined>()
    const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false)

    // TODO: Get workspaceId from workspaceSlug (need workspace API query)
    const workspaceId = workspaceSlug // Temporary - needs proper workspace lookup

    if (!workspaceSlug || !session?.user) {
        return <div className="flex items-center justify-center h-full">Loading...</div>
    }

    return (
        <div className="flex flex-col h-full">
            {/* Main Content - Flex Container */}
            <div className="flex flex-1 overflow-hidden">
                {/* Team Members List Sidebar */}
                <ConversationList
                    workspaceId={workspaceId}
                    selectedConversationId={selectedUserId}
                    onSelectConversation={setSelectedUserId}
                />

                {/* Main Chat Area */}
                <ChatWindow
                    recipientUserId={selectedUserId}
                    currentUserId={session.user.id}
                    workspaceId={workspaceId}
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
