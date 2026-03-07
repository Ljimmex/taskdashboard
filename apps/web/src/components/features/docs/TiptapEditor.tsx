"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import CharacterCount from '@tiptap/extension-character-count'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Youtube from '@tiptap/extension-youtube'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    CheckSquare,
    Quote,
    Code,
    Link as LinkIcon,
    Highlighter,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Type,
    Minus,
    Image as ImageIcon,
    Table as TableIcon,
    Video,
    ListTree,
    Plus,
    AlignJustify,
    MoreHorizontal,
    MoreVertical,
    GripVertical,
} from 'lucide-react'

const lowlight = createLowlight(common)

interface TiptapEditorProps {
    content?: string
    onChange?: (content: string) => void
    editable?: boolean
    characterCount?: number
    onCharacterCountChange?: (count: number) => void
    onEditorActionsChange?: (actions: { canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void }) => void
}

type MediaInsertType = 'image' | 'video'

type TocHeading = {
    level: number
    text: string
    id: string
    pos: number
}

const BubbleMenuBar = ({ editor }: { editor: any }) => {
    if (!editor) return null

    const setLink = useCallback(() => {
        const previousUrl = editor.getAttributes('link').href
        const url = window.prompt('URL:', previousUrl)
        if (url === null) return
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            return
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }, [editor])

    const setBlockType = (value: string) => {
        const chain = editor.chain().focus()
        if (value === 'paragraph') chain.setParagraph().run()
        if (value === 'h1') chain.toggleHeading({ level: 1 }).run()
        if (value === 'h2') chain.toggleHeading({ level: 2 }).run()
        if (value === 'h3') chain.toggleHeading({ level: 3 }).run()
        if (value === 'blockquote') chain.toggleBlockquote().run()
        if (value === 'codeblock') chain.toggleCodeBlock().run()
    }

    const insertParagraphBefore = () => {
        const { $from } = editor.state.selection
        const blockStart = $from.before($from.depth)
        editor.chain().focus().insertContentAt(blockStart, { type: 'paragraph' }).run()
    }

    const insertParagraphAfter = () => {
        const { $from } = editor.state.selection
        const blockEnd = $from.after($from.depth)
        editor.chain().focus().insertContentAt(blockEnd, { type: 'paragraph' }).run()
    }

    const activeBlockType = editor.isActive('heading', { level: 1 })
        ? 'h1'
        : editor.isActive('heading', { level: 2 })
            ? 'h2'
            : editor.isActive('heading', { level: 3 })
                ? 'h3'
                : editor.isActive('blockquote')
                    ? 'blockquote'
                    : editor.isActive('codeBlock')
                        ? 'codeblock'
                        : 'paragraph'

    return (
        <BubbleMenu
            editor={editor}
            shouldShow={({ editor, state }) => editor.isFocused && !state.selection.empty}
            className="z-[80] flex items-center gap-1 p-1.5 bg-popover border border-border rounded-lg shadow-xl"
        >
            <select
                value={activeBlockType}
                onChange={(e) => setBlockType(e.target.value)}
                className="h-8 rounded-md bg-transparent border border-border text-xs text-foreground px-2 outline-none"
                title="Typ bloku"
            >
                <option value="paragraph">Paragraf</option>
                <option value="h1">Nagłówek 1</option>
                <option value="h2">Nagłówek 2</option>
                <option value="h3">Nagłówek 3</option>
                <option value="blockquote">Cytat</option>
                <option value="codeblock">Blok kodu</option>
            </select>
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('bold') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground'}`}
                title="Pogrubienie"
            >
                <Bold size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('italic') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground'}`}
                title="Kursywa"
            >
                <Italic size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('underline') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground'}`}
                title="Podkreślenie"
            >
                <UnderlineIcon size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('strike') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground'}`}
                title="Przekreślenie"
            >
                <Strikethrough size={14} />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('highlight') ? 'bg-yellow-200 text-yellow-800' : 'hover:bg-accent/50 text-muted-foreground'}`}
                title="Zaznaczenie"
            >
                <Highlighter size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('code') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground'}`}
                title="Kod"
            >
                <Code size={14} />
            </button>
            <button
                onClick={setLink}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('link') ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground'}`}
                title="Link"
            >
                <LinkIcon size={14} />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground'}`}
                title="Do lewej"
            >
                <AlignLeft size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground'}`}
                title="Do środka"
            >
                <AlignCenter size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground'}`}
                title="Do prawej"
            >
                <AlignRight size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive({ textAlign: 'justify' }) ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground'}`}
                title="Wyjustuj"
            >
                <AlignJustify size={14} />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
                onClick={() => editor.chain().focus().toggleHighlight({ color: '#fde68a' }).run()}
                className="w-5 h-5 rounded-full border border-border bg-[#fde68a]"
                title="Kolor żółty"
            />
            <button
                onClick={() => editor.chain().focus().toggleHighlight({ color: '#bfdbfe' }).run()}
                className="w-5 h-5 rounded-full border border-border bg-[#bfdbfe]"
                title="Kolor niebieski"
            />
            <button
                onClick={() => editor.chain().focus().toggleHighlight({ color: '#bbf7d0' }).run()}
                className="w-5 h-5 rounded-full border border-border bg-[#bbf7d0]"
                title="Kolor zielony"
            />
            <button
                onClick={insertParagraphBefore}
                className="px-2 py-1 rounded-md hover:bg-accent/50 text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Paragraf nad"
            >
                ↑ P
            </button>
            <button
                onClick={insertParagraphAfter}
                className="px-2 py-1 rounded-md hover:bg-accent/50 text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Paragraf pod"
            >
                ↓ P
            </button>
        </BubbleMenu>
    )
}

