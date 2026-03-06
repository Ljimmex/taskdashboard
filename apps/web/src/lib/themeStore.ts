import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface ThemeState {
    theme: Theme
    isDark: boolean
    toggle: () => void
    setTheme: (theme: Theme) => void
}

function getInitialTheme(): Theme {
    if (typeof window === 'undefined') return 'dark'
    const stored = localStorage.getItem('app-theme')
    if (stored === 'light' || stored === 'dark') return stored
    return 'dark'
}

function applyTheme(theme: Theme) {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('app-theme', theme)
}

// Apply initial theme immediately to prevent flash
const initial = getInitialTheme()
applyTheme(initial)

export const useThemeStore = create<ThemeState>((set) => ({
    theme: initial,
    isDark: initial === 'dark',
    toggle: () =>
        set((state) => {
            const next = state.theme === 'dark' ? 'light' : 'dark'
            applyTheme(next)
            return { theme: next, isDark: next === 'dark' }
        }),
    setTheme: (theme: Theme) => {
        applyTheme(theme)
        set({ theme, isDark: theme === 'dark' })
    },
}))
