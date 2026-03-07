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
import SuperscriptExtension from '@tiptap/extension-superscript'
import SubscriptExtension from '@tiptap/extension-subscript'
import DragHandle from '@tiptap/extension-drag-handle'
import { common, createLowlight } from 'lowlight'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import { supabase } from '@/lib/supabase'
import { SupabaseYjsProvider } from '@/lib/SupabaseYjsProvider'
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
    AlignJustify,
    Superscript,
    Subscript,
    Plus,
    Eraser,
    Palette,
    Layout,
    ChevronRight,
} from 'lucide-react'

const lowlight = createLowlight(common)

interface TiptapEditorProps {
    content?: string
    onChange?: (content: string) => void
    editable?: boolean
    characterCount?: number
    onCharacterCountChange?: (count: number) => void
    onEditorActionsChange?: (actions: { canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void }) => void
    documentId?: string
    user?: any
    onCollaboratorsChange?: (collaborators: any[]) => void
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
            className="z-[80] flex items-center gap-1 p-1.5 bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-lg shadow-xl"
        >
            <select
                value={activeBlockType}
                onChange={(e) => setBlockType(e.target.value)}
                className="h-8 rounded-md bg-[var(--app-bg-elevated)] border border-[var(--app-border)] text-xs text-[var(--app-text-primary)] px-2 outline-none"
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
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('bold') ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]' : 'hover:bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]'}`}
                title="Pogrubienie"
            >
                <Bold size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('italic') ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]' : 'hover:bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]'}`}
                title="Kursywa"
            >
                <Italic size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('underline') ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]' : 'hover:bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]'}`}
                title="Podkreślenie"
            >
                <UnderlineIcon size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('strike') ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]' : 'hover:bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]'}`}
                title="Przekreślenie"
            >
                <Strikethrough size={14} />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('highlight') ? 'bg-yellow-200 text-yellow-800' : 'hover:bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]'}`}
                title="Zaznaczenie"
            >
                <Highlighter size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('code') ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]' : 'hover:bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]'}`}
                title="Kod"
            >
                <Code size={14} />
            </button>
            <button
                onClick={setLink}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('link') ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]' : 'hover:bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]'}`}
                title="Link"
            >
                <LinkIcon size={14} />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]' : 'hover:bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]'}`}
                title="Do lewej"
            >
                <AlignLeft size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]' : 'hover:bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]'}`}
                title="Do środka"
            >
                <AlignCenter size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]' : 'hover:bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]'}`}
                title="Do prawej"
            >
                <AlignRight size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive({ textAlign: 'justify' }) ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]' : 'hover:bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]'}`}
                title="Wyjustuj"
            >
                <AlignJustify size={14} />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
                onClick={() => editor.chain().focus().toggleHighlight({ color: '#fde68a' }).run()}
                className="w-5 h-5 rounded-full border border-[var(--app-border)] bg-[#fde68a]"
                title="Kolor żółty"
            />
            <button
                onClick={() => editor.chain().focus().toggleHighlight({ color: '#bfdbfe' }).run()}
                className="w-5 h-5 rounded-full border border-[var(--app-border)] bg-[#bfdbfe]"
                title="Kolor niebieski"
            />
            <button
                onClick={() => editor.chain().focus().toggleHighlight({ color: '#bbf7d0' }).run()}
                className="w-5 h-5 rounded-full border border-[var(--app-border)] bg-[#bbf7d0]"
                title="Kolor zielony"
            />
            <button
                onClick={() => editor.chain().focus().toggleSubscript().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('subscript') ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]' : 'hover:bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]'}`}
                title="Indeks dolny"
            >
                <Subscript size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleSuperscript().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('superscript') ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]' : 'hover:bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]'}`}
                title="Indeks górny"
            >
                <Superscript size={14} />
            </button>
        </BubbleMenu>
    )
}

const CustomTableCell = TableCell.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            backgroundColor: {
                default: null,
                parseHTML: element => element.style.backgroundColor || null,
                renderHTML: attributes => {
                    if (!attributes.backgroundColor) return {}
                    return { style: `background-color: ${attributes.backgroundColor} !important` }
                },
            },
            verticalAlign: {
                default: 'top',
                parseHTML: element => element.style.verticalAlign || 'top',
                renderHTML: attributes => {
                    if (!attributes.verticalAlign) return {}
                    return { style: `vertical-align: ${attributes.verticalAlign} !important` }
                },
            },
            textColor: {
                default: null,
                parseHTML: element => element.style.color || null,
                renderHTML: attributes => {
                    if (!attributes.textColor) return {}
                    return { style: `color: ${attributes.textColor} !important` }
                },
            },
        }
    },
})

const CustomTableHeader = TableHeader.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            backgroundColor: {
                default: null,
                parseHTML: element => element.style.backgroundColor || null,
                renderHTML: attributes => {
                    if (!attributes.backgroundColor) return {}
                    return { style: `background-color: ${attributes.backgroundColor} !important` }
                },
            },
            verticalAlign: {
                default: 'top',
                parseHTML: element => element.style.verticalAlign || 'top',
                renderHTML: attributes => {
                    if (!attributes.verticalAlign) return {}
                    return { style: `vertical-align: ${attributes.verticalAlign} !important` }
                },
            },
            textColor: {
                default: null,
                parseHTML: element => element.style.color || null,
                renderHTML: attributes => {
                    if (!attributes.textColor) return {}
                    return { style: `color: ${attributes.textColor} !important` }
                },
            },
        }
    },
})

