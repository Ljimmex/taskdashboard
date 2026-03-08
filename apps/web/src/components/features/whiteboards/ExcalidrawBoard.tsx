import { Excalidraw, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useState, useEffect, useRef } from "react";
import { useThemeStore } from "@/lib/themeStore";
import { supabase } from "@/lib/supabase";
import {
    Loader2,
    MousePointer2,
    Square,
    Circle,
    Minus,
    ArrowRight,
    Type,
    StickyNote,
    Pencil,
    Eraser,
    Smile,
    Hexagon,
    ImageIcon,
    Frame,
    Star,
    Triangle,
    MessageSquare,
    Monitor,
    Smartphone,
    Tablet
} from "lucide-react";
import { useSession } from "@/lib/auth";
import { RealtimeChannel } from "@supabase/supabase-js";
import styles from "./ExcalidrawBoard.module.css";
import clsx from "clsx";

interface ExcalidrawBoardProps {
    boardId?: string;
    initialData?: any;
    onSave?: (data: any) => void;
    readOnly?: boolean;
    onCollaboratorsChange?: (collaborators: any[]) => void;
}

// Generate deterministic distinct color based on string
const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = Math.floor(Math.abs((Math.sin(hash) * 16777215)) % 16777215).toString(16);
    return "#" + "0".repeat(6 - color.length) + color;
};

