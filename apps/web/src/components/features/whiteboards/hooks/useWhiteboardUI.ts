import { useState, useCallback } from "react";

export function useWhiteboardUI() {
    const [activeTool, setActiveTool] = useState("selection");
    const [isShapesOpen, setIsShapesOpen] = useState(false);
    const [isStickyOpen, setIsStickyOpen] = useState(false);
    const [isFramesOpen, setIsFramesOpen] = useState(false);
    const [isEmojisOpen, setIsEmojisOpen] = useState(false);
    const [isConnectorOpen, setIsConnectorOpen] = useState(false);
    const [isPenOpen, setIsPenOpen] = useState(false);
    const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
    const [isTimerOpen, setIsTimerOpen] = useState(false);
    const [isFlowchartOpen, setIsFlowchartOpen] = useState(false);
    const [isIconsOpen, setIsIconsOpen] = useState(false);
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const [isVotingOpen, setIsVotingOpen] = useState(false);
    const [isTableOpen, setIsTableOpen] = useState(false);
    const [isCommentOpen, setIsCommentOpen] = useState(false);

    const [isLocked, setIsLocked] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(100);
    const [strokeWidth, setStrokeWidth] = useState(2);
    const [strokeColor, setStrokeColor] = useState("#1e1e1e");

    // Timer state
    const [timerMinutes, setTimerMinutes] = useState(5);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerDisplay, setTimerDisplay] = useState("05:00");

    const [showImageHint, setShowImageHint] = useState(false);
    const [stickyColor, setStickyColor] = useState("#fef08a");

    const closeAllDropdowns = useCallback(() => {
        setIsShapesOpen(false);
        setIsStickyOpen(false);
        setIsFramesOpen(false);
        setIsEmojisOpen(false);
        setIsConnectorOpen(false);
        setIsPenOpen(false);
        setIsTemplatesOpen(false);
        setIsTimerOpen(false);
        setIsFlowchartOpen(false);
        setIsIconsOpen(false);
        setIsMoreOpen(false);
        setIsVotingOpen(false);
        setIsTableOpen(false);
        setIsCommentOpen(false);
    }, []);

    const setTool = useCallback((excalidrawAPI: any, type: string) => {
        if (!excalidrawAPI) return;

        if (typeof excalidrawAPI.setActiveTool === 'function') {
            excalidrawAPI.setActiveTool({ type, lastActiveToolBeforeEraser: null, locked: false });
        } else {
            excalidrawAPI.updateScene({ appState: { activeTool: { type } } });
        }

        setActiveTool(type);
        closeAllDropdowns();

        if (type === 'image') {
            setShowImageHint(true);
            setTimeout(() => setShowImageHint(false), 3000);
        }
    }, [closeAllDropdowns]);

    return {
        activeTool, setActiveTool, setTool,
        isShapesOpen, setIsShapesOpen,
        isStickyOpen, setIsStickyOpen,
        isFramesOpen, setIsFramesOpen,
        isEmojisOpen, setIsEmojisOpen,
        isConnectorOpen, setIsConnectorOpen,
        isPenOpen, setIsPenOpen,
        isTemplatesOpen, setIsTemplatesOpen,
        isTimerOpen, setIsTimerOpen,
        isFlowchartOpen, setIsFlowchartOpen,
        isIconsOpen, setIsIconsOpen,
        isMoreOpen, setIsMoreOpen,
        isVotingOpen, setIsVotingOpen,
        isTableOpen, setIsTableOpen,
        isCommentOpen, setIsCommentOpen,
        isLocked, setIsLocked,
        zoomLevel, setZoomLevel,
        strokeWidth, setStrokeWidth,
        strokeColor, setStrokeColor,
        timerMinutes, setTimerMinutes,
        timerSeconds, setTimerSeconds,
        timerRunning, setTimerRunning,
        timerDisplay, setTimerDisplay,
        showImageHint, setShowImageHint,
        stickyColor, setStickyColor,
        closeAllDropdowns
    };
}
