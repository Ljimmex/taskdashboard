import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import mammoth from 'mammoth'
import DOMPurify from 'dompurify'
import { apiFetch, apiFetchJson } from '@/lib/api'
import { useTranslation } from 'react-i18next'
import {
  X,
  ZoomIn,
  ZoomOut,
  FileText,
  Save,
  MessageSquare,
  Send,
  Check,
  Trash2,
  RotateCcw,
  Download,
  Loader2,
  Columns2,
  Rows2,
  GalleryVerticalEnd,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  MousePointer,
  Hand,
  StickyNote,
  Highlighter,
  Type,
  Pencil,
  Undo2,
  Redo2,
  Eraser,
  FileEdit,
  Link,
  Bold,
  Italic,
  TypeOutline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
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

type LayoutMode = 'single' | 'double' | 'fitWidth'

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
  textAlign?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  width?: number
  height?: number
}

// =============================================================================
// CANVAS OVERLAY — for draw/highlight on each page
// =============================================================================

function CanvasOverlay({
  pageNumber,
  activeTool,
  scale,
  strokes,
  onStrokeComplete,
  drawStyle,
  highlightStyle,
  eraserWidth,
}: {
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

    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return
      ctx.beginPath()
      ctx.strokeStyle = stroke.tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color
      ctx.lineWidth = stroke.width * scale
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const defaultOpacity = stroke.tool === 'highlight' ? 0.3 : 1
      ctx.globalAlpha = stroke.opacity !== undefined ? stroke.opacity / 100 : defaultOpacity

      const defaultBlendMode = stroke.tool === 'highlight' ? 'multiply' : 'source-over'
      ctx.globalCompositeOperation =
        stroke.tool === 'eraser'
          ? 'destination-out'
          : ((stroke.blendMode || defaultBlendMode) as any)

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

  const isDrawTool =
    activeTool === 'pencil' || activeTool === 'highlight' || activeTool === 'eraser'

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

    ctx.globalAlpha = isEraser ? 1 : style.opacity / 100
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

  let cursorStyle = 'crosshair'

  if (isDrawTool) {
    const style =
      activeTool === 'eraser'
        ? { width: eraserWidth, color: '#000000' }
        : activeTool === 'highlight'
          ? highlightStyle
          : drawStyle
    const actualSize = Math.max(activeTool === 'eraser' ? 10 : 2, style.width * scale)
    const cursorSize = Math.min(125, actualSize)
    const radius = Math.max(1, cursorSize / 2 - 1)

    let svg = ''
    if (activeTool === 'eraser') {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize}" height="${cursorSize}" viewBox="0 0 ${cursorSize} ${cursorSize}"><circle cx="${cursorSize / 2}" cy="${cursorSize / 2}" r="${radius}" fill="none" stroke="black" stroke-width="2"/><circle cx="${cursorSize / 2}" cy="${cursorSize / 2}" r="${radius}" fill="white" fill-opacity="0.5" stroke="white" stroke-width="1"/></svg>`
    } else {
      const fillOpacity = activeTool === 'highlight' ? 0.3 : 1
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize}" height="${cursorSize}" viewBox="0 0 ${cursorSize} ${cursorSize}"><circle cx="${cursorSize / 2}" cy="${cursorSize / 2}" r="${radius}" fill="${style.color}" fill-opacity="${fillOpacity}" stroke="white" stroke-width="1" stroke-opacity="0.7"/></svg>`
    }
    cursorStyle = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${cursorSize / 2} ${cursorSize / 2}, crosshair`
  }

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

function PageThumbnails({
  previewUrl,
  numPages,
  currentPage,
  onPageClick,
  onClose,
  layoutMode,
}: {
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
    <div className="animate-in fade-in slide-in-from-left-4 absolute bottom-20 left-4 top-4 z-30 flex min-h-0 w-[170px] flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-2xl backdrop-blur-xl duration-300">
      <div className="border-[var(--app-border)]/50 bg-[var(--app-bg-elevated)]/30 flex items-center justify-between border-b px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">
          {t('files.viewer.thumbnails', 'Thumbnails')}
        </span>
        <button
          onClick={onClose}
          className="text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="custom-scrollbar flex-1 space-y-3 overflow-auto px-3 py-3">
        <Document file={previewUrl} loading={null}>
          {pageGroups.map((group, gIdx) => {
            const isActive = group.includes(currentPage)
            return (
              <div
                key={gIdx}
                ref={(el) => {
                  thumbRefs.current[gIdx] = el
                }}
                className={`hover:border-[var(--app-accent)]/50 relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all ${
                  isActive
                    ? 'scale-[1.02] border-[var(--app-accent)] shadow-lg'
                    : 'border-transparent opacity-70 hover:scale-[1.01] hover:opacity-100'
                }`}
                onClick={() => onPageClick(group[0])}
              >
                <div
                  className={`flex ${layoutMode === 'double' ? 'gap-0.5' : ''} overflow-hidden rounded-lg bg-white`}
                >
                  {group.map((pageNum) => (
                    <Page
                      key={pageNum}
                      pageNumber={pageNum}
                      width={layoutMode === 'double' ? 70 : 140}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  ))}
                </div>
                <div
                  className={`absolute inset-x-0 bottom-0 py-1 text-center text-[10px] font-bold ${
                    isActive ? 'bg-[var(--app-accent)] text-white' : 'bg-black/60 text-white'
                  }`}
                >
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

function CommentsSidebar({
  annotations,
  onClose,
  onDeleteAnnotation,
  onResolveAnnotation,
  onReplyAnnotation,
  scrollToPage,
  newCommentPos,
  newCommentText,
  onNewCommentTextChange,
  onSubmitComment,
  onCancelComment,
}: {
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

  const topLevel = annotations.filter((a) => !a.parentId)

  return (
    <div className="animate-in fade-in slide-in-from-right-4 absolute bottom-20 right-4 top-4 z-30 flex min-h-0 w-[300px] flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-2xl backdrop-blur-xl duration-300">
      <div className="border-[var(--app-border)]/50 bg-[var(--app-bg-elevated)]/30 flex items-center justify-between border-b px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">
          {t('files.viewer.comments', 'Comments')}
        </span>
        <button
          onClick={onClose}
          className="text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {newCommentPos && (
        <div className="border-[var(--app-border)]/50 bg-[var(--app-bg-elevated)]/50 border-b p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--app-accent)]">
            {t('files.viewer.new_comment_on_page', 'Comment on page')} {newCommentPos.page}
          </p>
          <textarea
            value={newCommentText}
            onChange={(e) => onNewCommentTextChange(e.target.value)}
            placeholder={t('files.viewer.type_comment', 'Type your comment...') as string}
            className="border-[var(--app-border)]/50 focus:ring-[var(--app-accent)]/20 w-full resize-none rounded-xl border bg-[var(--app-bg-input)] p-3 text-sm font-medium text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] transition-all focus:outline-none focus:ring-2"
            rows={3}
            autoFocus
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={onCancelComment}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              onClick={onSubmitComment}
              disabled={!newCommentText.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--app-accent)] px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              {t('common.send', 'Send')}
            </button>
          </div>
        </div>
      )}

      <div className="custom-scrollbar flex-1 overflow-auto">
        {topLevel.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-bg-elevated)] shadow-inner">
              <MessageCircle className="h-8 w-8 text-[var(--app-text-muted)] opacity-30" />
            </div>
            <p className="text-sm font-bold text-[var(--app-text-secondary)]">
              {t('files.viewer.no_comments', 'No comments yet.')}
            </p>
          </div>
        ) : (
          topLevel.map((ann) => (
            <div
              key={ann.id}
              className={`border-[var(--app-border)]/30 hover:bg-[var(--app-bg-elevated)]/30 border-b p-4 transition-colors ${ann.resolved ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                {ann.user?.image ? (
                  <img
                    src={ann.user.image}
                    alt={ann.user.name}
                    className="border-[var(--app-border)]/50 h-8 w-8 flex-shrink-0 rounded-xl border object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--app-accent)] to-[var(--app-accent-hover)] text-xs font-black uppercase text-white shadow-sm">
                    {ann.user?.name?.charAt(0) || '?'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-xs font-bold text-[var(--app-text-primary)]">
                      {ann.user?.name || 'Unknown'}
                    </span>
                    <div className="flex items-center gap-1">
                      {ann.pageNumber && (
                        <span
                          className="bg-[var(--app-accent)]/10 mr-1 cursor-pointer rounded-md px-1.5 py-0.5 text-[10px] font-bold text-[var(--app-accent)] hover:underline"
                          onClick={() => scrollToPage(ann.pageNumber!)}
                        >
                          p.{ann.pageNumber}
                        </span>
                      )}
                      <button
                        onClick={() => onResolveAnnotation(ann.id, !ann.resolved)}
                        className="rounded-lg p-1 transition-colors hover:bg-[var(--app-bg-elevated)]"
                      >
                        <Check
                          className={`h-3.5 w-3.5 ${ann.resolved ? 'font-bold text-green-500' : 'text-[var(--app-text-muted)]'}`}
                        />
                      </button>
                      <button
                        onClick={() => onDeleteAnnotation(ann.id)}
                        className="group/del rounded-lg p-1 transition-colors hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-[var(--app-text-muted)] group-hover/del:text-red-500" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-xs font-medium leading-relaxed text-[var(--app-text-secondary)]">
                    {ann.content}
                  </p>
                  <span className="mt-2 block text-[10px] font-bold uppercase text-[var(--app-text-muted)]">
                    {format(new Date(ann.createdAt), 'dd.MM.yyyy HH:mm')}
                  </span>

                  {ann.replies && ann.replies.length > 0 && (
                    <div className="mt-3 space-y-2 border-l-2 border-[var(--app-border)] pl-3">
                      {ann.replies.map((reply) => (
                        <div key={reply.id} className="flex items-start gap-2">
                          {reply.user?.image ? (
                            <img
                              src={reply.user.image}
                              alt={reply.user.name}
                              className="border-[var(--app-border)]/50 h-6 w-6 flex-shrink-0 rounded-lg border object-cover"
                            />
                          ) : (
                            <div className="border-[var(--app-border)]/50 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border bg-[var(--app-bg-elevated)] text-[8px] font-black uppercase text-[var(--app-text-muted)]">
                              {reply.user?.name?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] font-bold text-[var(--app-text-primary)]">
                              {reply.user?.name}
                            </span>
                            <p className="text-[11px] font-medium leading-relaxed text-[var(--app-text-secondary)]">
                              {reply.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyingTo === ann.id ? (
                    <div className="mt-3 flex gap-1.5">
                      <input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={t('files.viewer.reply', 'Reply...') as string}
                        className="border-[var(--app-border)]/50 focus:ring-[var(--app-accent)]/20 flex-1 rounded-lg border bg-[var(--app-bg-input)] px-3 py-1.5 text-xs font-medium text-[var(--app-text-primary)] transition-all focus:outline-none focus:ring-2"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmitReply(ann.id)}
                      />
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-accent)] text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
                        onClick={() => handleSubmitReply(ann.id)}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingTo(ann.id)}
                      className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[var(--app-accent)] hover:underline"
                    >
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

function PdfViewer({
  previewUrl,
  annotations,
  onAddAnnotation,
  onDeleteAnnotation,
  onResolveAnnotation,
  onReplyAnnotation,
  showThumbnails,
  setShowThumbnails,
  showComments,
  setShowComments,
}: {
  previewUrl: string
  annotations: Annotation[]
  onAddAnnotation: (data: {
    pageNumber: number
    positionX: number
    positionY: number
    content: string
  }) => void
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
  const [newCommentPos, setNewCommentPos] = useState<{ page: number; x: number; y: number } | null>(
    null
  )
  const [newCommentText, setNewCommentText] = useState('')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('double')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pageStrokes, setPageStrokes] = useState<Record<number, DrawStroke[]>>({})
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([])
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [textStyle, setTextStyle] = useState<{
    fontFamily: string
    fontSize: number
    isBold: boolean
    isItalic: boolean
    color: string
    textAlign?: 'left' | 'center' | 'right'
    verticalAlign?: 'top' | 'middle' | 'bottom'
  }>({
    fontFamily: 'Helvetica',
    fontSize: 12,
    isBold: false,
    isItalic: false,
    color: '#000000',
    textAlign: 'left',
    verticalAlign: 'top',
  })

  // Extensibility tool states
  const [drawStyle, setDrawStyle] = useState({
    color: '#3B82F6',
    width: 5,
    opacity: 100,
    blendMode: 'source-over',
  })
  const [highlightStyle, setHighlightStyle] = useState({
    color: '#FBBF24',
    width: 30,
    opacity: 50,
    blendMode: 'multiply',
  })
  const [eraserWidth, setEraserWidth] = useState(20)
  const [textHighlights, setTextHighlights] = useState<TextHighlight[]>([])

  // Link Tool
  const [documentLinks, setDocumentLinks] = useState<DocumentLink[]>([])
  const [newLinkSelection, setNewLinkSelection] = useState<{
    rects: any[]
    pageNum: number
  } | null>(null)
  const [linkModalType, setLinkModalType] = useState<'website' | 'page'>('website')
  const [linkModalValue, setLinkModalValue] = useState('')

  // Pan Tool
  const [isPanDragging, setIsPanDragging] = useState(false)
  const panStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)

  // History (Undo/Redo)
  type AppState = {
    strokes: Record<number, DrawStroke[]>
    overlays: TextOverlay[]
    highlights: TextHighlight[]
    links: DocumentLink[]
  }
  const [history, setHistory] = useState<AppState[]>([])
  const [redoStack, setRedoStack] = useState<AppState[]>([])

  const saveHistoryState = () => {
    setHistory((prev) => [
      ...prev.slice(-49),
      {
        strokes: pageStrokes,
        overlays: textOverlays,
        highlights: textHighlights,
        links: documentLinks,
      },
    ])
    setRedoStack([])
  }

  const handleUndo = () => {
    if (history.length === 0) return
    const last = history[history.length - 1]
    setRedoStack((prev) => [
      ...prev,
      {
        strokes: pageStrokes,
        overlays: textOverlays,
        highlights: textHighlights,
        links: documentLinks,
      },
    ])
    setHistory((prev) => prev.slice(0, -1))
    setPageStrokes(last.strokes)
    setTextOverlays(last.overlays)
    setTextHighlights(last.highlights)
    setDocumentLinks(last.links || [])
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setHistory((prev) => [
      ...prev,
      {
        strokes: pageStrokes,
        overlays: textOverlays,
        highlights: textHighlights,
        links: documentLinks,
      },
    ])
    setRedoStack((prev) => prev.slice(0, -1))
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
        if (dist < closestDist) {
          closestDist = dist
          closestPage = i + 1
        }
      }
      setCurrentPage(closestPage)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [numPages])

  const scrollToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(numPages, page))
      const el = pageRefs.current[clamped - 1]
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setCurrentPage(clamped)
    },
    [numPages]
  )

  const handlePageClick = (pageNum: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'comment') {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
      const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
      setNewCommentPos({ page: pageNum, x, y })
      if (!showComments) setShowComments(true)
    } else if (activeTool === 'text' || activeTool === 'edit-text') {
      saveHistoryState()
      const rect = e.currentTarget.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      const id = `text-${Date.now()}`

      setTextOverlays((prev) => {
        const shifted = prev.map((t) => {
          // Shift down any existing text overlay that is below or exactly at the click Y
          if (t.pageNumber === pageNum && t.y >= y - 1) {
            return { ...t, y: t.y + 5 } // Push down by 5%
          }
          return t
        })
        return [
          ...shifted,
          { id, x, y, text: '', pageNumber: pageNum, ...textStyle, width: 250, height: 40 },
        ]
      })
      setEditingTextId(id)
    }
  }

  const handleSubmitComment = () => {
    if (!newCommentPos || !newCommentText.trim()) return
    onAddAnnotation({
      pageNumber: newCommentPos.page,
      positionX: newCommentPos.x,
      positionY: newCommentPos.y,
      content: newCommentText.trim(),
    })
    setNewCommentPos(null)
    setNewCommentText('')
  }

  const handleStrokeComplete = (pageNumber: number, stroke: DrawStroke) => {
    saveHistoryState()
    setPageStrokes((prev) => ({
      ...prev,
      [pageNumber]: [...(prev[pageNumber] || []), stroke],
    }))
  }

  const handleTextChange = (id: string, text: string) => {
    setTextOverlays((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)))
  }

  const updateTextStyle = (updates: Partial<typeof textStyle>) => {
    setTextStyle((prev) => ({ ...prev, ...updates }))
    if (editingTextId) {
      setTextOverlays((prev) =>
        prev.map((t) => (t.id === editingTextId ? { ...t, ...updates } : t))
      )
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
    if (
      r.left < pageRect.left ||
      r.right > pageRect.right ||
      r.top < pageRect.top ||
      r.bottom > pageRect.bottom
    )
      return

    const rects = Array.from(range.getClientRects()).map((r) => ({
      x: ((r.left - pageRect.left) / pageRect.width) * 100,
      y: ((r.top - pageRect.top) / pageRect.height) * 100,
      width: (r.width / pageRect.width) * 100,
      height: (r.height / pageRect.height) * 100,
      text: selection.toString(),
    }))

    if (activeTool === 'text-highlight') {
      saveHistoryState()
      setTextHighlights((prev) => [
        ...prev,
        {
          id: `th-${Date.now()}`,
          pageNumber: pageNum,
          rects,
          color: highlightStyle.color,
        },
      ])
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
    setDocumentLinks((prev) => [
      ...prev,
      {
        id: `l-${Date.now()}`,
        pageNumber: newLinkSelection.pageNum,
        rects: newLinkSelection.rects,
        type: linkModalType,
        url: linkModalType === 'website' ? linkModalValue.trim() : undefined,
        targetPage: linkModalType === 'page' ? parseInt(linkModalValue.trim()) || 1 : undefined,
      },
    ])
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
      top: scrollContainerRef.current?.scrollTop || 0,
    }
  }
  const handlePanMove = (e: React.MouseEvent) => {
    if (
      !isPanDragging ||
      !panStartRef.current ||
      !scrollContainerRef.current ||
      activeTool !== 'hand'
    )
      return
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
      el.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {})
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const zoomIn = () => setScale((s) => Math.min(3, +(s + 0.15).toFixed(2)))
  const zoomOut = () => setScale((s) => Math.max(0.3, +(s - 0.15).toFixed(2)))

  const getPageAnnotations = (pageNum: number) =>
    annotations.filter((a) => a.pageNumber === pageNum)

  const getPageDisplay = () => {
    if (layoutMode === 'double') {
      const end = Math.min(numPages, currentPage + 1)
      return currentPage === end ? `${currentPage}` : `${currentPage}-${end}`
    }
    return `${currentPage}`
  }

  const prevPage = () =>
    scrollToPage(
      layoutMode === 'double' ? Math.max(1, currentPage - 2) : Math.max(1, currentPage - 1)
    )
  const nextPage = () =>
    scrollToPage(
      layoutMode === 'double'
        ? Math.min(numPages, currentPage + 2)
        : Math.min(numPages, currentPage + 1)
    )

  const cursorClass =
    activeTool === 'comment' ||
    activeTool === 'pencil' ||
    activeTool === 'highlight' ||
    activeTool === 'eraser'
      ? 'cursor-crosshair'
      : activeTool === 'hand'
        ? 'cursor-grab active:cursor-grabbing'
        : activeTool === 'text' ||
            activeTool === 'edit-text' ||
            activeTool === 'text-highlight' ||
            activeTool === 'link'
          ? 'cursor-text'
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
    {
      id: 'layout',
      icon: layoutMode === 'single' ? Columns2 : layoutMode === 'double' ? Rows2 : Maximize2,
      label: layoutMode === 'single' ? 'Double' : layoutMode === 'double' ? 'Fit Width' : 'Single',
    },
  ]

  const cycleLayout = () => {
    if (layoutMode === 'single') setLayoutMode('double')
    else if (layoutMode === 'double') setLayoutMode('fitWidth')
    else setLayoutMode('single')
  }

  return (
    <div
      ref={viewerRootRef}
      className="relative flex min-h-0 flex-1 flex-col bg-[var(--app-bg-deepest)]"
    >
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

      {(activeTool === 'pencil' ||
        activeTool === 'highlight' ||
        activeTool === 'eraser' ||
        activeTool === 'hand') && (
        <style>{`
                    .react-pdf__Page__textContent {
                        pointer-events: none !important;
                        user-select: none !important;
                    }
                `}</style>
      )}

      {/* TOOL OPTIONS FLOATING PANELS */}
      {activeTool === 'pencil' && (
        <div className="bg-[var(--app-bg-card)]/95 absolute bottom-[5.5rem] left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-[var(--app-border)] px-3 py-2 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 border-r border-[var(--app-border)] pr-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
              Color
            </span>
            <input
              type="color"
              value={drawStyle.color}
              onChange={(e) => setDrawStyle((s) => ({ ...s, color: e.target.value }))}
              className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
              title="Stroke Color"
            />
          </div>
          <div className="flex items-center gap-2 border-r border-[var(--app-border)] pr-3">
            <span className="w-10 text-[11px] font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
              Width <span className="ml-1 text-[var(--app-text-primary)]">{drawStyle.width}</span>
            </span>
            <input
              type="range"
              min="1"
              max="50"
              value={drawStyle.width}
              onChange={(e) => setDrawStyle((s) => ({ ...s, width: Number(e.target.value) }))}
              className="w-24 cursor-pointer accent-[var(--app-accent)]"
            />
          </div>
          <div className="flex items-center gap-2 border-r border-[var(--app-border)] pr-3">
            <span className="w-12 text-[11px] font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
              Opacity{' '}
              <span className="ml-1 text-[var(--app-text-primary)]">{drawStyle.opacity}%</span>
            </span>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={drawStyle.opacity}
              onChange={(e) => setDrawStyle((s) => ({ ...s, opacity: Number(e.target.value) }))}
              className="w-24 cursor-pointer accent-[var(--app-accent)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
              Blend
            </span>
            <select
              value={drawStyle.blendMode}
              onChange={(e) => setDrawStyle((s) => ({ ...s, blendMode: e.target.value }))}
              className="cursor-pointer rounded border border-[var(--app-border)] bg-[var(--app-bg-deepest)] px-1.5 py-0.5 text-xs text-[var(--app-text-secondary)] outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
            >
              <option value="source-over">Normal</option>
              <option value="multiply">Multiply</option>
              <option value="screen">Screen</option>
              <option value="overlay">Overlay</option>
            </select>
          </div>
        </div>
      )}

      {activeTool === 'highlight' && (
        <div className="bg-[var(--app-bg-card)]/95 absolute bottom-[5.5rem] left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-[var(--app-border)] px-3 py-2 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 border-r border-[var(--app-border)] pr-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
              Color
            </span>
            <input
              type="color"
              value={highlightStyle.color}
              onChange={(e) => setHighlightStyle((s) => ({ ...s, color: e.target.value }))}
              className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
              title="Highlight Color"
            />
          </div>
          <div className="flex items-center gap-2 border-r border-[var(--app-border)] pr-3">
            <span className="w-10 text-[11px] font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
              Width{' '}
              <span className="ml-1 text-[var(--app-text-primary)]">{highlightStyle.width}</span>
            </span>
            <input
              type="range"
              min="5"
              max="100"
              value={highlightStyle.width}
              onChange={(e) => setHighlightStyle((s) => ({ ...s, width: Number(e.target.value) }))}
              className="w-24 cursor-pointer accent-[var(--app-accent)]"
            />
          </div>
          <div className="flex items-center gap-2 border-r border-[var(--app-border)] pr-3">
            <span className="w-12 text-[11px] font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
              Opacity{' '}
              <span className="ml-1 text-[var(--app-text-primary)]">{highlightStyle.opacity}%</span>
            </span>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={highlightStyle.opacity}
              onChange={(e) =>
                setHighlightStyle((s) => ({ ...s, opacity: Number(e.target.value) }))
              }
              className="w-24 cursor-pointer accent-[var(--app-accent)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
              Blend
            </span>
            <select
              value={highlightStyle.blendMode}
              onChange={(e) => setHighlightStyle((s) => ({ ...s, blendMode: e.target.value }))}
              className="cursor-pointer rounded border border-[var(--app-border)] bg-[var(--app-bg-deepest)] px-1.5 py-0.5 text-xs text-[var(--app-text-secondary)] outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
            >
              <option value="source-over">Normal</option>
              <option value="multiply">Multiply</option>
              <option value="screen">Screen</option>
            </select>
          </div>
        </div>
      )}

      {activeTool === 'eraser' && (
        <div className="bg-[var(--app-bg-card)]/95 absolute bottom-[5.5rem] left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-[var(--app-border)] px-4 py-2 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-[var(--app-text-primary)]">
            <span className="w-16 text-[11px] font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
              Size <span className="ml-1 text-[var(--app-text-primary)]">{eraserWidth}</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="range"
              min="10"
              max="125"
              value={eraserWidth}
              onChange={(e) => setEraserWidth(Number(e.target.value))}
              className="w-32 cursor-pointer accent-[var(--app-accent)]"
            />
          </div>
        </div>
      )}

      {activeTool === 'text-highlight' && (
        <div className="bg-[var(--app-bg-card)]/95 absolute bottom-[5.5rem] left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-[var(--app-border)] px-3 py-2 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 border-r border-[var(--app-border)] pr-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
              Color
            </span>
            <input
              type="color"
              value={highlightStyle.color}
              onChange={(e) => setHighlightStyle((s) => ({ ...s, color: e.target.value }))}
              className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
              title="Text Highlight Color"
            />
          </div>
          <div className="text-xs font-medium tracking-wide text-[var(--app-accent)]">
            Select text to highlight
          </div>
        </div>
      )}

      {activeTool === 'link' && !newLinkSelection && (
        <div className="bg-[var(--app-bg-card)]/95 absolute bottom-[5.5rem] left-1/2 z-40 flex -translate-x-1/2 items-center rounded-xl border border-[var(--app-border)] px-4 py-2 shadow-2xl backdrop-blur-md">
          <div className="text-xs font-medium tracking-wide text-[var(--app-accent)]">
            Select text to add link
          </div>
        </div>
      )}

      {/* NEW LINK SELECTION MODAL */}
      {newLinkSelection && (
        <div className="absolute left-1/2 top-1/2 z-50 w-[320px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-2xl drop-shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-bg-elevated)] px-4 py-3">
            <span className="text-sm font-semibold tracking-wide text-[var(--app-text-primary)]">
              Link Settings
            </span>
            <button
              onClick={() => setNewLinkSelection(null)}
              className="text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
                Link To
              </label>
              <div className="flex rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-deepest)] p-1">
                <button
                  onClick={() => setLinkModalType('website')}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${linkModalType === 'website' ? 'bg-[var(--app-accent)] text-white shadow-sm' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'}`}
                >
                  {linkModalType === 'website' && <Check className="mr-1 inline h-3.5 w-3.5" />}{' '}
                  Website
                </button>
                <button
                  onClick={() => setLinkModalType('page')}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${linkModalType === 'page' ? 'bg-[var(--app-accent)] text-white shadow-sm' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'}`}
                >
                  {linkModalType === 'page' && <Check className="mr-1 inline h-3.5 w-3.5" />} Page
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
                {linkModalType === 'website' ? 'URL Link' : 'Page Number'}
              </label>
              <input
                type={linkModalType === 'website' ? 'url' : 'number'}
                placeholder={linkModalType === 'website' ? 'www.example.com' : 'e.g. 2'}
                value={linkModalValue}
                onChange={(e) => setLinkModalValue(e.target.value)}
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-deepest)] px-3 py-2 text-sm text-[var(--app-text-primary)] outline-none transition-colors focus:border-[var(--app-accent)]"
                autoFocus
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') handleSaveLink()
                  if (e.key === 'Escape') setNewLinkSelection(null)
                }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setNewLinkSelection(null)}
                className="rounded-lg px-4 py-1.5 text-xs font-medium text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLink}
                className="rounded-lg bg-[var(--app-accent)] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--app-accent-hover)]"
              >
                Save Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEXT FORMATTING TOOLBAR */}
      {(editingTextId || activeTool === 'edit-text') && (
        <div className="bg-[var(--app-bg-card)]/95 absolute bottom-[5.5rem] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-1 border-r border-[var(--app-border)] pr-2">
            <input
              type="color"
              value={textStyle.color}
              onChange={(e) => {
                if (activeTool === 'edit-text') {
                  document.execCommand('foreColor', false, e.target.value)
                  setTextStyle((s) => ({ ...s, color: e.target.value }))
                } else updateTextStyle({ color: e.target.value })
              }}
              className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
              title="Text Color"
            />
          </div>
          <div className="flex items-center gap-1 border-r border-[var(--app-border)] pr-2">
            <select
              value={textStyle.fontFamily}
              onChange={(e) => {
                if (activeTool === 'edit-text') {
                  document.execCommand('fontName', false, e.target.value)
                  setTextStyle((s) => ({ ...s, fontFamily: e.target.value }))
                } else updateTextStyle({ fontFamily: e.target.value })
              }}
              className="cursor-pointer rounded border border-[var(--app-border)] bg-[var(--app-bg-deepest)] px-1.5 py-0.5 text-xs text-[var(--app-text-secondary)] outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
            >
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier">Courier</option>
              <option value="Arial">Arial</option>
            </select>
          </div>
          <div className="flex items-center gap-1 border-r border-[var(--app-border)] pr-2">
            <select
              value={textStyle.fontSize}
              onChange={(e) => {
                if (activeTool === 'edit-text') {
                  document.execCommand('fontSize', false, '7')
                  setTextStyle((s) => ({ ...s, fontSize: Number(e.target.value) }))
                } else updateTextStyle({ fontSize: Number(e.target.value) })
              }}
              className="cursor-pointer rounded border border-[var(--app-border)] bg-[var(--app-bg-deepest)] px-1.5 py-0.5 text-xs text-[var(--app-text-secondary)] outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
            >
              {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36].map((s) => (
                <option key={s} value={s}>
                  {s} pt
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1 border-r border-[var(--app-border)] pr-2">
            <button
              onClick={() => {
                if (activeTool === 'edit-text') {
                  document.execCommand('bold')
                  setTextStyle((s) => ({ ...s, isBold: !s.isBold }))
                } else updateTextStyle({ isBold: !textStyle.isBold })
              }}
              className={`rounded p-1 ${textStyle.isBold ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)]' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (activeTool === 'edit-text') {
                  document.execCommand('italic')
                  setTextStyle((s) => ({ ...s, isItalic: !s.isItalic }))
                } else updateTextStyle({ isItalic: !textStyle.isItalic })
              }}
              className={`rounded p-1 ${textStyle.isItalic ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)]' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}
            >
              <Italic className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 border-r border-[var(--app-border)] pr-2">
            <button
              onClick={() => updateTextStyle({ textAlign: 'left' })}
              className={`rounded p-1 ${textStyle.textAlign === 'left' ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)]' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}
            >
              <AlignLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => updateTextStyle({ textAlign: 'center' })}
              className={`rounded p-1 ${textStyle.textAlign === 'center' ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)]' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}
            >
              <AlignCenter className="h-4 w-4" />
            </button>
            <button
              onClick={() => updateTextStyle({ textAlign: 'right' })}
              className={`rounded p-1 ${textStyle.textAlign === 'right' ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)]' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}
            >
              <AlignRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 border-r border-[var(--app-border)] pr-2">
            <button
              onClick={() => updateTextStyle({ verticalAlign: 'top' })}
              className={`rounded p-1 ${textStyle.verticalAlign === 'top' ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)]' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}
            >
              <AlignVerticalJustifyStart className="h-4 w-4" />
            </button>
            <button
              onClick={() => updateTextStyle({ verticalAlign: 'middle' })}
              className={`rounded p-1 ${textStyle.verticalAlign === 'middle' ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)]' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}
            >
              <AlignVerticalJustifyCenter className="h-4 w-4" />
            </button>
            <button
              onClick={() => updateTextStyle({ verticalAlign: 'bottom' })}
              className={`rounded p-1 ${textStyle.verticalAlign === 'bottom' ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)]' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}
            >
              <AlignVerticalJustifyEnd className="h-4 w-4" />
            </button>
          </div>

          {editingTextId ? (
            <div className="flex items-center gap-2 pl-1">
              <button
                onClick={() => {
                  saveHistoryState()
                  setTextOverlays((prev) => prev.filter((t) => t.id !== editingTextId))
                  setEditingTextId(null)
                }}
                className="rounded p-1 text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-red-500"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              {activeTool === 'edit-text' && (
                <>
                  <button
                    onClick={() => setEditingTextId(null)}
                    className="rounded px-3 py-1 text-xs text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setEditingTextId(null)}
                    className="rounded bg-[var(--app-accent)] px-3 py-1 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[var(--app-accent-hover)]"
                  >
                    Save
                  </button>
                </>
              )}
            </div>
          ) : activeTool === 'edit-text' || activeTool === 'text' ? (
            <div className="flex items-center gap-1 pl-1 text-xs text-[var(--app-accent)]">
              (Click anywhere on page to add text)
            </div>
          ) : (
            <div className="flex items-center gap-1 pl-1 text-xs text-[var(--app-text-muted)]">
              (Select Native Text & Apply)
            </div>
          )}
        </div>
      )}

      {/* PDF scroll area */}
      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-auto ${cursorClass} ${activeTool === 'edit-text' || activeTool === 'text' ? 'pdf-edit-text-mode' : ''} ${activeTool === 'hand' ? 'select-none' : ''}`}
        style={{ padding: '24px' }}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanMove}
        onMouseLeave={handlePanEnd}
      >
        <Document
          file={previewUrl}
          onLoadSuccess={({ numPages: np }) => setNumPages(np)}
          loading={
            <div className="flex h-[600px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          }
        >
          <div
            className={
              layoutMode === 'double'
                ? 'grid grid-cols-1 justify-items-center gap-6 md:grid-cols-2'
                : 'flex flex-col items-center gap-6'
            }
          >
            {Array.from({ length: numPages }, (_, i) => {
              const pageNum = i + 1
              const pageAnns = getPageAnnotations(pageNum)
              const pageTextOverlays = textOverlays.filter((t) => t.pageNumber === pageNum)

              return (
                <div
                  key={i}
                  ref={(el) => {
                    pageRefs.current[i] = el
                  }}
                  className="relative rounded shadow-2xl"
                  onClick={(e) => handlePageClick(pageNum, e)}
                  onMouseUp={() => handlePageSelection(pageNum)}
                >
                  <Page
                    pageNumber={pageNum}
                    scale={layoutMode === 'fitWidth' ? undefined : scale}
                    width={
                      layoutMode === 'fitWidth' && scrollContainerRef.current
                        ? scrollContainerRef.current.clientWidth - 80
                        : undefined
                    }
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
                  {textHighlights
                    .filter((th) => th.pageNumber === pageNum)
                    .map((th) => (
                      <div
                        key={th.id}
                        className="pointer-events-none absolute inset-0 z-0 opacity-50 mix-blend-multiply"
                      >
                        {th.rects.map((rect, idx) => (
                          <div
                            key={idx}
                            className="pointer-events-none absolute"
                            style={{
                              left: `${rect.x}%`,
                              top: `${rect.y}%`,
                              width: `${rect.width}%`,
                              height: `${rect.height}%`,
                              backgroundColor: th.color,
                            }}
                          />
                        ))}
                      </div>
                    ))}

                  {/* Native Text selection links */}
                  {documentLinks
                    .filter((l) => l.pageNumber === pageNum)
                    .map((link) => (
                      <div key={link.id} className="pointer-events-none absolute inset-0 z-10">
                        {link.rects.map((rect, idx) => (
                          <a
                            key={idx}
                            href={
                              link.type === 'website'
                                ? link.url?.startsWith('http')
                                  ? link.url
                                  : `https://${link.url}`
                                : '#'
                            }
                            onClick={(e) => {
                              if (
                                activeTool === 'edit-text' ||
                                activeTool === 'text' ||
                                activeTool === 'pencil' ||
                                activeTool === 'eraser' ||
                                activeTool === 'highlight'
                              ) {
                                e.preventDefault()
                                return
                              }
                              if (link.type === 'page') {
                                e.preventDefault()
                                if (link.targetPage) scrollToPage(link.targetPage)
                              }
                            }}
                            target={link.type === 'website' ? '_blank' : undefined}
                            rel={link.type === 'website' ? 'noopener noreferrer' : undefined}
                            className="pointer-events-auto absolute cursor-pointer border-b-2 border-amber-500/50 mix-blend-multiply transition-colors hover:bg-amber-500/20"
                            style={{
                              left: `${rect.x}%`,
                              top: `${rect.y}%`,
                              width: `${rect.width}%`,
                              height: `${rect.height}%`,
                            }}
                            title={
                              link.type === 'website' ? link.url : `Go to page ${link.targetPage}`
                            }
                          />
                        ))}
                      </div>
                    ))}

                  {/* Temporary link selection highlight */}
                  {newLinkSelection?.pageNum === pageNum && (
                    <div className="pointer-events-none absolute inset-0 z-10">
                      {newLinkSelection.rects.map((rect, idx) => (
                        <div
                          key={idx}
                          className="pointer-events-none absolute border border-amber-500/50 bg-amber-500/30 mix-blend-multiply"
                          style={{
                            left: `${rect.x}%`,
                            top: `${rect.y}%`,
                            width: `${rect.width}%`,
                            height: `${rect.height}%`,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Text overlays */}
                  {pageTextOverlays.map((to) => {
                    const scaledFontSize = (to.fontSize || 12) * scale
                    const scaledWidth = to.width ? to.width * scale : undefined
                    const scaledHeight = to.height ? to.height * scale : undefined

                    const tStyle: React.CSSProperties = {
                      fontFamily: to.fontFamily || 'Helvetica',
                      fontSize: `${scaledFontSize}px`,
                      fontWeight: to.isBold ? 'bold' : 'normal',
                      fontStyle: to.isItalic ? 'italic' : 'normal',
                      color: to.color || '#000000',
                      textAlign: to.textAlign || 'left',
                      lineHeight: 1.2,
                    }
                    const alignH =
                      to.textAlign === 'center' ? '-50%' : to.textAlign === 'right' ? '-100%' : '0'
                    const alignV =
                      to.verticalAlign === 'middle'
                        ? '-50%'
                        : to.verticalAlign === 'bottom'
                          ? '-100%'
                          : '0'
                    return (
                      <div
                        key={to.id}
                        className={`z-15 absolute ${editingTextId === to.id ? 'bg-blue-500/5 ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-400/50'}`}
                        style={{
                          left: `${to.x}%`,
                          top: `${to.y}%`,
                          transform: `translate(${alignH}, ${alignV})`,
                          width: scaledWidth ? `${scaledWidth}px` : 'auto',
                          height: scaledHeight ? `${scaledHeight}px` : 'auto',
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (
                            (activeTool === 'edit-text' || activeTool === 'text') &&
                            editingTextId !== to.id
                          ) {
                            setEditingTextId(to.id)
                            setTextStyle({
                              fontFamily: to.fontFamily || 'Helvetica',
                              fontSize: to.fontSize || 12,
                              isBold: to.isBold || false,
                              isItalic: to.isItalic || false,
                              color: to.color || '#000000',
                              textAlign: to.textAlign || 'left',
                              verticalAlign: to.verticalAlign || 'top',
                            })
                          }
                        }}
                      >
                        {editingTextId === to.id ? (
                          <div className="group relative h-full w-full">
                            <textarea
                              value={to.text}
                              onChange={(e) => handleTextChange(to.id, e.target.value)}
                              onBlur={(e) => {
                                if (
                                  !e.relatedTarget ||
                                  !(e.relatedTarget as HTMLElement).closest('.z-40')
                                ) {
                                  handleTextChange(to.id, e.target.value)
                                  // Do not clear editingTextId so they can click Save/Delete/Cancel
                                }
                              }}
                              onKeyDown={(e) => {
                                e.stopPropagation()
                              }}
                              className="h-full w-full resize-none bg-transparent p-2 outline-none"
                              style={tStyle}
                              autoFocus
                              placeholder="(Empty)"
                            />
                            {(activeTool === 'edit-text' || activeTool === 'text') && (
                              <div
                                className="pointer-events-auto absolute -bottom-1.5 -right-1.5 z-10 flex h-3 w-3 cursor-nwse-resize items-center justify-center rounded-full border-[1.5px] border-white bg-red-500 shadow-md"
                                onMouseDown={(e) => {
                                  e.stopPropagation()
                                  const startX = e.clientX
                                  const startY = e.clientY
                                  const startW = to.width || 250
                                  const startH = to.height || 40

                                  const onMove = (ev: MouseEvent) => {
                                    const dx = (ev.clientX - startX) / scale
                                    const dy = (ev.clientY - startY) / scale
                                    setTextOverlays((prev) =>
                                      prev.map((t) =>
                                        t.id === to.id
                                          ? {
                                              ...t,
                                              width: Math.max(50, startW + dx),
                                              height: Math.max(20, startH + dy),
                                            }
                                          : t
                                      )
                                    )
                                  }
                                  const onUp = () => {
                                    window.removeEventListener('mousemove', onMove)
                                    window.removeEventListener('mouseup', onUp)
                                  }
                                  window.addEventListener('mousemove', onMove)
                                  window.addEventListener('mouseup', onUp)
                                }}
                              />
                            )}
                          </div>
                        ) : (
                          <div
                            className="block h-full w-full cursor-text overflow-hidden p-2"
                            style={{ ...tStyle, whiteSpace: 'pre-wrap' }}
                          >
                            {to.text ||
                              (activeTool === 'edit-text' || activeTool === 'text'
                                ? '(Empty)'
                                : '')}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Annotation pins */}
                  {pageAnns.map((ann) => (
                    <div
                      key={ann.id}
                      className={`absolute z-10 -ml-3 -mt-3 flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full font-bold shadow-lg transition-transform hover:scale-125 ${ann.resolved ? 'bg-green-500/90' : 'bg-amber-500/90'}`}
                      style={{ left: `${ann.positionX}%`, top: `${ann.positionY}%` }}
                      title={ann.content}
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowComments(true)
                        document
                          .getElementById(`comment-${ann.id}`)
                          ?.scrollIntoView({ behavior: 'smooth' })
                      }}
                    >
                      {ann.user?.image ? (
                        <img
                          src={ann.user.image}
                          alt={ann.user.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="block text-[10px] uppercase text-white">
                          {ann.user?.name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* New comment pin */}
                  {newCommentPos && newCommentPos.page === pageNum && (
                    <div
                      className="absolute z-20 -ml-3 -mt-3 flex h-6 w-6 animate-pulse items-center justify-center rounded-full bg-amber-500 shadow-lg"
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
      <div className="bg-[var(--app-bg-card)]/90 absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-[var(--app-border)] px-3 py-2 shadow-2xl backdrop-blur-xl">
        {toolbarItems.map((item) => {
          if (item.id.startsWith('sep')) {
            return <div key={item.id} className="bg-[var(--app-border)]/30 mx-1.5 h-6 w-px" />
          }
          const Icon = item.icon!
          const isActive = activeTool === item.id
          return (
            <button
              key={item.id}
              disabled={
                (item.id === 'undo' && history.length === 0) ||
                (item.id === 'redo' && redoStack.length === 0)
              }
              onClick={() => {
                if (item.id === 'undo') handleUndo()
                else if (item.id === 'redo') handleRedo()
                else if (item.id === 'layout') cycleLayout()
                else setActiveTool((prev) => (prev === item.id ? 'cursor' : item.id))
              }}
              className={`rounded-xl p-2.5 transition-all ${
                isActive
                  ? 'scale-110 bg-[var(--app-accent)] text-white shadow-sm'
                  : item.id === 'layout' && layoutMode === 'double'
                    ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)]'
                    : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] disabled:opacity-20 disabled:hover:bg-transparent'
              }`}
              title={item.label}
            >
              <Icon className="h-5 w-5" />
            </button>
          )
        })}
      </div>

      {/* BOTTOM LEFT: Page nav */}
      <div className="bg-[var(--app-bg-card)]/90 absolute bottom-6 left-6 z-40 flex items-center gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2 shadow-xl backdrop-blur-xl">
        <button
          onClick={prevPage}
          disabled={currentPage <= 1}
          className="rounded-lg p-1.5 text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] disabled:opacity-20"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[90px] select-none px-2 text-center text-xs font-bold tracking-tight text-[var(--app-text-secondary)]">
          {getPageDisplay()} / {numPages || '–'}
        </span>
        <button
          onClick={nextPage}
          disabled={currentPage >= numPages}
          className="rounded-lg p-1.5 text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] disabled:opacity-20"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* BOTTOM RIGHT: Zoom + fullscreen */}
      <div className="bg-[var(--app-bg-card)]/90 absolute bottom-6 right-6 z-40 flex items-center gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2 shadow-xl backdrop-blur-xl">
        <button
          onClick={zoomOut}
          className="rounded-lg p-1.5 text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[45px] select-none text-center text-xs font-bold text-[var(--app-text-secondary)]">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={zoomIn}
          className="rounded-lg p-1.5 text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <div className="bg-[var(--app-border)]/30 mx-1 h-5 w-px" />
        <button
          onClick={toggleFullscreen}
          className="rounded-lg p-1.5 text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// TEXT EDITOR
// =============================================================================

function TextEditor({
  content,
  onSave,
  isSaving,
}: {
  content: string
  onSave: (content: string) => void
  isSaving: boolean
}) {
  const { t } = useTranslation()
  const [text, setText] = useState(content)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setHasChanges(text !== content)
  }, [text, content])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--app-bg-deepest)]">
      <div className="border-[var(--app-border)]/50 flex items-center justify-between border-b bg-[var(--app-bg-card)] px-4 py-2">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              {t('files.viewer.unsaved_changes', 'Unsaved changes')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setText(content)}
            disabled={!hasChanges}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] disabled:opacity-30"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('files.viewer.revert', 'Revert')}
          </button>
          <button
            onClick={() => onSave(text)}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-1 rounded-lg bg-[var(--app-accent)] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-40"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {t('common.save', 'Save')}
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="custom-scrollbar h-full w-full resize-none bg-[var(--app-bg-deepest)] p-6 font-mono text-sm leading-relaxed text-[var(--app-text-primary)] focus:outline-none"
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
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--app-bg-deepest)]">
      <div className="border-[var(--app-border)]/50 flex items-center justify-center gap-4 border-b bg-[var(--app-bg-card)] px-4 py-2">
        <button
          onClick={() => setScale((s) => Math.max(0.25, s - 0.25))}
          className="rounded-lg p-2 text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[50px] text-center text-xs font-bold text-[var(--app-text-secondary)]">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(5, s + 0.25))}
          className="rounded-lg p-2 text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>
      <div className="custom-scrollbar flex flex-1 items-center justify-center overflow-auto bg-[var(--app-bg-deepest)] p-8">
        <div className="border-[var(--app-border)]/30 relative overflow-hidden rounded-lg border shadow-2xl">
          <img
            src={previewUrl}
            alt={fileName}
            style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
            className="max-w-none transition-transform duration-200 ease-out"
          />
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// DOCX VIEWER
// =============================================================================

// A4 page dimensions in pixels at 96 DPI
const A4_WIDTH = 794 // 210mm
const A4_HEIGHT = 1123 // 297mm
const PAGE_PADDING = 64 // px padding inside each page

// =============================================================================
// DOCX THUMBNAILS SIDEBAR
// =============================================================================

function DocxThumbnails({
  pages,
  currentPage,
  onPageClick,
  onClose,
  layoutMode,
}: {
  pages: string[]
  currentPage: number
  onPageClick: (page: number) => void
  onClose: () => void
  layoutMode: LayoutMode
}) {
  const { t } = useTranslation()
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([])
  const numPages = pages.length

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

  const thumbScale = 0.15

  return (
    <div className="animate-in fade-in slide-in-from-left-4 absolute bottom-20 left-4 top-4 z-30 flex min-h-0 w-[170px] flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-2xl backdrop-blur-xl duration-300">
      <div className="border-[var(--app-border)]/50 bg-[var(--app-bg-elevated)]/30 flex items-center justify-between border-b px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">
          {t('files.viewer.thumbnails', 'Thumbnails')}
        </span>
        <button
          onClick={onClose}
          className="text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="custom-scrollbar flex-1 space-y-3 overflow-auto px-3 py-3">
        {pageGroups.map((group, gIdx) => {
          const isActive = group.includes(currentPage)
          return (
            <div
              key={gIdx}
              ref={(el) => {
                thumbRefs.current[gIdx] = el
              }}
              className={`hover:border-[var(--app-accent)]/50 relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all ${
                isActive
                  ? 'scale-[1.02] border-[var(--app-accent)] shadow-lg'
                  : 'border-transparent opacity-70 hover:scale-[1.01] hover:opacity-100'
              }`}
              onClick={() => onPageClick(group[0])}
            >
              <div
                className={`flex ${layoutMode === 'double' ? 'gap-0.5' : 'justify-center'} overflow-hidden rounded-lg bg-white p-1`}
              >
                {group.map((pageNum) => (
                  <div
                    key={pageNum}
                    className="relative flex-shrink-0 overflow-hidden bg-white text-black shadow-sm"
                    style={{
                      width: `${A4_WIDTH * thumbScale}px`,
                      height: `${A4_HEIGHT * thumbScale}px`,
                      padding: `${PAGE_PADDING * thumbScale}px`,
                    }}
                  >
                    <div
                      className="docx-content origin-top-left"
                      style={{
                        transform: `scale(${thumbScale})`,
                        width: `${A4_WIDTH - PAGE_PADDING * 2}px`,
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontSize: '12pt',
                        lineHeight: '1.6',
                      }}
                      dangerouslySetInnerHTML={{ __html: pages[pageNum - 1] }}
                    />
                  </div>
                ))}
              </div>
              <div
                className={`absolute inset-x-0 bottom-0 py-1 text-center text-[10px] font-bold ${
                  isActive ? 'bg-[var(--app-accent)] text-white' : 'bg-black/60 text-white'
                }`}
              >
                {group.length > 1 ? `${group[0]}-${group[1]}` : group[0]}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DocxViewer({
  previewUrl,
  showThumbnails,
  setShowThumbnails,
}: {
  previewUrl: string
  fileName: string
  showThumbnails: boolean
  setShowThumbnails: (v: boolean) => void
}) {
  const [html, setHtml] = useState<string | null>(null)
  const [pages, setPages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('double')
  const [activeTool, setActiveTool] = useState<string>('cursor')
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const cycleLayout = () => {
    if (layoutMode === 'single') setLayoutMode('double')
    else if (layoutMode === 'double') setLayoutMode('fitWidth')
    else setLayoutMode('single')
  }

  // Pan Tool
  const [isPanDragging, setIsPanDragging] = useState(false)
  const panStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)

  const handlePanStart = (e: React.MouseEvent) => {
    if (activeTool !== 'hand') return
    setIsPanDragging(true)
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: scrollRef.current?.scrollLeft || 0,
      top: scrollRef.current?.scrollTop || 0,
    }
  }
  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanDragging || !panStartRef.current || !scrollRef.current || activeTool !== 'hand')
      return
    const dx = e.clientX - panStartRef.current.x
    const dy = e.clientY - panStartRef.current.y
    scrollRef.current.scrollLeft = panStartRef.current.left - dx
    scrollRef.current.scrollTop = panStartRef.current.top - dy
  }
  const handlePanEnd = () => setIsPanDragging(false)

  // Convert DOCX to HTML
  useEffect(() => {
    const convert = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(previewUrl)
        const arrayBuffer = await response.arrayBuffer()
        const result = await mammoth.convertToHtml({ arrayBuffer })
        setHtml(DOMPurify.sanitize(result.value))
      } catch (err: any) {
        setError(err.message || 'Failed to load DOCX')
      } finally {
        setLoading(false)
      }
    }
    convert()
  }, [previewUrl])

  // Split HTML content into pages by measuring rendered height
  useEffect(() => {
    if (!html) return

    const splitIntoPages = () => {
      // Create an off-screen container to measure content
      const measurer = document.createElement('div')
      measurer.style.position = 'absolute'
      measurer.style.left = '-9999px'
      measurer.style.top = '0'
      measurer.style.width = `${A4_WIDTH - PAGE_PADDING * 2}px`
      measurer.style.fontFamily = 'Georgia, "Times New Roman", serif'
      measurer.style.fontSize = '12pt'
      measurer.style.lineHeight = '1.6'
      measurer.innerHTML = html
      document.body.appendChild(measurer)

      const contentHeight = A4_HEIGHT - PAGE_PADDING * 2
      const totalHeight = measurer.scrollHeight

      if (totalHeight <= contentHeight) {
        // Single page
        setPages([html])
        document.body.removeChild(measurer)
        return
      }

      // Split by child elements
      const children = Array.from(measurer.children) as HTMLElement[]
      const pageContents: string[] = []
      let currentPageHtml = ''
      let currentHeight = 0

      for (const child of children) {
        const childHeight =
          child.offsetHeight +
          parseInt(getComputedStyle(child).marginTop || '0') +
          parseInt(getComputedStyle(child).marginBottom || '0')

        if (currentHeight + childHeight > contentHeight && currentPageHtml) {
          pageContents.push(currentPageHtml)
          currentPageHtml = child.outerHTML
          currentHeight = childHeight
        } else {
          currentPageHtml += child.outerHTML
          currentHeight += childHeight
        }
      }

      if (currentPageHtml) {
        pageContents.push(currentPageHtml)
      }

      // If no elements could be split, fall back to single page
      if (pageContents.length === 0) {
        pageContents.push(html)
      }

      setPages(pageContents)
      document.body.removeChild(measurer)
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(splitIntoPages, 100)
    return () => clearTimeout(timer)
  }, [html])

  // Track current page on scroll
  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return

    const handleScroll = () => {
      const scrollTop = scrollEl.scrollTop
      const viewportMid = scrollTop + scrollEl.clientHeight / 2

      for (let i = 0; i < pageRefs.current.length; i++) {
        const page = pageRefs.current[i]
        if (page) {
          const top = page.offsetTop
          const bottom = top + page.offsetHeight
          if (viewportMid >= top && viewportMid < bottom) {
            setCurrentPage(i + 1)
            break
          }
        }
      }
    }

    scrollEl.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollEl.removeEventListener('scroll', handleScroll)
  }, [pages.length])

  const scrollToPage = (pageNum: number) => {
    const page = pageRefs.current[pageNum - 1]
    if (page && scrollRef.current) {
      scrollRef.current.scrollTo({ top: page.offsetTop - 24, behavior: 'smooth' })
    }
  }

  const zoomIn = () => setScale((s) => Math.min(3, s + 0.25))
  const zoomOut = () => setScale((s) => Math.max(0.25, s - 0.25))

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {})
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {})
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const numPages = pages.length
  const prevPage = () => {
    if (currentPage > 1) scrollToPage(currentPage - 1)
  }
  const nextPage = () => {
    if (currentPage < numPages) scrollToPage(currentPage + 1)
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[var(--app-bg-deepest)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <span className="text-sm text-gray-400">Konwertowanie dokumentu...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[var(--app-bg-deepest)]">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    )
  }

  const cursorClass = activeTool === 'hand' ? 'cursor-grab active:cursor-grabbing' : ''

  const getPageDisplay = () => {
    if (layoutMode === 'double') {
      const end = Math.min(numPages, currentPage + 1)
      return currentPage === end ? `${currentPage}` : `${currentPage}-${end}`
    }
    return `${currentPage}`
  }

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--app-bg-deepest)]"
    >
      {showThumbnails && (
        <DocxThumbnails
          pages={pages}
          currentPage={currentPage}
          onPageClick={scrollToPage}
          onClose={() => setShowThumbnails(false)}
          layoutMode={layoutMode}
        />
      )}

      {/* Scroll area with pages */}
      <div
        ref={scrollRef}
        className={`custom-scrollbar flex flex-1 flex-col items-center overflow-auto bg-[var(--app-bg-deepest)] py-6 ${cursorClass}`}
        style={{ padding: '24px' }}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
      >
        <div
          className={
            layoutMode === 'double'
              ? 'grid grid-cols-1 justify-items-center gap-6 md:grid-cols-2'
              : 'flex flex-col items-center gap-6'
          }
        >
          {pages.map((pageHtml, i) => (
            <div
              key={i}
              ref={(el) => {
                pageRefs.current[i] = el
              }}
              className="relative flex-shrink-0 rounded-sm bg-white text-black shadow-2xl"
              style={{
                width:
                  layoutMode === 'fitWidth' && scrollRef.current
                    ? `${scrollRef.current.clientWidth - 80}px`
                    : `${A4_WIDTH * scale}px`,
                minHeight:
                  layoutMode === 'fitWidth' && scrollRef.current
                    ? `${(A4_HEIGHT / A4_WIDTH) * (scrollRef.current.clientWidth - 80)}px`
                    : `${A4_HEIGHT * scale}px`,
                padding:
                  layoutMode === 'fitWidth' && scrollRef.current
                    ? `${PAGE_PADDING * ((scrollRef.current.clientWidth - 80) / A4_WIDTH)}px`
                    : `${PAGE_PADDING * scale}px`,
                transformOrigin: 'top center',
              }}
            >
              <div
                className="docx-content"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize:
                    layoutMode === 'fitWidth' && scrollRef.current
                      ? `${12 * ((scrollRef.current.clientWidth - 80) / A4_WIDTH)}pt`
                      : `${12 * scale}pt`,
                  lineHeight: '1.6',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                }}
                dangerouslySetInnerHTML={{ __html: pageHtml }}
              />
              {/* Page number */}
              <div
                className="absolute bottom-3 right-4 select-none text-[10px] text-gray-400"
                style={{ fontSize: `${10 * scale}px` }}
              >
                {i + 1} / {numPages}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FLOATING BOTTOM TOOLBAR (center) — matching PDF viewer style */}
      <div className="bg-[var(--app-bg-card)]/90 absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-[var(--app-border)] px-3 py-2 shadow-2xl backdrop-blur-xl">
        <button
          onClick={() => setActiveTool('cursor')}
          className={`rounded-lg p-1.5 transition-all ${activeTool === 'cursor' ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)]' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}
          title="Select tool"
        >
          <MousePointer className="h-4 w-4" />
        </button>
        <button
          onClick={() => setActiveTool('hand')}
          className={`rounded-lg p-1.5 transition-all ${activeTool === 'hand' ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)]' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}
          title="Pan tool"
        >
          <Hand className="h-4 w-4" />
        </button>

        <div className="bg-[var(--app-border)]/30 mx-1.5 h-6 w-px" />

        <button
          onClick={cycleLayout}
          className={`rounded-lg p-1.5 transition-all ${layoutMode !== 'single' ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)]' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}
          title={
            layoutMode === 'single'
              ? 'Switch to double page'
              : layoutMode === 'double'
                ? 'Switch to fit width'
                : 'Switch to single page'
          }
        >
          {layoutMode === 'single' ? (
            <Columns2 className="h-4 w-4" />
          ) : layoutMode === 'double' ? (
            <Rows2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </button>

        <div className="bg-[var(--app-border)]/30 mx-1.5 h-6 w-px" />

        {/* Page style info */}
        <div className="flex select-none items-center gap-1 px-2 py-1 text-xs font-semibold text-[var(--app-text-muted)]">
          <FileText className="h-4 w-4" />
          <span>DOCX</span>
        </div>
      </div>

      {/* BOTTOM LEFT: Page nav */}
      <div className="bg-[var(--app-bg-card)]/90 absolute bottom-6 left-6 z-40 flex items-center gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2 shadow-xl backdrop-blur-xl">
        <button
          onClick={prevPage}
          disabled={currentPage <= 1}
          className="rounded-lg p-1.5 text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] disabled:opacity-20"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[90px] select-none px-2 text-center text-xs font-bold tracking-tight text-[var(--app-text-secondary)]">
          {getPageDisplay()} / {numPages || '–'}
        </span>
        <button
          onClick={nextPage}
          disabled={currentPage >= numPages}
          className="rounded-lg p-1.5 text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] disabled:opacity-20"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* BOTTOM RIGHT: Zoom + fullscreen */}
      <div className="bg-[var(--app-bg-card)]/90 absolute bottom-6 right-6 z-40 flex items-center gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2 shadow-xl backdrop-blur-xl">
        <button
          onClick={zoomOut}
          className="rounded-lg p-1.5 text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[45px] select-none text-center text-xs font-bold text-[var(--app-text-secondary)]">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={zoomIn}
          className="rounded-lg p-1.5 text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <div className="bg-[var(--app-border)]/30 mx-1 h-5 w-px" />
        <button
          onClick={toggleFullscreen}
          className="rounded-lg p-1.5 text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
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
  const isDocx =
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'docx'
  const textTypes = [
    'txt',
    'md',
    'csv',
    'json',
    'html',
    'css',
    'js',
    'ts',
    'jsx',
    'tsx',
    'xml',
    'yaml',
    'yml',
    'env',
    'log',
  ]
  const isText = mimeType.startsWith('text/') || textTypes.includes(fileType)

  useEffect(() => {
    const fetchFile = async () => {
      setLoading(true)
      setError(null)
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

  const handleAddAnnotation = useCallback(
    async (data: { pageNumber: number; positionX: number; positionY: number; content: string }) => {
      try {
        const res = await apiFetchJson<any>('/api/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId, ...data, type: 'comment' }),
        })
        if (res.data) {
          const annRes = await apiFetchJson<any>(`/api/annotations?fileId=${fileId}`)
          setAnnotations(annRes.data || [])
        }
      } catch (err) {
        console.error('Failed to add annotation:', err)
      }
    },
    [fileId]
  )

  const handleDeleteAnnotation = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/annotations/${id}`, { method: 'DELETE' })
      setAnnotations((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      console.error('Failed to delete annotation:', err)
    }
  }, [])

  const handleResolveAnnotation = useCallback(async (id: string, resolved: boolean) => {
    try {
      await apiFetch(`/api/annotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved }),
      })
      setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, resolved } : a)))
    } catch (err) {
      console.error('Failed to resolve annotation:', err)
    }
  }, [])

  const handleReplyAnnotation = useCallback(
    async (parentId: string, content: string) => {
      try {
        await apiFetchJson<any>('/api/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId, content, parentId, type: 'comment' }),
        })
        const annRes = await apiFetchJson<any>(`/api/annotations?fileId=${fileId}`)
        setAnnotations(annRes.data || [])
      } catch (err) {
        console.error('Failed to reply:', err)
      }
    },
    [fileId]
  )

  const handleSaveText = useCallback(
    async (content: string) => {
      setIsSaving(true)
      try {
        await apiFetch(`/api/files/${fileId}/content`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
        setTextContent(content)
      } catch (err) {
        console.error('Failed to save:', err)
      } finally {
        setIsSaving(false)
      }
    },
    [fileId]
  )

  const handleDownload = useCallback(async () => {
    try {
      const res = await apiFetchJson<any>(`/api/files/${fileId}/download`)
      if (res.downloadUrl) window.open(res.downloadUrl, '_blank')
    } catch (err) {
      console.error('Failed to download:', err)
    }
  }, [fileId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[var(--app-bg-deepest)] text-[var(--app-text-primary)]">
      {/* FLOATING HEADER — no border */}
      <div className="bg-[var(--app-bg-card)]/90 absolute left-4 right-4 top-4 z-40 flex h-14 items-center justify-between rounded-2xl border border-[var(--app-border)] px-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
          >
            <X className="h-4 w-4" />
            <span>{t('common.close')}</span>
          </button>

          <div className="bg-[var(--app-border)]/30 h-6 w-px" />

          <div className="flex items-center gap-3">
            <div className="bg-[var(--app-accent)]/10 border-[var(--app-accent)]/20 flex h-6 w-6 items-center justify-center rounded-lg border">
              <span className="text-[10px] font-black uppercase text-[var(--app-accent)]">
                {fileData?.fileType || '?'}
              </span>
            </div>
            <span className="max-w-[400px] truncate text-sm font-bold text-[var(--app-text-primary)]">
              {fileData?.name || t('files.viewer.loading')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
          >
            <Download className="h-4 w-4" />
            <span>{t('files.actions.download')}</span>
          </button>

          {(isPdf || isDocx) && (
            <>
              <div className="bg-[var(--app-border)]/30 mx-1 h-6 w-px" />
              <button
                onClick={() => setShowThumbnails((v) => !v)}
                className={`rounded-xl p-2.5 transition-all ${showThumbnails ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)] shadow-sm' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}
                title="Toggle thumbnails"
              >
                <GalleryVerticalEnd className="h-4 w-4" />
              </button>
            </>
          )}
          {isPdf && (
            <button
              onClick={() => setShowComments((v) => !v)}
              className={`rounded-xl p-2.5 transition-all ${showComments ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)] shadow-sm' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}
              title="Toggle comments"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex min-h-0 flex-1 flex-col pt-[60px]">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <span className="text-sm text-gray-400">
                {t('files.viewer.loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 rounded-lg px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              >
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
            {isDocx && previewUrl && (
              <DocxViewer
                previewUrl={previewUrl}
                fileName={fileData?.name || ''}
                showThumbnails={showThumbnails}
                setShowThumbnails={setShowThumbnails}
              />
            )}
            {!isPdf && !isText && !isImage && !isDocx && (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-gray-400">
                    {t('files.viewer.unsupported', 'This file type cannot be previewed.')}
                  </p>
                  <button
                    onClick={handleDownload}
                    className="mx-auto mt-4 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                  >
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
