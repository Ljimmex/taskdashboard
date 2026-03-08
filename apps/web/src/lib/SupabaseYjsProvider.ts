import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

export class SupabaseYjsProvider {
    public doc: Y.Doc
    public awareness: awarenessProtocol.Awareness
    public roomName: string
    private channel: RealtimeChannel
    private supabase: SupabaseClient
    private isConnected: boolean = false
    private isDestroyed: boolean = false
    private user: any = null

    private broadcastFullState = () => {
        if (this.isDestroyed || !this.channel) return

        const state = Y.encodeStateAsUpdate(this.doc)
        this.channel.send({
            type: 'broadcast',
            event: 'yjs-update',
            payload: { update: Array.from(state) },
        })

        const awarenessState = awarenessProtocol.encodeAwarenessUpdate(
            this.awareness,
            [this.doc.clientID]
        )
        this.channel.send({
            type: 'broadcast',
            event: 'yjs-awareness',
            payload: { update: Array.from(awarenessState) },
        })
    }

    constructor(doc: Y.Doc, supabase: SupabaseClient, roomName: string, user: any) {
        this.doc = doc
        this.supabase = supabase
        this.roomName = roomName
        this.user = user
        this.awareness = new awarenessProtocol.Awareness(doc)

        // Generate a deterministic color based on user ID
        const color = this.stringToColor(user.id)

        // Set our own awareness state (cursor data)
        this.awareness.setLocalStateField('user', {
            name: user.name || 'Anonymous',
            color: color,
            avatarUrl: user.image || null,
        })

        // Set up the Supabase Realtime channel
        this.channel = this.supabase.channel(this.roomName, {
            config: {
                broadcast: { ack: false, self: false },
                presence: { key: user.id },
            },
        })

        // Listen for incoming Yjs document updates
        this.channel.on('broadcast', { event: 'yjs-update' }, (payload) => {
            try {
                const update = new Uint8Array(payload.payload.update)
                Y.applyUpdate(this.doc, update, this)
            } catch (e) {
                console.error("[Yjs] Failed to apply update", e)
            }
        })

        // Listen for awareness (cursor/selection) updates
        this.channel.on('broadcast', { event: 'yjs-awareness' }, (payload) => {
            try {
                const update = new Uint8Array(payload.payload.update)
                awarenessProtocol.applyAwarenessUpdate(this.awareness, update, this)
            } catch (e) {
                console.error("[Yjs] Failed to apply awareness", e)
            }
        })

        // Listen for presence to know who is active
        this.channel.on('presence', { event: 'sync' }, () => {
            // Unused vars removed to fix TS error.
            // Presence is useful if we want to build a custom TTL cache for clients.
            // For now, Tiptap handles removing stale cursors after 10 seconds.
        })

        this.channel.on('presence', { event: 'join' }, ({ key }: any) => {
            if (!this.isConnected) return
            if (!key || key === this.user.id) return
            setTimeout(() => this.broadcastFullState(), 100)
        })

        // When we make changes, broadcast them
        this.doc.on('update', this.handleDocUpdate)
        this.awareness.on('update', this.handleAwarenessUpdate)

        this.connect()
    }

    private stringToColor(str: string) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const color = Math.floor(Math.abs((Math.sin(hash) * 16777215)) % 16777215).toString(16);
        return "#" + "0".repeat(6 - color.length) + color;
    }

    private handleDocUpdate = (update: Uint8Array, origin: any) => {
        if (origin === this || this.isDestroyed || !this.isConnected) {
            // Don't broadcast changes we just received from the network
            // or if we are already disconnected
            return
        }

        // Only send if channel is joined
        if (this.channel.state === 'joined') {
            this.channel.send({
                type: 'broadcast',
                event: 'yjs-update',
                payload: { update: Array.from(update) },
            })
        }
    }

    private handleAwarenessUpdate = ({ added, updated, removed }: any, origin: any) => {
        if (origin === this || this.isDestroyed || !this.isConnected) return

        const changedClients = added.concat(updated, removed)
        const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)

        if (this.channel.state === 'joined') {
            this.channel.send({
                type: 'broadcast',
                event: 'yjs-awareness',
                payload: { update: Array.from(update) },
            })
        }
    }

    public async connect() {
        if (this.isConnected) return

        await new Promise<void>((resolve, reject) => {
            this.channel.subscribe(async (status, err) => {
                if (status === 'SUBSCRIBED') {
                    this.isConnected = true
                    console.log(`[Yjs] Subscribed to ${this.roomName}`)

                    // Track presence
                    await this.channel.track({
                        id: this.user.id,
                        name: this.user.name,
                        image: this.user.image,
                        onlineAt: new Date().toISOString()
                    })

                    // Broadcast our complete state so new peers know it
                    // Small timeout allows channel fully bind
                    setTimeout(() => {
                        this.broadcastFullState()
                    }, 500)

                    resolve()
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error(`[Yjs] Error subscribing to ${this.roomName}`, err)
                    reject(err)
                }
            })
        })
    }

    public disconnect() {
        this.isDestroyed = true
        this.doc.off('update', this.handleDocUpdate)
        this.awareness.off('update', this.handleAwarenessUpdate)

        if (this.channel) {
            this.channel.untrack()
            this.supabase.removeChannel(this.channel)
        }

        this.isConnected = false
    }
}
