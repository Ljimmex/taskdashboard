import { cn } from "@/lib/utils";
import {
    MousePointer2, Hand, LayoutTemplate, Frame, Square, Circle, Triangle,
    Network, Kanban, Workflow, Table, ArrowRight, ArrowUpRight, Minus, StickyNote,
    Pencil, Highlighter, PenTool, Type, Eraser, Smile, ImageIcon, Timer,
    Pentagon, Hexagon, Octagon, Star, Diamond, Target, Lightbulb, Zap, Award,
    CheckCircle, XCircle, AlertTriangle, Bookmark, Heart,
    Database, RotateCw, Clock, MessageSquare,
    ThumbsUp, ThumbsDown, MoreHorizontal, Lock, Unlock, Group, Ungroup,
    Monitor, Smartphone, Spline, Cloud
} from "lucide-react";
import { ToolButton, ShapeButton, TemplateButton, DropdownPanel, Divider, IconButton } from "./WhiteboardComponents";

const emojiCategories = {
    reactions: ["👍", "👎", "❤️", "😀", "😂", "🥰", "😎", "🤔", "😮", "😢", "😡", "🤯"],
    status: ["✅", "❌", "⚠️", "❓", "❗", "🔴", "🟡", "🟢", "🔵", "⭕", "✨", "💫"],
    objects: ["🎯", "💡", "🔥", "🚀", "💰", "📌", "📎", "✏️", "📝", "📊", "📈", "📉"],
    celebration: ["🎉", "🎊", "🏆", "🥇", "🥈", "🥉", "⭐", "🌟", "💯", "👏", "🙌", "💪"],
    symbols: ["➡️", "⬅️", "⬆️", "⬇️", "↗️", "↘️", "🔄", "♻️", "🔗", "🔒", "🔓", "⚡"],
    nature: ["🌈", "☀️", "🌙", "⭐", "☁️", "🌸", "🌺", "🍀", "🌲", "🌊", "🔮", "💎"],
};

const frameOptions = [
    { label: "Custom", width: 400, height: 400, icon: <Frame size={16} /> },
    { label: "A4", width: 794, height: 1123, icon: <Square size={16} /> },
    { label: "16:9", width: 1920, height: 1080, icon: <Monitor size={16} /> },
    { label: "1:1", width: 1080, height: 1080, icon: <Square size={16} /> },
    { label: "Mobile", width: 390, height: 844, icon: <Smartphone size={16} /> },
    { label: "Desktop", width: 1440, height: 900, icon: <Monitor size={16} /> },
];

