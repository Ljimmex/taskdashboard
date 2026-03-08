"use client";

import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useState, useEffect, useRef, useCallback } from "react";
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
  ImageIcon,
  Frame,
  Star,
  Triangle,
  MessageSquare,
  Monitor,
  Smartphone,
  Hand,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Spline,
  Diamond,
  PenTool,
  Highlighter,
  Lock,
  Unlock,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Trash2,
  Layers,
  MoreHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MiroBoardProps {
  boardId?: string;
  initialData?: any;
  onSave?: (data: any) => void;
  readOnly?: boolean;
  theme?: "light" | "dark";
  boardName?: string;
  onNameChange?: (name: string) => void;
}

export const MiroBoard = ({
  boardId: _boardId,
  initialData,
  onSave,
  readOnly = false,
  theme = "light",
  boardName: _boardName = "Untitled Board",
  onNameChange: _onNameChange,
}: MiroBoardProps) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [activeTool, setActiveTool] = useState("selection");
  const [isShapesOpen, setIsShapesOpen] = useState(false);
  const [isStickyOpen, setIsStickyOpen] = useState(false);
  const [isFramesOpen, setIsFramesOpen] = useState(false);
  const [isEmojisOpen, setIsEmojisOpen] = useState(false);
  const [isConnectorOpen, setIsConnectorOpen] = useState(false);
  const [isPenOpen, setIsPenOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [showImageHint, setShowImageHint] = useState(false);
  const [stickyColor, setStickyColor] = useState("#fef08a");
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [popupCoords, setPopupCoords] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isLocked, setIsLocked] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeColor, setStrokeColor] = useState("#1e1e1e");

  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const strokeColors = [
    "#1e1e1e",
    "#e03131",
    "#2f9e44",
    "#1971c2",
    "#f08c00",
    "#9c36b5",
    "#0c8599",
    "#e64980",
  ];

  const frameOptions = [
    { label: "Custom", width: 400, height: 400, icon: <Frame size={16} /> },
    { label: "A4", width: 794, height: 1123, icon: <Square size={16} /> },
    { label: "16:9", width: 1920, height: 1080, icon: <Monitor size={16} /> },
    { label: "1:1", width: 1080, height: 1080, icon: <Square size={16} /> },
    {
      label: "Mobile",
      width: 390,
      height: 844,
      icon: <Smartphone size={16} />,
    },
    { label: "Desktop", width: 1440, height: 900, icon: <Monitor size={16} /> },
  ];

  const emojiOptions = [
    "😀",
    "😂",
    "🥰",
    "😎",
    "🤔",
    "🎉",
    "🔥",
    "✨",
    "💯",
    "🚀",
    "💡",
    "✅",
    "❤️",
    "👍",
    "👎",
    "⭐",
  ];

  const closeAllDropdowns = useCallback(() => {
    setIsShapesOpen(false);
    setIsStickyOpen(false);
    setIsFramesOpen(false);
    setIsEmojisOpen(false);
    setIsConnectorOpen(false);
    setIsPenOpen(false);
    setIsMoreOpen(false);
  }, []);

  const setTool = useCallback(
    (type: string) => {
      if (!excalidrawAPI) return;
      if (typeof excalidrawAPI.setActiveTool === "function") {
        excalidrawAPI.setActiveTool({ type, lastActiveToolBeforeEraser: null, locked: false });
      } else {
        excalidrawAPI.updateScene({ appState: { activeTool: { type } } });
      }
      setActiveTool(type);
      closeAllDropdowns();
      if (type === "image") {
        setShowImageHint(true);
        setTimeout(() => setShowImageHint(false), 3000);
      }
    },
    [excalidrawAPI, closeAllDropdowns]
  );

  const insertSticky = useCallback(
    (color?: string) => {
      if (!excalidrawAPI) return;
      const colorToUse = color || stickyColor;
      setStickyColor(colorToUse);

      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();

      const viewportWidth = appState.width / appState.zoom.value;
      const viewportHeight = appState.height / appState.zoom.value;
      const startX = -appState.scrollX + (viewportWidth - 200) / 2;
      const startY = -appState.scrollY + (viewportHeight - 200) / 2;

      const newStickyId = `sticky-${Date.now()}`;

      const newSticky = {
        type: "rectangle",
        version: 1,
        versionNonce: Math.random(),
        isDeleted: false,
        id: newStickyId,
        fillStyle: "solid",
        strokeWidth: 0,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        angle: 0,
        x: startX,
        y: startY,
        strokeColor: "transparent",
        backgroundColor: colorToUse,
        width: 200,
        height: 200,
        seed: Math.random() * 1000,
        strokeSharpness: "round",
        groupIds: [],
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        roundness: { type: 3, value: 16 },
      };

      excalidrawAPI.updateScene({
        elements: [...elements, newSticky],
        appState: { selectedElementIds: { [newStickyId]: true } },
      });

      setActiveTool("selection");
      setIsStickyOpen(false);
    },
    [excalidrawAPI, stickyColor]
  );

  const insertStickyStack = useCallback(() => {
    if (!excalidrawAPI) return;
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();

    const viewportWidth = appState.width / appState.zoom.value;
    const viewportHeight = appState.height / appState.zoom.value;
    const startX = -appState.scrollX + (viewportWidth - 440) / 2;
    const startY = -appState.scrollY + (viewportHeight - 440) / 2;

    const newElements = [];
    const colors = ["#fef08a", "#fbcfe8", "#bfdbfe", "#5eead4"];
    for (let i = 0; i < 4; i++) {
      newElements.push({
        type: "rectangle",
        version: 1,
        versionNonce: Math.random(),
        isDeleted: false,
        id: `sticky-${Date.now()}-${i}`,
        fillStyle: "solid",
        strokeWidth: 0,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        angle: 0,
        x: startX + (i % 2) * 220,
        y: startY + Math.floor(i / 2) * 220,
        strokeColor: "transparent",
        backgroundColor: colors[i],
        width: 200,
        height: 200,
        seed: Math.random() * 1000,
        strokeSharpness: "round",
        groupIds: [],
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        roundness: { type: 3, value: 16 },
      });
    }

    excalidrawAPI.updateScene({ elements: [...elements, ...newElements] });
    setIsStickyOpen(false);
  }, [excalidrawAPI]);

  const insertFrame = useCallback(
    (width: number, height: number, isCustom = false) => {
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
          locked: false,
        };
        excalidrawAPI.updateScene({
          elements: [...elements, newFrame],
          appState: { selectedElementIds: { [newFrameId]: true } },
        });
        setActiveTool("selection");
      }
      setIsFramesOpen(false);
    },
    [excalidrawAPI, setTool]
  );

  const insertMacroShape = useCallback(
    (shapeType: string) => {
      if (!excalidrawAPI) return;
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const viewportWidth = appState.width / appState.zoom.value;
      const viewportHeight = appState.height / appState.zoom.value;
      const startX = -appState.scrollX + (viewportWidth - 100) / 2;
      const startY = -appState.scrollY + (viewportHeight - 100) / 2;

      const newId = `macro-${Date.now()}`;
      let points: [number, number][] = [];

      if (shapeType === "triangle") {
        points = [
          [50, 0],
          [100, 100],
          [0, 100],
          [50, 0],
        ];
      } else if (shapeType === "star") {
        points = [
          [50, 0],
          [61, 35],
          [98, 35],
          [68, 57],
          [79, 91],
          [50, 70],
          [21, 91],
          [32, 57],
          [2, 35],
          [39, 35],
          [50, 0],
        ];
      } else if (shapeType === "message") {
        points = [
          [0, 0],
          [100, 0],
          [100, 80],
          [60, 80],
          [40, 100],
          [40, 80],
          [0, 80],
          [0, 0],
        ];
      }

      const newShape = {
        type: "line",
        version: 1,
        versionNonce: Math.random(),
        isDeleted: false,
        id: newId,
        fillStyle: "solid",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        x: startX,
        y: startY,
        strokeColor: strokeColor,
        backgroundColor: "transparent",
        points,
        groupIds: [],
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
      };

      excalidrawAPI.updateScene({
        elements: [...elements, newShape],
        appState: { selectedElementIds: { [newId]: true } },
      });

      setIsShapesOpen(false);
      setActiveTool("selection");
    },
    [excalidrawAPI, strokeColor]
  );

  const insertEmoji = useCallback(
    (emoji: string) => {
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
        locked: false,
      };
      excalidrawAPI.updateScene({
        elements: [...elements, newEmoji],
        appState: { selectedElementIds: { [newEmojiId]: true } },
      });
      setIsEmojisOpen(false);
      setActiveTool("selection");
    },
    [excalidrawAPI]
  );

  const handleZoom = useCallback(
    (delta: number) => {
      if (!excalidrawAPI) return;
      const appState = excalidrawAPI.getAppState();
      const newZoom = Math.min(Math.max(appState.zoom.value + delta, 0.1), 5);
      excalidrawAPI.updateScene({
        appState: { zoom: { value: newZoom } },
      });
      setZoomLevel(Math.round(newZoom * 100));
    },
    [excalidrawAPI]
  );

  const handleUndo = useCallback(() => {
    if (!excalidrawAPI) return;
    if (typeof excalidrawAPI.undo === "function") {
      excalidrawAPI.undo();
      return;
    }
    excalidrawAPI.history?.undo?.();
  }, [excalidrawAPI]);

  const handleRedo = useCallback(() => {
    if (!excalidrawAPI) return;
    if (typeof excalidrawAPI.redo === "function") {
      excalidrawAPI.redo();
      return;
    }
    excalidrawAPI.history?.redo?.();
  }, [excalidrawAPI]);

  const resetZoom = useCallback(() => {
    if (!excalidrawAPI) return;
    excalidrawAPI.updateScene({
      appState: { zoom: { value: 1 } },
    });
    setZoomLevel(100);
  }, [excalidrawAPI]);

  const [excalidrawInitialData] = useState(() => {
    const appState = initialData?.appState ? { ...initialData.appState } : {};
    if (appState.collaborators) {
      delete appState.collaborators;
    }
    return {
      elements: initialData?.elements || [],
      appState: {
        ...appState,
        gridSize: 20,
        viewBackgroundColor: theme === "dark" ? "#1a1a2e" : "#f8f9fa",
      },
      scrollToContent: true,
    };
  });

  const updateSelected = useCallback(
    (updates: any) => {
      if (!excalidrawAPI || !selectedElement) return;
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();

      const newElements = elements.map((el: any) => {
        if (appState.selectedElementIds[el.id]) {
          return { ...el, ...updates };
        }
        if (
          el.type === "text" &&
          el.containerId &&
          appState.selectedElementIds[el.containerId]
        ) {
          return { ...el, ...updates };
        }
        return el;
      });

      excalidrawAPI.updateScene({ elements: newElements });
    },
    [excalidrawAPI, selectedElement]
  );

  const handleChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      if (readOnly) return;

      // Update zoom level display
      if (appState.zoom?.value) {
        setZoomLevel(Math.round(appState.zoom.value * 100));
      }

      // Contextual Float Menu Logic
      const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(
        (id) => appState.selectedElementIds[id]
      );
      if (
        selectedIds.length === 1 &&
        !appState.draggingElement &&
        !appState.editingElement
      ) {
        const el = elements.find((e) => e.id === selectedIds[0]);
        if (
          el &&
          ["rectangle", "ellipse", "diamond", "text", "line", "arrow"].includes(
            el.type
          )
        ) {
          const zoom = appState.zoom.value;
          const topY = (el.y + appState.scrollY) * zoom;
          const centerX = (el.x + el.width / 2 + appState.scrollX) * zoom;

          setPopupCoords((prev) => {
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
      } else if (
        selectedIds.length !== 1 ||
        appState.draggingElement ||
        appState.editingElement
      ) {
        if (selectedElement) setSelectedElement(null);
      }

      if (
        appState.activeTool?.type &&
        appState.activeTool.type !== activeTool &&
        activeTool !== "sticky"
      ) {
        setActiveTool(appState.activeTool.type);
      }

      if (onSave) {
        onSave({ elements, appState, files });
      }
    },
    [readOnly, activeTool, selectedElement, onSave]
  );

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden",
        theme === "dark" ? "bg-[#1a1a2e]" : "bg-[#f8f9fa]"
      )}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Loading board...
          </span>
        </div>
      )}

      {/* Miro-style Left Sidebar Toolbar */}
      <div
        ref={toolbarRef}
        className={cn(
          "absolute left-4 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-1 rounded-2xl p-2 shadow-xl",
          theme === "dark"
            ? "border border-white/10 bg-[#2d2d44]/95"
            : "border border-black/5 bg-white/95",
          "backdrop-blur-xl"
        )}
      >
        {/* Selection & Hand */}
        <ToolButton
          active={activeTool === "selection"}
          onClick={() => setTool("selection")}
          icon={<MousePointer2 size={20} />}
          tooltip="Select (V)"
          theme={theme}
        />
        <ToolButton
          active={activeTool === "hand" || activeTool === "pan"}
          onClick={() => setTool("hand")}
          icon={<Hand size={20} />}
          tooltip="Pan (H)"
          theme={theme}
        />

        <div
          className={cn(
            "my-1 h-px w-full",
            theme === "dark" ? "bg-white/10" : "bg-black/10"
          )}
        />

        {/* Templates / Frames */}
        <div className="relative">
          <ToolButton
            active={activeTool === "frame" || isFramesOpen}
            onClick={() => {
              closeAllDropdowns();
              setIsFramesOpen(!isFramesOpen);
            }}
            icon={<Frame size={20} />}
            tooltip="Frames"
            hasDropdown
            theme={theme}
          />
          {isFramesOpen && (
            <DropdownPanel theme={theme} position="right">
              <div className="grid grid-cols-2 gap-2 p-3">
                {frameOptions.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() =>
                      insertFrame(opt.width, opt.height, opt.label === "Custom")
                    }
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-xs font-medium transition-colors",
                      theme === "dark"
                        ? "text-white/70 hover:bg-white/10 hover:text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
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
          <ToolButton
            active={[
              "rectangle",
              "diamond",
              "ellipse",
              "arrow",
              "line",
            ].includes(activeTool)}
            onClick={() => {
              closeAllDropdowns();
              setIsShapesOpen(!isShapesOpen);
            }}
            icon={<Square size={20} />}
            tooltip="Shapes"
            hasDropdown
            theme={theme}
          />
          {isShapesOpen && (
            <DropdownPanel theme={theme} position="right">
              <div className="w-[220px] p-4">
                <div className={cn(
                  "mb-3 text-xs font-semibold uppercase tracking-wider",
                  theme === "dark" ? "text-white/50" : "text-gray-500"
                )}>
                  Basic Shapes
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <ShapeButton
                    active={activeTool === "rectangle"}
                    onClick={() => setTool("rectangle")}
                    icon={<Square size={22} />}
                    theme={theme}
                  />
                  <ShapeButton
                    active={activeTool === "ellipse"}
                    onClick={() => setTool("ellipse")}
                    icon={<Circle size={22} />}
                    theme={theme}
                  />
                  <ShapeButton
                    active={activeTool === "diamond"}
                    onClick={() => setTool("diamond")}
                    icon={<Diamond size={22} />}
                    theme={theme}
                  />
                  <ShapeButton
                    onClick={() => insertMacroShape("triangle")}
                    icon={<Triangle size={22} />}
                    theme={theme}
                  />
                </div>
                
                <div className={cn(
                  "my-3 h-px w-full",
                  theme === "dark" ? "bg-white/10" : "bg-gray-200"
                )} />
                
                <div className={cn(
                  "mb-3 text-xs font-semibold uppercase tracking-wider",
                  theme === "dark" ? "text-white/50" : "text-gray-500"
                )}>
                  Lines & Arrows
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <ShapeButton
                    active={activeTool === "line"}
                    onClick={() => setTool("line")}
                    icon={<Minus size={22} />}
                    theme={theme}
                  />
                  <ShapeButton
                    active={activeTool === "arrow"}
                    onClick={() => setTool("arrow")}
                    icon={<ArrowRight size={22} />}
                    theme={theme}
                  />
                  <ShapeButton
                    onClick={() => insertMacroShape("star")}
                    icon={<Star size={22} />}
                    theme={theme}
                  />
                  <ShapeButton
                    onClick={() => insertMacroShape("message")}
                    icon={<MessageSquare size={22} />}
                    theme={theme}
                  />
                </div>
              </div>
            </DropdownPanel>
          )}
        </div>

        {/* Connectors */}
        <div className="relative">
          <ToolButton
            active={isConnectorOpen}
            onClick={() => {
              closeAllDropdowns();
              setIsConnectorOpen(!isConnectorOpen);
            }}
            icon={<ArrowUpRight size={20} />}
            tooltip="Connectors"
            hasDropdown
            theme={theme}
          />
          {isConnectorOpen && (
            <DropdownPanel theme={theme} position="right">
              <div className="p-3">
                <div className="grid grid-cols-3 gap-1.5">
                  <ShapeButton
                    active={activeTool === "arrow"}
                    onClick={() => setTool("arrow")}
                    icon={<ArrowRight size={18} />}
                    label="Arrow"
                    theme={theme}
                  />
                  <ShapeButton
                    active={activeTool === "line"}
                    onClick={() => setTool("line")}
                    icon={<Minus size={18} />}
                    label="Line"
                    theme={theme}
                  />
                  <ShapeButton
                    onClick={() => setTool("arrow")}
                    icon={<Spline size={18} />}
                    label="Curved"
                    theme={theme}
                  />
                </div>
              </div>
            </DropdownPanel>
          )}
        </div>

        {/* Sticky Notes */}
        <div className="relative">
          <ToolButton
            active={isStickyOpen}
            onClick={() => {
              closeAllDropdowns();
              setIsStickyOpen(!isStickyOpen);
            }}
            icon={<StickyNote size={20} />}
            tooltip="Sticky Notes"
            hasDropdown
            theme={theme}
          />
          {isStickyOpen && (
            <DropdownPanel theme={theme} position="right">
              <div className="w-[220px] p-4">
                {/* Color Grid - Miro Style */}
                <div className="mb-4 grid grid-cols-4 gap-2">
                  {[
                    "#fef08a", // yellow
                    "#fdba74", // orange
                    "#fca5a5", // red/coral
                    "#f9a8d4", // pink
                    "#c4b5fd", // light purple
                    "#93c5fd", // light blue
                    "#6ee7b7", // mint
                    "#86efac", // light green
                  ].map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setStickyColor(color);
                        insertSticky(color);
                      }}
                      className={cn(
                        "aspect-square w-10 rounded-xl shadow-sm transition-all hover:scale-105 hover:shadow-md",
                        stickyColor === color &&
                          "ring-2 ring-gray-400 ring-offset-2"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                
                {/* Divider */}
                <div className={cn(
                  "my-3 h-px w-full",
                  theme === "dark" ? "bg-white/10" : "bg-gray-200"
                )} />
                
                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => insertSticky(stickyColor)}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                      theme === "dark"
                        ? "bg-white/10 text-white hover:bg-white/20"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    <StickyNote size={16} />
                    Add single note
                  </button>
                  <button
                    onClick={insertStickyStack}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                      theme === "dark"
                        ? "bg-white/10 text-white hover:bg-white/20"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    <Layers size={16} />
                    Add 4 notes
                  </button>
                </div>
              </div>
            </DropdownPanel>
          )}
        </div>

        {/* Pen / Drawing */}
        <div className="relative">
          <ToolButton
            active={
              activeTool === "freedraw" ||
              activeTool === "laser" ||
              isPenOpen
            }
            onClick={() => {
              closeAllDropdowns();
              setIsPenOpen(!isPenOpen);
            }}
            icon={<Pencil size={20} />}
            tooltip="Drawing Tools"
            hasDropdown
            theme={theme}
          />
          {isPenOpen && (
            <DropdownPanel theme={theme} position="right">
              <div className="w-[220px] p-4">
                {/* Drawing Tools */}
                <div className={cn(
                  "mb-3 text-xs font-semibold uppercase tracking-wider",
                  theme === "dark" ? "text-white/50" : "text-gray-500"
                )}>
                  Drawing Tools
                </div>
                <div className="mb-4 grid grid-cols-3 gap-2">
                  <ShapeButton
                    active={activeTool === "freedraw" && strokeWidth <= 2}
                    onClick={() => {
                      setStrokeWidth(2);
                      setTool("freedraw");
                      if (excalidrawAPI) {
                        excalidrawAPI.updateScene({
                          appState: { 
                            currentItemStrokeWidth: 2,
                            currentItemStrokeColor: strokeColor 
                          },
                        });
                      }
                    }}
                    icon={<Pencil size={20} />}
                    label="Pen"
                    theme={theme}
                  />
                  <ShapeButton
                    active={activeTool === "freedraw" && strokeWidth > 2}
                    onClick={() => {
                      setStrokeWidth(6);
                      setTool("freedraw");
                      if (excalidrawAPI) {
                        excalidrawAPI.updateScene({
                          appState: { 
                            currentItemStrokeWidth: 6,
                            currentItemStrokeColor: strokeColor,
                            currentItemOpacity: 60
                          },
                        });
                      }
                    }}
                    icon={<Highlighter size={20} />}
                    label="Marker"
                    theme={theme}
                  />
                  <ShapeButton
                    active={activeTool === "laser"}
                    onClick={() => {
                      setTool("laser");
                    }}
                    icon={<PenTool size={20} />}
                    label="Laser"
                    theme={theme}
                  />
                </div>
                
                <div className={cn(
                  "my-3 h-px w-full",
                  theme === "dark" ? "bg-white/10" : "bg-gray-200"
                )} />
                
                {/* Stroke Width */}
                <div className={cn(
                  "mb-3 text-xs font-semibold uppercase tracking-wider",
                  theme === "dark" ? "text-white/50" : "text-gray-500"
                )}>
                  Stroke Width
                </div>
                <div className="mb-4 flex gap-2">
                  {[1, 2, 4, 6].map((width) => (
                    <button
                      key={width}
                      onClick={() => {
                        setStrokeWidth(width);
                        if (excalidrawAPI) {
                          excalidrawAPI.updateScene({
                            appState: { currentItemStrokeWidth: width },
                          });
                        }
                      }}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                        strokeWidth === width
                          ? "bg-primary text-primary-foreground"
                          : theme === "dark"
                            ? "bg-white/10 hover:bg-white/20"
                            : "bg-gray-100 hover:bg-gray-200"
                      )}
                    >
                      <div
                        className="rounded-full bg-current"
                        style={{ width: width * 2.5, height: width * 2.5 }}
                      />
                    </button>
                  ))}
                </div>
                
                {/* Color */}
                <div className={cn(
                  "mb-3 text-xs font-semibold uppercase tracking-wider",
                  theme === "dark" ? "text-white/50" : "text-gray-500"
                )}>
                  Color
                </div>
                <div className="flex flex-wrap gap-2">
                  {strokeColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setStrokeColor(color);
                        if (excalidrawAPI) {
                          excalidrawAPI.updateScene({
                            appState: { currentItemStrokeColor: color },
                          });
                        }
                      }}
                      className={cn(
                        "h-7 w-7 rounded-full transition-transform hover:scale-110",
                        strokeColor === color &&
                          "ring-2 ring-gray-400 ring-offset-2"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </DropdownPanel>
          )}
        </div>

        {/* Text */}
        <ToolButton
          active={activeTool === "text"}
          onClick={() => setTool("text")}
          icon={<Type size={20} />}
          tooltip="Text (T)"
          theme={theme}
        />

        {/* Eraser */}
        <ToolButton
          active={activeTool === "eraser"}
          onClick={() => setTool("eraser")}
          icon={<Eraser size={20} />}
          tooltip="Eraser (E)"
          theme={theme}
        />

        <div
          className={cn(
            "my-1 h-px w-full",
            theme === "dark" ? "bg-white/10" : "bg-black/10"
          )}
        />

        {/* Emoji */}
        <div className="relative">
          <ToolButton
            active={isEmojisOpen}
            onClick={() => {
              closeAllDropdowns();
              setIsEmojisOpen(!isEmojisOpen);
            }}
            icon={<Smile size={20} />}
            tooltip="Emoji"
            theme={theme}
          />
          {isEmojisOpen && (
            <DropdownPanel theme={theme} position="right">
              <div className="grid grid-cols-4 gap-2 p-3">
                {emojiOptions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-xl text-2xl transition-transform hover:scale-110",
                      theme === "dark"
                        ? "bg-white/10 hover:bg-white/20"
                        : "bg-gray-100 hover:bg-gray-200"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </DropdownPanel>
          )}
        </div>

        {/* Image */}
        <div className="relative">
          <ToolButton
            active={activeTool === "image"}
            onClick={() => setTool("image")}
            icon={<ImageIcon size={20} />}
            tooltip="Upload Image"
            theme={theme}
          />
          {showImageHint && (
            <div
              className={cn(
                "absolute left-full ml-3 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold shadow-lg",
                theme === "dark"
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary text-primary-foreground"
              )}
            >
              Click anywhere on the canvas to add an image
            </div>
          )}
        </div>

        {/* More */}
        <div className="relative">
          <ToolButton
            active={isMoreOpen}
            onClick={() => {
              closeAllDropdowns();
              setIsMoreOpen(!isMoreOpen);
            }}
            icon={<MoreHorizontal size={20} />}
            tooltip="More tools"
            theme={theme}
          />
          {isMoreOpen && (
            <DropdownPanel theme={theme} position="right">
              <div className="p-2">
                <button
                  onClick={() => {
                    setIsLocked(!isLocked);
                    setIsMoreOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    theme === "dark"
                      ? "hover:bg-white/10"
                      : "hover:bg-gray-100"
                  )}
                >
                  {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                  {isLocked ? "Unlock canvas" : "Lock canvas"}
                </button>
              </div>
            </DropdownPanel>
          )}
        </div>
      </div>

      {/* Context Menu for Selected Elements - Miro Style */}
      {selectedElement && (
        <div
          className={cn(
            "absolute z-[60] flex animate-in fade-in zoom-in-95 items-center gap-1 rounded-2xl px-2 py-1.5 shadow-xl duration-200",
            theme === "dark"
              ? "border border-white/10 bg-[#2d2d44]"
              : "border border-black/5 bg-white",
            "backdrop-blur-xl"
          )}
          style={{
            left: Math.max(
              150,
              Math.min(
                typeof window !== "undefined" ? window.innerWidth - 250 : 1000,
                popupCoords.x
              )
            ),
            top: Math.max(70, popupCoords.y - 55),
            transform: "translateX(-50%)",
          }}
        >
          {/* Quick Colors */}
          <div className="flex items-center gap-1.5 px-1">
            {["#fef08a", "#fdba74", "#fca5a5", "#bfdbfe", "#6ee7b7"].map(
              (color) => (
                <button
                  key={color}
                  onClick={() => updateSelected({ backgroundColor: color })}
                  className={cn(
                    "h-6 w-6 rounded-full shadow-sm transition-all hover:scale-110",
                    selectedElement.backgroundColor === color &&
                      "ring-2 ring-gray-400 ring-offset-2"
                  )}
                  style={{ backgroundColor: color }}
                />
              )
            )}
          </div>

          <div
            className={cn(
              "mx-2 h-6 w-px",
              theme === "dark" ? "bg-white/20" : "bg-gray-200"
            )}
          />

          {/* Alignment */}
          <div className="flex items-center">
            <SmallButton
              onClick={() => updateSelected({ textAlign: "left" })}
              icon={<AlignLeft size={16} />}
              active={selectedElement.textAlign === "left"}
              theme={theme}
            />
            <SmallButton
              onClick={() => updateSelected({ textAlign: "center" })}
              icon={<AlignCenter size={16} />}
              active={selectedElement.textAlign === "center"}
              theme={theme}
            />
            <SmallButton
              onClick={() => updateSelected({ textAlign: "right" })}
              icon={<AlignRight size={16} />}
              active={selectedElement.textAlign === "right"}
              theme={theme}
            />
          </div>

          <div
            className={cn(
              "mx-2 h-6 w-px",
              theme === "dark" ? "bg-white/20" : "bg-gray-200"
            )}
          />

          {/* Actions */}
          <SmallButton
            onClick={() => {
              if (excalidrawAPI && selectedElement) {
                const elements = excalidrawAPI.getSceneElements();
                const newId = `copy-${Date.now()}`;
                const copiedElement = {
                  ...selectedElement,
                  id: newId,
                  x: selectedElement.x + 20,
                  y: selectedElement.y + 20,
                };
                excalidrawAPI.updateScene({
                  elements: [...elements, copiedElement],
                  appState: { selectedElementIds: { [newId]: true } },
                });
              }
            }}
            icon={<Copy size={16} />}
            tooltip="Duplicate"
            theme={theme}
          />
          <SmallButton
            onClick={() => {
              if (excalidrawAPI && selectedElement) {
                const elements = excalidrawAPI
                  .getSceneElements()
                  .filter((el: any) => el.id !== selectedElement.id);
                excalidrawAPI.updateScene({ elements });
                setSelectedElement(null);
              }
            }}
            icon={<Trash2 size={16} />}
            tooltip="Delete"
            theme={theme}
            destructive
          />
        </div>
      )}

      {/* Bottom Right Controls - Miro Style */}
      <div
        className={cn(
          "absolute bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl p-1.5 shadow-lg",
          theme === "dark"
            ? "border border-white/10 bg-[#2d2d44]/95"
            : "border border-black/5 bg-white/95",
          "backdrop-blur-xl"
        )}
      >
        {/* Undo/Redo */}
        <div className="flex">
          <SmallButton
            onClick={handleUndo}
            icon={<Undo2 size={16} />}
            tooltip="Undo"
            theme={theme}
          />
          <SmallButton
            onClick={handleRedo}
            icon={<Redo2 size={16} />}
            tooltip="Redo"
            theme={theme}
          />
        </div>

        <div
          className={cn(
            "h-5 w-px",
            theme === "dark" ? "bg-white/20" : "bg-black/10"
          )}
        />

        {/* Zoom Controls */}
        <div className="flex items-center">
          <SmallButton
            onClick={() => handleZoom(-0.1)}
            icon={<ZoomOut size={16} />}
            tooltip="Zoom Out"
            theme={theme}
          />
          <button
            onClick={resetZoom}
            className={cn(
              "min-w-[52px] px-2 py-1 text-xs font-semibold transition-colors",
              theme === "dark"
                ? "text-white/80 hover:text-white"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {zoomLevel}%
          </button>
          <SmallButton
            onClick={() => handleZoom(0.1)}
            icon={<ZoomIn size={16} />}
            tooltip="Zoom In"
            theme={theme}
          />
        </div>
      </div>

      {/* Excalidraw Canvas */}
      <div className="h-full w-full [&_.excalidraw]:h-full [&_.excalidraw_.App-menu_top]:hidden [&_.excalidraw_.App-toolbar-container]:hidden [&_.excalidraw_.layer-ui__wrapper__footer-left]:hidden [&_.excalidraw_.layer-ui__wrapper__footer-right]:hidden [&_.excalidraw_.zen-mode-transition]:hidden [&_.excalidraw_.zen-mode-transition.zen-mode-transition--active]:hidden [&_.excalidraw-textEditorContainer]:z-\[100\] [&_.excalidraw_.disable-zen-mode]:hidden [&_.excalidraw_button]:hidden [&_button[aria-label='Exit zen mode']]:hidden [&_.excalidraw_.layer-ui\_\_wrapper]:pointer-events-none [&_.excalidraw_.layer-ui\_\_wrapper>*]:pointer-events-auto">
        <Excalidraw
          excalidrawAPI={(api: any) => {
            setExcalidrawAPI(api);
            setIsLoading(false);
          }}
          initialData={excalidrawInitialData}
          onChange={handleChange}
          viewModeEnabled={readOnly || isLocked}
          zenModeEnabled={false}
          gridModeEnabled={false}
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
          }}
        />
        
      </div>
    </div>
  );
};

// Tool Button Component
interface ToolButtonProps {
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  tooltip?: string;
  hasDropdown?: boolean;
  theme?: "light" | "dark";
}

const ToolButton = ({
  active,
  onClick,
  icon,
  tooltip,
  hasDropdown,
  theme = "light",
}: ToolButtonProps) => (
  <button
    title={tooltip}
    onClick={onClick}
    className={cn(
      "group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all",
      active
        ? "bg-primary text-primary-foreground shadow-md"
        : theme === "dark"
          ? "text-white/70 hover:bg-white/10 hover:text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    )}
  >
    {icon}
    {hasDropdown && (
      <ChevronDown
        size={10}
        className="absolute bottom-1 right-1 opacity-50"
      />
    )}
  </button>
);

// Shape Button for dropdowns
interface ShapeButtonProps {
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  theme?: "light" | "dark";
}

const ShapeButton = ({
  active,
  onClick,
  icon,
  label,
  theme = "light",
}: ShapeButtonProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center gap-1.5 rounded-xl p-2.5 transition-all",
      label ? "min-w-[52px]" : "min-w-[42px]",
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : theme === "dark"
          ? "text-white/70 hover:bg-white/10 hover:text-white"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
    )}
  >
    {icon}
    {label && <span className="text-[10px] font-medium">{label}</span>}
  </button>
);

// Small Button for context menus
interface SmallButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  active?: boolean;
  tooltip?: string;
  theme?: "light" | "dark";
  destructive?: boolean;
}

const SmallButton = ({
  onClick,
  icon,
  active,
  tooltip,
  theme = "light",
  destructive,
}: SmallButtonProps) => (
  <button
    title={tooltip}
    onClick={onClick}
    className={cn(
      "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
      active
        ? "bg-primary/20 text-primary"
        : destructive
          ? "text-red-500 hover:bg-red-500/10"
          : theme === "dark"
            ? "text-white/60 hover:bg-white/10 hover:text-white"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
    )}
  >
    {icon}
  </button>
);

// Dropdown Panel Component
interface DropdownPanelProps {
  children: React.ReactNode;
  theme?: "light" | "dark";
  position?: "right" | "top";
}

const DropdownPanel = ({
  children,
  theme = "light",
  position = "right",
}: DropdownPanelProps) => (
  <div
    className={cn(
      "absolute min-w-[200px] animate-in fade-in slide-in-from-left-2 rounded-2xl shadow-xl duration-200",
      position === "right" ? "left-full top-0 ml-3" : "bottom-full left-0 mb-3",
      theme === "dark"
        ? "border border-white/10 bg-[#2d2d44]"
        : "border border-black/5 bg-white"
    )}
  >
    {children}
  </div>
);

export default MiroBoard;
