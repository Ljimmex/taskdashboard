import { createFileRoute } from '@tanstack/react-router'
import { MessagesPage } from '@/pages/MessagesPage'

interface MessagesSearch {
  userId?: string
}

export const Route = createFileRoute('/$workspaceSlug/messages/')({
  component: MessagesPage,
  validateSearch: (search: Record<string, unknown>): MessagesSearch => {
    return {
      userId: search.userId as string | undefined, // Type assertion for simplicity
    }
  },
})
