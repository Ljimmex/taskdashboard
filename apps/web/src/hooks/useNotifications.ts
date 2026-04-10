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
    const lastToastTimeRef = useRef<number>(0)

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

        let channel: any = null
        let retryCount = 0
        const maxRetries = 5

        const subscribe = () => {
            channel = supabase
                .channel(`notifications_${session.user.id}_${Math.random().toString(36).substring(7)}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'notification_inboxes',
                    },
                    (payload) => {
                        console.log('[Realtime] Notifications changed:', payload)
                        const updatedUserId = (payload.new as any)?.user_id || (payload.old as any)?.user_id
                        if (updatedUserId && updatedUserId !== session.user.id) return
                        queryClient.refetchQueries({ queryKey: ['notifications'], type: 'active' })
                    }
                )
                .subscribe((status) => {
                    console.log(`[Realtime] Subscription status for notifications: ${status}`)
                    if (status === 'CHANNEL_ERROR' && retryCount < maxRetries) {
                        retryCount++
                        console.log(`[Realtime] Retrying subscription (${retryCount}/${maxRetries})...`)
                        setTimeout(subscribe, 2000 * retryCount)
                    }
                })
        }

        subscribe()

        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [session?.user?.id, queryClient])

    const unreadCount = notifications.filter(n => !n.read).length

    const hasInitialDataRef = useRef(false)

    // Toasts for new notifications (with deduplication)
    useEffect(() => {
        if (isLoading) return

        // Skip the very first time we get data (initial load)
        if (!hasInitialDataRef.current) {
            hasInitialDataRef.current = true
            previousNotificationsRef.current = notifications
            return
        }

        // Debounce — skip if a toast was shown less than 3s ago
        const now = Date.now()
        if (now - lastToastTimeRef.current < 3000) {
            previousNotificationsRef.current = notifications
            return
        }

        if (notifications.length > previousNotificationsRef.current.length) {
            const newNotifications = notifications.filter(
                n => !previousNotificationsRef.current.find(prev => prev.id === n.id)
            )

            // Show a single consolidated toast
            if (newNotifications.length > 0) {
                lastToastTimeRef.current = now
                if (newNotifications.length === 1) {
                    const translatedTitle = t(newNotifications[0].title) || newNotifications[0].title
                    toast.info(t('notifications.new_notification', { title: translatedTitle }))
                } else {
                    toast.info(t('notifications.new_notifications_count', {
                        count: newNotifications.length,
                        defaultValue: `Masz ${newNotifications.length} nowych powiadomień`
                    }))
                }
            }
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
