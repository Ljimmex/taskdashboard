import { Excalidraw, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useState, useEffect, useRef } from "react";
import { useThemeStore } from "@/lib/themeStore";
import { supabase } from "@/lib/supabase";
import {
    Loader2,
    MousePointer2,
    Square,
    ArrowRight,
    Type,
    StickyNote,
    Pencil,
    Eraser,
    Smile,
    ImageIcon,
    Frame,
    Hand,
    MoreHorizontal
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

    const emojiOptions = ["😀", "😂", "🥰", "😎", "🤔", "🎉", "🔥", "✨", "💯", "🚀", "💡", "✅"];

    const setTool = (type: string) => {
        if (!excalidrawAPI) return;
        excalidrawAPI.updateScene({ appState: { activeTool: { type } } });
        setActiveTool(type);
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
                viewBackgroundColor: theme === 'dark' ? '#1a1a2e' : '#f8f9fa',
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
                    viewBackgroundColor: theme === 'dark' ? '#1a1a2e' : '#f8f9fa',
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
                    className={clsx(
                        "absolute z-[60] flex items-center gap-1.5 p-1.5 backdrop-blur-xl rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200",
                        theme === 'dark'
                            ? "bg-[#2d2d44] border border-white/10"
                            : "bg-white border border-black/5"
                    )}
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
            <div className={clsx(
                "absolute left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1 p-2 rounded-2xl shadow-xl backdrop-blur-xl",
                theme === 'dark'
                    ? "bg-[#2d2d44]/90 border border-white/10"
                    : "bg-white/95 border border-black/5"
            )}>
                <ToolButton active={activeTool === 'selection'} onClick={() => setTool('selection')} icon={<MousePointer2 size={18} />} title="Select" />
                <ToolButton active={activeTool === 'hand'} onClick={() => setTool('hand')} icon={<Hand size={18} />} title="Hand" />
                <div className="w-full h-px bg-[var(--app-border)] my-1" />
                <ToolButton active={activeTool === 'frame'} onClick={() => setTool('frame')} icon={<Frame size={18} />} title="Frame" />
                <ToolButton active={activeTool === 'rectangle'} onClick={() => setTool('rectangle')} icon={<Square size={18} />} title="Rectangle" />
                <ToolButton active={activeTool === 'arrow'} onClick={() => setTool('arrow')} icon={<ArrowRight size={18} />} title="Arrow" />
                <ToolButton active={activeTool === 'freedraw'} onClick={() => setTool('freedraw')} icon={<Pencil size={18} />} title="Draw" />
                <ToolButton active={activeTool === 'text'} onClick={() => setTool('text')} icon={<Type size={18} />} title="Text" />
                <ToolButton active={activeTool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser size={18} />} title="Eraser" />
                <div className="w-full h-px bg-[var(--app-border)] my-1" />
                <ToolButton onClick={() => setIsEmojisOpen(!isEmojisOpen)} icon={<Smile size={18} />} title="Emoji" />
                <ToolButton active={activeTool === 'image'} onClick={() => setTool('image')} icon={<ImageIcon size={18} />} title="Image" />
                <ToolButton onClick={() => setIsStickyOpen(!isStickyOpen)} icon={<StickyNote size={18} />} title="Sticky" />
                <ToolButton onClick={() => setIsFramesOpen(!isFramesOpen)} icon={<MoreHorizontal size={18} />} title="More" />

                {isEmojisOpen && (
                    <div className={clsx(
                        "absolute left-full ml-3 top-[70%] -translate-y-1/2 p-3 w-64 rounded-2xl shadow-xl animate-in slide-in-from-left-2",
                        theme === 'dark'
                            ? "bg-[#2d2d44] border border-white/10"
                            : "bg-white border border-black/5"
                    )}>
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
                {isStickyOpen && (
                    <div className={clsx(
                        "absolute left-full ml-3 top-[82%] -translate-y-1/2 p-3 w-48 rounded-2xl shadow-xl animate-in slide-in-from-left-2",
                        theme === 'dark'
                            ? "bg-[#2d2d44] border border-white/10"
                            : "bg-white border border-black/5"
                    )}>
                        <div className="grid grid-cols-4 gap-2 mb-3">
                            {stickyColors.slice(0, 8).map(color => (
                                <button
                                    key={color}
                                    onClick={() => insertSticky(color)}
                                    className="w-full aspect-square rounded shadow-sm border border-black/10 transition-transform hover:scale-110"
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                        <button onClick={() => insertSticky(stickyColor)} className="w-full py-1.5 px-3 bg-[var(--app-bg-elevated)] hover:bg-[var(--app-bg-deepest)] border border-[var(--app-border)] rounded-lg text-xs font-semibold text-[var(--app-text-primary)] transition-colors">Add note</button>
                    </div>
                )}
                {isFramesOpen && (
                    <div className={clsx(
                        "absolute left-full ml-3 top-[92%] -translate-y-full p-2 rounded-2xl shadow-xl animate-in slide-in-from-left-2 w-[180px]",
                        theme === 'dark'
                            ? "bg-[#2d2d44] border border-white/10"
                            : "bg-white border border-black/5"
                    )}>
                        <button onClick={() => insertFrame(400, 400, false)} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--app-bg-elevated)]">Frame 1:1</button>
                        <button onClick={() => insertFrame(1920, 1080, false)} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--app-bg-elevated)]">Frame 16:9</button>
                        <button onClick={() => insertFrame(390, 844, false)} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--app-bg-elevated)]">Frame Mobile</button>
                    </div>
                )}
                {showImageHint && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[var(--app-accent)] text-[var(--app-bg-deepest)] rounded-lg text-xs font-bold shadow-lg animate-in fade-in slide-in-from-left-1 whitespace-nowrap">
                        Kliknij na canvas aby dodać obraz
                    </div>
                )}
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
