import { cn } from '@/lib/utils'
import {
  Trash2,
  Copy,
  ClipboardPaste,
  Layers,
  Ungroup,
  ArrowUpToLine,
  ArrowDownToLine,
  CopyPlus,
} from 'lucide-react'

interface WhiteboardRightClickMenuProps {
  x: number
  y: number
  visible: boolean
  onClose: () => void
  excalidrawAPI: any
  theme: string
}

export function WhiteboardRightClickMenu({
  x,
  y,
  visible,
  onClose,
  excalidrawAPI,
  theme,
}: WhiteboardRightClickMenuProps) {
  if (!visible || !excalidrawAPI) return null

  const isDark = theme === 'dark'
  const menuItemClass = cn(
    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isDark ? 'text-white/80 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
  )
  const shortcutClass = cn(
    'ml-auto text-[10px] font-semibold opacity-50',
    isDark ? 'text-white/50' : 'text-gray-400'
  )

  const getSelection = () => {
    const appState = excalidrawAPI.getAppState()
    const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(
      (id) => appState.selectedElementIds[id]
    )
    const elements = excalidrawAPI.getSceneElements() as any[]
    return { selectedIds, elements }
  }

  const deleteSelected = () => {
    const { selectedIds, elements } = getSelection()
    if (selectedIds.length === 0) return
    const next = elements.filter((el) => !selectedIds.includes(el.id))
    excalidrawAPI.updateScene({ elements: next, appState: { selectedElementIds: {} } })
    onClose()
  }

  const duplicateSelected = () => {
    const { selectedIds, elements } = getSelection()
    if (selectedIds.length === 0) return

    const selectedElements = elements.filter((el) => selectedIds.includes(el.id))
    const idMap = new Map<string, string>()
    selectedElements.forEach((el) =>
      idMap.set(el.id, `${el.id}-copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)
    )

    // Remap group ids so duplicated group stays grouped, but separate from original
    const oldGroupIds = new Set<string>()
    selectedElements.forEach((el) => (el.groupIds || []).forEach((g: string) => oldGroupIds.add(g)))
    const groupIdMap = new Map<string, string>()
    oldGroupIds.forEach((g) =>
      groupIdMap.set(g, `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)
    )

    const duplicated = selectedElements.map((el) => {
      const newId = idMap.get(el.id)!
      const newGroupIds = (el.groupIds || []).map((g: string) => groupIdMap.get(g) || g)
      const newBoundElements = (el.boundElements || []).map((b: any) =>
        idMap.has(b.id) ? { ...b, id: idMap.get(b.id) } : b
      )

      return {
        ...el,
        id: newId,
        x: el.x + 20,
        y: el.y + 20,
        groupIds: newGroupIds,
        boundElements: newBoundElements,
        containerId:
          el.containerId && idMap.has(el.containerId) ? idMap.get(el.containerId) : el.containerId,
        frameId: el.frameId,
        updated: Date.now(),
        version: (el.version || 1) + 1,
        versionNonce: Math.floor(Math.random() * 1000000),
      }
    })

    // Remap arrow start/end bindings if any
    duplicated.forEach((el) => {
      if (el.startBinding?.elementId && idMap.has(el.startBinding.elementId)) {
        el.startBinding = { ...el.startBinding, elementId: idMap.get(el.startBinding.elementId) }
      }
      if (el.endBinding?.elementId && idMap.has(el.endBinding.elementId)) {
        el.endBinding = { ...el.endBinding, elementId: idMap.get(el.endBinding.elementId) }
      }
    })

    const newSelectedIds: Record<string, boolean> = {}
    duplicated.forEach((el) => (newSelectedIds[el.id] = true))

    excalidrawAPI.updateScene({
      elements: [...elements, ...duplicated],
      appState: { selectedElementIds: newSelectedIds },
    })
    onClose()
  }

  const bringToFront = () => {
    const { selectedIds, elements } = getSelection()
    if (selectedIds.length === 0) return
    const selected = elements.filter((el) => selectedIds.includes(el.id))
    const rest = elements.filter((el) => !selectedIds.includes(el.id))
    excalidrawAPI.updateScene({ elements: [...rest, ...selected] })
    onClose()
  }

  const sendToBack = () => {
    const { selectedIds, elements } = getSelection()
    if (selectedIds.length === 0) return
    const selected = elements.filter((el) => selectedIds.includes(el.id))
    const rest = elements.filter((el) => !selectedIds.includes(el.id))
    excalidrawAPI.updateScene({ elements: [...selected, ...rest] })
    onClose()
  }

  const groupSelected = () => {
    const { selectedIds, elements } = getSelection()
    if (selectedIds.length < 2) return
    const groupId = `group-${Date.now()}`
    const next = elements.map((el) =>
      selectedIds.includes(el.id) ? { ...el, groupIds: [...(el.groupIds || []), groupId] } : el
    )
    excalidrawAPI.updateScene({ elements: next })
    onClose()
  }

  const ungroupSelected = () => {
    const { selectedIds, elements } = getSelection()
    if (selectedIds.length === 0) return
    const next = elements.map((el) => (selectedIds.includes(el.id) ? { ...el, groupIds: [] } : el))
    excalidrawAPI.updateScene({ elements: next })
    onClose()
  }

  // Clipboard actions are best-effort; Excalidraw has its own shortcuts.
  const copySelected = async () => {
    const { selectedIds, elements } = getSelection()
    const toCopy = elements.filter((el) => selectedIds.includes(el.id))
    try {
      localStorage.setItem('whiteboard_clipboard', JSON.stringify(toCopy))
    } catch {
      /* ignore */
    }
    onClose()
  }

  const pasteSelected = () => {
    try {
      const raw = localStorage.getItem('whiteboard_clipboard')
      if (!raw) return
      const clipboard = JSON.parse(raw) as any[]
      if (!Array.isArray(clipboard) || clipboard.length === 0) return

      const idMap = new Map<string, string>()
      clipboard.forEach((el) =>
        idMap.set(el.id, `${el.id}-paste-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)
      )

      const pasted = clipboard.map((el) => ({
        ...el,
        id: idMap.get(el.id)!,
        x: el.x + 40,
        y: el.y + 40,
        updated: Date.now(),
        version: (el.version || 1) + 1,
        versionNonce: Math.floor(Math.random() * 1000000),
      }))

      const current = excalidrawAPI.getSceneElements() as any[]
      const newSelected: Record<string, boolean> = {}
      pasted.forEach((el) => (newSelected[el.id] = true))

      excalidrawAPI.updateScene({
        elements: [...current, ...pasted],
        appState: { selectedElementIds: newSelected },
      })
    } catch {
      /* ignore */
    }
    onClose()
  }

  const { selectedIds } = getSelection()
  const hasSelection = selectedIds.length > 0

  return (
    <div
      className={cn(
        'fixed z-[200] min-w-[180px] rounded-xl border p-1.5 shadow-2xl',
        isDark ? 'bg-[#2d2d44]/98 border-white/10' : 'bg-white/98 border-black/5'
      )}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {hasSelection ? (
        <>
          <button onClick={duplicateSelected} className={menuItemClass}>
            <CopyPlus size={14} /> Duplikuj <span className={shortcutClass}>Ctrl+D</span>
          </button>
          <button onClick={copySelected} className={menuItemClass}>
            <Copy size={14} /> Kopiuj <span className={shortcutClass}>Ctrl+C</span>
          </button>
          <button
            onClick={deleteSelected}
            className={cn(menuItemClass, 'text-red-400 hover:text-red-300')}
          >
            <Trash2 size={14} /> Usuń <span className={shortcutClass}>Del</span>
          </button>
          <div className={cn('my-1 h-px', isDark ? 'bg-white/10' : 'bg-gray-200')} />
          <button onClick={bringToFront} className={menuItemClass}>
            <ArrowUpToLine size={14} /> Na wierzch
          </button>
          <button onClick={sendToBack} className={menuItemClass}>
            <ArrowDownToLine size={14} /> Na spód
          </button>
          <div className={cn('my-1 h-px', isDark ? 'bg-white/10' : 'bg-gray-200')} />
          {selectedIds.length >= 2 ? (
            <button onClick={groupSelected} className={menuItemClass}>
              <Layers size={14} /> Grupuj <span className={shortcutClass}>Ctrl+G</span>
            </button>
          ) : (
            <button onClick={ungroupSelected} className={menuItemClass}>
              <Ungroup size={14} /> Rozgrupuj <span className={shortcutClass}>Ctrl+Shift+G</span>
            </button>
          )}
        </>
      ) : (
        <button onClick={pasteSelected} className={menuItemClass}>
          <ClipboardPaste size={14} /> Wklej <span className={shortcutClass}>Ctrl+V</span>
        </button>
      )}
    </div>
  )
}