export function WhiteboardToolbar({ theme, uiState, actions, excalidrawAPI }: any) {
    const {
        activeTool, setTool, isShapesOpen, setIsShapesOpen,
        isStickyOpen, setIsStickyOpen, isFramesOpen, setIsFramesOpen,
        isEmojisOpen, setIsEmojisOpen, isConnectorOpen, setIsConnectorOpen,
        isPenOpen, setIsPenOpen, isTemplatesOpen, setIsTemplatesOpen,
        isTimerOpen, setIsTimerOpen, isFlowchartOpen, setIsFlowchartOpen,
        isIconsOpen, setIsIconsOpen, isMoreOpen, setIsMoreOpen,
        isVotingOpen, setIsVotingOpen, isTableOpen, setIsTableOpen,
        isLocked, setIsLocked, stickyColor, setStickyColor,
        closeAllDropdowns, strokeWidth,
        timerMinutes, setTimerMinutes, timerRunning, setTimerRunning
    } = uiState;

    const {
        insertTemplate, insertSticky, insertStickyStack, insertFrame,
        insertMacroShape, insertEmoji, insertKanbanCard, insertTable,
        insertVotingDot, groupSelected, ungroupSelected
    } = actions;

    return (
        <div
            className={cn(
                "absolute left-4 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-0.5 rounded-2xl p-1.5 shadow-xl",
                theme === "dark" ? "border border-white/10 bg-[#2d2d44]/95" : "border border-black/5 bg-white/95",
                "backdrop-blur-xl"
            )}
            style={{ maxHeight: "calc(100vh - 120px)" }}
        >
            <div className="flex flex-col gap-0.5 overflow-y-auto overflow-x-visible custom-scrollbar py-1" style={{ maxHeight: "calc(100vh - 140px)" }}>
                {/* Selection & Pan */}
                <ToolButton active={activeTool === "selection"} onClick={() => setTool(excalidrawAPI, "selection")} icon={<MousePointer2 size={20} />} tooltip="Select (V)" theme={theme} />
                <ToolButton active={activeTool === "hand"} onClick={() => setTool(excalidrawAPI, "hand")} icon={<Hand size={20} />} tooltip="Pan (H)" theme={theme} />

                <Divider theme={theme} />

                {/* Templates */}
                <div className="relative">
                    <ToolButton active={isTemplatesOpen} onClick={() => { closeAllDropdowns(); setIsTemplatesOpen(!isTemplatesOpen); }} icon={<LayoutTemplate size={20} />} tooltip="Templates" hasDropdown theme={theme} />
                    {isTemplatesOpen && (
                        <DropdownPanel theme={theme}>
                            <div className="w-[320px] p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className={cn("mb-3 text-xs font-semibold uppercase tracking-wider", theme === "dark" ? "text-white/50" : "text-gray-500")}>Planning & Strategy</div>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <TemplateButton onClick={() => insertTemplate("kanban", theme)} icon={<Kanban size={20} />} label="Kanban Board" theme={theme} />
                                    <TemplateButton onClick={() => insertTemplate("swot", theme)} icon={<Table size={20} />} label="SWOT Analysis" theme={theme} />
                                    <TemplateButton onClick={() => insertTemplate("retrospective", theme)} icon={<RotateCw size={20} />} label="Retrospective" theme={theme} />
                                    <TemplateButton onClick={() => insertTemplate("prioritization", theme)} icon={<Target size={20} />} label="Prioritization" theme={theme} />
                                </div>
                                <div className={cn("mb-3 text-xs font-semibold uppercase tracking-wider", theme === "dark" ? "text-white/50" : "text-gray-500")}>Ideation & Mapping</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <TemplateButton onClick={() => insertTemplate("mindmap", theme)} icon={<Network size={20} />} label="Mind Map" theme={theme} />
                                    <TemplateButton onClick={() => insertTemplate("flowchart", theme)} icon={<Workflow size={20} />} label="Flowchart" theme={theme} />
                                    <TemplateButton onClick={() => insertTemplate("timeline", theme)} icon={<Clock size={20} />} label="Timeline" theme={theme} />
                                    <TemplateButton onClick={() => insertTemplate("brainstorm", theme)} icon={<Lightbulb size={20} />} label="Brainstorming" theme={theme} />
                                </div>
                            </div>
                        </DropdownPanel>
                    )}
                </div>

                {/* Frames */}
                <div className="relative">
                    <ToolButton active={activeTool === "frame" || isFramesOpen} onClick={() => { closeAllDropdowns(); setIsFramesOpen(!isFramesOpen); }} icon={<Frame size={20} />} tooltip="Frames" hasDropdown theme={theme} />
                    {isFramesOpen && (
                        <DropdownPanel theme={theme}>
                            <div className="grid grid-cols-2 gap-2 p-3">
                                {frameOptions.map((opt) => (
                                    <button key={opt.label} onClick={() => insertFrame(opt.width, opt.height)} className={cn("flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-xs font-medium transition-colors", theme === "dark" ? "text-white/70 hover:bg-white/10" : "text-gray-600 hover:bg-gray-100")}>
                                        {opt.icon}
                                        <span>{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </DropdownPanel>
                    )}
                </div>

                {/* Shapes */}
                <div className="relative">
                    <ToolButton active={["rectangle", "ellipse", "diamond"].includes(activeTool) || isShapesOpen} onClick={() => { closeAllDropdowns(); setIsShapesOpen(!isShapesOpen); }} icon={<Square size={20} />} tooltip="Shapes" hasDropdown theme={theme} />
                    {isShapesOpen && (
                        <DropdownPanel theme={theme}>
                            <div className="w-[280px] p-4">
                                <div className="grid grid-cols-4 gap-2 mb-4">
                                    <ShapeButton active={activeTool === "rectangle"} onClick={() => setTool(excalidrawAPI, "rectangle")} icon={<Square size={22} />} theme={theme} />
                                    <ShapeButton active={activeTool === "ellipse"} onClick={() => setTool(excalidrawAPI, "ellipse")} icon={<Circle size={22} />} theme={theme} />
                                    <ShapeButton active={activeTool === "diamond"} onClick={() => setTool(excalidrawAPI, "diamond")} icon={<Diamond size={22} />} theme={theme} />
                                    <ShapeButton onClick={() => insertMacroShape("triangle")} icon={<Triangle size={22} />} theme={theme} />
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    <ShapeButton onClick={() => insertMacroShape("pentagon")} icon={<Pentagon size={22} />} theme={theme} />
                                    <ShapeButton onClick={() => insertMacroShape("hexagon")} icon={<Hexagon size={22} />} theme={theme} />
                                    <ShapeButton onClick={() => insertMacroShape("octagon")} icon={<Octagon size={22} />} theme={theme} />
                                    <ShapeButton onClick={() => insertMacroShape("star")} icon={<Star size={22} />} theme={theme} />
                                </div>
                            </div>
                        </DropdownPanel>
                    )}
                </div>

                {/* Flowchart */}
                <div className="relative">
                    <ToolButton active={isFlowchartOpen} onClick={() => { closeAllDropdowns(); setIsFlowchartOpen(!isFlowchartOpen); }} icon={<Workflow size={20} />} tooltip="Flowchart" hasDropdown theme={theme} />
                    {isFlowchartOpen && (
                        <DropdownPanel theme={theme}>
                            <div className="w-[280px] p-4">
                                <div className="grid grid-cols-3 gap-2">
                                    <ShapeButton onClick={() => setTool(excalidrawAPI, "ellipse")} icon={<Circle size={18} />} label="Start/End" theme={theme} />
                                    <ShapeButton onClick={() => setTool(excalidrawAPI, "rectangle")} icon={<Square size={18} />} label="Process" theme={theme} />
                                    <ShapeButton onClick={() => setTool(excalidrawAPI, "diamond")} icon={<Diamond size={18} />} label="Decision" theme={theme} />
                                    <ShapeButton onClick={() => insertMacroShape("cloud")} icon={<Cloud size={18} />} label="Cloud" theme={theme} />
                                    <ShapeButton onClick={() => insertMacroShape("callout")} icon={<MessageSquare size={18} />} label="Note" theme={theme} />
                                    <ShapeButton onClick={() => insertKanbanCard()} icon={<Database size={18} />} label="Data" theme={theme} />
                                </div>
                            </div>
                        </DropdownPanel>
                    )}
                </div>

                {/* Connectors */}
                <div className="relative">
                    <ToolButton active={isConnectorOpen || activeTool === "arrow" || activeTool === "line"} onClick={() => { closeAllDropdowns(); setIsConnectorOpen(!isConnectorOpen); }} icon={<ArrowUpRight size={20} />} tooltip="Connectors" hasDropdown theme={theme} />
                    {isConnectorOpen && (
                        <DropdownPanel theme={theme}>
                            <div className="p-3">
                                <div className="grid grid-cols-3 gap-1.5">
                                    <ShapeButton active={activeTool === "arrow"} onClick={() => setTool(excalidrawAPI, "arrow")} icon={<ArrowRight size={18} />} label="Arrow" theme={theme} />
                                    <ShapeButton active={activeTool === "line"} onClick={() => setTool(excalidrawAPI, "line")} icon={<Minus size={18} />} label="Line" theme={theme} />
                                    <ShapeButton onClick={() => setTool(excalidrawAPI, "arrow")} icon={<Spline size={18} />} label="Elbow" theme={theme} />
                                </div>
                            </div>
                        </DropdownPanel>
                    )}
                </div>

                <Divider theme={theme} />

                {/* Sticky Notes */}
                <div className="relative">
                    <ToolButton active={isStickyOpen} onClick={() => { closeAllDropdowns(); setIsStickyOpen(!isStickyOpen); }} icon={<StickyNote size={20} />} tooltip="Sticky Notes" hasDropdown theme={theme} />
                    {isStickyOpen && (
                        <DropdownPanel theme={theme}>
                            <div className="w-[280px] p-4">
                                <div className="mb-4 grid grid-cols-4 gap-2">
                                    {["#fef08a", "#fdba74", "#fca5a5", "#f9a8d4", "#c4b5fd", "#93c5fd", "#6ee7b7", "#86efac"].map((color) => (
                                        <button key={color} onClick={() => { setStickyColor(color); insertSticky(color); }} className={cn("aspect-square w-12 rounded-xl shadow-sm transition-all hover:scale-105", stickyColor === color && "ring-2 ring-gray-400 ring-offset-2")} style={{ backgroundColor: color }} />
                                    ))}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => insertStickyStack("grid")} className={cn("flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium", theme === "dark" ? "bg-white/10 hover:bg-white/20" : "bg-gray-100 hover:bg-gray-200")}>
                                        <LayoutTemplate size={16} /> Grid (2x2)
                                    </button>
                                </div>
                            </div>
                        </DropdownPanel>
                    )}
                </div>

                {/* Kanban Card */}
                <ToolButton onClick={() => insertKanbanCard()} icon={<Kanban size={20} />} tooltip="Kanban Card" theme={theme} />

                {/* Pen & Eraser */}
                <div className="relative">
                    <ToolButton active={activeTool === "freedraw" || activeTool === "laser" || isPenOpen} onClick={() => { closeAllDropdowns(); setIsPenOpen(!isPenOpen); }} icon={<Pencil size={20} />} tooltip="Drawing Tools" hasDropdown theme={theme} />
                    {isPenOpen && (
                        <DropdownPanel theme={theme}>
                            <div className="w-[240px] p-4">
                                <div className="mb-4 grid grid-cols-3 gap-2">
                                    <ShapeButton active={activeTool === "freedraw" && strokeWidth <= 2} onClick={() => setTool(excalidrawAPI, "freedraw")} icon={<Pencil size={20} />} label="Pen" theme={theme} />
                                    <ShapeButton active={activeTool === "freedraw" && strokeWidth > 2} onClick={() => setTool(excalidrawAPI, "freedraw")} icon={<Highlighter size={20} />} label="Marker" theme={theme} />
                                    <ShapeButton active={activeTool === "laser"} onClick={() => setTool(excalidrawAPI, "laser")} icon={<PenTool size={20} />} label="Laser" theme={theme} />
                                </div>
                            </div>
                        </DropdownPanel>
                    )}
                </div>

                <ToolButton active={activeTool === "text"} onClick={() => setTool(excalidrawAPI, "text")} icon={<Type size={20} />} tooltip="Text (T)" theme={theme} />
                <ToolButton active={activeTool === "eraser"} onClick={() => setTool(excalidrawAPI, "eraser")} icon={<Eraser size={20} />} tooltip="Eraser (E)" theme={theme} />

                <Divider theme={theme} />

                {/* Emojis */}
                <div className="relative">
                    <ToolButton active={isEmojisOpen} onClick={() => { closeAllDropdowns(); setIsEmojisOpen(!isEmojisOpen); }} icon={<Smile size={20} />} tooltip="Emoji" hasDropdown theme={theme} />
                    {isEmojisOpen && (
                        <DropdownPanel theme={theme}>
                            <div className="w-[320px] p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {Object.entries(emojiCategories).map(([category, emojis]) => (
                                    <div key={category} className="mb-4">
                                        <div className="mb-2 text-xs font-semibold uppercase opacity-50">{category}</div>
                                        <div className="grid grid-cols-6 gap-1">
                                            {emojis.map((emoji) => (
                                                <button key={emoji} onClick={() => insertEmoji(emoji)} className="flex aspect-square items-center justify-center rounded-lg text-xl hover:bg-gray-100/10 transition-all hover:scale-110">{emoji}</button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </DropdownPanel>
                    )}
                </div>

                {/* Icons */}
                <div className="relative">
                    <ToolButton active={isIconsOpen} onClick={() => { closeAllDropdowns(); setIsIconsOpen(!isIconsOpen); }} icon={<Bookmark size={20} />} tooltip="Icons" hasDropdown theme={theme} />
                    {isIconsOpen && (
                        <DropdownPanel theme={theme}>
                            <div className="w-[280px] p-4">
                                <div className="grid grid-cols-4 gap-2">
                                    <IconButton onClick={() => insertEmoji("✅")} icon={<CheckCircle size={20} className="text-green-500" />} theme={theme} />
                                    <IconButton onClick={() => insertEmoji("❌")} icon={<XCircle size={20} className="text-red-500" />} theme={theme} />
                                    <IconButton onClick={() => insertEmoji("⚠️")} icon={<AlertTriangle size={20} className="text-yellow-500" />} theme={theme} />
                                    <IconButton onClick={() => insertEmoji("💡")} icon={<Lightbulb size={20} className="text-yellow-400" />} theme={theme} />
                                    <IconButton onClick={() => insertEmoji("🎯")} icon={<Target size={20} className="text-red-500" />} theme={theme} />
                                    <IconButton onClick={() => insertEmoji("🔥")} icon={<Zap size={20} className="text-yellow-500" />} theme={theme} />
                                    <IconButton onClick={() => insertEmoji("🏆")} icon={<Award size={20} className="text-yellow-500" />} theme={theme} />
                                    <IconButton onClick={() => insertEmoji("❤️")} icon={<Heart size={20} className="text-red-500" />} theme={theme} />
                                </div>
                            </div>
                        </DropdownPanel>
                    )}
                </div>

                <ToolButton active={activeTool === "image"} onClick={() => setTool(excalidrawAPI, "image")} icon={<ImageIcon size={20} />} tooltip="Image" theme={theme} />

                {/* Table */}
                <div className="relative">
                    <ToolButton active={isTableOpen} onClick={() => { closeAllDropdowns(); setIsTableOpen(!isTableOpen); }} icon={<Table size={20} />} tooltip="Table" hasDropdown theme={theme} />
                    {isTableOpen && (
                        <DropdownPanel theme={theme}>
                            <div className="w-[200px] p-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => insertTable(2, 2, theme)} className={cn("py-2 rounded-lg text-sm", theme === "dark" ? "bg-white/10 hover:bg-white/20" : "bg-gray-100 hover:bg-gray-200")}>2x2</button>
                                    <button onClick={() => insertTable(3, 3, theme)} className={cn("py-2 rounded-lg text-sm", theme === "dark" ? "bg-white/10 hover:bg-white/20" : "bg-gray-100 hover:bg-gray-200")}>3x3</button>
                                    <button onClick={() => insertTable(4, 4, theme)} className={cn("py-2 rounded-lg text-sm", theme === "dark" ? "bg-white/10 hover:bg-white/20" : "bg-gray-100 hover:bg-gray-200")}>4x4</button>
                                    <button onClick={() => insertTable(5, 3, theme)} className={cn("py-2 rounded-lg text-sm", theme === "dark" ? "bg-white/10 hover:bg-white/20" : "bg-gray-100 hover:bg-gray-200")}>5x3</button>
                                </div>
                            </div>
                        </DropdownPanel>
                    )}
                </div>

                <Divider theme={theme} />

                {/* Timer */}
                <div className="relative">
                    <ToolButton active={isTimerOpen} onClick={() => { closeAllDropdowns(); setIsTimerOpen(!isTimerOpen); }} icon={<Timer size={20} />} tooltip="Timer" hasDropdown theme={theme} />
                    {isTimerOpen && (
                        <DropdownPanel theme={theme}>
                            <div className="w-[200px] p-4 text-center">
                                <div className="flex gap-2 mb-4">
                                    {[1, 5, 10, 15].map(mins => (
                                        <button key={mins} onClick={() => { setTimerMinutes(mins); }} className={cn("flex-1 py-1 rounded-lg text-xs", timerMinutes === mins ? "bg-primary text-primary-foreground" : "bg-gray-100/10")}>{mins}m</button>
                                    ))}
                                </div>
                                <button onClick={() => setTimerRunning(!timerRunning)} className={cn("w-full py-2 rounded-xl text-sm font-semibold", timerRunning ? "bg-red-500/20 text-red-500" : "bg-primary text-primary-foreground")}>
                                    {timerRunning ? "Stop Timer" : "Start Timer"}
                                </button>
                            </div>
                        </DropdownPanel>
                    )}
                </div>

                {/* Voting */}
                <div className="relative">
                    <ToolButton active={isVotingOpen} onClick={() => { closeAllDropdowns(); setIsVotingOpen(!isVotingOpen); }} icon={<ThumbsUp size={20} />} tooltip="Voting" hasDropdown theme={theme} />
                    {isVotingOpen && (
                        <DropdownPanel theme={theme}>
                            <div className="p-4 flex gap-2">
                                <button onClick={() => insertVotingDot("up")} className="p-3 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500/20"><ThumbsUp size={24} /></button>
                                <button onClick={() => insertVotingDot("down")} className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20"><ThumbsDown size={24} /></button>
                                <button onClick={() => insertVotingDot("dot")} className="p-3 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"><Circle size={24} className="fill-current" /></button>
                            </div>
                        </DropdownPanel>
                    )}
                </div>

                {/* More */}
                <div className="relative">
                    <ToolButton active={isMoreOpen} onClick={() => { closeAllDropdowns(); setIsMoreOpen(!isMoreOpen); }} icon={<MoreHorizontal size={20} />} tooltip="More" hasDropdown theme={theme} />
                    {isMoreOpen && (
                        <DropdownPanel theme={theme}>
                            <div className="p-2 w-[180px] flex flex-col gap-1">
                                <button onClick={() => { setIsLocked(!isLocked); setIsMoreOpen(false); }} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100/10 text-sm">
                                    {isLocked ? <Unlock size={16} /> : <Lock size={16} />} {isLocked ? "Unlock Canvas" : "Lock Canvas"}
                                </button>
                                <button onClick={() => { groupSelected(); setIsMoreOpen(false); }} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100/10 text-sm"><Group size={16} /> Group</button>
                                <button onClick={() => { ungroupSelected(); setIsMoreOpen(false); }} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100/10 text-sm"><Ungroup size={16} /> Ungroup</button>
                            </div>
                        </DropdownPanel>
                    )}
                </div>
            </div>
        </div>
    );
}
