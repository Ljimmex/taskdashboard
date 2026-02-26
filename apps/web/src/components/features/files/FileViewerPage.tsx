import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { apiFetch, apiFetchJson } from '@/lib/api'
import { useTranslation } from 'react-i18next'
import {
    X, ZoomIn, ZoomOut,
    Save, MessageSquare, Send, Check,
    Trash2, RotateCcw, Download, Loader2,
    Columns2, Rows2, GalleryVerticalEnd, MessageCircle,
    ChevronLeft, ChevronRight, Maximize2, Minimize2, Star,
    MousePointer, Hand, StickyNote, Highlighter, Type, Pencil,
    Undo2, Redo2, Eraser, FileEdit, Link, Bold, Italic, TypeOutline
} from 'lucide-react'
import { format } from 'date-fns'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface FileViewerProps {
    fileId: string
    onClose: () => void
}

interface Annotation {
    id: string
    fileId: string
    userId: string
    pageNumber: number | null
    positionX: number | null
    positionY: number | null
    content: string
    type: string
    parentId: string | null
    resolved: boolean
    createdAt: string
    updatedAt: string
    user: { id: string; name: string; image: string | null }
    replies?: Annotation[]
}

type LayoutMode = 'single' | 'double'

// Drawing stroke data
interface DrawStroke {
    points: { x: number; y: number }[]
    color: string
    width: number
    tool: 'pencil' | 'highlight' | 'eraser'
    opacity?: number
    blendMode?: string
}

interface TextHighlight {
    id: string
    pageNumber: number
    rects: { x: number; y: number; width: number; height: number; text: string }[]
    color: string
}

interface DocumentLink {
    id: string
    pageNumber: number
    rects: { x: number; y: number; width: number; height: number; text: string }[]
    type: 'website' | 'page'
    url?: string
    targetPage?: number
}

// Text annotation placed on page
interface TextOverlay {
    id: string
    x: number // percentage
    y: number // percentage
    text: string
    pageNumber: number
    fontFamily?: string
    fontSize?: number
    isBold?: boolean
    isItalic?: boolean
    color?: string
}

// =============================================================================
// CANVAS OVERLAY — for draw/highlight on each page
// =============================================================================

function CanvasOverlay({ pageNumber, activeTool, scale, strokes, onStrokeComplete, drawStyle, highlightStyle, eraserWidth }: {
    pageNumber: number
    activeTool: string
    scale: number
    strokes: DrawStroke[]
    onStrokeComplete: (pageNumber: number, stroke: DrawStroke) => void
    drawStyle: any
    highlightStyle: any
    eraserWidth: number
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDrawing = useRef(false)
    const currentPoints = useRef<{ x: number; y: number }[]>([])
    const parentRef = useRef<HTMLDivElement | null>(null)

    // Redraw all strokes whenever they change
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        strokes.forEach(stroke => {
            if (stroke.points.length < 2) return
            ctx.beginPath()
            ctx.strokeStyle = stroke.tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color
            ctx.lineWidth = stroke.width * scale
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'

            const defaultOpacity = stroke.tool === 'highlight' ? 0.3 : 1
            ctx.globalAlpha = stroke.opacity !== undefined ? stroke.opacity / 100 : defaultOpacity

            const defaultBlendMode = stroke.tool === 'highlight' ? 'multiply' : 'source-over'
            ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : (stroke.blendMode || defaultBlendMode) as any

            ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height)
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height)
            }
            ctx.stroke()
        })
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'
    }, [strokes, scale])

    // Resize canvas to match parent
    useEffect(() => {
        const canvas = canvasRef.current
        const parent = canvas?.parentElement
        if (!canvas || !parent) return
        parentRef.current = parent as HTMLDivElement

        const observer = new ResizeObserver(() => {
            canvas.width = parent.clientWidth
            canvas.height = parent.clientHeight
        })
        observer.observe(parent)
        canvas.width = parent.clientWidth
        canvas.height = parent.clientHeight

        return () => observer.disconnect()
    }, [])

    const getPos = (e: React.MouseEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }
        const rect = canvas.getBoundingClientRect()
        return {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height,
        }
    }

    const isDrawTool = activeTool === 'pencil' || activeTool === 'highlight' || activeTool === 'eraser'

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isDrawTool) return
        e.preventDefault()
        e.stopPropagation()
        isDrawing.current = true
        currentPoints.current = [getPos(e)]
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing.current || !isDrawTool) return
        e.preventDefault()
        const pos = getPos(e)
        currentPoints.current.push(pos)

        // Live preview
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx || currentPoints.current.length < 2) return

        const pts = currentPoints.current
        const prev = pts[pts.length - 2]
        const curr = pts[pts.length - 1]

        const style = activeTool === 'highlight' ? highlightStyle : drawStyle
        const isEraser = activeTool === 'eraser'

        ctx.beginPath()
        ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : style.color
        ctx.lineWidth = (isEraser ? eraserWidth : style.width) * scale
        ctx.lineCap = 'round'

        ctx.globalAlpha = isEraser ? 1 : (style.opacity / 100)
        ctx.globalCompositeOperation = isEraser ? 'destination-out' : style.blendMode

        ctx.moveTo(prev.x * canvas.width, prev.y * canvas.height)
        ctx.lineTo(curr.x * canvas.width, curr.y * canvas.height)
        ctx.stroke()

        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'
    }

    const handleMouseUp = () => {
        if (!isDrawing.current) return
        isDrawing.current = false
        if (currentPoints.current.length > 1) {
            const style = activeTool === 'highlight' ? highlightStyle : drawStyle
            onStrokeComplete(pageNumber, {
                points: [...currentPoints.current],
                color: activeTool === 'eraser' ? '#000' : style.color,
                width: activeTool === 'eraser' ? eraserWidth : style.width,
                opacity: activeTool === 'eraser' ? 100 : style.opacity,
                blendMode: activeTool === 'eraser' ? 'destination-out' : style.blendMode,
                tool: activeTool as 'pencil' | 'highlight' | 'eraser',
            })
        }
        currentPoints.current = []
    }

    const isEraser = activeTool === 'eraser'
    const actualEraserSize = Math.max(10, eraserWidth * scale)
    const eraserCursorSize = Math.min(125, actualEraserSize)
    const radius = Math.max(1, eraserCursorSize / 2 - 1)
    const eraserCursorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${eraserCursorSize}" height="${eraserCursorSize}" viewBox="0 0 ${eraserCursorSize} ${eraserCursorSize}"><circle cx="${eraserCursorSize / 2}" cy="${eraserCursorSize / 2}" r="${radius}" fill="none" stroke="black" stroke-width="2"/><circle cx="${eraserCursorSize / 2}" cy="${eraserCursorSize / 2}" r="${radius}" fill="white" fill-opacity="0.5" stroke="white" stroke-width="1"/></svg>`
    const eraserCursorUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(eraserCursorSvg)}") ${eraserCursorSize / 2} ${eraserCursorSize / 2}, crosshair`
    const cursorStyle = isEraser ? eraserCursorUrl : 'crosshair'

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 z-10 ${!isDrawTool ? 'pointer-events-none' : ''}`}
            style={{ cursor: cursorStyle }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        />
    )
}

// =============================================================================
// PAGE THUMBNAILS SIDEBAR (LEFT) — floating, no border
// =============================================================================

function PageThumbnails({ previewUrl, numPages, currentPage, onPageClick, onClose, layoutMode }: {
    previewUrl: string
    numPages: number
    currentPage: number
    onPageClick: (page: number) => void
    onClose: () => void
    layoutMode: LayoutMode
}) {
    const { t } = useTranslation()
    const thumbRefs = useRef<(HTMLDivElement | null)[]>([])

    useEffect(() => {
        const idx = layoutMode === 'double' ? Math.floor((currentPage - 1) / 2) : currentPage - 1
        const el = thumbRefs.current[idx]
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, [currentPage, layoutMode])

    const pageGroups: number[][] = []
    if (layoutMode === 'double') {
        for (let i = 0; i < numPages; i += 2) {
            const group = [i + 1]
            if (i + 2 <= numPages) group.push(i + 2)
            pageGroups.push(group)
        }
    } else {
        for (let i = 0; i < numPages; i++) pageGroups.push([i + 1])
    }

    return (
        <div className="absolute top-3 left-3 bottom-20 w-[170px] z-30 bg-[#1a1d2e]/95 backdrop-blur-md rounded-xl flex flex-col min-h-0 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t('files.viewer.thumbnails', 'Thumbnails')}
                </span>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
            <div className="flex-1 overflow-auto py-2 px-2 space-y-2">
                <Document file={previewUrl} loading={null}>
                    {pageGroups.map((group, gIdx) => {
                        const isActive = group.includes(currentPage)
                        return (
                            <div
                                key={gIdx}
                                ref={el => { thumbRefs.current[gIdx] = el }}
                                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:border-amber-400/40 ${isActive
                                    ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                                    : 'border-transparent opacity-60 hover:opacity-100'
                                    }`}
                                onClick={() => onPageClick(group[0])}
                            >
                                <div className={`flex ${layoutMode === 'double' ? 'gap-0.5' : ''}`}>
                                    {group.map(pageNum => (
                                        <Page
                                            key={pageNum}
                                            pageNumber={pageNum}
                                            width={layoutMode === 'double' ? 72 : 148}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                        />
                                    ))}
                                </div>
                                <div className={`absolute bottom-0 inset-x-0 text-center text-[10px] py-0.5 font-medium ${isActive ? 'bg-amber-500 text-black' : 'bg-black/60 text-gray-400'
                                    }`}>
                                    {group.length > 1 ? `${group[0]}-${group[1]}` : group[0]}
                                </div>
                            </div>
                        )
                    })}
                </Document>
            </div>
        </div>
    )
}