const TableOverlayControls = ({ editor }: { editor: any }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [tableBounds, setTableBounds] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
    const menuRef = useRef<HTMLDivElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const isTableActive = !!editor?.isActive('table')

    useEffect(() => {
        if (!isTableActive) setIsMenuOpen(false)
    }, [isTableActive])

    useEffect(() => {
        if (!isMenuOpen) return
        const onPointerDown = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) {
                setIsMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', onPointerDown)
        return () => document.removeEventListener('mousedown', onPointerDown)
    }, [isMenuOpen])

    useEffect(() => {
        if (!editor || !isTableActive || !containerRef.current) {
            setTableBounds(null)
            return
        }

        const updateBounds = () => {
            if (!containerRef.current) return
            const domAtPos = editor.view.domAtPos(editor.state.selection.from)
            const origin = domAtPos.node instanceof Element ? domAtPos.node : domAtPos.node.parentElement
            const table = origin?.closest('table')
            if (!table) {
                setTableBounds(null)
                return
            }
            const wrapper = table.closest('.tableWrapper') || table
            const wrapperRect = wrapper.getBoundingClientRect()
            const containerRect = containerRef.current.getBoundingClientRect()
            setTableBounds({
                top: wrapperRect.top - containerRect.top,
                left: wrapperRect.left - containerRect.left,
                width: wrapperRect.width,
                height: wrapperRect.height,
            })
        }

        updateBounds()
        editor.on('selectionUpdate', updateBounds)
        editor.on('update', updateBounds)
        window.addEventListener('resize', updateBounds)
        const container = containerRef.current
        container.addEventListener('scroll', updateBounds)
        return () => {
            editor.off('selectionUpdate', updateBounds)
            editor.off('update', updateBounds)
            window.removeEventListener('resize', updateBounds)
            container.removeEventListener('scroll', updateBounds)
        }
    }, [editor, isTableActive])

    if (!editor || !isTableActive) return null

    return (
        <div ref={containerRef} className="absolute inset-0 pointer-events-none z-[55]">
            {tableBounds && (
                <>
                    <div
                        className="pointer-events-none absolute rounded-xl border border-[var(--app-border)]"
                        style={{
                            top: tableBounds.top - 8,
                            left: tableBounds.left - 8,
                            width: tableBounds.width + 16,
                            height: tableBounds.height + 16,
                        }}
                    />
            <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="pointer-events-auto absolute h-6 min-w-[56px] px-2 rounded-md border border-[var(--app-border)] bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-card)] transition-colors flex items-center justify-center"
                style={{
                    top: tableBounds.top - 18,
                    left: tableBounds.left + tableBounds.width / 2,
                    transform: 'translateX(-50%)',
                }}
                title="Opcje tabeli"
            >
                <MoreHorizontal size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="pointer-events-auto absolute h-6 w-6 rounded-full border border-[var(--app-border)] bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-card)] transition-colors flex items-center justify-center"
                style={{
                    top: tableBounds.top + tableBounds.height / 2,
                    left: tableBounds.left + tableBounds.width + 10,
                    transform: 'translateY(-50%)',
                }}
                title="Dodaj kolumnę"
            >
                <Plus size={12} />
            </button>
            <button
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="pointer-events-auto absolute h-6 min-w-[56px] px-2 rounded-md border border-[var(--app-border)] bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-card)] transition-colors flex items-center justify-center"
                style={{
                    top: tableBounds.top + tableBounds.height + 10,
                    left: tableBounds.left + tableBounds.width / 2,
                    transform: 'translateX(-50%)',
                }}
                title="Dodaj wiersz"
            >
                <Plus size={12} />
            </button>
            <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="pointer-events-auto absolute h-6 w-6 rounded-md border border-[var(--app-border)] bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-card)] transition-colors flex items-center justify-center"
                style={{
                    top: tableBounds.top + tableBounds.height / 2,
                    left: tableBounds.left - 18,
                    transform: 'translateY(-50%)',
                }}
                title="Więcej opcji"
            >
                <MoreVertical size={12} />
            </button>
            {isMenuOpen && (
                <div
                    ref={menuRef}
                    className="pointer-events-auto absolute z-[60] w-[260px] rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-2xl p-2"
                    style={{
                        top: tableBounds.top - 12,
                        left: tableBounds.left + tableBounds.width / 2,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] transition-colors">Wstaw kolumnę po lewej</button>
                    <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] transition-colors">Wstaw kolumnę po prawej</button>
                    <button onClick={() => editor.chain().focus().addRowBefore().run()} className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] transition-colors">Wstaw wiersz nad</button>
                    <button onClick={() => editor.chain().focus().addRowAfter().run()} className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] transition-colors">Wstaw wiersz pod</button>
                    <div className="h-px bg-[var(--app-border)] my-1" />
                    <button onClick={() => editor.chain().focus().toggleHeaderRow().run()} className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] transition-colors">Przełącz header wiersza</button>
                    <button onClick={() => editor.chain().focus().toggleHeaderColumn().run()} className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] transition-colors">Przełącz header kolumny</button>
                    <button onClick={() => editor.chain().focus().mergeOrSplit().run()} className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] transition-colors">Scal / rozdziel komórki</button>
                    <div className="h-px bg-[var(--app-border)] my-1" />
                    <button onClick={() => editor.chain().focus().deleteRow().run()} className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">Usuń wiersz</button>
                    <button onClick={() => editor.chain().focus().deleteColumn().run()} className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">Usuń kolumnę</button>
                    <button onClick={() => editor.chain().focus().deleteTable().run()} className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">Usuń tabelę</button>
                </div>
            )}
                </>
            )}
        </div>
    )
}

