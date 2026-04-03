import { cn } from "@/lib/utils";
import { MoveUp, MoveDown, Trash2, AlignLeft, AlignCenter, AlignRight, Eye, Maximize2, Minimize2, Copy } from "lucide-react";
import { SmallButton, ContextDivider } from "./WhiteboardComponents";

const strokeColors = ["#1e1e1e", "#e03131", "#2f9e44", "#1971c2", "#f08c00", "#9c36b5"];
const backgroundColors = ["transparent", "#fef08a", "#fdba74", "#fca5a5", "#fbcfe8", "#bfdbfe", "#86efac", "#ffffff"];

export function WhiteboardContextMenu({ selectedElement, popupCoords, updateSelected, excalidrawAPI, theme = "dark" }: any) {
    if (!selectedElement) return null;

    const t = theme === "dark" ? "dark" : "light";
    const elementType = selectedElement.type;
    const isShape = ["rectangle", "ellipse", "diamond"].includes(elementType);
    const isLine = ["line", "arrow"].includes(elementType);
    const isText = elementType === "text";
    const isFreedraw = elementType === "freedraw";

    return (
        <div
            className={cn(
                "absolute z-[60] flex animate-in fade-in zoom-in-95 flex-col rounded-2xl shadow-xl duration-200 backdrop-blur-xl",
                theme === "dark"
                    ? "border border-white/10 bg-[#2d2d44]"
                    : "border border-black/5 bg-white"
            )}
            style={{
                left: Math.max(150, Math.min(typeof window !== "undefined" ? window.innerWidth - 300 : 1000, popupCoords.x)),
                top: Math.max(70, popupCoords.y - 60),
                transform: "translateX(-50%)",
            }}
        >
            <div className="flex items-center gap-1 p-2">
                {/* Fill Colors - shapes only */}
                {isShape && (
                    <>
                        <div className="flex items-center gap-1 px-1">
                            {backgroundColors.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => updateSelected({ backgroundColor: color })}
                                    className={cn(
                                        "h-6 w-6 rounded-full border transition-all hover:scale-110",
                                        selectedElement.backgroundColor === color && "ring-2 ring-primary ring-offset-1",
                                        color === "transparent" ? "border-dashed border-gray-400" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: color === "transparent" ? "transparent" : color }}
                                />
                            ))}
                        </div>
                        <ContextDivider theme={t} />
                    </>
                )}

                {/* Stroke Colors - shapes, lines, freedraw */}
                {(isShape || isLine || isFreedraw) && (
                    <>
                        <div className="flex items-center gap-1 px-1">
                            {strokeColors.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => updateSelected({ strokeColor: color })}
                                    className={cn("h-5 w-5 rounded-full transition-all hover:scale-110", selectedElement.strokeColor === color && "ring-2 ring-primary ring-offset-1")}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                        <ContextDivider theme={t} />
                    </>
                )}

                {/* Alignment - text and shapes */}
                {(isText || isShape) && (
                    <>
                        <div className="flex items-center">
                            <SmallButton onClick={() => updateSelected({ textAlign: "left" })} icon={<AlignLeft size={16} />} active={selectedElement.textAlign === "left"} theme={t} />
                            <SmallButton onClick={() => updateSelected({ textAlign: "center" })} icon={<AlignCenter size={16} />} active={selectedElement.textAlign === "center"} theme={t} />
                            <SmallButton onClick={() => updateSelected({ textAlign: "right" })} icon={<AlignRight size={16} />} active={selectedElement.textAlign === "right"} theme={t} />
                        </div>
                        <ContextDivider theme={t} />
                    </>
                )}

                {/* Font Size - text only */}
                {isText && (
                    <>
                        <div className="flex items-center gap-1 px-1">
                            <SmallButton onClick={() => updateSelected({ fontSize: Math.max(12, (selectedElement.fontSize || 20) - 4) })} icon={<Minimize2 size={14} />} theme={t} />
                            <span className={cn("text-xs font-medium min-w-[24px] text-center", theme === "dark" ? "text-white/80" : "text-gray-700")}>{selectedElement.fontSize || 20}</span>
                            <SmallButton onClick={() => updateSelected({ fontSize: Math.min(128, (selectedElement.fontSize || 20) + 4) })} icon={<Maximize2 size={14} />} theme={t} />
                        </div>
                        <ContextDivider theme={t} />
                    </>
                )}

                {/* Opacity */}
                <div className="flex items-center gap-0.5 px-1">
                    <SmallButton onClick={() => updateSelected({ opacity: 50 })} icon={<Eye size={14} className="opacity-50" />} active={selectedElement.opacity === 50} theme={t} />
                    <SmallButton onClick={() => updateSelected({ opacity: 100 })} icon={<Eye size={14} />} active={selectedElement.opacity === 100} theme={t} />
                </div>

                <ContextDivider theme={t} />

                {/* Duplicate */}
                <SmallButton
                    onClick={() => {
                        if (!excalidrawAPI || !selectedElement) return;
                        const elements = excalidrawAPI.getSceneElements();
                        const newId = `copy-${Date.now()}`;
                        const copied = { ...selectedElement, id: newId, x: selectedElement.x + 20, y: selectedElement.y + 20 };
                        excalidrawAPI.updateScene({ elements: [...elements, copied], appState: { selectedElementIds: { [newId]: true } } });
                    }}
                    icon={<Copy size={16} />}
                    tooltip="Duplicate"
                    theme={t}
                />

                {/* Layer Actions */}
                <SmallButton
                    onClick={() => {
                        if (!excalidrawAPI) return;
                        const els = excalidrawAPI.getSceneElements();
                        const idx = els.findIndex((e: any) => e.id === selectedElement.id);
                        if (idx < els.length - 1) {
                            const newEls = [...els];
                            [newEls[idx], newEls[idx + 1]] = [newEls[idx + 1], newEls[idx]];
                            excalidrawAPI.updateScene({ elements: newEls });
                        }
                    }}
                    icon={<MoveUp size={16} />}
                    tooltip="Bring Forward"
                    theme={t}
                />
                <SmallButton
                    onClick={() => {
                        if (!excalidrawAPI) return;
                        const els = excalidrawAPI.getSceneElements();
                        const idx = els.findIndex((e: any) => e.id === selectedElement.id);
                        if (idx > 0) {
                            const newEls = [...els];
                            [newEls[idx], newEls[idx - 1]] = [newEls[idx - 1], newEls[idx]];
                            excalidrawAPI.updateScene({ elements: newEls });
                        }
                    }}
                    icon={<MoveDown size={16} />}
                    tooltip="Send Backward"
                    theme={t}
                />

                <ContextDivider theme={t} />

                {/* Delete */}
                <SmallButton
                    onClick={() => {
                        if (!excalidrawAPI) return;
                        const els = excalidrawAPI.getSceneElements().filter((e: any) => e.id !== selectedElement.id);
                        excalidrawAPI.updateScene({ elements: els });
                    }}
                    icon={<Trash2 size={16} />}
                    tooltip="Delete"
                    theme={t}
                    destructive
                />
            </div>
        </div>
    );
}
