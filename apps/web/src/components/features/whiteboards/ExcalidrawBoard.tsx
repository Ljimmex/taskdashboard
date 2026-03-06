import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useState } from "react";
import { useThemeStore } from "@/lib/themeStore";

interface ExcalidrawBoardProps {
    initialData?: any;
    onSave?: (data: any) => void;
    readOnly?: boolean;
}

export const ExcalidrawBoard = ({ initialData, onSave, readOnly = false }: ExcalidrawBoardProps) => {
    const { theme } = useThemeStore();

    const excalidrawInitialData = useState(() => {
        const appState = initialData?.appState ? { ...initialData.appState } : {};
        if (appState.collaborators) {
            delete appState.collaborators; // Excalidraw expects a Map, DB saves a plain object
        }
        return {
            elements: initialData?.elements || [],
            appState: appState,
            scrollToContent: true,
        };
    })[0];

    const handleChange = (elements: readonly any[], appState: any, files: any) => {
        if (readOnly) return;
        if (onSave) {
            onSave({ elements, appState, files });
        }
    };

    return (
        <div className="absolute inset-0 w-full h-full bg-[var(--app-bg-deepest)]">
            <Excalidraw
                initialData={excalidrawInitialData}
                onChange={handleChange}
                viewModeEnabled={readOnly}
                theme={theme}
            />

            {/* Overlay indicators */}
            <div className="absolute top-4 right-4 z-[10] pointer-events-none">
                <div className="bg-[var(--app-bg-card)]/80 backdrop-blur-sm border border-[var(--app-border)] px-3 py-1.5 rounded-full shadow-sm">
                    <span className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-widest">Excalidraw Canvas</span>
                </div>
            </div>
        </div>
    );
};
