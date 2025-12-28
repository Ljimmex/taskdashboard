import { create } from 'zustand'

interface PanelState {
    isPanelOpen: boolean
    setIsPanelOpen: (isOpen: boolean) => void
}

export const usePanelStore = create<PanelState>((set) => ({
    isPanelOpen: false,
    setIsPanelOpen: (isOpen: boolean) => set({ isPanelOpen: isOpen }),
}))
