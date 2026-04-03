import { cn } from "@/lib/utils";
import {
    MousePointer2, Hand, Frame, Square, Circle, Triangle,
    ArrowRight, ArrowUpRight, Minus, StickyNote,
    Pencil, Highlighter, PenTool, Type, Eraser, ImageIcon,
    Diamond, Star, Pentagon, Hexagon, Octagon,
    MoreHorizontal, Lock, Unlock, Group, Ungroup,
    Network, Kanban, Workflow, Table,
    Monitor, Smartphone, Spline, Layers,
    RotateCw, Clock,
} from "lucide-react";
import { ToolButton, ShapeButton, TemplateButton, DropdownPanel, Divider } from "./WhiteboardComponents";

const emojiList = ["😀", "😂", "🥰", "😎", "🤔", "🎉", "🔥", "✨", "💯", "🚀", "💡", "✅", "❤️", "👍", "👎", "⭐"];

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
        activeTool, setTool,
        isShapesOpen, setIsShapesOpen,
        isStickyOpen, setIsStickyOpen,
        isFramesOpen, setIsFramesOpen,
        isConnectorOpen, setIsConnectorOpen,
        isPenOpen, setIsPenOpen,
        isMoreOpen, setIsMoreOpen,
        isLocked, setIsLocked,
        stickyColor, setStickyColor,
        closeAllDropdowns,
    } = uiState;

    const {
        insertTemplate, insertSticky, insertStickyStack, insertFrame,
        insertMacroShape, insertEmoji, insertTable,
        groupSelected, ungroupSelected,
    } = actions;

    const label = cn("mb-2 text-xs font-semibold uppercase tracking-wider", theme === "dark" ? "text-white/50" : "text-gray-500");
    const menuBtn = cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors", theme === "dark" ? "text-white/70 hover:bg-white/10" : "text-gray-600 hover:bg-gray-100");

    return (
        <div
            className={cn(
                "absolute left-4 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-0.5 rounded-2xl p-1.5 shadow-xl backdrop-blur-xl",
                theme === "dark" ? "border border-white/10 bg-[#2d2d44]/95" : "border border-black/5 bg-white/95"
            )}
        >
            {/* Selection & Pan */}
            <ToolButton active={activeTool === "selection"} onClick={() => setTool(excalidrawAPI, "selection")} icon={<MousePointer2 size={18} />} tooltip="Select (V)" theme={theme} />
            <ToolButton active={activeTool === "hand"} onClick={() => setTool(excalidrawAPI, "hand")} icon={<Hand size={18} />} tooltip="Pan (H)" theme={theme} />

            <Divider theme={theme} />

            {/* Frames */}
            <div className="relative">
                <ToolButton active={activeTool === "frame" || isFramesOpen} onClick={() => { closeAllDropdowns(); setIsFramesOpen(!isFramesOpen); }} icon={<Frame size={18} />} tooltip="Frames" hasDropdown theme={theme} />
                {isFramesOpen && (
                    <DropdownPanel theme={theme}>
                        <div className="grid grid-cols-2 gap-2 p-3">
                            {frameOptions.map((opt) => (
                                <button key={opt.label} onClick={() => insertFrame(opt.width, opt.height)} className={cn("flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-xs font-medium transition-colors", theme === "dark" ? "text-white/70 hover:bg-white/10" : "text-gray-600 hover:bg-gray-100")}>
                                    {opt.icon}<span>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </DropdownPanel>
                )}
            </div>

            {/* Shapes */}
            <div className="relative">
                <ToolButton active={["rectangle", "ellipse", "diamond"].includes(activeTool) || isShapesOpen} onClick={() => { closeAllDropdowns(); setIsShapesOpen(!isShapesOpen); }} icon={<Square size={18} />} tooltip="Shapes" hasDropdown theme={theme} />
                {isShapesOpen && (
                    <DropdownPanel theme={theme}>
                        <div className="w-[220px] p-4">
                            <div className={label}>Basic</div>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                <ShapeButton active={activeTool === "rectangle"} onClick={() => setTool(excalidrawAPI, "rectangle")} icon={<Square size={20} />} theme={theme} />
                                <ShapeButton active={activeTool === "ellipse"} onClick={() => setTool(excalidrawAPI, "ellipse")} icon={<Circle size={20} />} theme={theme} />
                                <ShapeButton active={activeTool === "diamond"} onClick={() => setTool(excalidrawAPI, "diamond")} icon={<Diamond size={20} />} theme={theme} />
                                <ShapeButton onClick={() => insertMacroShape("triangle")} icon={<Triangle size={20} />} theme={theme} />
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                <ShapeButton onClick={() => insertMacroShape("pentagon")} icon={<Pentagon size={20} />} theme={theme} />
                                <ShapeButton onClick={() => insertMacroShape("hexagon")} icon={<Hexagon size={20} />} theme={theme} />
                                <ShapeButton onClick={() => insertMacroShape("octagon")} icon={<Octagon size={20} />} theme={theme} />
                                <ShapeButton onClick={() => insertMacroShape("star")} icon={<Star size={20} />} theme={theme} />
                            </div>
                        </div>
                    </DropdownPanel>
                )}
            </div>

            {/* Connectors */}
            <div className="relative">
                <ToolButton active={isConnectorOpen || activeTool === "arrow" || activeTool === "line"} onClick={() => { closeAllDropdowns(); setIsConnectorOpen(!isConnectorOpen); }} icon={<ArrowUpRight size={18} />} tooltip="Connectors" hasDropdown theme={theme} />
                {isConnectorOpen && (
                    <DropdownPanel theme={theme}>
                        <div className="p-3">
                            <div className="grid grid-cols-3 gap-1.5">
                                <ShapeButton active={activeTool === "arrow"} onClick={() => setTool(excalidrawAPI, "arrow")} icon={<ArrowRight size={18} />} label="Arrow" theme={theme} />
                                <ShapeButton active={activeTool === "line"} onClick={() => setTool(excalidrawAPI, "line")} icon={<Minus size={18} />} label="Line" theme={theme} />
                                <ShapeButton onClick={() => setTool(excalidrawAPI, "arrow")} icon={<Spline size={18} />} label="Curved" theme={theme} />
                            </div>
                        </div>
                    </DropdownPanel>
                )}
            </div>

            <Divider theme={theme} />

            {/* Sticky Notes */}
            <div className="relative">
                <ToolButton active={isStickyOpen} onClick={() => { closeAllDropdowns(); setIsStickyOpen(!isStickyOpen); }} icon={<StickyNote size={18} />} tooltip="Sticky Notes" hasDropdown theme={theme} />
                {isStickyOpen && (
                    <DropdownPanel theme={theme}>
                        <div className="w-[220px] p-4">
                            <div className="mb-4 grid grid-cols-4 gap-2">
                                {["#fef08a", "#fdba74", "#fca5a5", "#f9a8d4", "#c4b5fd", "#93c5fd", "#6ee7b7", "#86efac"].map((color) => (
                                    <button key={color} onClick={() => { setStickyColor(color); insertSticky(color); }} className={cn("aspect-square w-10 rounded-xl shadow-sm transition-all hover:scale-105", stickyColor === color && "ring-2 ring-gray-400 ring-offset-2")} style={{ backgroundColor: color }} />
                                ))}
                            </div>
                            <div className={cn("my-3 h-px w-full", theme === "dark" ? "bg-white/10" : "bg-gray-200")} />
                            <div className="flex flex-col gap-2">
                                <button onClick={() => insertSticky(stickyColor)} className={cn("flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium", theme === "dark" ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}>
                                    <StickyNote size={16} /> Add note
                                </button>
                                <button onClick={() => insertStickyStack("grid")} className={cn("flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium", theme === "dark" ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}>
                                    <Layers size={16} /> Grid (2×2)
                                </button>
                            </div>
                        </div>
                    </DropdownPanel>
                )}
            </div>

            {/* Pen & Drawing */}
            <div className="relative">
                <ToolButton active={activeTool === "freedraw" || activeTool === "laser" || isPenOpen} onClick={() => { closeAllDropdowns(); setIsPenOpen(!isPenOpen); }} icon={<Pencil size={18} />} tooltip="Drawing" hasDropdown theme={theme} />
                {isPenOpen && (
                    <DropdownPanel theme={theme}>
                        <div className="w-[200px] p-4">
                            <div className="grid grid-cols-3 gap-2">
                                <ShapeButton active={activeTool === "freedraw"} onClick={() => setTool(excalidrawAPI, "freedraw")} icon={<Pencil size={18} />} label="Pen" theme={theme} />
                                <ShapeButton onClick={() => setTool(excalidrawAPI, "freedraw")} icon={<Highlighter size={18} />} label="Marker" theme={theme} />
                                <ShapeButton active={activeTool === "laser"} onClick={() => setTool(excalidrawAPI, "laser")} icon={<PenTool size={18} />} label="Laser" theme={theme} />
                            </div>
                        </div>
                    </DropdownPanel>
                )}
            </div>

            <ToolButton active={activeTool === "text"} onClick={() => setTool(excalidrawAPI, "text")} icon={<Type size={18} />} tooltip="Text (T)" theme={theme} />
            <ToolButton active={activeTool === "eraser"} onClick={() => setTool(excalidrawAPI, "eraser")} icon={<Eraser size={18} />} tooltip="Eraser (E)" theme={theme} />

            <Divider theme={theme} />

            <ToolButton active={activeTool === "image"} onClick={() => setTool(excalidrawAPI, "image")} icon={<ImageIcon size={18} />} tooltip="Image" theme={theme} />

            {/* More - all extra tools consolidated */}
            <div className="relative">
                <ToolButton active={isMoreOpen} onClick={() => { closeAllDropdowns(); setIsMoreOpen(!isMoreOpen); }} icon={<MoreHorizontal size={18} />} tooltip="More" hasDropdown theme={theme} />
                {isMoreOpen && (
                    <DropdownPanel theme={theme} position="top">
                        <div className="w-[320px] p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {/* Templates */}
                            <div className={label}>Templates</div>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <TemplateButton onClick={() => insertTemplate("kanban", theme)} icon={<Kanban size={18} />} label="Kanban" theme={theme} />
                                <TemplateButton onClick={() => insertTemplate("swot", theme)} icon={<Table size={18} />} label="SWOT" theme={theme} />
                                <TemplateButton onClick={() => insertTemplate("mindmap", theme)} icon={<Network size={18} />} label="Mind Map" theme={theme} />
                                <TemplateButton onClick={() => insertTemplate("flowchart", theme)} icon={<Workflow size={18} />} label="Flowchart" theme={theme} />
                                <TemplateButton onClick={() => insertTemplate("retrospective", theme)} icon={<RotateCw size={18} />} label="Retro" theme={theme} />
                                <TemplateButton onClick={() => insertTemplate("timeline", theme)} icon={<Clock size={18} />} label="Timeline" theme={theme} />
                            </div>

                            {/* Emoji */}
                            <div className={label}>Emoji</div>
                            <div className="grid grid-cols-8 gap-1 mb-4">
                                {emojiList.map((emoji) => (
                                    <button key={emoji} onClick={() => insertEmoji(emoji)} className="flex items-center justify-center rounded-lg text-lg p-1.5 transition-all hover:scale-110 hover:bg-gray-100/10">{emoji}</button>
                                ))}
                            </div>

                            {/* Insert */}
                            <div className={label}>Insert</div>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <button onClick={() => insertTable(3, 3, theme)} className={menuBtn}><Table size={16} /> Table 3×3</button>
                            </div>

                            {/* Canvas Controls */}
                            <div className={label}>Canvas</div>
                            <div className="flex flex-col gap-1">
                                <button onClick={() => { setIsLocked(!isLocked); setIsMoreOpen(false); }} className={menuBtn}>
                                    {isLocked ? <Unlock size={16} /> : <Lock size={16} />} {isLocked ? "Unlock Canvas" : "Lock Canvas"}
                                </button>
                                <button onClick={() => { groupSelected(); setIsMoreOpen(false); }} className={menuBtn}><Group size={16} /> Group</button>
                                <button onClick={() => { ungroupSelected(); setIsMoreOpen(false); }} className={menuBtn}><Ungroup size={16} /> Ungroup</button>
                            </div>
                        </div>
                    </DropdownPanel>
                )}
            </div>
        </div>
    );
}
