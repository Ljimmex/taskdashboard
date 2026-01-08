import { useEffect, useCallback } from 'react'

type ShortcutAction = () => void

interface ShortcutConfig {
    key: string
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    meta?: boolean // Cmd on Mac
    action: ShortcutAction
    description: string
}

interface UseKeyboardShortcutsOptions {
    enabled?: boolean
    shortcuts: ShortcutConfig[]
}

/**
 * Hook for handling global keyboard shortcuts
 * 
 * @example
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     { key: 'n', ctrl: true, action: openNewTask, description: 'Create new task' },
 *     { key: 'Escape', action: closePanel, description: 'Close panel' },
 *   ]
 * })
 */
export function useKeyboardShortcuts({
    enabled = true,
    shortcuts
}: UseKeyboardShortcutsOptions) {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable elements
        const target = event.target as HTMLElement
        const tagName = target.tagName.toLowerCase()
        const isEditing = tagName === 'input' ||
            tagName === 'textarea' ||
            target.isContentEditable

        for (const shortcut of shortcuts) {
            const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase()
            const matchesCtrl = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey
            const matchesShift = shortcut.shift ? event.shiftKey : !event.shiftKey
            const matchesAlt = shortcut.alt ? event.altKey : !event.altKey

            // Skip if we're editing and the shortcut requires modifiers
            if (isEditing && !shortcut.ctrl && !shortcut.alt && !shortcut.meta) {
                continue
            }

            if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
                event.preventDefault()
                shortcut.action()
                break
            }
        }
    }, [shortcuts])

    useEffect(() => {
        if (!enabled) return

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [enabled, handleKeyDown])
}

// Predefined shortcut keys for consistency
export const SHORTCUT_KEYS = {
    NEW_TASK: { key: 'n', alt: true, description: 'Nowe zadanie' },
    SEARCH: { key: 'k', alt: true, description: 'Szukaj' },
    ESCAPE: { key: 'Escape', description: 'Zamknij panel' },
    SAVE: { key: 's', ctrl: true, description: 'Zapisz' },
    DELETE: { key: 'Delete', description: 'Usuń' },
    ARCHIVE: { key: 'e', alt: true, description: 'Archiwizuj' },
    DUPLICATE: { key: 'd', alt: true, description: 'Duplikuj' },
    VIEW_KANBAN: { key: '1', alt: true, description: 'Widok Kanban' },
    VIEW_LIST: { key: '2', alt: true, description: 'Widok Lista' },
    VIEW_CALENDAR: { key: '3', alt: true, description: 'Widok Kalendarz' },
    VIEW_TIMELINE: { key: '4', alt: true, description: 'Widok Timeline' },
} as const

export type ShortcutKey = keyof typeof SHORTCUT_KEYS