// =============================================================================
// COMMENTS SIDEBAR (RIGHT) — floating, no border
// =============================================================================

function CommentsSidebar({ annotations, onClose, onDeleteAnnotation, onResolveAnnotation, onReplyAnnotation, scrollToPage, newCommentPos, newCommentText, onNewCommentTextChange, onSubmitComment, onCancelComment }: {
    annotations: Annotation[]
    onClose: () => void
    onDeleteAnnotation: (id: string) => void
    onResolveAnnotation: (id: string, resolved: boolean) => void
    onReplyAnnotation: (parentId: string, content: string) => void
    scrollToPage: (page: number) => void
    newCommentPos: { page: number; x: number; y: number } | null
    newCommentText: string
    onNewCommentTextChange: (text: string) => void
    onSubmitComment: () => void
    onCancelComment: () => void
}) {
    const { t } = useTranslation()
    const [replyingTo, setReplyingTo] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')

    const handleSubmitReply = (parentId: string) => {
        if (!replyText.trim()) return
        onReplyAnnotation(parentId, replyText.trim())
        setReplyingTo(null)
        setReplyText('')
    }

    const topLevel = annotations.filter(a => !a.parentId)

    return (
        <div className="absolute top-3 right-3 bottom-20 w-[280px] z-30 bg-[#1a1d2e]/95 backdrop-blur-md rounded-xl flex flex-col min-h-0 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t('files.viewer.comments', 'Comments')}
                </span>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            {newCommentPos && (
                <div className="p-3 border-b border-white/5 bg-white/3">
                    <p className="text-[11px] text-gray-400 mb-2">
                        {t('files.viewer.new_comment_on_page', 'Comment on page')} {newCommentPos.page}
                    </p>
                    <textarea
                        value={newCommentText}
                        onChange={e => onNewCommentTextChange(e.target.value)}
                        placeholder={t('files.viewer.type_comment', 'Type your comment...') as string}
                        className="w-full bg-[#0f1019] border border-white/10 rounded-lg p-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500"
                        rows={3}
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <button onClick={onCancelComment} className="px-2.5 py-1 text-xs text-gray-400 hover:text-white rounded-md hover:bg-white/5 transition-colors">
                            {t('common.cancel', 'Cancel')}
                        </button>
                        <button onClick={onSubmitComment} disabled={!newCommentText.trim()}
                            className="px-2.5 py-1 text-xs bg-amber-500 text-black font-medium rounded-md hover:bg-amber-400 disabled:opacity-40 transition-colors flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            {t('common.send', 'Send')}
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-auto">
                {topLevel.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                        <Star className="h-10 w-10 text-gray-700 mb-3" />
                        <p className="text-sm text-gray-500">{t('files.viewer.no_comments', 'No comments yet.')}</p>
                    </div>
                ) : (
                    topLevel.map(ann => (
                        <div key={ann.id} className={`p-3 border-b border-white/5 hover:bg-white/3 transition-colors ${ann.resolved ? 'opacity-50' : ''}`}>
                            <div className="flex items-start gap-2">
                                {ann.user?.image ? (
                                    <img src={ann.user.image} alt={ann.user.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                        {ann.user?.name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-white truncate">{ann.user?.name || 'Unknown'}</span>
                                        <div className="flex items-center gap-0.5">
                                            {ann.pageNumber && (
                                                <span className="text-[10px] text-amber-400 cursor-pointer hover:underline mr-1" onClick={() => scrollToPage(ann.pageNumber!)}>
                                                    p.{ann.pageNumber}
                                                </span>
                                            )}
                                            <button onClick={() => onResolveAnnotation(ann.id, !ann.resolved)} className="p-0.5 hover:bg-white/5 rounded">
                                                <Check className={`h-3 w-3 ${ann.resolved ? 'text-green-400' : 'text-gray-500'}`} />
                                            </button>
                                            <button onClick={() => onDeleteAnnotation(ann.id)} className="p-0.5 hover:bg-white/5 rounded">
                                                <Trash2 className="h-3 w-3 text-gray-500 hover:text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-300 mt-1 whitespace-pre-wrap">{ann.content}</p>
                                    <span className="text-[10px] text-gray-600 mt-1 block">
                                        {format(new Date(ann.createdAt), 'dd.MM.yyyy HH:mm')}
                                    </span>

                                    {ann.replies && ann.replies.length > 0 && (
                                        <div className="mt-2 pl-2 border-l-2 border-white/10 space-y-1.5">
                                            {ann.replies.map(reply => (
                                                <div key={reply.id} className="flex items-start gap-1.5">
                                                    {reply.user?.image ? (
                                                        <img src={reply.user.image} alt={reply.user.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
                                                            {reply.user?.name?.charAt(0)?.toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="text-[10px] font-medium text-gray-300">{reply.user?.name}</span>
                                                        <p className="text-[11px] text-gray-400">{reply.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {replyingTo === ann.id ? (
                                        <div className="mt-2 flex gap-1">
                                            <input
                                                value={replyText}
                                                onChange={e => setReplyText(e.target.value)}
                                                placeholder={t('files.viewer.reply', 'Reply...') as string}
                                                className="flex-1 bg-[#0f1019] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                autoFocus
                                                onKeyDown={e => e.key === 'Enter' && handleSubmitReply(ann.id)}
                                            />
                                            <button className="h-6 px-2 bg-amber-500 text-black text-xs rounded font-medium" onClick={() => handleSubmitReply(ann.id)}>
                                                <Send className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setReplyingTo(ann.id)} className="text-[10px] text-amber-400 hover:underline mt-1">
                                            {t('files.viewer.reply', 'Reply')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

// =============================================================================
// PDF VIEWER
// =============================================================================

function PdfViewer({ previewUrl, annotations, onAddAnnotation, onDeleteAnnotation, onResolveAnnotation, onReplyAnnotation, showThumbnails, setShowThumbnails, showComments, setShowComments }: {
    previewUrl: string
    annotations: Annotation[]
    onAddAnnotation: (data: { pageNumber: number; positionX: number; positionY: number; content: string }) => void
    onDeleteAnnotation: (id: string) => void
    onResolveAnnotation: (id: string, resolved: boolean) => void
    onReplyAnnotation: (parentId: string, content: string) => void
    showThumbnails: boolean
    setShowThumbnails: (v: boolean) => void
    showComments: boolean
    setShowComments: (v: boolean) => void
}) {
    const [numPages, setNumPages] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [scale, setScale] = useState(1.0)
    const [activeTool, setActiveTool] = useState<string>('cursor')
    const [newCommentPos, setNewCommentPos] = useState<{ page: number; x: number; y: number } | null>(null)
    const [newCommentText, setNewCommentText] = useState('')
    const [layoutMode, setLayoutMode] = useState<LayoutMode>('double')
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [pageStrokes, setPageStrokes] = useState<Record<number, DrawStroke[]>>({})
    const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([])
    const [editingTextId, setEditingTextId] = useState<string | null>(null)
    const [textStyle, setTextStyle] = useState({
        fontFamily: 'Helvetica',
        fontSize: 12,
        isBold: false,
        isItalic: false,
        color: '#000000'
    })

    // Extensibility tool states
    const [drawStyle, setDrawStyle] = useState({ color: '#3B82F6', width: 5, opacity: 100, blendMode: 'source-over' })
    const [highlightStyle, setHighlightStyle] = useState({ color: '#FBBF24', width: 30, opacity: 50, blendMode: 'multiply' })
    const [eraserWidth, setEraserWidth] = useState(20)
    const [textHighlights, setTextHighlights] = useState<TextHighlight[]>([])

    // Link Tool
    const [documentLinks, setDocumentLinks] = useState<DocumentLink[]>([])
    const [newLinkSelection, setNewLinkSelection] = useState<{ rects: any[], pageNum: number } | null>(null)
    const [linkModalType, setLinkModalType] = useState<'website' | 'page'>('website')
    const [linkModalValue, setLinkModalValue] = useState('')

    // Pan Tool
    const [isPanDragging, setIsPanDragging] = useState(false)
    const panStartRef = useRef<{ x: number, y: number, left: number, top: number } | null>(null)

    // History (Undo/Redo)
    type AppState = { strokes: Record<number, DrawStroke[]>, overlays: TextOverlay[], highlights: TextHighlight[], links: DocumentLink[] }
    const [history, setHistory] = useState<AppState[]>([])
    const [redoStack, setRedoStack] = useState<AppState[]>([])

    const saveHistoryState = () => {
        setHistory(prev => [...prev.slice(-49), { strokes: pageStrokes, overlays: textOverlays, highlights: textHighlights, links: documentLinks }])
        setRedoStack([])
    }

    const handleUndo = () => {
        if (history.length === 0) return
        const last = history[history.length - 1]
        setRedoStack(prev => [...prev, { strokes: pageStrokes, overlays: textOverlays, highlights: textHighlights, links: documentLinks }])
        setHistory(prev => prev.slice(0, -1))
        setPageStrokes(last.strokes)
        setTextOverlays(last.overlays)
        setTextHighlights(last.highlights)
        setDocumentLinks(last.links || [])
    }

    const handleRedo = () => {
        if (redoStack.length === 0) return
        const next = redoStack[redoStack.length - 1]
        setHistory(prev => [...prev, { strokes: pageStrokes, overlays: textOverlays, highlights: textHighlights, links: documentLinks }])
        setRedoStack(prev => prev.slice(0, -1))
        setPageStrokes(next.strokes)
        setTextOverlays(next.overlays)
        setTextHighlights(next.highlights)
        setDocumentLinks(next.links || [])
    }

    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const viewerRootRef = useRef<HTMLDivElement>(null)
    const pageRefs = useRef<(HTMLDivElement | null)[]>([])

    // Track current page from scroll
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container || numPages === 0) return
        const handleScroll = () => {
            const containerRect = container.getBoundingClientRect()
            const containerMid = containerRect.top + containerRect.height / 3
            let closestPage = 1
            let closestDist = Infinity
            for (let i = 0; i < numPages; i++) {
                const el = pageRefs.current[i]
                if (!el) continue
                const dist = Math.abs(el.getBoundingClientRect().top - containerMid)
                if (dist < closestDist) { closestDist = dist; closestPage = i + 1 }
            }
            setCurrentPage(closestPage)
        }
        container.addEventListener('scroll', handleScroll, { passive: true })
        return () => container.removeEventListener('scroll', handleScroll)
    }, [numPages])

    const scrollToPage = useCallback((page: number) => {
        const clamped = Math.max(1, Math.min(numPages, page))
        const el = pageRefs.current[clamped - 1]
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setCurrentPage(clamped)
    }, [numPages])

    const handlePageClick = (pageNum: number, e: React.MouseEvent<HTMLDivElement>) => {
        if (activeTool === 'comment') {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
            const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
            setNewCommentPos({ page: pageNum, x, y })
            if (!showComments) setShowComments(true)
        } else if (activeTool === 'text') {
            saveHistoryState()
            const rect = e.currentTarget.getBoundingClientRect()
            const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
            const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
            const id = `text-${Date.now()}`
            setTextOverlays(prev => [...prev, { id, x, y, text: '', pageNumber: pageNum, ...textStyle }])
            setEditingTextId(id)
        }
    }

    const handleSubmitComment = () => {
        if (!newCommentPos || !newCommentText.trim()) return
        onAddAnnotation({ pageNumber: newCommentPos.page, positionX: newCommentPos.x, positionY: newCommentPos.y, content: newCommentText.trim() })
        setNewCommentPos(null)
        setNewCommentText('')
    }

    const handleStrokeComplete = (pageNumber: number, stroke: DrawStroke) => {
        saveHistoryState()
        setPageStrokes(prev => ({
            ...prev,
            [pageNumber]: [...(prev[pageNumber] || []), stroke],
        }))
    }

    const handleTextChange = (id: string, text: string) => {
        setTextOverlays(prev => prev.map(t => t.id === id ? { ...t, text } : t))
    }

    const updateTextStyle = (updates: Partial<typeof textStyle>) => {
        setTextStyle(prev => ({ ...prev, ...updates }))
        if (editingTextId) {
            setTextOverlays(prev => prev.map(t => t.id === editingTextId ? { ...t, ...updates } : t))
        }
    }

    const handlePageSelection = (pageNum: number) => {
        if (activeTool !== 'text-highlight' && activeTool !== 'link') return
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') return

        const pageEl = pageRefs.current[pageNum - 1]
        if (!pageEl) return

        const pageRect = pageEl.getBoundingClientRect()
        const range = selection.getRangeAt(0)

        // Ensure range is inside pageRect approximately
        const r = range.getBoundingClientRect()
        if (r.left < pageRect.left || r.right > pageRect.right || r.top < pageRect.top || r.bottom > pageRect.bottom) return

        const rects = Array.from(range.getClientRects()).map(r => ({
            x: ((r.left - pageRect.left) / pageRect.width) * 100,
            y: ((r.top - pageRect.top) / pageRect.height) * 100,
            width: (r.width / pageRect.width) * 100,
            height: (r.height / pageRect.height) * 100,
            text: selection.toString()
        }))

        if (activeTool === 'text-highlight') {
            saveHistoryState()
            setTextHighlights(prev => [...prev, {
                id: `th-${Date.now()}`,
                pageNumber: pageNum,
                rects,
                color: highlightStyle.color
            }])
        } else if (activeTool === 'link') {
            setNewLinkSelection({ rects, pageNum })
            setLinkModalType('website')
            setLinkModalValue('')
        }

        selection.removeAllRanges()
    }

    const handleSaveLink = () => {
        if (!newLinkSelection || !linkModalValue.trim()) return
        saveHistoryState()
        setDocumentLinks(prev => [...prev, {
            id: `l-${Date.now()}`,
            pageNumber: newLinkSelection.pageNum,
            rects: newLinkSelection.rects,
            type: linkModalType,
            url: linkModalType === 'website' ? linkModalValue.trim() : undefined,
            targetPage: linkModalType === 'page' ? parseInt(linkModalValue.trim()) || 1 : undefined
        }])
        setNewLinkSelection(null)
        setLinkModalValue('')
    }

    const handlePanStart = (e: React.MouseEvent) => {
        if (activeTool !== 'hand') return
        setIsPanDragging(true)
        panStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            left: scrollContainerRef.current?.scrollLeft || 0,
            top: scrollContainerRef.current?.scrollTop || 0
        }
    }
    const handlePanMove = (e: React.MouseEvent) => {
        if (!isPanDragging || !panStartRef.current || !scrollContainerRef.current || activeTool !== 'hand') return
        const dx = e.clientX - panStartRef.current.x
        const dy = e.clientY - panStartRef.current.y
        scrollContainerRef.current.scrollLeft = panStartRef.current.left - dx
        scrollContainerRef.current.scrollTop = panStartRef.current.top - dy
    }
    const handlePanEnd = () => setIsPanDragging(false)

    // Fullscreen
    const toggleFullscreen = useCallback(() => {
        const el = viewerRootRef.current
        if (!el) return
        if (!document.fullscreenElement) {
            el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { })
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { })
        }
    }, [])

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener('fullscreenchange', handler)
        return () => document.removeEventListener('fullscreenchange', handler)
    }, [])

    const zoomIn = () => setScale(s => Math.min(3, +(s + 0.15).toFixed(2)))
    const zoomOut = () => setScale(s => Math.max(0.3, +(s - 0.15).toFixed(2)))

    const getPageAnnotations = (pageNum: number) => annotations.filter(a => a.pageNumber === pageNum)

    const getPageDisplay = () => {
        if (layoutMode === 'double') {
            const end = Math.min(numPages, currentPage + 1)
            return currentPage === end ? `${currentPage}` : `${currentPage}-${end}`
        }
        return `${currentPage}`
    }

    const prevPage = () => scrollToPage(layoutMode === 'double' ? Math.max(1, currentPage - 2) : Math.max(1, currentPage - 1))
    const nextPage = () => scrollToPage(layoutMode === 'double' ? Math.min(numPages, currentPage + 2) : Math.min(numPages, currentPage + 1))

    const cursorClass = activeTool === 'comment' || activeTool === 'pencil' || activeTool === 'highlight' || activeTool === 'eraser' ? 'cursor-crosshair'
        : activeTool === 'hand' ? 'cursor-grab active:cursor-grabbing'
            : activeTool === 'text' || activeTool === 'edit-text' || activeTool === 'text-highlight' || activeTool === 'link' ? 'cursor-text'
                : ''

    const toolbarItems = [
        { id: 'undo', icon: Undo2, label: 'Undo' },
        { id: 'redo', icon: Redo2, label: 'Redo' },
        { id: 'sep0', icon: null, label: '' },
        { id: 'cursor', icon: MousePointer, label: 'Select' },
        { id: 'hand', icon: Hand, label: 'Pan' },
        { id: 'sep1', icon: null, label: '' },
        { id: 'text', icon: Type, label: 'Text' },
        { id: 'edit-text', icon: FileEdit, label: 'Edit text' },
        { id: 'comment', icon: StickyNote, label: 'Comment' },
        { id: 'pencil', icon: Pencil, label: 'Draw' },
        { id: 'eraser', icon: Eraser, label: 'Eraser' },
        { id: 'highlight', icon: Highlighter, label: 'Draw High' },
        { id: 'text-highlight', icon: TypeOutline, label: 'Text High' },
        { id: 'sep2', icon: null, label: '' },
        { id: 'link', icon: Link, label: 'Link' },
        { id: 'layout', icon: layoutMode === 'single' ? Columns2 : Rows2, label: layoutMode === 'single' ? 'Two pages' : 'Single page' },
    ]

    return (
        <div ref={viewerRootRef} className="flex-1 flex flex-col min-h-0 relative bg-[#0c0e1a]">
            {activeTool === 'edit-text' && (
                <style>{`
                    .pdf-edit-text-mode .react-pdf__Page__textContent {
                        z-index: 20 !important;
                    }
                    .pdf-edit-text-mode .react-pdf__Page__textContent span {
                        border: 1px dashed rgba(59, 130, 246, 0.4) !important;
                        cursor: text !important;
                        border-radius: 2px;
                        transition: all 0.2s;
                        /* Make editable in webkit */
                        -webkit-user-modify: read-write !important;
                    }
                    .pdf-edit-text-mode .react-pdf__Page__textContent span:hover {
                        background-color: rgba(59, 130, 246, 0.1) !important;
                        border-color: rgba(59, 130, 246, 0.8) !important;
                    }
                    .pdf-edit-text-mode .react-pdf__Page__textContent span:focus {
                        outline: 2px solid #3b82f6 !important;
                        background-color: rgba(255, 255, 255, 0.9) !important;
                        color: black !important;
                    }
                `}</style>
            )}

            {(activeTool === 'pencil' || activeTool === 'highlight' || activeTool === 'eraser' || activeTool === 'hand') && (
                <style>{`
                    .react-pdf__Page__textContent {
                        pointer-events: none !important;
                        user-select: none !important;
                    }
                `}</style>
            )}

            {/* TOOL OPTIONS FLOATING PANELS */}
            {activeTool === 'pencil' && (
                <div className="absolute bottom-[5.5rem] left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-3 py-2 bg-[#1a1d2e]/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/5">
                    <div className="flex items-center gap-2 border-r border-white/10 pr-3">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Color</span>
                        <input type="color" value={drawStyle.color} onChange={e => setDrawStyle(s => ({ ...s, color: e.target.value }))} className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0" title="Stroke Color" />
                    </div>
                    <div className="flex items-center gap-2 border-r border-white/10 pr-3">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider w-10">Width <span className="text-white/70 ml-1">{drawStyle.width}</span></span>
                        <input type="range" min="1" max="50" value={drawStyle.width} onChange={e => setDrawStyle(s => ({ ...s, width: Number(e.target.value) }))} className="w-24 accent-amber-500 cursor-pointer" />
                    </div>
                    <div className="flex items-center gap-2 border-r border-white/10 pr-3">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider w-12">Opacity <span className="text-white/70 ml-1">{drawStyle.opacity}%</span></span>
                        <input type="range" min="10" max="100" step="5" value={drawStyle.opacity} onChange={e => setDrawStyle(s => ({ ...s, opacity: Number(e.target.value) }))} className="w-24 accent-amber-500 cursor-pointer" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Blend</span>
                        <select value={drawStyle.blendMode} onChange={e => setDrawStyle(s => ({ ...s, blendMode: e.target.value }))} className="bg-[#0c0e1a] text-gray-200 border border-white/10 rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer">
                            <option value="source-over">Normal</option>
                            <option value="multiply">Multiply</option>
                            <option value="screen">Screen</option>
                            <option value="overlay">Overlay</option>
                        </select>
                    </div>
                </div>
            )}

            {activeTool === 'highlight' && (
                <div className="absolute bottom-[5.5rem] left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-3 py-2 bg-[#1a1d2e]/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/5">
                    <div className="flex items-center gap-2 border-r border-white/10 pr-3">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Color</span>
                        <input type="color" value={highlightStyle.color} onChange={e => setHighlightStyle(s => ({ ...s, color: e.target.value }))} className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0" title="Highlight Color" />
                    </div>
                    <div className="flex items-center gap-2 border-r border-white/10 pr-3">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider w-10">Width <span className="text-white/70 ml-1">{highlightStyle.width}</span></span>
                        <input type="range" min="5" max="100" value={highlightStyle.width} onChange={e => setHighlightStyle(s => ({ ...s, width: Number(e.target.value) }))} className="w-24 accent-amber-500 cursor-pointer" />
                    </div>
                    <div className="flex items-center gap-2 border-r border-white/10 pr-3">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider w-12">Opacity <span className="text-white/70 ml-1">{highlightStyle.opacity}%</span></span>
                        <input type="range" min="10" max="100" step="5" value={highlightStyle.opacity} onChange={e => setHighlightStyle(s => ({ ...s, opacity: Number(e.target.value) }))} className="w-24 accent-amber-500 cursor-pointer" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Blend</span>
                        <select value={highlightStyle.blendMode} onChange={e => setHighlightStyle(s => ({ ...s, blendMode: e.target.value }))} className="bg-[#0c0e1a] text-gray-200 border border-white/10 rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer">
                            <option value="source-over">Normal</option>
                            <option value="multiply">Multiply</option>
                            <option value="screen">Screen</option>
                        </select>
                    </div>
                </div>
            )}

            {activeTool === 'eraser' && (
                <div className="absolute bottom-[5.5rem] left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 bg-[#1a1d2e]/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-white text-xs">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider w-16">Size <span className="text-white/70 ml-1">{eraserWidth}</span></span>
                    </div>
                    <div className="flex items-center gap-1">
                        <input type="range" min="10" max="125" value={eraserWidth} onChange={e => setEraserWidth(Number(e.target.value))} className="w-32 accent-amber-500 cursor-pointer" />
                    </div>
                </div>
            )}

            {activeTool === 'text-highlight' && (
                <div className="absolute bottom-[5.5rem] left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-3 py-2 bg-[#1a1d2e]/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/5">
                    <div className="flex items-center gap-2 pr-2 border-r border-white/10">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Color</span>
                        <input type="color" value={highlightStyle.color} onChange={e => setHighlightStyle(s => ({ ...s, color: e.target.value }))} className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0" title="Text Highlight Color" />
                    </div>
                    <div className="text-xs text-amber-400 font-medium tracking-wide">Select text to highlight</div>
                </div>
            )}

            {activeTool === 'link' && !newLinkSelection && (
                <div className="absolute bottom-[5.5rem] left-1/2 -translate-x-1/2 z-40 flex items-center px-4 py-2 bg-[#1a1d2e]/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/5">
                    <div className="text-xs text-amber-400 font-medium tracking-wide">Select text to add link</div>
                </div>
            )}

            {/* NEW LINK SELECTION MODAL */}
            {newLinkSelection && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#1a1d2e] rounded-xl shadow-2xl border border-white/10 w-[320px] overflow-hidden drop-shadow-2xl ring-1 ring-black/50">
                    <div className="px-4 py-3 bg-[#1e2235] border-b border-white/5 flex items-center justify-between">
                        <span className="text-sm font-semibold text-white tracking-wide">Link Settings</span>
                        <button onClick={() => setNewLinkSelection(null)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="p-4 space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-400 mb-1.5 block uppercase tracking-wider">Link To</label>
                            <div className="flex bg-[#0f1019] border border-white/5 rounded-lg p-1">
                                <button
                                    onClick={() => setLinkModalType('website')}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${linkModalType === 'website' ? 'bg-amber-500 text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                >
                                    {linkModalType === 'website' && <Check className="w-3.5 h-3.5 inline mr-1" />} Website
                                </button>
                                <button
                                    onClick={() => setLinkModalType('page')}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${linkModalType === 'page' ? 'bg-amber-500 text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                >
                                    {linkModalType === 'page' && <Check className="w-3.5 h-3.5 inline mr-1" />} Page
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-400 mb-1.5 block uppercase tracking-wider">
                                {linkModalType === 'website' ? 'URL Link' : 'Page Number'}
                            </label>
                            <input
                                type={linkModalType === 'website' ? 'url' : 'number'}
                                placeholder={linkModalType === 'website' ? 'www.example.com' : 'e.g. 2'}
                                value={linkModalValue}
                                onChange={e => setLinkModalValue(e.target.value)}
                                className="w-full bg-[#0f1019] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                                autoFocus
                                onKeyDown={e => {
                                    e.stopPropagation()
                                    if (e.key === 'Enter') handleSaveLink()
                                    if (e.key === 'Escape') setNewLinkSelection(null)
                                }}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setNewLinkSelection(null)} className="px-4 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-medium">Cancel</button>
                            <button onClick={handleSaveLink} className="px-4 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors shadow-sm">Save Link</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TEXT FORMATTING TOOLBAR */}
            {(editingTextId || activeTool === 'edit-text') && (
                <div className="absolute bottom-[5.5rem] left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-2 bg-[#1a1d2e]/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/5">
                    <div className="flex items-center gap-1 border-r border-white/10 pr-2">
                        <input type="color" value={textStyle.color} onChange={e => {
                            if (activeTool === 'edit-text') { document.execCommand('foreColor', false, e.target.value); setTextStyle(s => ({ ...s, color: e.target.value })) }
                            else updateTextStyle({ color: e.target.value })
                        }} className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0" title="Text Color" />
                    </div>
                    <div className="flex items-center gap-1 border-r border-white/10 pr-2">
                        <select value={textStyle.fontFamily} onChange={e => {
                            if (activeTool === 'edit-text') { document.execCommand('fontName', false, e.target.value); setTextStyle(s => ({ ...s, fontFamily: e.target.value })) }
                            else updateTextStyle({ fontFamily: e.target.value })
                        }} className="bg-[#0c0e1a] text-gray-200 border border-white/10 rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer">
                            <option value="Helvetica">Helvetica</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Courier">Courier</option>
                            <option value="Arial">Arial</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-1 border-r border-white/10 pr-2">
                        <select value={textStyle.fontSize} onChange={e => {
                            if (activeTool === 'edit-text') { document.execCommand('fontSize', false, "7"); setTextStyle(s => ({ ...s, fontSize: Number(e.target.value) })) }
                            else updateTextStyle({ fontSize: Number(e.target.value) })
                        }} className="bg-[#0c0e1a] text-gray-200 border border-white/10 rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer">
                            {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36].map(s => <option key={s} value={s}>{s} pt</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-1 border-r border-white/10 pr-2">
                        <button onClick={() => {
                            if (activeTool === 'edit-text') { document.execCommand('bold'); setTextStyle(s => ({ ...s, isBold: !s.isBold })) }
                            else updateTextStyle({ isBold: !textStyle.isBold })
                        }} className={`p-1 rounded ${textStyle.isBold ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                            <Bold className="h-4 w-4" />
                        </button>
                        <button onClick={() => {
                            if (activeTool === 'edit-text') { document.execCommand('italic'); setTextStyle(s => ({ ...s, isItalic: !s.isItalic })) }
                            else updateTextStyle({ isItalic: !textStyle.isItalic })
                        }} className={`p-1 rounded ${textStyle.isItalic ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                            <Italic className="h-4 w-4" />
                        </button>
                    </div>

                    {editingTextId ? (
                        <div className="flex items-center gap-2 pl-1">
                            <button onClick={() => {
                                saveHistoryState()
                                setTextOverlays(prev => prev.filter(t => t.id !== editingTextId))
                                setEditingTextId(null)
                            }} className="p-1 text-gray-400 hover:text-red-400 rounded hover:bg-white/5" title="Delete">
                                <Trash2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => setEditingTextId(null)} className="px-3 py-1 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => setEditingTextId(null)} className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors font-medium shadow-sm">
                                Save & Close
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 pl-1 text-xs text-gray-400">
                            (Select Native Text & Apply)
                        </div>
                    )}
                </div>
            )}

            {/* PDF scroll area */}
            <div
                ref={scrollContainerRef}
                className={`flex-1 overflow-auto ${cursorClass} ${activeTool === 'edit-text' ? 'pdf-edit-text-mode' : ''} ${activeTool === 'hand' ? 'select-none' : ''}`}
                style={{ padding: '24px' }}
                onMouseDown={handlePanStart}
                onMouseMove={handlePanMove}
                onMouseUp={handlePanEnd}
                onMouseLeave={handlePanEnd}
            >
                <Document
                    file={previewUrl}
                    onLoadSuccess={({ numPages: np }) => setNumPages(np)}
                    loading={
                        <div className="flex items-center justify-center h-[600px]">
                            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                        </div>
                    }
                >
                    <div className={
                        layoutMode === 'double'
                            ? 'grid grid-cols-1 md:grid-cols-2 gap-6 justify-items-center'
                            : 'flex flex-col items-center gap-6'
                    }>
                        {Array.from({ length: numPages }, (_, i) => {
                            const pageNum = i + 1
                            const pageAnns = getPageAnnotations(pageNum)
                            const pageTextOverlays = textOverlays.filter(t => t.pageNumber === pageNum)

                            return (
                                <div
                                    key={i}
                                    ref={el => { pageRefs.current[i] = el }}
                                    className="relative shadow-2xl rounded"
                                    onClick={(e) => handlePageClick(pageNum, e)}
                                    onMouseUp={() => handlePageSelection(pageNum)}
                                >
                                    <Page
                                        pageNumber={pageNum}
                                        scale={scale}
                                        renderTextLayer={true}
                                        renderAnnotationLayer={true}
                                    />

                                    {/* Canvas overlay for draw/highlight */}
                                    <CanvasOverlay
                                        pageNumber={pageNum}
                                        activeTool={activeTool}
                                        scale={scale}
                                        strokes={pageStrokes[pageNum] || []}
                                        onStrokeComplete={handleStrokeComplete}
                                        drawStyle={drawStyle}
                                        highlightStyle={highlightStyle}
                                        eraserWidth={eraserWidth}
                                    />

                                    {/* Native Text selection highlights */}
                                    {textHighlights.filter(th => th.pageNumber === pageNum).map(th => (
                                        <div key={th.id} className="absolute inset-0 z-0 pointer-events-none mix-blend-multiply opacity-50">
                                            {th.rects.map((rect, idx) => (
                                                <div
                                                    key={idx}
                                                    className="absolute pointer-events-none"
                                                    style={{
                                                        left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.width}%`, height: `${rect.height}%`,
                                                        backgroundColor: th.color
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    ))}

                                    {/* Native Text selection links */}
                                    {documentLinks.filter(l => l.pageNumber === pageNum).map(link => (
                                        <div key={link.id} className="absolute inset-0 z-10 pointer-events-none">
                                            {link.rects.map((rect, idx) => (
                                                <a
                                                    key={idx}
                                                    href={link.type === 'website' ? (link.url?.startsWith('http') ? link.url : `https://${link.url}`) : '#'}
                                                    onClick={e => {
                                                        if (activeTool === 'edit-text' || activeTool === 'pencil' || activeTool === 'eraser' || activeTool === 'highlight') {
                                                            e.preventDefault()
                                                            return;
                                                        }
                                                        if (link.type === 'page') {
                                                            e.preventDefault()
                                                            if (link.targetPage) scrollToPage(link.targetPage)
                                                        }
                                                    }}
                                                    target={link.type === 'website' ? '_blank' : undefined}
                                                    rel={link.type === 'website' ? 'noopener noreferrer' : undefined}
                                                    className="absolute cursor-pointer pointer-events-auto hover:bg-amber-500/20 mix-blend-multiply border-b-2 border-amber-500/50 transition-colors"
                                                    style={{
                                                        left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.width}%`, height: `${rect.height}%`
                                                    }}
                                                    title={link.type === 'website' ? link.url : `Go to page ${link.targetPage}`}
                                                />
                                            ))}
                                        </div>
                                    ))}

                                    {/* Temporary link selection highlight */}
                                    {newLinkSelection?.pageNum === pageNum && (
                                        <div className="absolute inset-0 z-10 pointer-events-none">
                                            {newLinkSelection.rects.map((rect, idx) => (
                                                <div
                                                    key={idx}
                                                    className="absolute pointer-events-none bg-amber-500/30 mix-blend-multiply border border-amber-500/50"
                                                    style={{
                                                        left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.width}%`, height: `${rect.height}%`
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Text overlays */}
                                    {pageTextOverlays.map(to => {
                                        const tStyle: React.CSSProperties = {
                                            fontFamily: to.fontFamily || 'Helvetica',
                                            fontSize: `${to.fontSize || 12}px`,
                                            fontWeight: to.isBold ? 'bold' : 'normal',
                                            fontStyle: to.isItalic ? 'italic' : 'normal',
                                            color: to.color || '#000000',
                                        }
                                        return (
                                            <div
                                                key={to.id}
                                                className="absolute z-15"
                                                style={{ left: `${to.x}%`, top: `${to.y}%` }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {editingTextId === to.id ? (
                                                    <input
                                                        value={to.text}
                                                        onChange={e => handleTextChange(to.id, e.target.value)}
                                                        onBlur={() => setEditingTextId(null)}
                                                        onKeyDown={e => {
                                                            e.stopPropagation();
                                                            if (e.key === 'Enter') setEditingTextId(null);
                                                        }}
                                                        className="bg-transparent outline-none min-w-[120px] border border-blue-400 border-dashed p-1"
                                                        style={tStyle}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span
                                                        className="px-1 cursor-text select-none"
                                                        style={tStyle}
                                                        onClick={() => {
                                                            setEditingTextId(to.id)
                                                            setTextStyle({
                                                                fontFamily: to.fontFamily || 'Helvetica',
                                                                fontSize: to.fontSize || 12,
                                                                isBold: to.isBold || false,
                                                                isItalic: to.isItalic || false,
                                                                color: to.color || '#000000'
                                                            })
                                                        }}
                                                    >
                                                        {to.text || '...'}
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}

                                    {/* Annotation pins */}
                                    {pageAnns.map(ann => (
                                        <div
                                            key={ann.id}
                                            className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full flex items-center justify-center font-bold cursor-pointer transition-transform hover:scale-125 z-10 shadow-lg overflow-hidden ${ann.resolved ? 'bg-green-500/90' : 'bg-amber-500/90'}`}
                                            style={{ left: `${ann.positionX}%`, top: `${ann.positionY}%` }}
                                            title={ann.content}
                                            onClick={(e) => { e.stopPropagation(); setShowComments(true); document.getElementById(`comment-${ann.id}`)?.scrollIntoView({ behavior: 'smooth' }) }}
                                        >
                                            {ann.user?.image ? (
                                                <img src={ann.user.image} alt={ann.user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-white text-[10px] uppercase block">{ann.user?.name?.charAt(0) || '?'}</span>
                                            )}
                                        </div>
                                    ))}

                                    {/* New comment pin */}
                                    {newCommentPos && newCommentPos.page === pageNum && (
                                        <div
                                            className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full bg-amber-500 flex items-center justify-center animate-pulse z-20 shadow-lg"
                                            style={{ left: `${newCommentPos.x}%`, top: `${newCommentPos.y}%` }}
                                        >
                                            <MessageSquare className="h-3 w-3 text-black" />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </Document>
            </div>

            {/* Thumbnails sidebar (floating) */}
            {showThumbnails && numPages > 0 && (
                <PageThumbnails
                    previewUrl={previewUrl}
                    numPages={numPages}
                    currentPage={currentPage}
                    onPageClick={scrollToPage}
                    onClose={() => setShowThumbnails(false)}
                    layoutMode={layoutMode}
                />
            )}

            {/* Comments sidebar (floating) */}
            {showComments && (
                <CommentsSidebar
                    annotations={annotations}
                    onClose={() => setShowComments(false)}
                    onDeleteAnnotation={onDeleteAnnotation}
                    onResolveAnnotation={onResolveAnnotation}
                    onReplyAnnotation={onReplyAnnotation}
                    scrollToPage={scrollToPage}
                    newCommentPos={newCommentPos}
                    newCommentText={newCommentText}
                    onNewCommentTextChange={setNewCommentText}
                    onSubmitComment={handleSubmitComment}
                    onCancelComment={() => setNewCommentPos(null)}
                />
            )}

            {/* FLOATING BOTTOM TOOLBAR (center) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-1.5 bg-[#1a1d2e]/95 backdrop-blur-md rounded-xl shadow-2xl z-40">
                {toolbarItems.map(item => {
                    if (item.id.startsWith('sep')) {
                        return <div key={item.id} className="w-px h-6 bg-white/10 mx-1" />
                    }
                    const Icon = item.icon!
                    const isActive = activeTool === item.id
                    return (
                        <button
                            key={item.id}
                            disabled={(item.id === 'undo' && history.length === 0) || (item.id === 'redo' && redoStack.length === 0)}
                            onClick={() => {
                                if (item.id === 'undo') handleUndo()
                                else if (item.id === 'redo') handleRedo()
                                else if (item.id === 'layout') setLayoutMode(prev => prev === 'single' ? 'double' : 'single')
                                else setActiveTool(prev => prev === item.id ? 'cursor' : item.id)
                            }}
                            className={`p-2.5 rounded-lg transition-all ${isActive
                                ? 'bg-amber-500/20 text-amber-400'
                                : item.id === 'layout' && layoutMode === 'double'
                                    ? 'bg-amber-500/10 text-amber-400/60'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400'
                                }`}
                            title={item.label}
                        >
                            <Icon className="h-[18px] w-[18px]" />
                        </button>
                    )
                })}
            </div>

            {/* BOTTOM LEFT: Page nav */}
            <div className="absolute bottom-4 left-3 flex items-center gap-1 px-2.5 py-1.5 bg-[#1a1d2e]/95 backdrop-blur-md rounded-lg shadow-xl z-40">
                <button onClick={prevPage} disabled={currentPage <= 1} className="p-1 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                    <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs text-gray-300 select-none px-1 min-w-[85px] text-center">
                    Page {getPageDisplay()} of {numPages || '–'}
                </span>
                <button onClick={nextPage} disabled={currentPage >= numPages} className="p-1 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* BOTTOM RIGHT: Zoom + fullscreen */}
            <div className="absolute bottom-4 right-3 flex items-center gap-1 px-2.5 py-1.5 bg-[#1a1d2e]/95 backdrop-blur-md rounded-lg shadow-xl z-40">
                <button onClick={zoomOut} className="p-1 text-gray-400 hover:text-white transition-colors">
                    <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs text-gray-300 min-w-[36px] text-center select-none">{Math.round(scale * 100)}%</span>
                <button onClick={zoomIn} className="p-1 text-gray-400 hover:text-white transition-colors">
                    <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <div className="w-px h-4 bg-white/10 mx-0.5" />
                <button onClick={toggleFullscreen} className="p-1 text-gray-400 hover:text-white transition-colors" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                    {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
            </div>
        </div>
    )
}

// =============================================================================
// TEXT EDITOR
// =============================================================================

function TextEditor({ content, onSave, isSaving }: {
    content: string
    onSave: (content: string) => void
    isSaving: boolean
}) {
    const { t } = useTranslation()
    const [text, setText] = useState(content)
    const [hasChanges, setHasChanges] = useState(false)

    useEffect(() => { setHasChanges(text !== content) }, [text, content])

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (hasChanges) { e.preventDefault(); e.returnValue = '' }
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [hasChanges])

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-2 bg-[#1a1d2e] border-b border-white/5">
                <div className="flex items-center gap-2">
                    {hasChanges && (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            {t('files.viewer.unsaved_changes', 'Unsaved changes')}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setText(content)} disabled={!hasChanges}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/5 transition-colors">
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t('files.viewer.revert', 'Revert')}
                    </button>
                    <button onClick={() => onSave(text)} disabled={!hasChanges || isSaving}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white font-medium rounded-lg hover:bg-green-500 disabled:opacity-40 transition-colors">
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        {t('common.save', 'Save')}
                    </button>
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    className="w-full h-full bg-[#0c0e1a] text-gray-200 text-sm font-mono p-6 resize-none focus:outline-none leading-relaxed"
                    spellCheck={false}
                />
            </div>
        </div>
    )
}

// =============================================================================
// IMAGE VIEWER
// =============================================================================

function ImageViewer({ previewUrl, fileName }: { previewUrl: string; fileName: string }) {
    const [scale, setScale] = useState(1)

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1a1d2e]">
                <button onClick={() => setScale(s => Math.max(0.25, s - 0.25))} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                    <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-400 min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.min(5, s + 0.25))} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                    <ZoomIn className="h-4 w-4" />
                </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-[#0c0e1a] p-4">
                <img
                    src={previewUrl}
                    alt={fileName}
                    style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
                    className="max-w-none transition-transform"
                />
            </div>
        </div>
    )
}

// =============================================================================
// MAIN FILE VIEWER PAGE
// =============================================================================

export function FileViewerPage({ fileId, onClose }: FileViewerProps) {
    const { t } = useTranslation()
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [fileData, setFileData] = useState<any>(null)
    const [textContent, setTextContent] = useState<string | null>(null)
    const [annotations, setAnnotations] = useState<Annotation[]>([])
    const [loading, setLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showThumbnails, setShowThumbnails] = useState(true)
    const [showComments, setShowComments] = useState(true)

    const mimeType = fileData?.mimeType || ''
    const fileType = fileData?.fileType || ''
    const isPdf = mimeType.includes('pdf')
    const isImage = mimeType.startsWith('image/')
    const textTypes = ['txt', 'md', 'csv', 'json', 'html', 'css', 'js', 'ts', 'jsx', 'tsx', 'xml', 'yaml', 'yml', 'env', 'log']
    const isText = mimeType.startsWith('text/') || textTypes.includes(fileType)

    useEffect(() => {
        const fetchFile = async () => {
            setLoading(true); setError(null)
            try {
                const previewRes = await apiFetchJson<any>(`/api/files/${fileId}/preview`)
                setPreviewUrl(previewRes.previewUrl)
                setFileData(previewRes.file)
                const ft = previewRes.file?.fileType || ''
                const mt = previewRes.file?.mimeType || ''
                if (mt.startsWith('text/') || textTypes.includes(ft)) {
                    const contentRes = await apiFetchJson<any>(`/api/files/${fileId}/content`)
                    setTextContent(contentRes.content)
                }
                const annRes = await apiFetchJson<any>(`/api/annotations?fileId=${fileId}`)
                setAnnotations(annRes.data || [])
            } catch (err: any) {
                setError(err.message || 'Failed to load file')
            } finally {
                setLoading(false)
            }
        }
        fetchFile()
    }, [fileId])

    const handleAddAnnotation = useCallback(async (data: { pageNumber: number; positionX: number; positionY: number; content: string }) => {
        try {
            const res = await apiFetchJson<any>('/api/annotations', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId, ...data, type: 'comment' }),
            })
            if (res.data) {
                const annRes = await apiFetchJson<any>(`/api/annotations?fileId=${fileId}`)
                setAnnotations(annRes.data || [])
            }
        } catch (err) { console.error('Failed to add annotation:', err) }
    }, [fileId])

    const handleDeleteAnnotation = useCallback(async (id: string) => {
        try {
            await apiFetch(`/api/annotations/${id}`, { method: 'DELETE' })
            setAnnotations(prev => prev.filter(a => a.id !== id))
        } catch (err) { console.error('Failed to delete annotation:', err) }
    }, [])

    const handleResolveAnnotation = useCallback(async (id: string, resolved: boolean) => {
        try {
            await apiFetch(`/api/annotations/${id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resolved }),
            })
            setAnnotations(prev => prev.map(a => a.id === id ? { ...a, resolved } : a))
        } catch (err) { console.error('Failed to resolve annotation:', err) }
    }, [])

    const handleReplyAnnotation = useCallback(async (parentId: string, content: string) => {
        try {
            await apiFetchJson<any>('/api/annotations', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId, content, parentId, type: 'comment' }),
            })
            const annRes = await apiFetchJson<any>(`/api/annotations?fileId=${fileId}`)
            setAnnotations(annRes.data || [])
        } catch (err) { console.error('Failed to reply:', err) }
    }, [fileId])

    const handleSaveText = useCallback(async (content: string) => {
        setIsSaving(true)
        try {
            await apiFetch(`/api/files/${fileId}/content`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            })
            setTextContent(content)
        } catch (err) { console.error('Failed to save:', err) }
        finally { setIsSaving(false) }
    }, [fileId])

    const handleDownload = useCallback(async () => {
        try {
            const res = await apiFetchJson<any>(`/api/files/${fileId}/download`)
            if (res.downloadUrl) window.open(res.downloadUrl, '_blank')
        } catch (err) { console.error('Failed to download:', err) }
    }, [fileId])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    return (
        <div className="fixed inset-0 z-50 bg-[#0c0e1a] flex flex-col text-white">
            {/* FLOATING HEADER — no border */}
            <div className="absolute top-3 left-3 right-3 z-40 flex items-center justify-between h-11 px-3 bg-[#1a1d2e]/95 backdrop-blur-md rounded-xl shadow-2xl">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm">
                        <X className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{t('common.close', 'Close')}</span>
                    </button>

                    <div className="w-px h-5 bg-white/10" />

                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center">
                            <span className="text-[8px] text-amber-400 font-bold uppercase">{fileData?.fileType || '?'}</span>
                        </div>
                        <span className="text-sm font-medium text-white truncate max-w-[300px]">
                            {fileData?.name || t('files.viewer.loading', 'Loading...')}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={handleDownload} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-xs">
                        <Download className="h-3.5 w-3.5" />
                        <span>{t('files.actions.download', 'Download')}</span>
                    </button>

                    {isPdf && (
                        <>
                            <div className="w-px h-5 bg-white/10 mx-1" />
                            <button
                                onClick={() => setShowThumbnails(v => !v)}
                                className={`p-2 rounded-lg transition-colors ${showThumbnails ? 'text-amber-400 bg-amber-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                title="Toggle thumbnails"
                            >
                                <GalleryVerticalEnd className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => setShowComments(v => !v)}
                                className={`p-2 rounded-lg transition-colors ${showComments ? 'text-amber-400 bg-amber-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                title="Toggle comments"
                            >
                                <MessageCircle className="h-3.5 w-3.5" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 flex flex-col min-h-0 pt-[60px]">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                            <span className="text-sm text-gray-400">{t('files.viewer.loading', 'Loading...')}</span>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-red-400 text-sm">{error}</p>
                            <button onClick={onClose} className="mt-4 px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                                {t('common.close', 'Close')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {isPdf && previewUrl && (
                            <PdfViewer
                                previewUrl={previewUrl}
                                annotations={annotations}
                                onAddAnnotation={handleAddAnnotation}
                                onDeleteAnnotation={handleDeleteAnnotation}
                                onResolveAnnotation={handleResolveAnnotation}
                                onReplyAnnotation={handleReplyAnnotation}
                                showThumbnails={showThumbnails}
                                setShowThumbnails={setShowThumbnails}
                                showComments={showComments}
                                setShowComments={setShowComments}
                            />
                        )}
                        {isText && textContent !== null && (
                            <TextEditor content={textContent} onSave={handleSaveText} isSaving={isSaving} />
                        )}
                        {isImage && previewUrl && (
                            <ImageViewer previewUrl={previewUrl} fileName={fileData?.name || ''} />
                        )}
                        {!isPdf && !isText && !isImage && (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <p className="text-gray-400 text-sm">{t('files.viewer.unsupported', 'This file type cannot be previewed.')}</p>
                                    <button onClick={handleDownload} className="mt-4 flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors mx-auto">
                                        <Download className="h-4 w-4" /> {t('files.actions.download', 'Download')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
