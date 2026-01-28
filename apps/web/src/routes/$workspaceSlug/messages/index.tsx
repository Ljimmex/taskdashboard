import { createFileRoute } from '@tanstack/react-router'
import { MessagesPage } from '@/pages/MessagesPage'

export const Route = createFileRoute('/$workspaceSlug/messages/')({
  component: MessagesPage,
})
