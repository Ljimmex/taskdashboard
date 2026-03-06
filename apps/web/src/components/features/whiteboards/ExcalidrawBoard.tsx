import { Excalidraw } from "@excalidraw/excalidraw";
import { useState, useEffect } from "react";
import { useThemeStore } from "@/lib/themeStore";

interface ExcalidrawBoardProps {
    initialData?: any;
    onSave?: (data: any) => void;
    readOnly?: boolean;
}

export const ExcalidrawBoard = ({ initialData, onSave, readOnly = false }: ExcalidrawBoardProps) => {
    const { theme } = useThemeStore();
    const [elements, setElements] = useState(initialData?.elements || []);
    const [appState, setAppState] = useState(initialData?.appState || {});

    // Sync with initialData if it changes (e.g. switching boards)
    useEffect(() => {
        if (initialData) {
            setElements(initialData.elements || []);
            setAppState(initialData.appState || {});
        }
    }, [initialData]);

    const handleChange = (newElements: readonly any[], newAppState: any, files: any) => {
        if (readOnly) return;

        setElements([...newElements]);
        setAppState({ ...newAppState });

        if (onSave) {
            onSave({
                elements: newElements,
                appState: newAppState,
                files
            });
        }
    };

    return (
        <div className="absolute inset-0 w-full h-full bg-[var(--app-bg-deepest)]">
            <Excalidraw
                initialData={{
                    elements: elements,
                    appState: { ...appState, theme },
                    scrollToContent: true,
                }}
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
