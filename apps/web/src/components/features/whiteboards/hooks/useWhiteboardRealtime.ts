import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useSession } from '@/lib/auth'

// Generate deterministic distinct color based on string
export const stringToColor = (str: string) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const color = Math.floor(Math.abs(Math.sin(hash) * 16777215) % 16777215).toString(16)
  return '#' + '0'.repeat(6 - color.length) + color
}

interface Collaborator {
  userId: string
  username?: string
  avatarUrl?: string
  pointer?: { x: number; y: number }
  button?: 'down' | 'up'
  color: { background: string; stroke: string }
}

export function useWhiteboardRealtime(
  boardId: string | undefined,
  excalidrawAPI: any,
  readOnly: boolean
) {
  const { data: session } = useSession()
  const user = session?.user

  const isUpdatingRef = useRef(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [collaborators, setCollaborators] = useState<Map<string, Collaborator>>(new Map())
  const [isConnected, setIsConnected] = useState(false)

  const lastBroadcastTime = useRef<number>(0)
  const lastPointerBroadcastTime = useRef<number>(0)
  const lastSentElementsRef = useRef<Map<string, number>>(new Map())

  const getUserColor = useCallback(
    (id: string) => ({
      background: stringToColor(id),
      stroke: stringToColor(id + 'stroke'),
    }),
    []
  )

  // Setup Supabase Realtime Collaboration with Presence & Pointers
  useEffect(() => {
    if (!boardId || !excalidrawAPI || readOnly || !user) {
      setIsConnected(false)
      return
    }

    const channel = supabase.channel(`whiteboard_${boardId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: user.id },
      },
    })

    channelRef.current = channel

    channel
      .on('broadcast', { event: 'board-update' }, (payload) => {
        if (payload.payload?.elements && Array.isArray(payload.payload.elements)) {
          isUpdatingRef.current = true
          try {
            const currentElements = excalidrawAPI.getSceneElements() as any[]
            const incoming = payload.payload.elements as any[]
            const incomingMap = new Map(incoming.map((el) => [el.id, el]))

            // Merge incoming elements into current scene
            const merged = currentElements.map((el) => {
              const updated = incomingMap.get(el.id)
              return updated ? { ...el, ...updated } : el
            })

            // Append elements that are new to this client
            const existingIds = new Set(currentElements.map((el) => el.id))
            const newElements = incoming.filter((el) => !existingIds.has(el.id))

            excalidrawAPI.updateScene({
              elements: [...merged, ...newElements],
            })
          } catch (err) {
            console.error('[Whiteboard realtime] Failed to apply board-update', err)
          } finally {
            setTimeout(() => {
              isUpdatingRef.current = false
            }, 50)
          }
        }
      })
      .on('broadcast', { event: 'pointer-update' }, (payload) => {
        setCollaborators((prev) => {
          const next = new Map(prev)
          next.set(payload.payload.userId, {
            ...next.get(payload.payload.userId),
            userId: payload.payload.userId,
            pointer: payload.payload.pointer,
            button: payload.payload.button,
            username: payload.payload.username,
            avatarUrl: payload.payload.avatarUrl,
            color: getUserColor(payload.payload.userId),
          })
          return next
        })
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const activeIds = Object.keys(state)

        setCollaborators((prev) => {
          const next = new Map()
          activeIds.forEach((id) => {
            if (id === user.id) return

            const presenceData: any = state[id][0]
            next.set(id, {
              ...(prev.get(id) || {}),
              userId: id,
              username: presenceData.username,
              avatarUrl: presenceData.avatarUrl,
              color: getUserColor(id),
            })
          })
          return next
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Whiteboard realtime] Joined channel:', boardId)
          setIsConnected(true)
          await channel.track({
            id: user.id,
            username: user.name,
            avatarUrl: user.image,
          })
        } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
          console.error('[Whiteboard realtime] Channel error:', status, 'boardId:', boardId)
          setIsConnected(false)
        } else {
          setIsConnected(false)
        }
      })

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
      setIsConnected(false)
    }
  }, [boardId, excalidrawAPI, readOnly, user?.id, getUserColor])

  // Update parent about collaborators
  useEffect(() => {
    if (excalidrawAPI) {
      excalidrawAPI.updateScene({ collaborators })
    }
  }, [collaborators, excalidrawAPI])

  const broadcastBoardUpdate = useCallback(
    (elements: any[]) => {
      if (readOnly || isUpdatingRef.current || !channelRef.current) return
      if (channelRef.current.state !== 'joined') return

      const now = Date.now()
      if (now - lastBroadcastTime.current < 100) return
      lastBroadcastTime.current = now

      // Compute delta: only elements whose version or updated timestamp changed
      const changedElements: any[] = []
      const lastSent = lastSentElementsRef.current

      elements.forEach((el) => {
        const marker = el.version ?? el.updated ?? 0
        const lastMarker = lastSent.get(el.id) ?? 0
        if (marker !== lastMarker) {
          changedElements.push(el)
          lastSent.set(el.id, marker)
        }
      })

      if (changedElements.length === 0) return

      channelRef.current
        .send({
          type: 'broadcast',
          event: 'board-update',
          payload: { elements: changedElements },
        })
        .catch((err) => {
          console.error('[Whiteboard realtime] Failed to broadcast board-update', err)
        })
    },
    [readOnly]
  )

  const broadcastPointerUpdate = useCallback(
    (payload: any) => {
      if (readOnly || !channelRef.current || !user?.id) return
      if (channelRef.current.state !== 'joined') return

      const now = Date.now()
      if (now - lastPointerBroadcastTime.current < 80) return
      lastPointerBroadcastTime.current = now

      channelRef.current
        .send({
          type: 'broadcast',
          event: 'pointer-update',
          payload: {
            userId: user.id,
            username: user.name,
            avatarUrl: user.image,
            pointer: payload.pointer,
            button: payload.button,
          },
        })
        .catch((err) => {
          console.error('[Whiteboard realtime] Failed to broadcast pointer-update', err)
        })
    },
    [readOnly, user?.id]
  )

  return {
    collaborators: Array.from(collaborators.values()),
    broadcastBoardUpdate,
    broadcastPointerUpdate,
    isUpdatingSync: isUpdatingRef.current,
    isConnected,
  }
}
