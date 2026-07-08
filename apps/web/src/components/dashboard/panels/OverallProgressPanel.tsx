import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { OverallProgress } from '@/components/dashboard/OverallProgress'
import type { DashboardPanelProps } from '@/lib/dashboard'

export function OverallProgressPanel({ workspaceSlug }: DashboardPanelProps) {
  const { data: session } = useSession()
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', workspaceSlug],
    queryFn: async () => {
      const json = await apiFetchJson<any>(`/api/projects?workspaceSlug=${workspaceSlug}`)
      if (json?.success === false) throw new Error(json.error || 'Failed to fetch projects')
      return json?.data || []
    },
  })

  return (
    <OverallProgress
      projects={projects}
      currentUserId={session?.user?.id}
      workspaceSlug={workspaceSlug}
    />
  )
}
