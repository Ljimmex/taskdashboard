import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/auth'

export type PresenceStatus = 'online' | 'away' | 'offline'

export interface PresenceState {
    userId: string
    status: PresenceStatus
    lastSeen: string
}

export function usePresence(workspaceId: string) {
    const { data: session } = useSession()
    const [presenceMap, setPresenceMap] = useState<Map<string, PresenceState>>(new Map())

    useEffect(() => {
        if (!workspaceId || !session?.user) return

        const presenceChannel = supabase.channel(`workspace:${workspaceId}:presence`, {
            config: {
                presence: {
                    key: session.user.id
                }
            }
        })

        // Track presence changes
        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState()
                const newMap = new Map<string, PresenceState>()

                Object.entries(state).forEach(([userId, presences]: [string, any[]]) => {
                    const presence = presences[0]
                    if (presence) {
                        newMap.set(userId, {
                            userId,
                            status: presence.status || 'online',
                            lastSeen: presence.lastSeen || new Date().toISOString()
                        })
                    }
                })

                setPresenceMap(newMap)
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('User joined:', key, newPresences)
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('User left:', key, leftPresences)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Track self as online
                    await presenceChannel.track({
                        status: 'online',
                        lastSeen: new Date().toISOString()
                    })
                }
            })

        // Update to "away" on visibility change
        const handleVisibilityChange = () => {
            if (document.hidden) {
                presenceChannel.track({
                    status: 'away',
                    lastSeen: new Date().toISOString()
                })
            } else {
                presenceChannel.track({
                    status: 'online',
                    lastSeen: new Date().toISOString()
                })
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            // Mark as offline before cleanup
            presenceChannel.track({
                status: 'offline',
                lastSeen: new Date().toISOString()
            })
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            presenceChannel.unsubscribe()
        }
    }, [workspaceId, session?.user])

    return {
        presenceMap,
        isOnline: (userId: string) => presenceMap.get(userId)?.status === 'online',
        getStatus: (userId: string) => presenceMap.get(userId)?.status || 'offline'
    }
}