const BlockSideControls = ({ editor }: { editor: any }) => {
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
    const [menuOpen, setMenuOpen] = useState(false)
    const [isGripHolding, setIsGripHolding] = useState(false)
    const menuRef = useRef<HTMLDivElement | null>(null)
    const holdTimerRef = useRef<number | null>(null)
    const holdTriggeredRef = useRef(false)
    const draggedBlockRef = useRef<{ range: { from: number; to: number }; content: any } | null>(null)

    const getCurrentBlockRange = () => {
        const { $from } = editor.state.selection
        return {
            from: $from.before(1),
            to: $from.after(1),
        }
    }

    const insertBelow = () => {
        const range = getCurrentBlockRange()
        editor.chain().focus().insertContentAt(range.to, { type: 'paragraph' }).run()
    }

    const duplicateBlock = () => {
        const range = getCurrentBlockRange()
        const slice = editor.state.doc.slice(range.from, range.to).content.toJSON()
        editor.chain().focus().insertContentAt(range.to, slice).run()
        setMenuOpen(false)
    }

    const deleteBlock = () => {
        const range = getCurrentBlockRange()
        editor.chain().focus().deleteRange(range).run()
        setMenuOpen(false)
    }

    const copyBlockText = async () => {
        const range = getCurrentBlockRange()
        const text = editor.state.doc.textBetween(range.from, range.to, '\n')
        if (text.trim()) {
            await navigator.clipboard.writeText(text)
        }
        setMenuOpen(false)
    }

    const copyAnchor = async () => {
        const range = getCurrentBlockRange()
        const text = editor.state.doc.textBetween(range.from, range.to, ' ')
        const anchor = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
        if (anchor) {
            await navigator.clipboard.writeText(`#${anchor}`)
        }
        setMenuOpen(false)
    }

    const resetFormatting = () => {
        editor.chain().focus().unsetAllMarks().clearNodes().run()
        setMenuOpen(false)
    }

    const clearHoldTimer = () => {
        if (holdTimerRef.current) {
            window.clearTimeout(holdTimerRef.current)
            holdTimerRef.current = null
        }
        setIsGripHolding(false)
    }

    const handleGripMouseDown = (event: React.MouseEvent) => {
        event.stopPropagation()
        editor.chain().focus().run()
        holdTriggeredRef.current = false
        clearHoldTimer()
        holdTimerRef.current = window.setTimeout(() => {
            holdTriggeredRef.current = true
            setIsGripHolding(true)
            setMenuOpen(true)
        }, 320)
    }

    const handleGripClick = (event: React.MouseEvent) => {
        event.stopPropagation()
        clearHoldTimer()
        if (holdTriggeredRef.current) {
            holdTriggeredRef.current = false
            return
        }
        setMenuOpen((prev) => !prev)
    }

    const handleGripDragStart = (event: React.DragEvent<HTMLButtonElement>) => {
        const range = getCurrentBlockRange()
        const content = editor.state.doc.slice(range.from, range.to).content.toJSON()
        draggedBlockRef.current = { range, content }
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', 'block')
        setMenuOpen(false)
        clearHoldTimer()
    }

    const handleGripDragEnd = () => {
        draggedBlockRef.current = null
        clearHoldTimer()
    }

    useEffect(() => {
        if (!editor) return
        const updatePosition = () => {
            const { from } = editor.state.selection
            const blockCoords = editor.view.coordsAtPos(from)
            const editorRect = (editor.view.dom as HTMLElement).getBoundingClientRect()
            setCoords({
                top: blockCoords.top,
                left: Math.max(8, editorRect.left - 42),
            })
        }
        updatePosition()
        editor.on('selectionUpdate', updatePosition)
        editor.on('focus', updatePosition)
        editor.on('update', updatePosition)
        window.addEventListener('resize', updatePosition)
        return () => {
            editor.off('selectionUpdate', updatePosition)
            editor.off('focus', updatePosition)
            editor.off('update', updatePosition)
            window.removeEventListener('resize', updatePosition)
        }
    }, [editor])

    useEffect(() => {
        if (!editor) return
        const dom = editor.view.dom as HTMLElement
        const onDragOver = (event: DragEvent) => {
            if (!draggedBlockRef.current) return
            event.preventDefault()
            event.dataTransfer!.dropEffect = 'move'
        }
        const onDrop = (event: DragEvent) => {
            if (!draggedBlockRef.current) return
            event.preventDefault()
            const pos = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
            if (!pos) {
                draggedBlockRef.current = null
                return
            }
            const { range, content } = draggedBlockRef.current
            if (pos >= range.from && pos <= range.to) {
                draggedBlockRef.current = null
                return
            }
            const size = range.to - range.from
            let insertionPos = pos
            try {
                const $pos = editor.state.doc.resolve(pos)
                insertionPos = $pos.depth > 0 ? $pos.before(1) : 1
            } catch {
                insertionPos = pos
            }
            if (insertionPos < 1) insertionPos = 1
            const targetPos = insertionPos > range.to ? insertionPos - size : insertionPos
            if (targetPos >= range.from && targetPos <= range.to) {
                draggedBlockRef.current = null
                return
            }
            editor.chain().focus().deleteRange(range).run()
            editor.chain().focus().insertContentAt(targetPos, content).run()
            draggedBlockRef.current = null
        }
        dom.addEventListener('dragover', onDragOver)
        dom.addEventListener('drop', onDrop)
        return () => {
            dom.removeEventListener('dragover', onDragOver)
            dom.removeEventListener('drop', onDrop)
        }
    }, [editor])

    useEffect(() => {
        if (!menuOpen) return
        const onDown = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) {
                setMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [menuOpen])

    if (!editor || !coords) return null

    return (
        <div className="fixed inset-0 pointer-events-none z-[58]">
            <div
                className="pointer-events-auto absolute flex items-center gap-1"
                style={{ top: coords.top + 2, left: coords.left }}
            >
                <button
                    onMouseDown={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        editor.chain().focus().run()
                    }}
                    onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        insertBelow()
                    }}
                    className="h-7 w-7 rounded-md border border-[var(--app-border)] bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-card)] transition-colors flex items-center justify-center"
                    title="Wstaw blok pod spodem"
                >
                    <Plus size={13} />
                </button>
                <button
                    draggable
                    onMouseDown={handleGripMouseDown}
                    onMouseUp={clearHoldTimer}
                    onMouseLeave={clearHoldTimer}
                    onClick={handleGripClick}
                    onDragStart={handleGripDragStart}
                    onDragEnd={handleGripDragEnd}
                    className={`h-7 w-7 rounded-md border border-[var(--app-border)] bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-card)] transition-colors flex items-center justify-center ${isGripHolding ? 'cursor-grabbing' : 'cursor-grab'}`}
                    title="Kliknij opcje, przytrzymaj by przeciągać"
                >
                    <GripVertical size={13} />
                </button>
            </div>
            {menuOpen && (
                <div
                    ref={menuRef}
                    className="pointer-events-auto absolute z-[70] w-[280px] rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-2xl p-2"
                    style={{ top: coords.top + 36, left: coords.left + 36 }}
                >
                    <button onClick={duplicateBlock} className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] transition-colors">Duplicate node</button>
                    <button onClick={copyBlockText} className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] transition-colors">Copy to clipboard</button>
                    <button onClick={copyAnchor} className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] transition-colors">Copy anchor link</button>
                    <div className="h-px bg-[var(--app-border)] my-1" />
                    <button onClick={resetFormatting} className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] transition-colors">Reset formatting</button>
                    <button onClick={() => { editor.chain().focus().setParagraph().run(); setMenuOpen(false) }} className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] transition-colors">Turn into paragraph</button>
                    <button onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setMenuOpen(false) }} className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] transition-colors">Turn into heading</button>
                    <div className="h-px bg-[var(--app-border)] my-1" />
                    <button onClick={deleteBlock} className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">Delete</button>
                </div>
            )}
        </div>
    )
}

