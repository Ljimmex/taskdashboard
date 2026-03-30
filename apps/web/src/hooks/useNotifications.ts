import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'
import { useEffect, useRef } from 'react'
import { toast } from './useToast'
import { useTranslation } from 'react-i18next'

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
    const queryClient = useQueryClient()
    const previousNotificationsRef = useRef<NotificationItem[]>([])

    const { data: notifications = [], isLoading, ...queryInfo } = useQuery<NotificationItem[]>({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await apiFetchJson<{ success: boolean, data: NotificationItem[] }>('/api/notifications')
            return res.success ? res.data : []
        },
        refetchInterval: 30000, // Poll every 30s
    })

    const unreadCount = notifications.filter(n => !n.read).length

    // Toasts for new notifications
    useEffect(() => {
        if (notifications.length > previousNotificationsRef.current.length) {
            const newNotifications = notifications.filter(
                n => !previousNotificationsRef.current.find(prev => prev.id === n.id)
            )

            // Only show toast if it's a real update (not the first load)
            if (previousNotificationsRef.current.length > 0 && newNotifications.length > 0) {
                newNotifications.forEach(n => {
                    toast.info(t('notifications.new_notification', { title: t(n.title) || n.title }))
                })
            }
        }
        previousNotificationsRef.current = notifications
    }, [notifications, t])

    const markReadMutation = useMutation({
        mutationFn: async (id: string) => {
            return apiFetchJson('/api/notifications/read', {
                method: 'PATCH',
                body: JSON.stringify({ notificationIds: [id] })
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
