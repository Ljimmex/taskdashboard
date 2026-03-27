import { useCallback } from "react";

export function useWhiteboardActions(excalidrawAPI: any) {
    const insertSticky = useCallback(
        (color: string, size: "small" | "medium" | "large" = "medium") => {
            if (!excalidrawAPI) return;
            const sizeMap = { small: 150, medium: 200, large: 280 };
            const stickySize = sizeMap[size];

            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();
            const viewportWidth = appState.width / appState.zoom.value;
            const viewportHeight = appState.height / appState.zoom.value;
            const startX = -appState.scrollX + (viewportWidth - stickySize) / 2;
            const startY = -appState.scrollY + (viewportHeight - stickySize) / 2;

            const newStickyId = `sticky-${Date.now()}`;
            const newSticky = {
                type: "rectangle",
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
                backgroundColor: color,
                width: stickySize,
                height: stickySize,
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
        },
        [excalidrawAPI]
    );

    const insertStickyStack = useCallback(
        (layout: "grid" | "row" | "column" = "grid") => {
            if (!excalidrawAPI) return;
            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();
            const viewportWidth = appState.width / appState.zoom.value;
            const viewportHeight = appState.height / appState.zoom.value;

            const colors = ["#fef08a", "#fbcfe8", "#bfdbfe", "#5eead4"];
            const newElements = [];
            let startX, startY;

            if (layout === "grid") {
                startX = -appState.scrollX + (viewportWidth - 440) / 2;
                startY = -appState.scrollY + (viewportHeight - 440) / 2;
                for (let i = 0; i < 4; i++) {
                    newElements.push({
                        type: "rectangle",
                        id: `sticky-${Date.now()}-${i}`,
                        fillStyle: "solid",
                        strokeWidth: 0,
                        x: startX + (i % 2) * 220,
                        y: startY + Math.floor(i / 2) * 220,
                        strokeColor: "transparent",
                        backgroundColor: colors[i],
                        width: 200,
                        height: 200,
                        roughness: 0,
                        roundness: { type: 3, value: 16 },
                    });
                }
            } else if (layout === "row") {
                startX = -appState.scrollX + (viewportWidth - 880) / 2;
                startY = -appState.scrollY + (viewportHeight - 200) / 2;
                for (let i = 0; i < 4; i++) {
                    newElements.push({
                        type: "rectangle",
                        id: `sticky-${Date.now()}-${i}`,
                        x: startX + i * 220,
                        y: startY,
                        backgroundColor: colors[i],
                        width: 200,
                        height: 200,
                        fillStyle: "solid",
                        strokeWidth: 0,
                        roughness: 0,
                        roundness: { type: 3, value: 16 },
                    });
                }
            } else {
                startX = -appState.scrollX + (viewportWidth - 200) / 2;
                startY = -appState.scrollY + (viewportHeight - 880) / 2;
                for (let i = 0; i < 4; i++) {
                    newElements.push({
                        type: "rectangle",
                        id: `sticky-${Date.now()}-${i}`,
                        x: startX,
                        y: startY + i * 220,
                        backgroundColor: colors[i],
                        width: 200,
                        height: 200,
                        fillStyle: "solid",
                        strokeWidth: 0,
                        roughness: 0,
                        roundness: { type: 3, value: 16 },
                    });
                }
            }
            excalidrawAPI.updateScene({ elements: [...elements, ...newElements] });
        },
        [excalidrawAPI]
    );

    const insertFrame = useCallback(
        (width: number, height: number) => {
            if (!excalidrawAPI) return;
            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();
            const viewportWidth = appState.width / appState.zoom.value;
            const viewportHeight = appState.height / appState.zoom.value;
            const startX = -appState.scrollX + (viewportWidth - width) / 2;
            const startY = -appState.scrollY + (viewportHeight - height) / 2;

            const newFrameId = `frame-${Date.now()}`;
            const newFrame = {
                type: "frame",
                id: newFrameId,
                name: "Frame",
                x: startX,
                y: startY,
                width: width,
                height: height,
                backgroundColor: "transparent",
                strokeColor: "#000000",
                fillStyle: "solid",
                strokeWidth: 1,
                roughness: 0,
            };
            excalidrawAPI.updateScene({ elements: [...elements, newFrame], appState: { selectedElementIds: { [newFrameId]: true } } });
        },
        [excalidrawAPI]
    );

    const insertTemplate = useCallback(
        (templateType: string, theme: string = "light") => {
            if (!excalidrawAPI) return;
            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();
            const viewportWidth = appState.width / appState.zoom.value;
            const viewportHeight = appState.height / appState.zoom.value;
            const centerX = -appState.scrollX + viewportWidth / 2;
            const centerY = -appState.scrollY + viewportHeight / 2;

            const newElements: any[] = [];
            const timestamp = Date.now();

            if (templateType === "mindmap") {
                newElements.push({
                    type: "ellipse", id: `mm-center-${timestamp}`, x: centerX - 60, y: centerY - 40, width: 120, height: 80, backgroundColor: "#3b82f6", strokeColor: "#1d4ed8", fillStyle: "solid", strokeWidth: 2, roughness: 0, angle: 0,
                });
                const branches = [
                    { x: centerX - 200, y: centerY - 150, color: "#ef4444" },
                    { x: centerX + 100, y: centerY - 150, color: "#22c55e" },
                    { x: centerX - 200, y: centerY + 80, color: "#f59e0b" },
                    { x: centerX + 100, y: centerY + 80, color: "#8b5cf6" },
                ];
                branches.forEach((branch, i) => {
                    newElements.push({
                        type: "rectangle", id: `mm-branch-${timestamp}-${i}`, x: branch.x, y: branch.y, width: 100, height: 60, backgroundColor: branch.color, fillStyle: "solid", strokeWidth: 0, roughness: 0, roundness: { type: 3, value: 12 },
                    });
                });
            } else if (templateType === "kanban") {
                const columns = [{ title: "To Do", color: "#fef08a" }, { title: "In Progress", color: "#93c5fd" }, { title: "Done", color: "#86efac" }];
                columns.forEach((col, i) => {
                    const x = centerX - 450 + i * 300;
                    newElements.push(
                        { type: "rectangle", id: `kb-h-${timestamp}-${i}`, x, y: centerY - 200, width: 280, height: 50, backgroundColor: col.color, fillStyle: "solid", strokeWidth: 0, roughness: 0, roundness: { type: 3, value: 8 } },
                        { type: "rectangle", id: `kb-b-${timestamp}-${i}`, x, y: centerY - 140, width: 280, height: 400, backgroundColor: theme === "dark" ? "#1e293b" : "#f8fafc", strokeColor: "#e2e8f0", fillStyle: "solid", strokeWidth: 1, roughness: 0, roundness: { type: 3, value: 8 } }
                    );
                });
            } else if (templateType === "swot") {
                const quadrants = [{ l: "S", c: "#22c55e", x: -220, y: -220 }, { l: "W", c: "#ef4444", x: 20, y: -220 }, { l: "O", c: "#3b82f6", x: -220, y: 20 }, { l: "T", c: "#f59e0b", x: 20, y: 20 }];
                quadrants.forEach((q, i) => {
                    newElements.push({ type: "rectangle", id: `swot-${timestamp}-${i}`, x: centerX + q.x, y: centerY + q.y, width: 200, height: 200, backgroundColor: q.c, fillStyle: "solid", strokeWidth: 0, roughness: 0, roundness: { type: 3, value: 12 } });
                });
            }
            excalidrawAPI.updateScene({ elements: [...elements, ...newElements] });
        },
        [excalidrawAPI]
    );

    const insertMacroShape = useCallback(
        (shapeType: string, strokeColor: string = "#000000") => {
            if (!excalidrawAPI) return;
            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();
            const viewportWidth = appState.width / appState.zoom.value;
            const viewportHeight = appState.height / appState.zoom.value;
            const startX = -appState.scrollX + (viewportWidth - 100) / 2;
            const startY = -appState.scrollY + (viewportHeight - 100) / 2;

            let points: [number, number][] = [];
            if (shapeType === "triangle") points = [[50, 0], [100, 100], [0, 100], [50, 0]];
            else if (shapeType === "star") points = [[50, 0], [61, 35], [98, 35], [68, 57], [79, 91], [50, 70], [21, 91], [32, 57], [2, 35], [39, 35], [50, 0]];
            else if (shapeType === "callout") points = [[0, 0], [100, 0], [100, 70], [30, 70], [15, 100], [20, 70], [0, 70], [0, 0]];
            else if (shapeType === "pentagon") points = [[50, 0], [100, 38], [81, 100], [19, 100], [0, 38], [50, 0]];
            else if (shapeType === "hexagon") points = [[25, 0], [75, 0], [100, 50], [75, 100], [25, 100], [0, 50], [25, 0]];
            else if (shapeType === "octagon") points = [[30, 0], [70, 0], [100, 30], [100, 70], [70, 100], [30, 100], [0, 70], [0, 30], [30, 0]];
            else if (shapeType === "cloud") points = [[20, 80], [10, 60], [20, 40], [35, 30], [50, 20], [70, 25], [85, 40], [95, 60], [85, 80], [20, 80]];

            const newShapeId = `macro-${Date.now()}`;
            const newShape = {
                type: "line", id: newShapeId, fillStyle: "solid", strokeWidth: 2, roughness: 0, x: startX, y: startY, strokeColor, backgroundColor: "transparent", points,
            };
            excalidrawAPI.updateScene({ elements: [...elements, newShape], appState: { selectedElementIds: { [newShapeId]: true } } });
        },
        [excalidrawAPI]
    );

    const insertEmoji = useCallback(
        (emoji: string) => {
            if (!excalidrawAPI) return;
            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();
            const viewportWidth = appState.width / appState.zoom.value;
            const viewportHeight = appState.height / appState.zoom.value;
            const startX = -appState.scrollX + viewportWidth / 2 - 30;
            const startY = -appState.scrollY + viewportHeight / 2 - 30;

            const emojiId = `emoji-${Date.now()}`;
            const emojiElement = {
                type: "text", id: emojiId, text: emoji, fontSize: 64, fontFamily: 1, textAlign: "center", verticalAlign: "middle", x: startX, y: startY, width: 60, height: 72, strokeColor: "#000000", originalText: emoji, updated: Date.now(),
            };
            excalidrawAPI.updateScene({ elements: [...elements, emojiElement], appState: { selectedElementIds: { [emojiId]: true } } });
        },
        [excalidrawAPI]
    );

    const insertKanbanCard = useCallback(
        (color: string = "#ffffff") => {
            if (!excalidrawAPI) return;
            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();
            const viewportWidth = appState.width / appState.zoom.value;
            const viewportHeight = appState.height / appState.zoom.value;
            const startX = -appState.scrollX + (viewportWidth - 250) / 2;
            const startY = -appState.scrollY + (viewportHeight - 150) / 2;

            const cardId = `kanban-${Date.now()}`;
            const card = {
                type: "rectangle", id: cardId, fillStyle: "solid", strokeWidth: 1, x: startX, y: startY, strokeColor: "#e2e8f0", backgroundColor: color, width: 250, height: 150, roundness: { type: 3, value: 8 },
            };
            excalidrawAPI.updateScene({ elements: [...elements, card], appState: { selectedElementIds: { [cardId]: true } } });
        },
        [excalidrawAPI]
    );

    const insertTable = useCallback(
        (rows: number, cols: number, theme: string = "light") => {
            if (!excalidrawAPI) return;
            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();
            const viewportWidth = appState.width / appState.zoom.value;
            const viewportHeight = appState.height / appState.zoom.value;
            const cellWidth = 120, cellHeight = 40, tableWidth = cellWidth * cols, tableHeight = cellHeight * rows;
            const startX = -appState.scrollX + (viewportWidth - tableWidth) / 2;
            const startY = -appState.scrollY + (viewportHeight - tableHeight) / 2;

            const newElements: any[] = [];
            const timestamp = Date.now();
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    newElements.push({
                        type: "rectangle", id: `table-cell-${timestamp}-${r}-${c}`, x: startX + c * cellWidth, y: startY + r * cellHeight, width: cellWidth, height: cellHeight, backgroundColor: r === 0 ? (theme === "dark" ? "#3b4d61" : "#e2e8f0") : (theme === "dark" ? "#1e293b" : "#ffffff"), strokeColor: theme === "dark" ? "#475569" : "#cbd5e1", fillStyle: "solid", strokeWidth: 1, roughness: 0, groupIds: [`table-${timestamp}`],
                    });
                }
            }
            excalidrawAPI.updateScene({ elements: [...elements, ...newElements] });
        },
        [excalidrawAPI]
    );

    const insertVotingDot = useCallback(
        (type: "up" | "down" | "dot") => {
            if (!excalidrawAPI) return;
            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();
            const viewportWidth = appState.width / appState.zoom.value;
            const viewportHeight = appState.height / appState.zoom.value;
            const startX = -appState.scrollX + viewportWidth / 2 - 20;
            const startY = -appState.scrollY + viewportHeight / 2 - 20;

            const colors = { up: "#22c55e", down: "#ef4444", dot: "#3b82f6" };
            const dotId = `vote-${Date.now()}`;
            const voteDot = { type: "ellipse", id: dotId, x: startX, y: startY, width: 40, height: 40, backgroundColor: colors[type], strokeColor: "transparent", fillStyle: "solid", strokeWidth: 0, roughness: 0 };
            excalidrawAPI.updateScene({ elements: [...elements, voteDot], appState: { selectedElementIds: { [dotId]: true } } });
        },
        [excalidrawAPI]
    );

    const groupSelected = useCallback(() => {
        if (!excalidrawAPI) return;
        const appState = excalidrawAPI.getAppState();
        const elements = excalidrawAPI.getSceneElements();
        const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(id => appState.selectedElementIds[id]);
        if (selectedIds.length < 2) return;
        const groupId = `group-${Date.now()}`;
        const newElements = elements.map((el: any) => selectedIds.includes(el.id) ? { ...el, groupIds: [...(el.groupIds || []), groupId] } : el);
        excalidrawAPI.updateScene({ elements: newElements });
    }, [excalidrawAPI]);

    const ungroupSelected = useCallback(() => {
        if (!excalidrawAPI) return;
        const appState = excalidrawAPI.getAppState();
        const elements = excalidrawAPI.getSceneElements();
        const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(id => appState.selectedElementIds[id]);
        const newElements = elements.map((el: any) => selectedIds.includes(el.id) ? { ...el, groupIds: [] } : el);
        excalidrawAPI.updateScene({ elements: newElements });
    }, [excalidrawAPI]);

    return {
        insertSticky, insertStickyStack, insertFrame, insertTemplate, insertMacroShape, insertEmoji,
        insertKanbanCard, insertTable, insertVotingDot, groupSelected, ungroupSelected
    };
}