type SlashItem = {
    label: string
    description: string
    icon: React.ReactNode
    color: string
    action: () => void
}

const FloatingMenuBar = ({
    editor,
    onInsertImage,
    onInsertVideo,
}: {
    editor: any
    onInsertImage: () => void
    onInsertVideo: () => void
}) => {
    if (!editor) return null

    const runSlashAction = (action: () => void) => {
        const { from } = editor.state.selection
        const textBefore = editor.state.doc.textBetween(Math.max(0, from - 100), from, '\n', '\0')
        const match = textBefore.match(/\/[^\s]*$/)
        if (match) {
            const slashFrom = from - match[0].length
            editor.chain().focus().deleteRange({ from: slashFrom, to: from }).run()
        }
        action()
    }

    const setLink = () => {
        const url = window.prompt('URL:')
        if (!url) return
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }

    const addImage = () => onInsertImage()

    const addVideo = () => onInsertVideo()

    const insertTableOfContents = () => {
        // Get all headings from the editor
        const headings: { level: number; text: string; id: string }[] = []
        editor.state.doc.descendants((node: any, _pos: number) => {
            if (node.type.name === 'heading') {
                const text = node.textContent
                const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
                headings.push({ level: node.attrs.level, text, id })
            }
        })

        if (headings.length === 0) {
            alert('Brak nagłówków w dokumencie. Dodaj nagłówki (H1, H2, H3) aby wygenerować spis treści.')
            return
        }

        // Generate HTML for table of contents
        let tocHtml = '<div class="toc-wrapper"><p><strong>Spis treści</strong></p><ul>'
        headings.forEach((h) => {
            const indent = (h.level - 1) * 16
            tocHtml += `<li style="margin-left: ${indent}px"><a href="#${h.id}">${h.text}</a></li>`
        })
        tocHtml += '</ul></div>'

        editor.chain().focus().insertContent(tocHtml).run()
    }

    const groups: { heading: string; items: SlashItem[] }[] = [
        {
            heading: 'Bloki tekstu',
            items: [
                {
                    label: 'Tekst',
                    description: 'Zwykły akapit',
                    icon: <Type size={16} />,
                    color: 'bg-muted text-muted-foreground',
                    action: () => editor.chain().focus().setParagraph().run(),
                },
                {
                    label: 'Nagłówek 1',
                    description: 'Duży tytuł',
                    icon: <Heading1 size={16} />,
                    color: 'bg-blue-500/10 text-blue-500',
                    action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
                },
                {
                    label: 'Nagłówek 2',
                    description: 'Średni tytuł',
                    icon: <Heading2 size={16} />,
                    color: 'bg-emerald-500/10 text-emerald-500',
                    action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
                },
                {
                    label: 'Nagłówek 3',
                    description: 'Mały tytuł',
                    icon: <Heading3 size={16} />,
                    color: 'bg-teal-500/10 text-teal-500',
                    action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
                },
            ],
        },
        {
            heading: 'Listy',
            items: [
                {
                    label: 'Lista punktowana',
                    description: 'Prosta lista z kropkami',
                    icon: <List size={16} />,
                    color: 'bg-amber-500/10 text-amber-500',
                    action: () => editor.chain().focus().toggleBulletList().run(),
                },
                {
                    label: 'Lista numerowana',
                    description: 'Lista z numeracją',
                    icon: <ListOrdered size={16} />,
                    color: 'bg-orange-500/10 text-orange-500',
                    action: () => editor.chain().focus().toggleOrderedList().run(),
                },
                {
                    label: 'Lista zadań',
                    description: 'Lista z polami wyboru',
                    icon: <CheckSquare size={16} />,
                    color: 'bg-violet-500/10 text-violet-500',
                    action: () => editor.chain().focus().toggleTaskList().run(),
                },
            ],
        },
        {
            heading: 'Media',
            items: [
                {
                    label: 'Obrazek',
                    description: 'Wstaw obraz z URL',
                    icon: <ImageIcon size={16} />,
                    color: 'bg-pink-500/10 text-pink-500',
                    action: addImage,
                },
                {
                    label: 'Wideo YouTube',
                    description: 'Osadź wideo z YouTube',
                    icon: <Video size={16} />,
                    color: 'bg-red-500/10 text-red-500',
                    action: addVideo,
                },
                {
                    label: 'Tabela',
                    description: 'Wstaw tabelę 3x3',
                    icon: <TableIcon size={16} />,
                    color: 'bg-indigo-500/10 text-indigo-500',
                    action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
                },
            ],
        },
        {
            heading: 'Formatowanie',
            items: [
                {
                    label: 'Pogrubienie',
                    description: 'Pogrub zaznaczony tekst',
                    icon: <Bold size={16} />,
                    color: 'bg-slate-500/10 text-slate-600',
                    action: () => editor.chain().focus().toggleBold().run(),
                },
                {
                    label: 'Kursywa',
                    description: 'Pochyl zaznaczony tekst',
                    icon: <Italic size={16} />,
                    color: 'bg-slate-500/10 text-slate-600',
                    action: () => editor.chain().focus().toggleItalic().run(),
                },
                {
                    label: 'Podkreślenie',
                    description: 'Podkreśl zaznaczony tekst',
                    icon: <UnderlineIcon size={16} />,
                    color: 'bg-slate-500/10 text-slate-600',
                    action: () => editor.chain().focus().toggleUnderline().run(),
                },
                {
                    label: 'Przekreślenie',
                    description: 'Przekreśl zaznaczony tekst',
                    icon: <Strikethrough size={16} />,
                    color: 'bg-slate-500/10 text-slate-600',
                    action: () => editor.chain().focus().toggleStrike().run(),
                },
                {
                    label: 'Zaznaczenie',
                    description: 'Podświetl tekst na żółto',
                    icon: <Highlighter size={16} />,
                    color: 'bg-yellow-400/20 text-yellow-600',
                    action: () => editor.chain().focus().toggleHighlight().run(),
                },
                {
                    label: 'Link',
                    description: 'Dodaj hiperłącze',
                    icon: <LinkIcon size={16} />,
                    color: 'bg-blue-400/10 text-blue-500',
                    action: setLink,
                },
            ],
        },
        {
            heading: 'Wyrównanie',
            items: [
                {
                    label: 'Do lewej',
                    description: 'Wyrównaj tekst do lewej',
                    icon: <AlignLeft size={16} />,
                    color: 'bg-gray-500/10 text-gray-500',
                    action: () => editor.chain().focus().setTextAlign('left').run(),
                },
                {
                    label: 'Do środka',
                    description: 'Wyśrodkuj tekst',
                    icon: <AlignCenter size={16} />,
                    color: 'bg-gray-500/10 text-gray-500',
                    action: () => editor.chain().focus().setTextAlign('center').run(),
                },
                {
                    label: 'Do prawej',
                    description: 'Wyrównaj tekst do prawej',
                    icon: <AlignRight size={16} />,
                    color: 'bg-gray-500/10 text-gray-500',
                    action: () => editor.chain().focus().setTextAlign('right').run(),
                },
            ],
        },
        {
            heading: 'Wstawki',
            items: [
                {
                    label: 'Cytat',
                    description: 'Wyróżniony blok tekstu',
                    icon: <Quote size={16} />,
                    color: 'bg-pink-500/10 text-pink-500',
                    action: () => editor.chain().focus().toggleBlockquote().run(),
                },
                {
                    label: 'Blok kodu',
                    description: 'Kod z kolorowaniem składni',
                    icon: <Code size={16} />,
                    color: 'bg-slate-500/10 text-slate-500',
                    action: () => editor.chain().focus().toggleCodeBlock().run(),
                },
                {
                    label: 'Linia pozioma',
                    description: 'Wizualny separator',
                    icon: <Minus size={16} />,
                    color: 'bg-gray-500/10 text-gray-500',
                    action: () => editor.chain().focus().setHorizontalRule().run(),
                },
                {
                    label: 'Spis treści',
                    description: 'Generuj z nagłówków',
                    icon: <ListTree size={16} />,
                    color: 'bg-cyan-500/10 text-cyan-500',
                    action: insertTableOfContents,
                },
            ],
        },
    ]

    return (
        <FloatingMenu
            editor={editor}
            shouldShow={({ editor, state }) => {
                if (!editor.isFocused || !state.selection.empty) return false
                const { from } = state.selection
                const textBefore = state.doc.textBetween(Math.max(0, from - 100), from, '\n', '\0')
                return /\/[^\s]*$/.test(textBefore)
            }}
            options={{ placement: 'bottom-start' }}
            className="flex flex-col bg-popover border border-border rounded-xl shadow-2xl w-[260px] max-h-[420px] overflow-y-auto py-1.5"
        >
            {groups.map((group, gi) => (
                <div key={gi}>
                    {gi > 0 && <div className="w-full h-px bg-border my-1" />}
                    <div className="px-3 pt-1.5 pb-0.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                        {group.heading}
                    </div>
                    {group.items.map((item, ii) => (
                        <button
                            key={ii}
                            onClick={() => runSlashAction(item.action)}
                            className="flex items-center gap-2.5 w-full px-2 py-1.5 hover:bg-accent/50 transition-colors text-left rounded-lg mx-1 group"
                            style={{ width: 'calc(100% - 8px)' }}
                        >
                            <div className={`w-8 h-8 shrink-0 rounded-md flex items-center justify-center ${item.color}`}>
                                {item.icon}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium text-foreground leading-tight">{item.label}</span>
                                <span className="text-[11px] text-muted-foreground leading-tight">{item.description}</span>
                            </div>
                        </button>
                    ))}
                </div>
            ))}
        </FloatingMenu>
    )
}

