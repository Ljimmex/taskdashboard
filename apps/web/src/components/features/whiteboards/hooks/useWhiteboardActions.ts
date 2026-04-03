import { useCallback } from "react";

export function useWhiteboardActions(excalidrawAPI: any) {
    // Helper: ensures every element has all required Excalidraw properties
    const makeEl = (overrides: any) => ({
        version: 1,
        versionNonce: Math.floor(Math.random() * 1000000),
        isDeleted: false,
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        angle: 0,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        seed: Math.floor(Math.random() * 100000),
        groupIds: [],
        frameId: null,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        ...overrides,
    });

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
                        groupIds: [],
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
                        groupIds: [],
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
                        groupIds: [],
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
                backgroundColor: "#ffffff",
                strokeColor: "#000000",
                fillStyle: "solid",
                strokeWidth: 1,
                roughness: 0,
                groupIds: [],
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

            const frameId = `f-${timestamp}`;
            const addText = (text: string, x: number, y: number, fontSize = 20, color = "#1e1e1e", cid?: string) => makeEl({ type: "text", id: `t-${timestamp}-${Math.random()}`, text, fontSize, fontFamily: 1, textAlign: "center", verticalAlign: "middle", x, y, strokeColor: color, opacity: 100, containerId: cid, frameId });

            if (templateType === "mindmap") {
                newElements.push(makeEl({ type: "frame", id: frameId, name: "Mind Map", x: centerX - 500, y: centerY - 350, width: 1000, height: 700 }));
                const cId = `mm-c-${timestamp}`;
                newElements.push(makeEl({ type: "rectangle", id: cId, x: centerX - 60, y: centerY - 30, width: 120, height: 60, backgroundColor: "#1e293b", strokeColor: "transparent", roundness: { type: 3, value: 30 }, frameId }));
                newElements.push(addText("Mind Map", centerX - 60, centerY - 30, 16, "#ffffff", cId));

                const branches = [
                    { x: centerX - 250, y: centerY - 150, c: "#fcd34d", id: `mm-lt-${timestamp}`, t: "Subtopic" },
                    { x: centerX - 250, y: centerY + 100, c: "#f97316", id: `mm-lb-${timestamp}`, t: "Subtopic" },
                    { x: centerX + 150, y: centerY - 150, c: "#5eead4", id: `mm-rt-${timestamp}`, t: "Subtopic" },
                    { x: centerX + 150, y: centerY + 100, c: "#8b5cf6", id: `mm-rb-${timestamp}`, t: "Subtopic" }
                ];
                branches.forEach(b => {
                    newElements.push(makeEl({ type: "rectangle", id: b.id, x: b.x, y: b.y, width: 100, height: 40, backgroundColor: b.c, strokeColor: "transparent", roundness: { type: 3, value: 20 }, frameId }));
                    newElements.push(addText(b.t, b.x, b.y, 14, b.c === "#1e293b" ? "#ffffff" : "#1e1e1e", b.id));
                    newElements.push(makeEl({ type: "arrow", id: `arr-${b.id}`, x: centerX, y: centerY, strokeColor: b.c, strokeWidth: 2, points: [[0, 0], [b.x - centerX + (b.x < centerX ? 100 : 0), b.y - centerY + 20]], roundness: { type: 3 }, frameId }));
                });

                // Top Left children
                [-40, 40].forEach((oy, i) => {
                    const cid = `c-lt-${i}`;
                    newElements.push(makeEl({ type: "rectangle", id: cid, x: centerX - 400, y: centerY - 150 + oy, width: 80, height: 30, backgroundColor: "#fbd38d", strokeColor: "transparent", roundness: { type: 3, value: 15 }, frameId }));
                    newElements.push(makeEl({ type: "arrow", id: `arr-${cid}`, x: centerX - 250, y: centerY - 130, strokeColor: "#fbd38d", strokeWidth: 2, points: [[0, 0], [-70, oy]], roundness: { type: 3 }, frameId }));
                });
                // Bottom Left children
                [-50, 0, 50].forEach((oy, i) => {
                    const cid = `c-lb-${i}`;
                    newElements.push(makeEl({ type: "rectangle", id: cid, x: centerX - 400, y: centerY + 100 + oy, width: 80, height: 30, backgroundColor: "#fb923c", strokeColor: "transparent", roundness: { type: 3, value: 15 }, frameId }));
                    newElements.push(makeEl({ type: "arrow", id: `arr-${cid}`, x: centerX - 250, y: centerY + 120, strokeColor: "#fb923c", strokeWidth: 2, points: [[0, 0], [-70, oy]], roundness: { type: 3 }, frameId }));
                });
                // Top Right children
                [-60, 0, 60].forEach((oy, i) => {
                    const cid = `c-rt-${i}`;
                    newElements.push(makeEl({ type: "rectangle", id: cid, x: centerX + 320, y: centerY - 150 + oy, width: 80, height: 30, backgroundColor: "#99f6e4", strokeColor: "transparent", roundness: { type: 3, value: 15 }, frameId }));
                    newElements.push(makeEl({ type: "arrow", id: `arr-${cid}`, x: centerX + 250, y: centerY - 130, strokeColor: "#99f6e4", strokeWidth: 2, points: [[0, 0], [70, oy]], roundness: { type: 3 }, frameId }));
                });
                // Bottom Right children
                [-50, 0, 50].forEach((oy, i) => {
                    const cid = `c-rb-${i}`;
                    newElements.push(makeEl({ type: "rectangle", id: cid, x: centerX + 320, y: centerY + 100 + oy, width: 80, height: 30, backgroundColor: "#a78bfa", strokeColor: "transparent", roundness: { type: 3, value: 15 }, frameId }));
                    newElements.push(makeEl({ type: "arrow", id: `arr-${cid}`, x: centerX + 250, y: centerY + 120, strokeColor: "#a78bfa", strokeWidth: 2, points: [[0, 0], [70, oy]], roundness: { type: 3 }, frameId }));
                });

            } else if (templateType === "kanban") {
                newElements.push(makeEl({ type: "frame", id: frameId, name: "Kanban", x: centerX - 500, y: centerY - 300, width: 1000, height: 600 }));
                [{ title: "To Do", color: "#fef08a" }, { title: "In Progress", color: "#93c5fd" }, { title: "Done", color: "#86efac" }].forEach((col, i) => {
                    const x = centerX - 450 + i * 300;
                    const hId = `kb-h-${timestamp}-${i}`;
                    newElements.push(
                        makeEl({ type: "rectangle", id: hId, x, y: centerY - 200, width: 280, height: 50, backgroundColor: col.color, strokeWidth: 0, strokeColor: "transparent", roundness: { type: 3, value: 8 }, frameId }),
                        addText(col.title, x, centerY - 200, 20, "#1e1e1e", hId),
                        makeEl({ type: "rectangle", id: `kb-b-${timestamp}-${i}`, x, y: centerY - 140, width: 280, height: 400, backgroundColor: theme === "dark" ? "#1e293b" : "#f8fafc", strokeColor: "#e2e8f0", roundness: { type: 3, value: 8 }, frameId })
                    );
                });
            } else if (templateType === "swot") {
                newElements.push(makeEl({ type: "frame", id: frameId, name: "Coffee Company SWOT Analysis", x: centerX - 450, y: centerY - 450, width: 900, height: 900 }));
                const quads = [
                    { title: "Strengths", text: "• High global reputation\n• Top 100 Companies to Work For\n• Strong ethical values", c: "#06b6d4", x: -420, y: -420 },
                    { title: "Weaknesses", text: "• Dependent on US market\n• Main competitive advantage limits\n  diversification flexibility", c: "#ef4444", x: 20, y: -420 },
                    { title: "Opportunities", text: "• New Fair Trade products\n• Global expansion to India/Pacific\n• Co-branding with other makers", c: "#0f766e", x: -420, y: 20 },
                    { title: "Threats", text: "• Fast changing coffee trends\n• Raw coffee & dairy cost rises\n• Easy market entry for copycats", c: "#f59e0b", x: 20, y: 20 }
                ];
                quads.forEach((q, i) => {
                    const cid = `swot-${timestamp}-${i}`;
                    newElements.push(makeEl({ type: "rectangle", id: cid, x: centerX + q.x, y: centerY + q.y, width: 400, height: 400, backgroundColor: q.c, strokeWidth: 0, strokeColor: "transparent", roundness: { type: 3, value: 30 }, frameId }));
                    newElements.push(makeEl({ type: "text", id: `swot-h-${timestamp}-${i}`, text: q.title, fontSize: 36, fontFamily: 1, textAlign: "left", verticalAlign: "top", x: centerX + q.x + 30, y: centerY + q.y + 30, strokeColor: "#ffffff", frameId }));
                    newElements.push(makeEl({ type: "text", id: `swot-b-${timestamp}-${i}`, text: q.text, fontSize: 16, fontFamily: 1, textAlign: "left", verticalAlign: "top", x: centerX + q.x + 30, y: centerY + q.y + 120, strokeColor: "#ffffff", width: 340, frameId }));
                });
            } else if (templateType === "retrospective") {
                newElements.push(makeEl({ type: "frame", id: frameId, name: "Retrospective", x: centerX - 500, y: centerY - 300, width: 1000, height: 600 }));
                [{ title: "What went well?", color: "#86efac" }, { title: "What to improve?", color: "#fca5a5" }, { title: "Action items", color: "#93c5fd" }].forEach((col, i) => {
                    const x = centerX - 450 + i * 300;
                    const hId = `retro-h-${timestamp}-${i}`;
                    newElements.push(
                        makeEl({ type: "rectangle", id: hId, x, y: centerY - 200, width: 280, height: 50, backgroundColor: col.color, strokeWidth: 0, strokeColor: "transparent", roundness: { type: 3, value: 8 }, frameId }),
                        addText(col.title, x, centerY - 200, 20, "#1e1e1e", hId),
                        makeEl({ type: "rectangle", id: `retro-b-${timestamp}-${i}`, x, y: centerY - 140, width: 280, height: 350, backgroundColor: theme === "dark" ? "#1e293b" : "#f8fafc", strokeColor: "#e2e8f0", roundness: { type: 3, value: 8 }, frameId })
                    );
                });
            } else if (templateType === "flowchart") {
                newElements.push(makeEl({ type: "frame", id: frameId, name: "Flowchart of a simple process", x: centerX - 350, y: centerY - 400, width: 700, height: 800 }));
                const shapes = [
                    { id: `fs`, t: "ellipse", text: "Start", x: centerX - 60, y: centerY - 350, w: 120, h: 60, c: "#fbd38d" },
                    { id: `fr`, t: "rectangle", text: "Read\nA, B, C", x: centerX - 75, y: centerY - 250, w: 150, h: 80, c: "#fb923c" },
                    { id: `fd1`, t: "diamond", text: "Is\nA > B", x: centerX - 60, y: centerY - 130, w: 120, h: 80, c: "#fb923c" },
                    { id: `fd2`, t: "diamond", text: "Is\nB > C", x: centerX - 210, y: centerY - 10, w: 120, h: 80, c: "#fb923c" },
                    { id: `fd3`, t: "diamond", text: "Is\nA > C", x: centerX + 90, y: centerY - 10, w: 120, h: 80, c: "#fb923c" },
                    { id: `fp1`, t: "rectangle", text: "Print\n'B is largest'", x: centerX - 260, y: centerY + 120, w: 120, h: 80, c: "#fb923c" },
                    { id: `fp2`, t: "rectangle", text: "Print\n'C is largest'", x: centerX - 60, y: centerY + 120, w: 120, h: 80, c: "#fb923c" },
                    { id: `fp3`, t: "rectangle", text: "Print\n'A is largest'", x: centerX + 140, y: centerY + 120, w: 120, h: 80, c: "#fb923c" },
                    { id: `fe`, t: "ellipse", text: "Stop", x: centerX - 60, y: centerY + 260, w: 120, h: 60, c: "#fbd38d" }
                ];
                shapes.forEach(s => {
                    newElements.push(makeEl({ type: s.t, id: s.id, x: s.x, y: s.y, width: s.w, height: s.h, backgroundColor: s.c, strokeColor: "#9c4221", strokeWidth: 2, frameId }));
                    newElements.push(addText(s.text, s.x, s.y, 16, "#1e1e1e", s.id));
                });

                const arrows = [
                    { p1: [centerX, centerY - 290], p2: [centerX, centerY - 250] },
                    { p1: [centerX, centerY - 170], p2: [centerX, centerY - 130] },
                    { p1: [centerX - 60, centerY - 90], p2: [centerX - 150, centerY - 90] }, // No route
                    { p1: [centerX - 150, centerY - 90], p2: [centerX - 150, centerY - 10] },
                    { p1: [centerX + 60, centerY - 90], p2: [centerX + 150, centerY - 90] }, // Yes route A>B
                    { p1: [centerX + 150, centerY - 90], p2: [centerX + 150, centerY - 10] },
                    { p1: [centerX - 210, centerY + 30], p2: [centerX - 200, centerY + 30], l: "Yes" }, // B>C down
                    { p1: [centerX - 200, centerY + 30], p2: [centerX - 200, centerY + 120] },
                    { p1: [centerX - 90, centerY + 30], p2: [centerX, centerY + 30], l: "No" }, // B>C no
                    { p1: [centerX, centerY + 30], p2: [centerX, centerY + 120] },
                    { p1: [centerX + 90, centerY + 30], p2: [centerX, centerY + 30], l: "No" }, // A>C no
                    { p1: [centerX + 210, centerY + 30], p2: [centerX + 200, centerY + 30], l: "Yes" }, // A>C yes
                    { p1: [centerX + 200, centerY + 30], p2: [centerX + 200, centerY + 120] },
                    // Returns
                    { p1: [centerX - 200, centerY + 200], p2: [centerX - 200, centerY + 290] },
                    { p1: [centerX - 200, centerY + 290], p2: [centerX - 60, centerY + 290] },
                    { p1: [centerX, centerY + 200], p2: [centerX, centerY + 260] },
                    { p1: [centerX + 200, centerY + 200], p2: [centerX + 200, centerY + 290] },
                    { p1: [centerX + 200, centerY + 290], p2: [centerX + 60, centerY + 290] }
                ];
                arrows.forEach((a, k) => {
                    newElements.push(makeEl({ type: "arrow", id: `fca-${k}`, x: a.p1[0], y: a.p1[1], strokeColor: "#9c4221", strokeWidth: 2, points: [[0, 0], [a.p2[0] - a.p1[0], a.p2[1] - a.p1[1]]], roundness: { type: 3 }, frameId }));
                    if (a.l) {
                        newElements.push(makeEl({ type: "text", id: `fcl-${k}`, text: a.l, fontSize: 16, fontFamily: 1, textAlign: "center", x: (a.p1[0] + a.p2[0]) / 2, y: (a.p1[1] + a.p2[1]) / 2 - 20, strokeColor: "#c05621", frameId }));
                    }
                });
                newElements.push(makeEl({ type: "text", id: `fcl-ab1`, text: "No", fontSize: 16, fontFamily: 1, textAlign: "center", x: centerX - 100, y: centerY - 110, strokeColor: "#c05621", frameId }));
                newElements.push(makeEl({ type: "text", id: `fcl-ab2`, text: "Yes", fontSize: 16, fontFamily: 1, textAlign: "center", x: centerX + 100, y: centerY - 110, strokeColor: "#c05621", frameId }));
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
                type: "line", id: newShapeId, fillStyle: "solid", strokeWidth: 2, roughness: 0, x: startX, y: startY, strokeColor, backgroundColor: "transparent", points, groupIds: [],
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
                type: "text", id: emojiId, text: emoji, fontSize: 64, fontFamily: 1, textAlign: "center", verticalAlign: "middle", x: startX, y: startY, width: 60, height: 72, strokeColor: "#000000", originalText: emoji, updated: Date.now(), groupIds: [],
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
                type: "rectangle", id: cardId, fillStyle: "solid", strokeWidth: 1, x: startX, y: startY, strokeColor: "#e2e8f0", backgroundColor: color, width: 250, height: 150, roundness: { type: 3, value: 8 }, groupIds: [],
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
            const voteDot = { type: "ellipse", id: dotId, x: startX, y: startY, width: 40, height: 40, backgroundColor: colors[type], strokeColor: "transparent", fillStyle: "solid", strokeWidth: 0, roughness: 0, groupIds: [] };
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