const TableGridSelector = ({ onSelect }: { onSelect: (rows: number, cols: number) => void }) => {
    const [hovered, setHovered] = useState({ r: 0, c: 0 })
    const rows = 10
    const cols = 10

    return (
        <div className="p-3 bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl shadow-2xl w-fit">
            <div className="mb-2 text-[10px] uppercase tracking-wider font-bold text-[var(--app-text-muted)] flex justify-between">
                <span>Wstaw tabelę</span>
                <span>{hovered.r > 0 ? `${hovered.r} x ${hovered.c}` : 'Wybierz rozmiar'}</span>
            </div>
            <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
                onMouseLeave={() => setHovered({ r: 0, c: 0 })}
            >
                {Array.from({ length: rows * cols }).map((_, i) => {
                    const r = Math.floor(i / cols) + 1
                    const c = (i % cols) + 1
                    const isHovered = r <= hovered.r && c <= hovered.c
                    return (
                        <div
                            key={i}
                            onMouseEnter={() => setHovered({ r, c })}
                            onClick={() => onSelect(r, c)}
                            className={`w-4 h-4 rounded-sm border transition-colors cursor-pointer ${isHovered
                                ? 'bg-[var(--app-accent)] border-[var(--app-accent-hover)]'
                                : 'bg-transparent border-[var(--app-border)] hover:border-[var(--app-text-muted)]'
                                }`}
                        />
                    )
                })}
            </div>
        </div>
    )
}