export function TiptapEditor({ content, onChange, editable = true, onCharacterCountChange, onEditorActionsChange }: TiptapEditorProps) {
    const [mediaToast, setMediaToast] = useState<{
        open: boolean
        type: MediaInsertType
        value: string
        error?: string
    }>({ open: false, type: 'image', value: '' })
    const [headings, setHeadings] = useState<TocHeading[]>([])
    const [showTocPreview, setShowTocPreview] = useState(false)

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                codeBlock: false,
            }),
            CodeBlockLowlight.configure({
                lowlight,
            }),
            Placeholder.configure({
                placeholder: ({ node }) => {
                    if (node.type.name === 'heading') return 'Wpisz nagłówek...'
                    return "Wpisz '/' dla komend lub zacznij pisać..."
                },
            }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-500 underline cursor-pointer hover:text-blue-600',
                },
            }),
            Underline,
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            CharacterCount,
            Image.configure({
                HTMLAttributes: {
                    class: 'max-w-full h-auto rounded-lg my-4',
                },
            }),
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'notion-table',
                },
            }),
            TableRow,
            TableHeader,
            TableCell,
            Youtube.configure({
                HTMLAttributes: {
                    class: 'w-full aspect-video rounded-lg my-4',
                },
            }),
        ],
        content: content || '',
        editable,
        onUpdate: ({ editor }) => {
            if (onChange) onChange(editor.getHTML())
            if (onCharacterCountChange) {
                onCharacterCountChange(editor.storage.characterCount?.characters() || 0)
            }
        },
        editorProps: {
            attributes: {
                class: 'notion-editor prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[calc(100vh-260px)] px-16 py-12',
            },
        },
    })

    const openMediaToast = useCallback((type: MediaInsertType) => {
        setMediaToast({ open: true, type, value: '' })
    }, [])

    const closeMediaToast = useCallback(() => {
        setMediaToast((prev) => ({ ...prev, open: false, value: '', error: undefined }))
    }, [])

    const submitMediaToast = useCallback(() => {
        if (!editor) return
        const url = mediaToast.value.trim()
        if (!url) {
            setMediaToast((prev) => ({ ...prev, error: 'Wklej poprawny URL' }))
            return
        }
        try {
            new URL(url)
        } catch {
            setMediaToast((prev) => ({ ...prev, error: 'URL jest nieprawidłowy' }))
            return
        }
        if (mediaToast.type === 'image') {
            editor.chain().focus().setImage({ src: url }).run()
        } else {
            editor.commands.setYoutubeVideo({ src: url })
        }
        closeMediaToast()
    }, [editor, mediaToast.type, mediaToast.value, closeMediaToast])

    const addImage = useCallback(() => openMediaToast('image'), [openMediaToast])
    const addVideo = useCallback(() => openMediaToast('video'), [openMediaToast])

    useEffect(() => {
        if (!editor) return

        const updateHeadings = () => {
            const nextHeadings: TocHeading[] = []
            editor.state.doc.descendants((node: any, pos: number) => {
                if (node.type.name === 'heading') {
                    const text = node.textContent
                    if (!text.trim()) return
                    const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
                    nextHeadings.push({ level: node.attrs.level, text, id, pos })
                }
            })
            setHeadings(nextHeadings)
        }

        updateHeadings()
        editor.on('update', updateHeadings)
        return () => {
            editor.off('update', updateHeadings)
        }
    }, [editor])

    useEffect(() => {
        if (!editor || !onEditorActionsChange) return
        const emit = () => {
            onEditorActionsChange({
                canUndo: editor.can().chain().focus().undo().run(),
                canRedo: editor.can().chain().focus().redo().run(),
                undo: () => editor.chain().focus().undo().run(),
                redo: () => editor.chain().focus().redo().run(),
            })
        }
        emit()
        editor.on('update', emit)
        editor.on('selectionUpdate', emit)
        editor.on('focus', emit)
        return () => {
            editor.off('update', emit)
            editor.off('selectionUpdate', emit)
            editor.off('focus', emit)
        }
    }, [editor, onEditorActionsChange])

    // Update character count on mount
    if (editor && onCharacterCountChange) {
        const count = editor.storage.characterCount?.characters() || 0
        if (count > 0) {
            onCharacterCountChange(count)
        }
    }

    if (!editor) {
        return (
            <div className="flex-1 px-16 py-12 animate-pulse space-y-4">
                <div className="h-10 bg-muted rounded w-1/3 mb-8" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-2/3" />
            </div>
        )
    }

    return (
        <div className="flex flex-col w-full h-full relative">
            <div className="flex-1 overflow-auto bg-[var(--app-bg-page)] px-4 py-5 relative">
                <div className="mx-auto w-full max-w-[calc(80rem)] h-full flex items-start gap-5">
                    <div
                        className="hidden lg:flex w-10 flex-col items-center pt-3 shrink-0"
                        onMouseEnter={() => setShowTocPreview(true)}
                        onMouseLeave={() => setShowTocPreview(false)}
                    >
                        <div className="space-y-3">
                            {headings.length === 0 ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <div key={i} className="h-[2px] w-7 rounded bg-[var(--app-text-secondary)]/55" />
                                    ))}
                                </div>
                            ) : (
                                headings.map((h, i) => (
                                    <button
                                        key={`toc-line-${h.id}-${h.pos}-${i}`}
                                        onClick={() => editor.chain().focus().setTextSelection(h.pos + 1).scrollIntoView().run()}
                                        className="block mx-auto"
                                        title={h.text}
                                    >
                                        <div
                                            className="h-[2px] rounded bg-[var(--app-text-secondary)] hover:bg-[var(--app-accent)] transition-colors"
                                            style={{ width: `${Math.max(18, 36 - (h.level - 1) * 7)}px` }}
                                        />
                                    </button>
                                ))
                            )}
                        </div>
                        {showTocPreview && headings.length > 0 && (
                            <div className="absolute left-16 top-8 z-20 w-72 p-1">
                                <div className="space-y-0.5">
                                    {headings.map((h, i) => (
                                        <button
                                            key={`toc-preview-${h.id}-${h.pos}-${i}`}
                                            onClick={() => editor.chain().focus().setTextSelection(h.pos + 1).scrollIntoView().run()}
                                            className="w-full rounded-lg px-3 py-1.5 text-left text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] transition-colors"
                                            style={{ paddingLeft: `${12 + (h.level - 1) * 12}px` }}
                                        >
                                            <span className="truncate block text-base leading-tight">{h.text}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 max-w-5xl h-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-[var(--app-shadow-card)] overflow-hidden">
                        <div className="h-full">
                            <div className="flex-1 min-w-0">
                            <BubbleMenuBar editor={editor} />
                            <TableOverlayControls editor={editor} />
                            <BlockSideControls editor={editor} />
                            <FloatingMenuBar editor={editor} onInsertImage={addImage} onInsertVideo={addVideo} />
                            <EditorContent editor={editor} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {mediaToast.open && (
                <div className="fixed bottom-6 right-6 z-[80] w-[360px] rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-elevated)] p-3 shadow-2xl">
                    <div className="text-xs font-semibold text-[var(--app-text-primary)] mb-2">
                        {mediaToast.type === 'image' ? 'Wstaw obrazek z URL' : 'Wstaw wideo YouTube z URL'}
                    </div>
                    <input
                        autoFocus
                        type="url"
                        value={mediaToast.value}
                        onChange={(e) => setMediaToast((prev) => ({ ...prev, value: e.target.value, error: undefined }))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') submitMediaToast()
                            if (e.key === 'Escape') closeMediaToast()
                        }}
                        placeholder={mediaToast.type === 'image' ? 'https://example.com/image.jpg' : 'https://www.youtube.com/watch?v=...'}
                        className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-input)] px-3 py-2 text-sm text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)]"
                    />
                    {mediaToast.error && (
                        <div className="mt-2 text-xs text-red-400">{mediaToast.error}</div>
                    )}
                    <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                            onClick={closeMediaToast}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-card)] transition-colors"
                        >
                            Anuluj
                        </button>
                        <button
                            onClick={submitMediaToast}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--app-accent)] text-[var(--app-accent-text)] hover:opacity-90 transition-opacity"
                        >
                            Wstaw
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
