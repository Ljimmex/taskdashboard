import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useSession } from "@/lib/auth";

// Generate deterministic distinct color based on string
export const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = Math.floor(Math.abs((Math.sin(hash) * 16777215)) % 16777215).toString(16);
    return "#" + "0".repeat(6 - color.length) + color;
};

export function useWhiteboardRealtime(boardId: string | undefined, excalidrawAPI: any, readOnly: boolean) {
    const { data: session } = useSession();
    const user = session?.user;

    const isUpdatingRef = useRef(false);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const [collaborators, setCollaborators] = useState<Map<string, any>>(new Map());

    const lastBroadcastTime = useRef<number>(0);
    const lastPointerBroadcastTime = useRef<number>(0);

    // Setup Supabase Realtime Collaboration with Presence & Pointers
    useEffect(() => {
        if (!boardId || !excalidrawAPI || readOnly || !user) return;

        const channel = supabase.channel(`whiteboard_${boardId}`, {
            config: {
                broadcast: { self: false },
                presence: { key: user.id }
            },
        });

        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'board-update' }, (payload) => {
                if (payload.payload?.elements) {
                    isUpdatingRef.current = true;
                    excalidrawAPI.updateScene({
                        elements: payload.payload.elements,
                    });
                    setTimeout(() => {
                        isUpdatingRef.current = false;
                    }, 50);
                }
            })
            .on('broadcast', { event: 'pointer-update' }, (payload) => {
                setCollaborators(prev => {
                    const next = new Map(prev);
                    next.set(payload.payload.userId, {
                        ...next.get(payload.payload.userId),
                        userId: payload.payload.userId,
                        pointer: payload.payload.pointer,
                        button: payload.payload.button,
                        username: payload.payload.username,
                        avatarUrl: payload.payload.avatarUrl,
                        color: {
                            background: stringToColor(payload.payload.userId),
                            stroke: stringToColor(payload.payload.userId + "stroke")
                        }
                    });
                    return next;
                });
            })
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const activeIds = Object.keys(state);

                setCollaborators(prev => {
                    const next = new Map();
                    // Keep pointers for users still in the room (exclude self)
                    activeIds.forEach(id => {
                        if (id === user.id) return; // Don't show own pointer from presence

                        const presenceData: any = state[id][0];
                        next.set(id, {
                            ...(prev.get(id) || {}),
                            userId: id,
                            username: presenceData.username,
                            avatarUrl: presenceData.avatarUrl,
                            color: {
                                background: stringToColor(id),
                                stroke: stringToColor(id + "stroke")
                            }
                        });
                    });
                    return next;
                });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Joined whiteboard collaboration channel:', boardId);
                    await channel.track({
                        id: user.id,
                        username: user.name,
                        avatarUrl: user.image
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [boardId, excalidrawAPI, readOnly, user?.id]);

    // Update parent about collaborators
    useEffect(() => {
        if (excalidrawAPI) {
            excalidrawAPI.updateScene({ collaborators });
        }
    }, [collaborators, excalidrawAPI]);

    const broadcastBoardUpdate = (elements: any[]) => {
        if (readOnly || isUpdatingRef.current || !channelRef.current) return;

        const now = Date.now();
        if (now - lastBroadcastTime.current > 50) {
            lastBroadcastTime.current = now;
            channelRef.current.send({
                type: 'broadcast',
                event: 'board-update',
                payload: { elements }
            }).catch(() => { });
        }
    };

    const broadcastPointerUpdate = (payload: any) => {
        if (readOnly || !channelRef.current || !user?.id) return;

        const now = Date.now();
        if (now - lastPointerBroadcastTime.current > 50) {
            lastPointerBroadcastTime.current = now;

            channelRef.current.send({
                type: 'broadcast',
                event: 'pointer-update',
                payload: {
                    userId: user.id,
                    username: user.name,
                    avatarUrl: user.image,
                    pointer: payload.pointer,
                    button: payload.button
                }
            }).catch(() => { });
        }
    };

    return {
        collaborators: Array.from(collaborators.values()),
        broadcastBoardUpdate,
        broadcastPointerUpdate,
        isUpdatingSync: isUpdatingRef.current
    };
}
