import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'
import { useEffect, useRef } from 'react'
import { toast } from './useToast'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/auth'

export interface NotificationItem {
    id: string
    type: string
    title: string
    message: string
    link?: string
    actor?: {
        name: string
        image?: string
    }
    metadata?: Record<string, any>
    createdAt: string
    read?: boolean
}

export function useNotifications() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const queryClient = useQueryClient()
    const previousNotificationsRef = useRef<NotificationItem[]>([])

    const { data: notifications = [], isLoading, ...queryInfo } = useQuery<NotificationItem[]>({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await apiFetchJson<{ success: boolean, data: NotificationItem[] }>('/api/notifications')
            return res.success ? res.data : []
        },
        refetchInterval: 60000, // Increase polling interval since we have Realtime now
    })

    // Supabase Realtime Subscription
    useEffect(() => {
        if (!session?.user?.id) return

        const channel = supabase
            .channel(`notifications_${session.user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notification_inboxes',
                    // Filter removed for maximum reliability
                },
                (payload) => {
                    console.log('[Realtime] Notifications changed:', payload)
                    // Verify if this update is for the current user (if payload has user_id)
                    const updatedUserId = (payload.new as any)?.user_id || (payload.old as any)?.user_id
                    if (updatedUserId && updatedUserId !== session.user.id) return

                    // Force immediate refetch
                    queryClient.refetchQueries({ queryKey: ['notifications'], type: 'active' })
                }
            )
            .subscribe((status) => {
                console.log(`[Realtime] Subscription status for notifications: ${status}`)
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [session?.user?.id, queryClient])

    const unreadCount = notifications.filter(n => !n.read).length

    const hasInitialDataRef = useRef(false)

    // Toasts for new notifications
    useEffect(() => {
        if (isLoading) return

        // Skip the very first time we get data (initial load)
        if (!hasInitialDataRef.current) {
            hasInitialDataRef.current = true
            previousNotificationsRef.current = notifications
            return
        }

        if (notifications.length > previousNotificationsRef.current.length) {
            console.log(`[Notifications] Count increased from ${previousNotificationsRef.current.length} to ${notifications.length}`)
            const newNotifications = notifications.filter(
                n => !previousNotificationsRef.current.find(prev => prev.id === n.id)
            )

            console.log(`[Notifications] New items found:`, newNotifications.length)

            // Show toast for each really NEW notification
            if (newNotifications.length > 0) {
                newNotifications.forEach(n => {
                    const translatedTitle = t(n.title) || n.title
                    toast.info(t('notifications.new_notification', { title: translatedTitle }))
                })
            }
        } else {
            // Debug log if needed
            // console.log(`[Notifications] No increase in count. Current: ${notifications.length}, Prev: ${previousNotificationsRef.current.length}`)
        }
        previousNotificationsRef.current = notifications
    }, [notifications, isLoading, t])

    const markReadMutation = useMutation({
        mutationFn: async (id: string) => {
            return apiFetchJson('/api/notifications/read', {
                method: 'PATCH',
                body: JSON.stringify({ ids: [id] })
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
    })

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            return apiFetchJson('/api/notifications/read-all', {
                method: 'PATCH'
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
    })

    return {
        notifications,
        unreadCount,
        isLoading,
        markRead: markReadMutation.mutate,
        markAllRead: markAllReadMutation.mutate,
        ...queryInfo
    }
}