export const ExcalidrawBoard = ({ boardId, initialData, onSave, readOnly = false, onCollaboratorsChange }: ExcalidrawBoardProps) => {
    const { theme } = useThemeStore();
    const { data: session } = useSession();
    const user = session?.user;

    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
    const isUpdatingRef = useRef(false);
    const [isLoading, setIsLoading] = useState(true);

    const channelRef = useRef<RealtimeChannel | null>(null);
    const [collaborators, setCollaborators] = useState<Map<string, any>>(new Map());

    const [activeTool, setActiveTool] = useState("selection");
    const [isShapesOpen, setIsShapesOpen] = useState(false);
    const [isStickyOpen, setIsStickyOpen] = useState(false);
    const [isFramesOpen, setIsFramesOpen] = useState(false);
    const [isEmojisOpen, setIsEmojisOpen] = useState(false);
    const [showImageHint, setShowImageHint] = useState(false);
    const [stickyColor, setStickyColor] = useState("#fef08a");
    const [selectedElement, setSelectedElement] = useState<any>(null);
    const [popupCoords, setPopupCoords] = useState({ x: 0, y: 0 });

    const stickyColors = [
        '#fef08a', '#fbbf24', '#fdba74', '#f87171',
        '#fbcfe8', '#f472b6', '#bfdbfe', '#a78bfa',
        '#67e8f9', '#60a5fa', '#5eead4', '#4ade80',
        '#d9f99d', '#a3e635', '#ffffff', '#1e293b'
    ];

    const frameOptions = [
        { label: "Custom", width: 400, height: 400, icon: <Frame size={18} /> },
        { label: "A4", width: 794, height: 1123, icon: <Square size={18} /> },
        { label: "Letter", width: 816, height: 1056, icon: <Square size={18} /> },
        { label: "16:9", width: 1920, height: 1080, icon: <Monitor size={18} /> },
        { label: "4:3", width: 1024, height: 768, icon: <Monitor size={18} /> },
        { label: "1:1", width: 1080, height: 1080, icon: <Square size={18} /> },
        { label: "Mobile", width: 390, height: 844, icon: <Smartphone size={18} /> },
        { label: "Tablet", width: 820, height: 1180, icon: <Tablet size={18} /> },
        { label: "Desktop", width: 1440, height: 900, icon: <Monitor size={18} /> },
    ];

    const emojiOptions = ["😀", "😂", "🥰", "😎", "🤔", "🎉", "🔥", "✨", "💯", "🚀", "💡", "✅"];

    const setTool = (type: string) => {
        if (!excalidrawAPI) return;
        excalidrawAPI.updateScene({ appState: { activeTool: { type } } });
        setActiveTool(type);
        setIsShapesOpen(false);
        setIsStickyOpen(false);
        setIsFramesOpen(false);
        setIsEmojisOpen(false);
        if (type === 'image') {
            setShowImageHint(true);
            setTimeout(() => setShowImageHint(false), 3000);
        }
    };

    const insertSticky = (color?: string) => {
        if (!excalidrawAPI) return;
        const colorToUse = color || stickyColor;
        setStickyColor(colorToUse);

        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();

        const viewportWidth = appState.width / appState.zoom.value;
        const viewportHeight = appState.height / appState.zoom.value;
        const startX = -appState.scrollX + (viewportWidth - 140) / 2;
        const startY = -appState.scrollY + (viewportHeight - 140) / 2;

        const newStickyId = `sticky-${Date.now()}`;

        const newSticky = {
            type: "rectangle",
            version: 1,
            versionNonce: Math.random(),
            isDeleted: false,
            id: newStickyId,
            fillStyle: "solid",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            angle: 0,
            x: startX,
            y: startY,
            strokeColor: "#000000",
            backgroundColor: colorToUse,
            width: 140,
            height: 140,
            seed: Math.random() * 1000,
            strokeSharpness: "sharp",
            groupIds: [],
            boundElements: null,
            updated: Date.now(),
            link: null,
            locked: false
        };

        excalidrawAPI.updateScene({
            elements: [...elements, newSticky],
            appState: { selectedElementIds: { [newStickyId]: true } }
        });

        setActiveTool("selection");
        setIsStickyOpen(false);
    };

    const insertStickyStack = () => {
        if (!excalidrawAPI) return;
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();

        const viewportWidth = appState.width / appState.zoom.value;
        const viewportHeight = appState.height / appState.zoom.value;
        const startX = -appState.scrollX + (viewportWidth - 300) / 2; // 300 is rough width of 2 stickies with gap
        const startY = -appState.scrollY + (viewportHeight - 300) / 2;

        const newElements = [];
        for (let i = 0; i < 4; i++) {
            newElements.push({
                type: "rectangle",
                version: 1,
                versionNonce: Math.random(),
                isDeleted: false,
                id: `sticky-${Date.now()}-${i}`,
                fillStyle: "solid",
                strokeWidth: 1,
                strokeStyle: "solid",
                roughness: 0,
                opacity: 100,
                angle: (Math.random() - 0.5) * 0.1,
                x: startX + (i % 2) * 160,
                y: startY + Math.floor(i / 2) * 160,
                strokeColor: "#000000",
                backgroundColor: stickyColor,
                width: 140,
                height: 140,
                seed: Math.random() * 1000,
                strokeSharpness: "sharp",
                groupIds: [],
                boundElements: null,
                updated: Date.now(),
                link: null,
                locked: false
            });
        }

        excalidrawAPI.updateScene({ elements: [...elements, ...newElements] });
        setIsStickyOpen(false);
    };

    const insertFrame = (width: number, height: number, isCustom = false) => {
        if (!excalidrawAPI) return;
        if (isCustom) {
            setTool("frame");
        } else {
            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();
            const viewportWidth = appState.width / appState.zoom.value;
            const viewportHeight = appState.height / appState.zoom.value;
            const startX = -appState.scrollX + (viewportWidth - width) / 2;
            const startY = -appState.scrollY + (viewportHeight - height) / 2;

            const newFrameId = `frame-${Date.now()}`;
            const newFrame = {
                type: "frame",
                version: 1,
                versionNonce: Math.random(),
                isDeleted: false,
                id: newFrameId,
                name: "Frame",
                x: startX,
                y: startY,
                width: width,
                height: height,
                angle: 0,
                strokeColor: "#000000",
                backgroundColor: "transparent",
                fillStyle: "solid",
                strokeWidth: 1,
                strokeStyle: "solid",
                roughness: 0,
                opacity: 100,
                groupIds: [],
                boundElements: null,
                updated: Date.now(),
                link: null,
                locked: false
            };
            excalidrawAPI.updateScene({
                elements: [...elements, newFrame],
                appState: { selectedElementIds: { [newFrameId]: true } }
            });
            setActiveTool("selection");
        }
        setIsFramesOpen(false);
    };

    const insertMacroShape = (shapeType: string) => {
        if (!excalidrawAPI) return;
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();
        const viewportWidth = appState.width / appState.zoom.value;
        const viewportHeight = appState.height / appState.zoom.value;
        const startX = -appState.scrollX + (viewportWidth - 100) / 2;
        const startY = -appState.scrollY + (viewportHeight - 100) / 2;

        const newId = `macro-${Date.now()}`;
        let points: [number, number][] = [];

        if (shapeType === 'triangle') {
            points = [[50, 0], [100, 100], [0, 100], [50, 0]];
        } else if (shapeType === 'star') {
            points = [[50, 0], [61, 35], [98, 35], [68, 57], [79, 91], [50, 70], [21, 91], [32, 57], [2, 35], [39, 35], [50, 0]];
        } else if (shapeType === 'message') {
            points = [[0, 0], [100, 0], [100, 80], [60, 80], [40, 100], [40, 80], [0, 80], [0, 0]];
        }

        const newShape = {
            type: "line",
            version: 1,
            versionNonce: Math.random(),
            isDeleted: false,
            id: newId,
            fillStyle: "hachure",
            fillColor: "transparent",
            strokeWidth: 2,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            x: startX,
            y: startY,
            strokeColor: "#000000",
            backgroundColor: "transparent",
            points,
            groupIds: [],
            boundElements: null,
            updated: Date.now(),
            link: null,
            locked: false
        };

        excalidrawAPI.updateScene({
            elements: [...elements, newShape],
            appState: { selectedElementIds: { [newId]: true } }
        });

        setIsShapesOpen(false);
        setActiveTool("selection");
    };

    const insertEmoji = (emoji: string) => {
        if (!excalidrawAPI) return;
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();
        const viewportWidth = appState.width / appState.zoom.value;
        const viewportHeight = appState.height / appState.zoom.value;
        const startX = -appState.scrollX + viewportWidth / 2;
        const startY = -appState.scrollY + viewportHeight / 2;

        const newEmojiId = `emoji-${Date.now()}`;
        const newEmoji = {
            type: "text",
            version: 1,
            versionNonce: Math.random(),
            isDeleted: false,
            id: newEmojiId,
            text: emoji,
            fontSize: 64,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            x: startX - 32,
            y: startY - 32,
            width: 64,
            height: 64,
            strokeColor: "#000000",
            backgroundColor: "transparent",
            fillStyle: "solid",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            angle: 0,
            originalText: emoji,
            groupIds: [],
            boundElements: null,
            updated: Date.now(),
            link: null,
            locked: false
        };
        excalidrawAPI.updateScene({
            elements: [...elements, newEmoji],
            appState: { selectedElementIds: { [newEmojiId]: true } }
        });
        setIsEmojisOpen(false);
        setActiveTool("selection");
    };



    const excalidrawInitialData = useState(() => {
        const appState = initialData?.appState ? { ...initialData.appState } : {};
        if (appState.collaborators) {
            delete appState.collaborators; // Excalidraw expects a Map, DB saves a plain object
        }
        return {
            elements: initialData?.elements || [],
            appState: {
                ...appState,
                // Force subtle grid for professional look
                gridSize: 20,
                viewBackgroundColor: theme === 'dark' ? '#121212' : '#ffffff',
            },
            scrollToContent: true,
        };
    })[0];

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
        if (onCollaboratorsChange) {
            onCollaboratorsChange(Array.from(collaborators.values()));
        }
        if (excalidrawAPI) {
            excalidrawAPI.updateScene({ collaborators });
        }
    }, [collaborators, excalidrawAPI, onCollaboratorsChange]);

    // Throttle our own broadcasts to prevent flooding the websocket
    const lastBroadcastTime = useRef<number>(0);
    const lastPointerBroadcastTime = useRef<number>(0);

    const updateSelected = (updates: any) => {
        if (!excalidrawAPI || !selectedElement) return;
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();

        const newElements = elements.map((el: any) => {
            if (appState.selectedElementIds[el.id]) {
                return { ...el, ...updates };
            }
            if (el.type === 'text' && el.containerId && appState.selectedElementIds[el.containerId]) {
                return { ...el, ...updates };
            }
            return el;
        });

        excalidrawAPI.updateScene({ elements: newElements });
    };

    const handleChange = (elements: readonly any[], appState: any, files: any) => {
        if (readOnly) return;

        // Broadcast changes if not currently applying a remote update
        if (!isUpdatingRef.current && channelRef.current) {
            const now = Date.now();
            if (now - lastBroadcastTime.current > 50) {
                lastBroadcastTime.current = now;
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'board-update',
                    payload: { elements }
                }).catch(() => { }); // ignore broadcast errors
            }
        }

        // Contextual Float Menu Logic
        const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(id => appState.selectedElementIds[id]);
        if (selectedIds.length === 1 && !appState.draggingElement && !appState.editingElement) {
            const el = elements.find(e => e.id === selectedIds[0]);
            if (el && ['rectangle', 'ellipse', 'diamond', 'text'].includes(el.type)) {
                // Ensure text elements get context menu
                const zoom = appState.zoom.value;
                const topY = (el.y + appState.scrollY) * zoom;
                const centerX = (el.x + el.width / 2 + appState.scrollX) * zoom;

                setPopupCoords(prev => {
                    const dist = Math.abs(prev.x - centerX) + Math.abs(prev.y - topY);
                    if (dist > 5 || selectedElement?.id !== el.id) {
                        setSelectedElement(el);
                        return { x: centerX, y: topY };
                    }
                    return prev;
                });
            } else {
                setSelectedElement(null);
            }
        } else if (selectedIds.length !== 1 || appState.draggingElement || appState.editingElement) {
            if (selectedElement) setSelectedElement(null);
        }

        if (appState.activeTool?.type && appState.activeTool.type !== activeTool && activeTool !== 'sticky') {
            setActiveTool(appState.activeTool.type);
        }

        if (onSave) {
            onSave({ elements, appState, files });
        }
    };

    const handlePointerUpdate = (payload: any) => {
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

    // Update background color when theme changes
    useEffect(() => {
        if (excalidrawAPI) {
            excalidrawAPI.updateScene({
                appState: {
                    viewBackgroundColor: theme === 'dark' ? '#121212' : '#ffffff',
                }
            });
        }
    }, [theme, excalidrawAPI]);

    return (
        <div className={clsx(styles.excalidrawWrapper, theme === 'dark' && styles.dark)}>
            {isLoading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[var(--app-bg-deepest)] backdrop-blur-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--app-accent)]" />
                    <span className="text-xs font-medium text-[var(--app-text-muted)] uppercase tracking-widest">Wczytywanie tablicy...</span>
                </div>
            )}

            {/* Custom Header / Info Bar is moved to BoardPage index.tsx */}

            {/* Contextual Properties Panel for Selected Elements */}
            {selectedElement && (
                <div
                    className="absolute z-[60] flex items-center gap-1.5 p-1.5 bg-[var(--app-bg-card)]/90 backdrop-blur-xl border border-[var(--app-border)] rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        left: Math.max(120, Math.min(typeof window !== 'undefined' ? window.innerWidth - 120 : 1000, popupCoords.x)),
                        top: Math.max(60, popupCoords.y - 70), /* Show above the element */
                        transform: 'translateX(-50%)'
                    }}
                >
                    {/* Size S/M/L/XL */}
                    <div className="flex bg-[var(--app-bg-elevated)] rounded-lg p-0.5">
                        <PropBtn active={selectedElement.fontSize === 16} onClick={() => updateSelected({ fontSize: 16 })} label="S" />
                        <PropBtn active={selectedElement.fontSize === 20} onClick={() => updateSelected({ fontSize: 20 })} label="M" />
                        <PropBtn active={selectedElement.fontSize === 28} onClick={() => updateSelected({ fontSize: 28 })} label="L" />
                        <PropBtn active={selectedElement.fontSize === 36} onClick={() => updateSelected({ fontSize: 36 })} label="XL" />
                    </div>
                    <div className="w-px h-5 bg-[var(--app-border)] mx-0.5" />

                    {/* Alignment */}
                    <div className="flex bg-[var(--app-bg-elevated)] rounded-lg p-0.5">
                        <PropBtn active={selectedElement.textAlign === "left"} onClick={() => updateSelected({ textAlign: "left" })} label="L" />
                        <PropBtn active={selectedElement.textAlign === "center"} onClick={() => updateSelected({ textAlign: "center" })} label="C" />
                        <PropBtn active={selectedElement.textAlign === "right"} onClick={() => updateSelected({ textAlign: "right" })} label="R" />
                    </div>
                    <div className="flex bg-[var(--app-bg-elevated)] rounded-lg p-0.5 ml-1">
                        <PropBtn active={selectedElement.verticalAlign === "top"} onClick={() => updateSelected({ verticalAlign: "top" })} label="T" />
                        <PropBtn active={selectedElement.verticalAlign === "middle"} onClick={() => updateSelected({ verticalAlign: "middle" })} label="M" />
                        <PropBtn active={selectedElement.verticalAlign === "bottom"} onClick={() => updateSelected({ verticalAlign: "bottom" })} label="B" />
                    </div>

                    <div className="w-px h-5 bg-[var(--app-border)] mx-0.5" />

                    {/* Quick Colors */}
                    <div className="flex gap-1 px-1">
                        {['#fef08a', '#fdba74', '#fbcfe8', '#bfdbfe', '#a3e635'].map(color => (
                            <button
                                key={color}
                                onClick={() => updateSelected({ backgroundColor: color })}
                                className={clsx("w-5 h-5 rounded-full shadow-sm border border-black/10 transition-transform hover:scale-110", selectedElement.backgroundColor === color && "ring-2 ring-offset-1 ring-offset-[var(--app-bg-card)] ring-[var(--app-accent)]")}
                                style={{ backgroundColor: color }}
                                title="Kolor tła"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Custom Floating Toolbar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-2 bg-[var(--app-bg-card)]/80 backdrop-blur-xl border border-[var(--app-border)] rounded-2xl shadow-xl">
                {/* Drawing Tools Properties (Pen/Eraser) */}
                {(activeTool === 'freedraw' || activeTool === 'eraser' || activeTool === 'line') && (
                    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 bg-[var(--app-bg-card)]/90 backdrop-blur-xl border border-[var(--app-border)] rounded-xl shadow-xl animate-in slide-in-from-bottom-2">
                        <div className="text-[10px] font-semibold text-[var(--app-text-muted)] uppercase tracking-wider px-2">Grubość:</div>
                        <div className="flex gap-1">
                            <button onClick={() => { if (excalidrawAPI) { excalidrawAPI.updateScene({ appState: { currentItemStrokeWidth: 1 } }); updateSelected({ strokeWidth: 1 }); } }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--app-bg-elevated)] transition-colors text-[var(--app-text-primary)]">
                                <div className="w-4 h-[2px] bg-current rounded-full" />
                            </button>
                            <button onClick={() => { if (excalidrawAPI) { excalidrawAPI.updateScene({ appState: { currentItemStrokeWidth: 2 } }); updateSelected({ strokeWidth: 2 }); } }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--app-bg-elevated)] transition-colors text-[var(--app-text-primary)]">
                                <div className="w-4 h-[4px] bg-current rounded-full" />
                            </button>
                            <button onClick={() => { if (excalidrawAPI) { excalidrawAPI.updateScene({ appState: { currentItemStrokeWidth: 4 } }); updateSelected({ strokeWidth: 4 }); } }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--app-bg-elevated)] transition-colors text-[var(--app-text-primary)]">
                                <div className="w-4 h-[6px] bg-current rounded-full" />
                            </button>
                        </div>
                    </div>
                )}

                <ToolButton active={activeTool === 'selection'} onClick={() => setTool('selection')} icon={<MousePointer2 size={18} />} title="Wybierz" />
                <ToolButton active={activeTool === 'freedraw'} onClick={() => setTool('freedraw')} icon={<Pencil size={18} />} title="Rysuj" />
                <ToolButton active={activeTool === 'text'} onClick={() => setTool('text')} icon={<Type size={18} />} title="Tekst" />

                <div className="relative">
                    <ToolButton
                        active={['rectangle', 'diamond', 'ellipse', 'arrow', 'line', 'triangle', 'star', 'message'].includes(activeTool)}
                        onClick={() => setIsShapesOpen(!isShapesOpen)}
                        icon={<Square size={18} />}
                        title="Kształty i linie"
                    />
                    {isShapesOpen && (
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 p-2 bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-2xl shadow-xl animate-in slide-in-from-bottom-2 w-[160px]">
                            <div className="grid grid-cols-4 gap-1 mb-1">
                                <ToolButton active={activeTool === 'line'} onClick={() => setTool('line')} icon={<Minus size={18} />} title="Linia" />
                                <ToolButton active={activeTool === 'arrow'} onClick={() => setTool('arrow')} icon={<ArrowRight size={18} />} title="Strzałka" />
                                {/* Emulate curved arrow/line with native path if needed, but skipping complex curves for now */}
                                <div className="col-span-2" />
                            </div>
                            <div className="w-full h-px bg-[var(--app-border)] my-1" />
                            <div className="grid grid-cols-4 gap-1 mb-1">
                                <ToolButton active={activeTool === 'rectangle'} onClick={() => setTool('rectangle')} icon={<Square size={18} />} title="Prostokąt" />
                                <ToolButton active={activeTool === 'ellipse'} onClick={() => setTool('ellipse')} icon={<Circle size={18} />} title="Koło" />
                                <ToolButton active={activeTool === 'diamond'} onClick={() => setTool('diamond')} icon={<Hexagon size={18} />} title="Romb" />
                                <ToolButton active={activeTool === 'triangle'} onClick={() => insertMacroShape('triangle')} icon={<Triangle size={18} />} title="Trójkąt" />
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                                <ToolButton active={activeTool === 'star'} onClick={() => insertMacroShape('star')} icon={<Star size={18} />} title="Gwiazda" />
                                <ToolButton active={activeTool === 'message'} onClick={() => insertMacroShape('message')} icon={<MessageSquare size={18} />} title="Dymek" />
                                <div className="col-span-2" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <ToolButton
                        active={activeTool === 'sticky'}
                        onClick={() => setIsStickyOpen(!isStickyOpen)}
                        icon={<StickyNote size={18} />}
                        title="Sticky Notes"
                    />
                    {isStickyOpen && (
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 p-3 w-48 bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-2xl shadow-xl animate-in slide-in-from-bottom-2">
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {stickyColors.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => insertSticky(color)}
                                        className={clsx(
                                            "w-full aspect-square rounded shadow-sm border border-black/10 transition-transform hover:scale-110",
                                            stickyColor === color && "ring-2 ring-offset-2 ring-offset-[var(--app-bg-card)] ring-[var(--app-accent)]"
                                        )}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <button
                                    onClick={() => insertSticky(stickyColor)}
                                    className="w-full py-1.5 px-3 bg-[var(--app-bg-elevated)] hover:bg-[var(--app-bg-deepest)] border border-[var(--app-border)] rounded-lg text-xs font-semibold text-[var(--app-text-primary)] transition-colors"
                                >
                                    ✦ Pojedyncza
                                </button>
                                <button
                                    onClick={insertStickyStack}
                                    className="w-full py-1.5 px-3 bg-[var(--app-bg-elevated)] hover:bg-[var(--app-bg-deepest)] border border-[var(--app-border)] rounded-lg text-xs font-semibold text-[var(--app-text-primary)] transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <StickyNote size={12} /> Układ (x4)
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <ToolButton active={activeTool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser size={18} />} title="Gumka" />

                <div className="relative">
                    <ToolButton
                        active={activeTool === 'frame'}
                        onClick={() => setIsFramesOpen(!isFramesOpen)}
                        icon={<Frame size={18} />}
                        title="Ramki (Frames)"
                    />
                    {isFramesOpen && (
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 p-3 bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-2xl shadow-xl animate-in slide-in-from-bottom-2 w-[240px]">
                            <div className="grid grid-cols-3 gap-2">
                                {frameOptions.map(opt => (
                                    <button
                                        key={opt.label}
                                        onClick={() => insertFrame(opt.width, opt.height, opt.label === "Custom")}
                                        className="flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] transition-colors gap-1.5"
                                    >
                                        <div className="text-[var(--app-text-primary)] opacity-80">{opt.icon}</div>
                                        <span>{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-px h-6 bg-[var(--app-border)] mx-1" />

                <div className="relative">
                    <ToolButton onClick={() => setIsEmojisOpen(!isEmojisOpen)} icon={<Smile size={18} />} title="Emoji" />
                    {isEmojisOpen && (
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 p-3 w-64 bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-2xl shadow-xl animate-in slide-in-from-bottom-2">
                            <div className="grid grid-cols-4 gap-2">
                                {emojiOptions.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => insertEmoji(emoji)}
                                        className="w-full aspect-square text-2xl flex items-center justify-center rounded-xl bg-[var(--app-bg-elevated)] hover:bg-[var(--app-bg-deepest)] transition-transform hover:scale-110 shadow-sm border border-black/5"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <ToolButton active={activeTool === 'image'} onClick={() => setTool('image')} icon={<ImageIcon size={18} />} title="Wstaw obraz" />
                    {showImageHint && (
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[var(--app-accent)] text-[var(--app-bg-deepest)] rounded-lg text-xs font-bold shadow-lg animate-in fade-in slide-in-from-bottom-1 whitespace-nowrap">
                            Kliknij w dowolnym miejscu tablicy, by upuścić i wybrać obraz!
                        </div>
                    )}
                </div>
            </div>

            <Excalidraw
                excalidrawAPI={(api) => {
                    setExcalidrawAPI(api);
                    setIsLoading(false);
                }}
                initialData={excalidrawInitialData}
                onChange={handleChange}
                onPointerUpdate={handlePointerUpdate}
                viewModeEnabled={readOnly}
                theme={theme}
                UIOptions={{
                    canvasActions: {
                        changeViewBackgroundColor: false,
                        clearCanvas: true,
                        loadScene: false,
                        export: { saveFileToDisk: true },
                        toggleTheme: false,
                    },
                    tools: {
                        image: true,
                    },
                    // Hide generic help/shortcuts and default menus for cleaner look
                    welcomeScreen: false,
                }}
            >
                {/* Custom Welcome Screen - Minimal */}
                <WelcomeScreen>
                    <WelcomeScreen.Hints.MenuHint>
                        Zacznij rysować lub dodaj element z paska narzędzi.
                    </WelcomeScreen.Hints.MenuHint>
                </WelcomeScreen>

                {/* Simplified Main Menu */}
                <MainMenu>
                    <MainMenu.DefaultItems.SaveAsImage />
                    <MainMenu.DefaultItems.Export />
                    <MainMenu.DefaultItems.ClearCanvas />
                    <MainMenu.Separator />
                    <MainMenu.DefaultItems.ToggleTheme />
                </MainMenu>
            </Excalidraw>
        </div>
    );
};

// Reusable toolbar button component
const ToolButton = ({ active, onClick, icon, title }: any) => (
    <button
        title={title}
        onClick={onClick}
        className={clsx(
            "p-2.5 rounded-xl transition-all",
            active
                ? "bg-[var(--app-accent)]/20 text-[var(--app-accent)]"
                : "text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
        )}
    >
        {icon}
    </button>
);

const PropBtn = ({ active, onClick, label }: any) => (
    <button
        onClick={onClick}
        className={clsx(
            "px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-colors",
            active
                ? "bg-[var(--app-bg-deepest)] text-[var(--app-text-primary)] shadow-sm"
                : "text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]"
        )}
    >
        {label}
    </button>
);