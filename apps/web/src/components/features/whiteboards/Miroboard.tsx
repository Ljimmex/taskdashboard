import { useState, useEffect, useCallback, useRef } from "react";
import { Excalidraw, WelcomeScreen } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useThemeStore } from "@/lib/themeStore";
import { Loader2, Timer as TimerIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./Miroboard.module.css";

import { useWhiteboardRealtime } from "./hooks/useWhiteboardRealtime";
import { useWhiteboardActions } from "./hooks/useWhiteboardActions";
import { useWhiteboardUI } from "./hooks/useWhiteboardUI";

import { WhiteboardToolbar } from "./ui/WhiteboardToolbar";
import { WhiteboardContextMenu } from "./ui/WhiteboardContextMenu";

export interface MiroBoardProps {
  boardId?: string;
  boardName?: string;
  theme?: string;
  initialData?: any;
  onSave?: (data: any) => void;
  readOnly?: boolean;
}

export function MiroBoard({ boardId, boardName: _boardName, initialData, onSave, readOnly = false }: MiroBoardProps) {
  const { theme } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [popupCoords, setPopupCoords] = useState({ x: 0, y: 0 });

  const uiState = useWhiteboardUI();
  const actions = useWhiteboardActions(excalidrawAPI);

  // Realtime Supabase Collaboration hook
  const { broadcastBoardUpdate, broadcastPointerUpdate } = useWhiteboardRealtime(boardId, excalidrawAPI, readOnly);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Timer logic - unified here to avoid duplicate intervals
  useEffect(() => {
    if (uiState.timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        uiState.setTimerSeconds((prev: number) => {
          if (prev === 0) {
            uiState.setTimerMinutes((mins: number) => {
              if (mins === 0) {
                uiState.setTimerRunning(false);
                return 0;
              }
              return mins - 1;
            });
            return 59;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [uiState.timerRunning]);

  useEffect(() => {
    const mins = String(uiState.timerMinutes).padStart(2, "0");
    const secs = String(uiState.timerSeconds).padStart(2, "0");
    uiState.setTimerDisplay(`${mins}:${secs}`);
  }, [uiState.timerMinutes, uiState.timerSeconds]);

  const [excalidrawInitialData] = useState(() => {
    const appState = initialData?.appState ? { ...initialData.appState } : {};
    if (appState.collaborators) delete appState.collaborators;
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

  const updateSelected = useCallback((updates: any) => {
    if (!excalidrawAPI || !selectedElement) return;
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();

    const newElements = elements.map((el: any) => {
      if (appState.selectedElementIds[el.id]) return { ...el, ...updates };
      if (el.type === "text" && el.containerId && appState.selectedElementIds[el.containerId]) return { ...el, ...updates };
      return el;
    });

    excalidrawAPI.updateScene({ elements: newElements });
  }, [excalidrawAPI, selectedElement]);

  const handleChange = useCallback((elements: readonly any[], appState: any, files: any) => {
    if (readOnly) return;

    // Fix for zoom sync if needed
    if (appState.zoom?.value) {
      uiState.setZoomLevel(Math.round(appState.zoom.value * 100));
    }

    broadcastBoardUpdate(elements as any[]);

    const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(id => appState.selectedElementIds[id]);

    if (selectedIds.length === 1 && !appState.draggingElement && !appState.editingElement) {
      const el = elements.find((e) => e.id === selectedIds[0]);
      if (el && ["rectangle", "ellipse", "diamond", "text", "line", "arrow", "freedraw"].includes(el.type)) {
        const zoom = appState.zoom.value;
        const topY = (el.y + appState.scrollY) * zoom;
        const centerX = (el.x + (el.width || 100) / 2 + appState.scrollX) * zoom;

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
    } else if (selectedIds.length !== 1 || appState.draggingElement || appState.editingElement) {
      if (selectedElement) setSelectedElement(null);
    }

    if (appState.activeTool?.type && appState.activeTool.type !== uiState.activeTool && uiState.activeTool !== "sticky") {
      uiState.setActiveTool(appState.activeTool.type);
    }

    if (onSave) onSave({ elements, appState, files });
  }, [readOnly, uiState.activeTool, selectedElement, onSave, broadcastBoardUpdate]);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn(styles.miroboardWrapper, theme === "dark" && styles.dark)}>
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[var(--app-bg-deepest)] border-none">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs font-medium uppercase tracking-widest text-primary">Loading board...</span>
        </div>
      )}

      {uiState.timerRunning && (
        <div className={cn(
          "absolute top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 rounded-2xl px-6 py-3 shadow-2xl animate-in fade-in slide-in-from-top-4",
          theme === "dark" ? "bg-[#2d2d44] border border-white/10" : "bg-white border border-black/5"
        )}>
          <TimerIcon size={24} className="text-primary" />
          <span className="text-3xl font-bold font-mono tracking-tighter">{uiState.timerDisplay}</span>
          <button onClick={() => uiState.setTimerRunning(false)} className="ml-2 p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-bold font-mono">STOP</button>
        </div>
      )}

      {/* Excalidraw Canvas */}
      <div className="absolute inset-0 z-0">
        <Excalidraw
          excalidrawAPI={(api) => {
            setExcalidrawAPI(api);
            setIsLoading(false);
          }}
          initialData={excalidrawInitialData}
          onChange={handleChange}
          onPointerUpdate={(payload) => broadcastPointerUpdate(payload)}
          viewModeEnabled={readOnly || uiState.isLocked}
          theme={theme === "dark" ? "dark" : "light"}
          langCode="pl-PL"
          UIOptions={{
            canvasActions: { changeViewBackgroundColor: false, clearCanvas: true, loadScene: false, export: { saveFileToDisk: true }, toggleTheme: false, },
            tools: { image: true },
          }}
        >
          <WelcomeScreen>
            <WelcomeScreen.Hints.MenuHint />
            <WelcomeScreen.Hints.ToolbarHint />
            <WelcomeScreen.Hints.HelpHint />
          </WelcomeScreen>
        </Excalidraw>
      </div>

      {/* Floating UI */}
      {!readOnly && (
        <>
          <WhiteboardToolbar theme={theme} uiState={uiState} actions={actions} excalidrawAPI={excalidrawAPI} />
          <WhiteboardContextMenu selectedElement={selectedElement} popupCoords={popupCoords} updateSelected={updateSelected} excalidrawAPI={excalidrawAPI} />
        </>
      )}

      {/* Navigation Controls (Bottom Right) */}
      <div className={cn(
        "absolute bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl p-1.5 shadow-lg backdrop-blur-xl",
        theme === "dark" ? "border border-white/10 bg-[#2d2d44]/95" : "border border-black/5 bg-white/95"
      )}>
        <button onClick={() => excalidrawAPI?.updateScene({ appState: { zoom: { value: Math.max(0.1, excalidrawAPI.getAppState().zoom.value - 0.1) } } })} className="p-2 hover:bg-gray-100/10 rounded-lg">Zoom Out</button>
        <span className="text-xs font-bold min-w-[40px] text-center">{uiState.zoomLevel}%</span>
        <button onClick={() => excalidrawAPI?.updateScene({ appState: { zoom: { value: Math.min(5, excalidrawAPI.getAppState().zoom.value + 0.1) } } })} className="p-2 hover:bg-gray-100/10 rounded-lg">Zoom In</button>
      </div>
    </div>
  );
}

export default MiroBoard;
