import { useNavigate } from '@tanstack/react-router'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { ChatSection } from '@/components/dashboard/ChatSection'
import type { DashboardPanelProps } from '@/lib/dashboard'

export function ChatSectionPanel({ workspaceSlug }: DashboardPanelProps) {
  const navigate = useNavigate()
  const { members } = useTeamMembers(workspaceSlug)
  const chatContacts = members.slice(0, 10).map((m) => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    isOnline: m.isOnline,
  }))

  return (
    <ChatSection
      contacts={chatContacts}
      onSeeAll={() => navigate({ to: `/${workspaceSlug}/messages` })}
      onContactClick={(userId) => {
        navigate({
          to: `/${workspaceSlug}/messages`,
          search: { userId },
        })
      }}
    />
  )
}
