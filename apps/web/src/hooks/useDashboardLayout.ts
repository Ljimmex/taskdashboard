import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { apiFetchJson, apiFetch } from '@/lib/api'
import { useSession } from '@/lib/auth'
import {
  getInitialLayout,
  DEFAULT_DASHBOARD_LAYOUT,
  type DashboardLayoutItem,
} from '@/lib/dashboard'

interface UserMeResponse {
  id?: string
  preferences?: {
    dashboard?: {
      layout?: DashboardLayoutItem[]
    }
  }
}

const SAVE_DEBOUNCE_MS = 600

export function useDashboardLayout() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const userId = session?.user?.id

  const { data, isLoading } = useQuery<UserMeResponse>({
    queryKey: ['me', userId],
    queryFn: async () => {
      if (!userId) return {}
      return apiFetchJson<UserMeResponse>('/api/users/me')
    },
    enabled: !!userId,
  })

  const serverLayout = useMemo(
    () => getInitialLayout(data?.preferences?.dashboard?.layout),
    [data?.preferences?.dashboard?.layout]
  )

  // Local draft layout used while editing so UI responds instantly.
  const [draftLayout, setDraftLayout] = useState<DashboardLayoutItem[] | null>(null)

  // Reset draft when the user changes.
  useEffect(() => {
    setDraftLayout(null)
  }, [userId])

  // Seed draft from server when it loads; don't overwrite an active draft.
  useEffect(() => {
    if (!isLoading && draftLayout === null) {
      setDraftLayout(serverLayout)
    }
  }, [isLoading, serverLayout, draftLayout])

  const displayedLayout = draftLayout ?? serverLayout

  const saveMutation = useMutation({
    mutationFn: async (nextLayout: DashboardLayoutItem[]) => {
      if (!userId) throw new Error('Not authenticated')
      const res = await apiFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          preferences: {
            ...(data?.preferences || {}),
            dashboard: { layout: nextLayout },
          },
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Failed to save layout (${res.status})`)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', userId] })
    },
  })

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateLayout = useCallback(
    (nextLayout: DashboardLayoutItem[]) => {
      setDraftLayout(nextLayout)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        saveMutation.mutate(nextLayout)
      }, SAVE_DEBOUNCE_MS)
    },
    [saveMutation]
  )

  const resetLayout = useCallback(() => {
    updateLayout(DEFAULT_DASHBOARD_LAYOUT)
  }, [updateLayout])

  // Cleanup pending timeout on unmount.
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  return {
    layout: displayedLayout,
    isLoading,
    updateLayout,
    resetLayout,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
  }
}