const TableOverlayControls = ({ editor }: { editor: any }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [menuType, setMenuType] = useState<'column' | 'row' | 'table' | 'cell'>('table')
    const [activeSubMenu, setActiveSubMenu] = useState<'color' | 'align' | null>(null)
    const [activeColorLayer, setActiveColorLayer] = useState<'text' | 'background'>('text')
    const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
    const [tableBounds, setTableBounds] = useState<{
        top: number; left: number; width: number; height: number;
        cellTop: number; cellLeft: number; cellWidth: number; cellHeight: number;
        rowCount: number; colCount: number;
        rowRects: DOMRect[]; colRects: DOMRect[];
    } | null>(null)
    const menuRef = useRef<HTMLDivElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const isTableActive = !!editor?.isActive('table')

    const backgroundColors = [
        { label: 'Domyślne tło', value: null, color: 'transparent' },
        { label: 'Szare tło', value: 'var(--app-bg-card)', color: '#94a3b8' },
        { label: 'Brązowe tło', value: '#3e2723', color: '#8d6e63' },
        { label: 'Pomarańczowe tło', value: '#432818', color: '#f59e0b' },
        { label: 'Żółte tło', value: '#453c12', color: '#facc15' },
        { label: 'Zielone tło', value: '#132a13', color: '#22c55e' },
        { label: 'Niebieskie tło', value: '#122245', color: '#3b82f6' },
        { label: 'Fioletowe tło', value: '#2e1065', color: '#a855f7' },
        { label: 'Różowe tło', value: '#4a044e', color: '#ec4899' },
        { label: 'Czerwone tło', value: '#450a0a', color: '#ef4444' },
    ]

    const textColors = [
        { label: 'Domyślny tekst', value: null, color: 'var(--app-text-primary)' },
        { label: 'Szary tekst', value: '#9ca3af', color: '#9ca3af' },
        { label: 'Brązowy tekst', value: '#d6b191', color: '#d6b191' },
        { label: 'Pomarańczowy tekst', value: '#f59e0b', color: '#f59e0b' },
        { label: 'Żółty tekst', value: '#fde047', color: '#fde047' },
        { label: 'Zielony tekst', value: '#4ade80', color: '#4ade80' },
        { label: 'Niebieski tekst', value: '#60a5fa', color: '#60a5fa' },
        { label: 'Fioletowy tekst', value: '#c084fc', color: '#c084fc' },
        { label: 'Różowy tekst', value: '#f472b6', color: '#f472b6' },
        { label: 'Czerwony tekst', value: '#f87171', color: '#f87171' },
    ]

    useEffect(() => {
        if (!isTableActive) setIsMenuOpen(false)
    }, [isTableActive])

    useEffect(() => {
        if (!isMenuOpen) {
            setActiveSubMenu(null)
            setMenuAnchor(null)
            return
        }
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
            const { selection } = editor.state
            const domAtPos = editor.view.domAtPos(selection.from)
            const node = domAtPos.node instanceof Element ? domAtPos.node : domAtPos.node.parentElement
            const table = node?.closest('table')
            if (!table) return

            const wrapper = table.closest('.tableWrapper') || table
            const wrapperRect = wrapper.getBoundingClientRect()
            const containerRect = containerRef.current.getBoundingClientRect()

            const rows = Array.from(table.querySelectorAll('tr')) as HTMLTableRowElement[]
            const rowRects = rows.map(r => r.getBoundingClientRect())

            // Get columns from first row
            const firstRowCells = Array.from(rows[0]?.querySelectorAll('td, th') || []) as HTMLElement[]
            const colRects = firstRowCells.map(c => c.getBoundingClientRect())

            const cell = node?.closest('td, th') as HTMLElement | null
            let cellTop = wrapperRect.top, cellLeft = wrapperRect.left, cellWidth = wrapperRect.width, cellHeight = wrapperRect.height

            if (cell) {
                const cellRect = cell.getBoundingClientRect()
                cellTop = cellRect.top
                cellLeft = cellRect.left
                cellWidth = cellRect.width
                cellHeight = cellRect.height
            }

            setTableBounds({
                top: wrapperRect.top - containerRect.top,
                left: wrapperRect.left - containerRect.left,
                width: wrapperRect.width,
                height: wrapperRect.height,
                cellTop: cellTop - containerRect.top,
                cellLeft: cellLeft - containerRect.left,
                cellWidth,
                cellHeight,
                rowCount: rows.length,
                colCount: colRects.length,
                rowRects,
                colRects
            })
        }

        updateBounds()
        editor.on('selectionUpdate', updateBounds)
        editor.on('update', updateBounds)
        window.addEventListener('resize', updateBounds)
        return () => {
            editor.off('selectionUpdate', updateBounds)
            editor.off('update', updateBounds)
            window.removeEventListener('resize', updateBounds)
        }
    }, [editor, isTableActive])

    if (!editor || !isTableActive) return null

    const openMenu = (type: 'column' | 'row' | 'table' | 'cell', target?: HTMLElement) => {
        setMenuType(type)
        setActiveSubMenu(null)
        setActiveColorLayer('text')
        if (target && containerRef.current) {
            const rect = target.getBoundingClientRect()
            const containerRect = containerRef.current.getBoundingClientRect()
            setMenuAnchor({
                top: rect.top - containerRect.top,
                left: rect.left - containerRect.left,
                width: rect.width,
                height: rect.height,
            })
        }
        setIsMenuOpen(true)
    }

    const getContext = () => {
        const { state, view } = editor
        const { selection } = state
        const domAtPos = view.domAtPos(selection.from)
        const node = domAtPos.node instanceof Element ? domAtPos.node : domAtPos.node.parentElement
        const tableDom = node?.closest('table')
        const selectedCell = node?.closest('td, th') as HTMLElement | null
        const selectedRow = selectedCell?.closest('tr') as HTMLTableRowElement | null
        if (!tableDom || !selectedCell || !selectedRow) return null
        const rowsDom = Array.from(tableDom.querySelectorAll('tr')) as HTMLTableRowElement[]
        const rowIndex = rowsDom.indexOf(selectedRow)
        const colIndex = Array.from(selectedRow.querySelectorAll('td, th')).indexOf(selectedCell)
        if (rowIndex < 0 || colIndex < 0) return null
        const { $from } = state.selection
        let tableDepth = -1
        for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === 'table') {
                tableDepth = d
                break
            }
        }
        if (tableDepth === -1) return null
        const tablePos = $from.before(tableDepth)
        const tableNode = $from.node(tableDepth)
        return { state, tablePos, tableNode, rowIndex, colIndex }
    }

    const replaceTable = (newTableNode: any, tablePos: number, oldTableNode: any) => {
        editor.commands.command(({ tr, dispatch }: any) => {
            tr.replaceWith(tablePos, tablePos + oldTableNode.nodeSize, newTableNode)
            if (dispatch) dispatch(tr.scrollIntoView())
            return true
        })
    }

    const mapCells = (mapper: (cellNode: any, rowIndex: number, colIndex: number, schema: any) => any) => {
        const ctx = getContext()
        if (!ctx) return
        const rows = ctx.tableNode.content.toArray()
        const nextRows = rows.map((rowNode: any, rIdx: number) => {
            const cells = rowNode.content.toArray()
            const nextCells = cells.map((cellNode: any, cIdx: number) => {
                const inScope = menuType === 'column'
                    ? cIdx === ctx.colIndex
                    : menuType === 'row'
                        ? rIdx === ctx.rowIndex
                        : (rIdx === ctx.rowIndex && cIdx === ctx.colIndex)
                return inScope ? mapper(cellNode, rIdx, cIdx, ctx.state.schema) : cellNode
            })
            return rowNode.type.create(rowNode.attrs, nextCells)
        })
        const newTable = ctx.tableNode.type.create(ctx.tableNode.attrs, nextRows)
        replaceTable(newTable, ctx.tablePos, ctx.tableNode)
    }

    const setCellAlignment = (align: string) => {
        mapCells((cellNode) => cellNode.type.create({ ...cellNode.attrs, verticalAlign: align }, cellNode.content, cellNode.marks))
        setIsMenuOpen(false)
    }

    const clearCell = () => {
        mapCells((cellNode, _r, _c, schema) => {
            const paragraph = schema.nodes.paragraph.create()
            return cellNode.type.create({ ...cellNode.attrs, backgroundColor: null, textColor: null, verticalAlign: 'top' }, [paragraph], cellNode.marks)
        })
        setIsMenuOpen(false)
    }

    const applyCellColor = (type: 'text' | 'background', color: string | null) => {
        mapCells((cellNode) => cellNode.type.create({ ...cellNode.attrs, [type === 'text' ? 'textColor' : 'backgroundColor']: color }, cellNode.content, cellNode.marks))
    }

    const duplicateRow = () => {
        const ctx = getContext()
        if (!ctx) return
        const rows = ctx.tableNode.content.toArray()
        const clone = rows[ctx.rowIndex].type.create(rows[ctx.rowIndex].attrs, rows[ctx.rowIndex].content, rows[ctx.rowIndex].marks)
        rows.splice(ctx.rowIndex + 1, 0, clone)
        const newTable = ctx.tableNode.type.create(ctx.tableNode.attrs, rows)
        replaceTable(newTable, ctx.tablePos, ctx.tableNode)
        setIsMenuOpen(false)
    }

    const duplicateColumn = () => {
        const ctx = getContext()
        if (!ctx) return
        const rows = ctx.tableNode.content.toArray()
        const nextRows = rows.map((rowNode: any) => {
            const cells = rowNode.content.toArray()
            const idx = Math.min(ctx.colIndex, Math.max(0, cells.length - 1))
            const source = cells[idx]
            const clone = source.type.create(source.attrs, source.content, source.marks)
            cells.splice(idx + 1, 0, clone)
            return rowNode.type.create(rowNode.attrs, cells)
        })
        const newTable = ctx.tableNode.type.create(ctx.tableNode.attrs, nextRows)
        replaceTable(newTable, ctx.tablePos, ctx.tableNode)
        setIsMenuOpen(false)
    }

    const sortColumn = (desc = false) => {
        const ctx = getContext()
        if (!ctx) return
        const rows = ctx.tableNode.content.toArray()
        const hasHeaderRow = rows.length > 0 && rows[0].firstChild?.type.name === 'tableHeader'
        const headerRows = hasHeaderRow ? [rows[0]] : []
        const bodyRows = hasHeaderRow ? rows.slice(1) : rows.slice()
        const sortedRows = [...bodyRows].sort((a: any, b: any) => {
            const aCell = a.child(Math.min(ctx.colIndex, Math.max(0, a.childCount - 1)))
            const bCell = b.child(Math.min(ctx.colIndex, Math.max(0, b.childCount - 1)))
            const cmp = aCell.textContent.localeCompare(bCell.textContent, 'pl', { sensitivity: 'base', numeric: true })
            return desc ? -cmp : cmp
        })
        const newTable = ctx.tableNode.type.create(ctx.tableNode.attrs, [...headerRows, ...sortedRows])
        replaceTable(newTable, ctx.tablePos, ctx.tableNode)
        setIsMenuOpen(false)
    }

    const sortRow = (desc = false) => {
        const ctx = getContext()
        if (!ctx) return
        const rows = ctx.tableNode.content.toArray()
        const currentRow = rows[ctx.rowIndex]
        const cells = currentRow.content.toArray()
        const sortedCells = [...cells].sort((a: any, b: any) => {
            const cmp = a.textContent.localeCompare(b.textContent, 'pl', { sensitivity: 'base', numeric: true })
            return desc ? -cmp : cmp
        })
        rows[ctx.rowIndex] = currentRow.type.create(currentRow.attrs, sortedCells)
        const newTable = ctx.tableNode.type.create(ctx.tableNode.attrs, rows)
        replaceTable(newTable, ctx.tablePos, ctx.tableNode)
        setIsMenuOpen(false)
    }

    const appendRow = () => {
        if (!editor) return
        const { state, view } = editor
        const { selection } = state
        const domAtPos = view.domAtPos(selection.from)
        const node = domAtPos.node instanceof Element ? domAtPos.node : domAtPos.node.parentElement
        const tableDom = node?.closest('table')
        if (!tableDom) return

        const rows = tableDom.querySelectorAll('tr')
        const lastRow = rows[rows.length - 1]
        const cells = lastRow.querySelectorAll('td, th')
        const lastCell = cells[cells.length - 1]

        const pos = view.posAtDOM(lastCell, 0) + 1
        editor.chain().focus().setTextSelection(pos).addRowAfter().run()
    }

    const appendColumn = () => {
        if (!editor) return
        const { state, view } = editor
        const { selection } = state
        const domAtPos = view.domAtPos(selection.from)
        const node = domAtPos.node instanceof Element ? domAtPos.node : domAtPos.node.parentElement
        const tableDom = node?.closest('table')
        if (!tableDom) return

        const rows = tableDom.querySelectorAll('tr')
        const firstRow = rows[0]
        const cells = firstRow.querySelectorAll('td, th')
        const lastCell = cells[cells.length - 1]

        const pos = view.posAtDOM(lastCell, 0) + 1
        editor.chain().focus().setTextSelection(pos).addColumnAfter().run()
    }

    const getMenuStyles = () => {
        if (!tableBounds) return {}
        const menuWidth = 240
        const menuHeight = 460
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        const anchorTop = menuAnchor?.top ?? tableBounds.cellTop
        const anchorLeft = menuAnchor?.left ?? tableBounds.cellLeft
        const anchorWidth = menuAnchor?.width ?? tableBounds.cellWidth
        const anchorHeight = menuAnchor?.height ?? tableBounds.cellHeight

        let top = anchorTop + anchorHeight + 8
        let left = anchorLeft + anchorWidth + 8

        if (menuType === 'column') {
            const wouldBeOffScreenTop = (anchorTop - 12 - menuHeight) < 80
            if (wouldBeOffScreenTop) {
                top = anchorTop + anchorHeight + 8
            } else {
                top = anchorTop - menuHeight - 12
            }
            left = anchorLeft
        } else if (menuType === 'row') {
            top = anchorTop
            left = anchorLeft - menuWidth - 8
            if (left < 16) {
                left = anchorLeft + anchorWidth + 8
            }
        } else if (menuType === 'cell') {
            top = anchorTop
            left = anchorLeft + anchorWidth + 8
            if (left + menuWidth > viewportWidth - 16) {
                left = anchorLeft - menuWidth - 8
            }
        }

        if (left + menuWidth > viewportWidth - 16) {
            left = viewportWidth - menuWidth - 16
        }
        if (left < 16) left = 16

        if (top + menuHeight > viewportHeight - 16) {
            if (menuType === 'cell' || menuType === 'row' || menuType === 'column') {
                top = anchorTop - menuHeight - 8
            } else {
                top = viewportHeight - menuHeight - 16
            }
        }

        if (top < 72) top = 72

        return { top, left }
    }

    return (
        <div ref={containerRef} className="absolute inset-0 pointer-events-none z-[55]">
            {tableBounds && (
                <>
                    {/* Column handle */}
                    <div
                        className="pointer-events-auto absolute group flex flex-col items-center"
                        style={{
                            top: tableBounds.top - 20,
                            left: tableBounds.cellLeft,
                            width: tableBounds.cellWidth,
                        }}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); openMenu('column', e.currentTarget); }}
                            className="h-4 w-full bg-[var(--app-bg-elevated)] border-x border-t border-[var(--app-border)] hover:bg-[var(--app-accent)] hover:border-[var(--app-accent)] transition-all rounded-t-sm flex items-center justify-center opacity-40 group-hover:opacity-100"
                        >
                            <div className="w-4 h-0.5 bg-[var(--app-text-muted)] rounded-full group-hover:bg-[var(--app-accent-text)]" />
                        </button>
                    </div>

                    {/* Row handle */}
                    <div
                        className="pointer-events-auto absolute group flex items-start"
                        style={{
                            top: tableBounds.cellTop,
                            left: tableBounds.left - 20,
                            height: tableBounds.cellHeight,
                        }}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); openMenu('row', e.currentTarget); }}
                            className="w-4 h-full bg-[var(--app-bg-elevated)] border-y border-l border-[var(--app-border)] hover:bg-[var(--app-accent)] hover:border-[var(--app-accent)] transition-all rounded-l-sm flex items-center justify-center opacity-40 group-hover:opacity-100"
                        >
                            <div className="w-0.5 h-4 bg-[var(--app-text-muted)] rounded-full group-hover:bg-[var(--app-accent-text)]" />
                        </button>
                    </div>

                    {/* Cell handle (4-dot) */}
                    <button
                        onClick={(e) => { e.stopPropagation(); openMenu('cell', e.currentTarget); }}
                        className="pointer-events-auto absolute h-5 w-5 rounded-full bg-[var(--app-accent)] text-[var(--app-accent-text)] flex items-center justify-center shadow-lg hover:scale-110 transition-transform opacity-100 z-[56]"
                        style={{
                            top: tableBounds.cellTop + tableBounds.cellHeight / 2,
                            left: tableBounds.cellLeft + tableBounds.cellWidth,
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        <Layout size={10} fill="currentColor" />
                    </button>

                    {/* UNIFIED ADD BAR ON THE RIGHT (Vertical) */}
                    <button
                        onClick={() => appendColumn()}
                        className="pointer-events-auto absolute w-1.5 rounded-full bg-[var(--app-accent)] opacity-0 hover:opacity-40 transition-opacity flex items-center justify-center group/add-bar cursor-pointer"
                        style={{
                            top: tableBounds.top,
                            left: tableBounds.left + tableBounds.width + 18,
                            height: tableBounds.height,
                        }}
                    >
                        <div className="flex h-6 w-6 rounded-full bg-[var(--app-accent)] text-white items-center justify-center shadow-lg transition-transform hover:scale-110 opacity-0 group-hover/add-bar:opacity-100">
                            <Plus size={14} />
                        </div>
                    </button>

                    {/* UNIFIED ADD BAR BELOW (Horizontal) */}
                    <button
                        onClick={() => appendRow()}
                        className="pointer-events-auto absolute h-1.5 rounded-full bg-[var(--app-accent)] opacity-0 hover:opacity-40 transition-opacity flex items-center justify-center group/add-bar cursor-pointer"
                        style={{
                            top: tableBounds.top + tableBounds.height + 12,
                            left: tableBounds.left,
                            width: tableBounds.width,
                        }}
                    >
                        <div className="flex h-6 w-6 rounded-full bg-[var(--app-accent)] text-white items-center justify-center shadow-lg transition-transform hover:scale-110 opacity-0 group-hover/add-bar:opacity-100">
                            <Plus size={14} />
                        </div>
                    </button>

                    {isMenuOpen && (
                        <div
                            ref={menuRef}
                            className="pointer-events-auto absolute z-[60] w-[240px] rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-2xl p-2 animate-in fade-in zoom-in duration-150"
                            style={getMenuStyles()}
                        >
                            <div className="space-y-1">
                                {menuType === 'column' && (
                                    <>
                                        <button onClick={() => { editor.chain().focus().toggleHeaderColumn().run(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]">Header column</button>
                                        <button onClick={() => sortColumn(false)} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]">Sort A-Z</button>
                                        <button onClick={() => sortColumn(true)} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]">Sort Z-A</button>
                                        <button onClick={() => { editor.chain().focus().addColumnBefore().run(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] flex items-center gap-2"><Plus size={14} /> Wstaw po lewej</button>
                                        <button onClick={() => { editor.chain().focus().addColumnAfter().run(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] flex items-center gap-2"><Plus size={14} /> Wstaw po prawej</button>
                                        <button onClick={duplicateColumn} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]">Duplicate column</button>
                                        <div className="h-px bg-[var(--app-border)] my-1" />
                                        <button onClick={() => { editor.chain().focus().deleteColumn().run(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Minus size={14} /> Usuń kolumnę</button>
                                    </>
                                )}

                                {menuType === 'row' && (
                                    <>
                                        <button onClick={() => { editor.chain().focus().toggleHeaderRow().run(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]">Header row</button>
                                        <button onClick={() => sortRow(false)} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]">Sort A-Z</button>
                                        <button onClick={() => sortRow(true)} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]">Sort Z-A</button>
                                        <button onClick={() => { editor.chain().focus().addRowBefore().run(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] flex items-center gap-2"><Plus size={14} /> Wstaw powyżej</button>
                                        <button onClick={() => { editor.chain().focus().addRowAfter().run(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] flex items-center gap-2"><Plus size={14} /> Wstaw poniżej</button>
                                        <button onClick={duplicateRow} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]">Duplicate row</button>
                                        <div className="h-px bg-[var(--app-border)] my-1" />
                                        <button onClick={() => { editor.chain().focus().deleteRow().run(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Minus size={14} /> Usuń wiersz</button>
                                    </>
                                )}

                                {menuType === 'cell' && (
                                    <>
                                        <button onClick={() => setActiveSubMenu('color')} className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between ${activeSubMenu === 'color' ? 'bg-[var(--app-bg-elevated)] text-[var(--app-text-primary)]' : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}>
                                            <div className="flex items-center gap-2"><Palette size={14} /> Kolor</div>
                                            <ChevronRight size={14} className="opacity-50" />
                                        </button>
                                        <button onClick={() => setActiveSubMenu('align')} className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between ${activeSubMenu === 'align' ? 'bg-[var(--app-bg-elevated)] text-[var(--app-text-primary)]' : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}>
                                            <div className="flex items-center gap-2"><Layout size={14} /> Wyrównanie</div>
                                            <ChevronRight size={14} className="opacity-50" />
                                        </button>
                                        <button onClick={clearCell} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] flex items-center gap-2"><Eraser size={14} /> Wyczyść zawartość</button>
                                    </>
                                )}

                                {(menuType === 'column' || menuType === 'row') && (
                                    <>
                                        <button onClick={() => setActiveSubMenu('color')} className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between ${activeSubMenu === 'color' ? 'bg-[var(--app-bg-elevated)] text-[var(--app-text-primary)]' : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}>
                                            <div className="flex items-center gap-2"><Palette size={14} /> Kolor</div>
                                            <ChevronRight size={14} className="opacity-50" />
                                        </button>
                                        <button onClick={() => setActiveSubMenu('align')} className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between ${activeSubMenu === 'align' ? 'bg-[var(--app-bg-elevated)] text-[var(--app-text-primary)]' : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}>
                                            <div className="flex items-center gap-2"><Layout size={14} /> Wyrównanie</div>
                                            <ChevronRight size={14} className="opacity-50" />
                                        </button>
                                        <button onClick={clearCell} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] flex items-center gap-2"><Eraser size={14} /> Wyczyść zawartość</button>
                                    </>
                                )}
                            </div>

                            {(menuType === 'cell' || menuType === 'column' || menuType === 'row') && activeSubMenu === 'color' && (
                                <div className="absolute top-0 left-[calc(100%+8px)] w-[250px] rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-2xl p-2 animate-in fade-in zoom-in duration-150">
                                    <div className="flex items-center gap-1 mb-2">
                                        <button onClick={() => setActiveColorLayer('text')} className={`px-2 py-1 rounded-md text-xs ${activeColorLayer === 'text' ? 'bg-[var(--app-bg-elevated)] text-[var(--app-text-primary)]' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'}`}>Kolor tekstu</button>
                                        <button onClick={() => setActiveColorLayer('background')} className={`px-2 py-1 rounded-md text-xs ${activeColorLayer === 'background' ? 'bg-[var(--app-bg-elevated)] text-[var(--app-text-primary)]' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'}`}>Kolor pola</button>
                                    </div>
                                    <div className="space-y-1 overflow-y-auto max-h-[300px] custom-scrollbar">
                                        {(activeColorLayer === 'text' ? textColors : backgroundColors).map((c) => (
                                            <button
                                                key={c.label}
                                                onClick={() => activeColorLayer === 'text' ? applyCellColor('text', c.value) : applyCellColor('background', c.value)}
                                                className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] flex items-center gap-2"
                                            >
                                                <div className="w-4 h-4 rounded-sm border border-white/10" style={{ background: c.color }} />
                                                {c.label}
                                            </button>
                                        ))}
                                        <div className="h-px bg-[var(--app-border)] my-1" />
                                        <button
                                            onClick={() => {
                                                const input = document.createElement('input')
                                                input.type = 'color'
                                                input.onchange = (e) => {
                                                    const color = (e.target as HTMLInputElement).value
                                                    if (activeColorLayer === 'text') applyCellColor('text', color)
                                                    else applyCellColor('background', color)
                                                }
                                                input.click()
                                            }}
                                            className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] flex items-center gap-2"
                                        >
                                            <div className="w-4 h-4 rounded-sm border border-white/10 bg-gradient-to-tr from-red-500 via-green-500 to-blue-500" />
                                            Własny kolor...
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(menuType === 'cell' || menuType === 'column' || menuType === 'row') && activeSubMenu === 'align' && (
                                <div className="absolute top-0 left-[calc(100%+8px)] w-[220px] rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-2xl p-2 animate-in fade-in zoom-in duration-150">
                                    <div className="space-y-1">
                                        <button onClick={() => setCellAlignment('top')} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]">Do góry</button>
                                        <button onClick={() => setCellAlignment('middle')} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]">Do środka</button>
                                        <button onClick={() => setCellAlignment('bottom')} className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]">Do dołu</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
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
    const [showTableGrid, setShowTableGrid] = useState(false)
    if (!editor) return null

    const runSlashAction = (action: () => void) => {
        const { from } = editor.state.selection
        const textBefore = editor.state.doc.textBetween(editor.state.selection.$from.start(), from, '\n', '\0')
        const match = textBefore.match(/\/[^\s]*$/)
        if (match) {
            const slashFrom = from - match[0].length
            editor.chain().focus().deleteRange({ from: slashFrom, to: from }).run()
        }
        action()
    }

    if (showTableGrid) {
        return (
            <FloatingMenu
                editor={editor}
                shouldShow={() => true}
                options={{ placement: 'bottom-start' }}
            >
                <TableGridSelector
                    onSelect={(rows, cols) => {
                        runSlashAction(() => {
                            editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
                        })
                        setShowTableGrid(false)
                    }}
                />
            </FloatingMenu>
        )
    }

    const setLink = () => {
        const url = window.prompt('URL:')
        if (!url) return
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }

    const addImage = () => onInsertImage()

    const addVideo = () => onInsertVideo()

    const insertCodeBlockSmart = () => {
        const inTaskList = editor.isActive('taskList')
        const inAnyList = inTaskList || editor.isActive('orderedList') || editor.isActive('bulletList')
        if (!inAnyList) {
            editor.chain().focus().setCodeBlock().run()
            return
        }
        const itemType = inTaskList ? 'taskItem' : 'listItem'
        const splitAndLiftDone = editor.chain().focus().splitListItem(itemType).liftListItem(itemType).setCodeBlock().run()
        if (!splitAndLiftDone) {
            editor.chain().focus().liftListItem(itemType).setCodeBlock().run()
        }
    }

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
                    description: 'Wstaw tabelę z siatki',
                    icon: <TableIcon size={16} />,
                    color: 'bg-indigo-500/10 text-indigo-500',
                    action: () => {
                        // This will be handled by a special state in FloatingMenuBar to show TableGridSelector
                        setShowTableGrid(true)
                    },
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
                    action: insertCodeBlockSmart,
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
                const lineBefore = state.doc.textBetween(Math.max(0, from - 200), from, '\n', '\0')
                const inCurrentBlock = state.doc.textBetween(state.selection.$from.start(), from, '\n', '\0')
                return /\/[^\s]*$/.test(inCurrentBlock) || /\/[^\s]*$/.test(lineBefore)
            }}
            options={{ placement: 'bottom-start' }}
            className="flex flex-col bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl shadow-2xl w-[260px] max-h-[420px] overflow-y-auto py-1.5"
        >
            {groups.map((group, gi) => (
                <div key={gi}>
                    {gi > 0 && <div className="w-full h-px bg-[var(--app-border)] my-1" />}
                    <div className="px-3 pt-1.5 pb-0.5 text-[10px] uppercase tracking-wider font-semibold text-[var(--app-text-muted)]">
                        {group.heading}
                    </div>
                    {group.items.map((item, ii) => (
                        <button
                            key={ii}
                            onClick={() => runSlashAction(item.action)}
                            className="flex items-center gap-2.5 w-full px-2 py-1.5 hover:bg-[var(--app-bg-card)] transition-colors text-left rounded-lg mx-1 group"
                            style={{ width: 'calc(100% - 8px)' }}
                        >
                            <div className={`w-8 h-8 shrink-0 rounded-md flex items-center justify-center ${item.color}`}>
                                {item.icon}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium text-[var(--app-text-primary)] leading-tight">{item.label}</span>
                                <span className="text-[11px] text-[var(--app-text-secondary)] leading-tight">{item.description}</span>
                            </div>
                        </button>
                    ))}
                </div>
            ))}
        </FloatingMenu>
    )
}

export function TiptapEditor({
    content,
    onChange,
    editable = true,
    onCharacterCountChange,
    onEditorActionsChange,
    documentId,
    user,
    onCollaboratorsChange
}: TiptapEditorProps) {
    const [mediaToast, setMediaToast] = useState<{
        open: boolean
        type: MediaInsertType
        value: string
        error?: string
    }>({ open: false, type: 'image', value: '' })
    const [headings, setHeadings] = useState<TocHeading[]>([])
    const [showTocPreview, setShowTocPreview] = useState(false)
    const [provider, setProvider] = useState<SupabaseYjsProvider | null>(null)

    // Setup Collaboration Document
    useEffect(() => {
        if (!documentId || !user) return

        const ydoc = new Y.Doc()
        const providerInstance = new SupabaseYjsProvider(ydoc, supabase, `document_${documentId}`, user)
        setProvider(providerInstance)

        providerInstance.awareness.on('update', () => {
            if (onCollaboratorsChange) {
                const states = Array.from(providerInstance.awareness.getStates().values())
                const activeUsers: any[] = []
                states.forEach((state: any) => {
                    if (state.user && state.user.name) {
                        activeUsers.push(state.user)
                    }
                })
                // Deduplicate by name or ID if multiple tabs open
                const uniqueUsers = Array.from(new Map(activeUsers.map(u => [u.name, u])).values())
                onCollaboratorsChange(uniqueUsers)
            }
        })

        return () => {
            providerInstance.disconnect()
            ydoc.destroy()
        }
    }, [documentId, user?.id])

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
                    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') return ''
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
            SuperscriptExtension,
            SubscriptExtension,
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
            CustomTableHeader,
            CustomTableCell,
            Youtube.configure({
                HTMLAttributes: {
                    class: 'w-full aspect-video rounded-lg my-4',
                },
            }),
            DragHandle.configure({
                render: () => {
                    const element = document.createElement('div')
                    element.classList.add('custom-drag-handle')
                    element.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grip-vertical"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>`
                    return element
                },
            }),
            ...(provider ? [
                Collaboration.configure({
                    document: provider.doc,
                }),
                CollaborationCursor.configure({
                    provider: provider as any,
                    user: {
                        name: user?.name || 'Anonymous',
                        color: provider.awareness.getLocalState()?.user?.color || '#fef08a',
                        avatarUrl: user?.image
                    },
                }),
            ] : []),
        ],
        // Do not pass initial content directly to editor when using Yjs to avoid overrides
        content: provider ? undefined : (content || ''),
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
            <div className="flex-1 overflow-auto bg-[var(--app-bg-page)] px-4 md:px-8 py-8 relative">
                <div className="mx-auto w-full max-w-6xl h-full flex items-start gap-4 xl:gap-8">
                    {/* Main Editor Container */}
                    <div className="flex-1 min-w-0 h-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-[var(--app-shadow-card)] overflow-hidden">
                        <div className="h-full">
                            <div className="flex-1 min-w-0">
                                <BubbleMenuBar editor={editor} />
                                <TableOverlayControls editor={editor} />
                                <FloatingMenuBar editor={editor} onInsertImage={addImage} onInsertVideo={addVideo} />
                                <EditorContent editor={editor} />
                            </div>
                        </div>
                    </div>

                    {/* Fixed ToC on the right edge */}
                    <div
                        className="hidden lg:flex w-8 xl:w-12 flex-col items-center pt-8 shrink-0 relative z-30"
                        onMouseEnter={() => setShowTocPreview(true)}
                        onMouseLeave={() => setShowTocPreview(false)}
                    >
                        <div className="space-y-3">
                            {headings.length === 0 ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <div key={i} className="h-[2px] w-6 xl:w-7 rounded bg-[var(--app-text-secondary)]/55" />
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
                                            style={{ width: `${Math.max(12, 28 - (h.level - 1) * 6)}px` }}
                                        />
                                    </button>
                                ))
                            )}
                        </div>
                        {showTocPreview && headings.length > 0 && (
                            <div className="absolute right-10 xl:right-14 top-8 z-20 w-64 p-1">
                                <div className="space-y-0.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-[var(--app-shadow-card)] p-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                    <div className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider mb-2 px-3">
                                        Spis treści
                                    </div>
                                    {headings.map((h, i) => {
                                        let textSize = 'text-sm font-normal';
                                        if (h.level === 1) textSize = 'text-sm font-bold text-[var(--app-text-primary)] tracking-tight';
                                        else if (h.level === 2) textSize = 'text-xs font-semibold text-[var(--app-text-primary)]';
                                        else if (h.level === 3) textSize = 'text-[11px] font-medium text-[var(--app-text-secondary)]';
                                        else textSize = 'text-[10px] font-normal text-[var(--app-text-secondary)] opacity-90';

                                        return (
                                            <button
                                                key={`toc-preview-${h.id}-${h.pos}-${i}`}
                                                onClick={() => editor.chain().focus().setTextSelection(h.pos + 1).scrollIntoView().run()}
                                                className="w-full rounded-md px-3 py-1 text-left hover:bg-[var(--app-bg-elevated)] transition-colors"
                                                style={{ paddingLeft: `${12 + (h.level - 1) * 8}px` }}
                                            >
                                                <span className={`truncate block leading-tight ${textSize}`}>{h.text}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
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
