import { useQuery } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'

export interface ProjectStage {
  id: string
  name: string
  color?: string
  position: number
}

export interface ProjectMember {
  id: string
  user?: {
    id: string
    name: string
    image?: string
  }
}

export interface ProjectSummary {
  id: string
  name: string
  color?: string
  status: string
  teamId: string
  stages?: ProjectStage[]
  members?: ProjectMember[]
}

export function useProjects(workspaceSlug?: string) {
  return useQuery<ProjectSummary[]>({
    queryKey: ['projects', workspaceSlug],
    queryFn: async () => {
      if (!workspaceSlug) return []
      const response = await apiFetchJson<{ success: boolean; data: ProjectSummary[] }>(
        `/api/projects?workspaceSlug=${workspaceSlug}`
      )
      return response.data || []
    },
    enabled: !!workspaceSlug,
  })
}
