import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, FileText, Palette, Search, Trash2, ArrowLeft, Share2, Undo2, Redo2, MessageSquare, MoreVertical } from 'lucide-react'
import { useWhiteboards, useCreateBoard, useDeleteBoard, useUpdateBoard } from '@/hooks/useWhiteboards'
import { useDocuments, useCreateDocument, useDeleteDocument, useUpdateDocument } from '@/hooks/useDocuments'
import { MiroBoard } from '@/components/features/whiteboards/Miroboard'
import { TiptapEditor } from '@/components/features/docs/TiptapEditor'
import { CreationSidePanel } from '@/components/features/shared/CreationSidePanel'
import { useSession } from '@/lib/auth'
import { format } from 'date-fns'
import { debounce } from 'lodash'
import * as locales from 'date-fns/locale'
import { useThemeStore } from '@/lib/themeStore'

export const Route = createFileRoute('/$workspaceSlug/board/')({
    component: BoardPage,
})

type ResourceType = 'doc' | 'whiteboard'

interface Resource {
    id: string
    name: string
    type: ResourceType
    updatedAt: string
    data?: any // For whiteboard
    content?: any // For document
}

function BoardPage() {
    const { t, i18n } = useTranslation()
    const { workspaceSlug } = Route.useParams()
    const { data: session } = useSession()
    const user = session?.user
    const { theme } = useThemeStore()

    // Fetch both types of resources
    const { data: whiteboards, isLoading: isWhiteboardsLoading } = useWhiteboards(workspaceSlug)
    const { data: documents, isLoading: isDocumentsLoading } = useDocuments(workspaceSlug)

    // Mutations for Whiteboards
    const { mutate: createBoard } = useCreateBoard()
    const { mutate: updateBoard } = useUpdateBoard()
    const { mutate: deleteBoard } = useDeleteBoard()

    // Mutations for Documents
    const { mutate: createDoc } = useCreateDocument()
    const { mutate: updateDoc } = useUpdateDocument()
    const { mutate: deleteDoc } = useDeleteDocument()

    const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null)
    const [isCreationModalOpen, setIsCreationModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeCollaborators, setActiveCollaborators] = useState<any[]>([])
    const [characterCount, setCharacterCount] = useState(0)
    const [isSaving, setIsSaving] = useState(false)
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
    const [editorActions, setEditorActions] = useState({
        canUndo: false,
        canRedo: false,
        undo: () => { },
        redo: () => { },
    })
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false)

    // Consolidate resources into one list
    const resources = useMemo(() => {
        const boardsList: Resource[] = (whiteboards || []).map(b => ({
            id: b.id,
            name: b.name,
            type: 'whiteboard',
            updatedAt: b.updatedAt.toString(),
            data: b.data
        }))
        const docsList: Resource[] = (documents || []).map(d => ({
            id: d.id,
            name: d.title,
            type: 'doc',
            updatedAt: d.updatedAt.toString(),
            content: d.content
        }))
        return [...boardsList, ...docsList].sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
    }, [whiteboards, documents])

    const selectedResource = resources.find(r => r.id === selectedResourceId)
    const isWhiteboardSelected = selectedResource?.type === 'whiteboard'

    // Debounced updates
    const debouncedUpdateBoard = useCallback(
        debounce((id: string, data: any) => {
            updateBoard({ id, ...data })
        }, 1000),
        []
    )

    const debouncedUpdateDoc = useMemo(
        () =>
            debounce((id: string, data: any) => {
                updateDoc(
                    { id, ...data },
                    {
                        onSuccess: (updated) => {
                            setLastSavedAt(new Date(updated.updatedAt))
                            setIsSaving(false)
                        },
                        onError: () => {
                            setIsSaving(false)
                        },
                    }
                )
            }, 900),
        [updateDoc]
    )

    useEffect(() => {
        return () => {
            debouncedUpdateDoc.cancel()
        }
    }, [debouncedUpdateDoc])

    useEffect(() => {
        if (selectedResource?.type === 'doc' && selectedResource.updatedAt) {
            setLastSavedAt(new Date(selectedResource.updatedAt))
        }
    }, [selectedResource?.id, selectedResource?.updatedAt, selectedResource?.type])

    const queueDocSave = useCallback(
        (id: string, data: any) => {
            setIsSaving(true)
            debouncedUpdateDoc(id, data)
        },
        [debouncedUpdateDoc]
    )

    const filteredResources = resources.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleCreateBoard = (name: string) => {
        createBoard({
            name,
            workspaceId: workspaceSlug,
            data: {}
        }, {
            onSuccess: (data) => {
                setIsCreationModalOpen(false)
                setSelectedResourceId(data.id)
            },
            onError: (error) => {
                alert(t('resources.creation_error', { defaultValue: 'Failed to create board: ' }) + error.message)
            }
        })
    }

    const handleCreateDocument = (name: string) => {
        createDoc({
            title: name,
            workspaceId: workspaceSlug,
            content: {
                type: 'doc',
                content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: name }] }]
            }
        }, {
            onSuccess: (data) => {
                setIsCreationModalOpen(false)
                setSelectedResourceId(data.id)
            },
            onError: (error) => {
                alert(t('resources.creation_error', { defaultValue: 'Failed to create document: ' }) + error.message)
            }
        })
    }

    const handleDelete = () => {
        if (!selectedResource) return
        if (confirm(t('resources.delete_confirm'))) {
            if (selectedResource.type === 'whiteboard') {
                deleteBoard(selectedResource.id, { onSuccess: () => setSelectedResourceId(null) })
            } else {
                deleteDoc(selectedResource.id, { onSuccess: () => setSelectedResourceId(null) })
            }
        }
    }

    if (isWhiteboardsLoading || isDocumentsLoading) {
        return <div className="p-8 animate-pulse text-[var(--app-text-muted)]">{t('resources.loading')}</div>
    }

    // Editor View
    if (selectedResource) {
        return (
            <div className="flex flex-col h-full bg-[var(--app-bg-deepest)]">
                <div className="flex-none h-14 px-3 bg-[var(--app-bg-sidebar)] flex items-center justify-between border-b border-[var(--app-border)]">
                    <div className="flex items-center gap-4 flex-1">
                        <button
                            onClick={() => setSelectedResourceId(null)}
                            className="p-2 rounded-xl hover:bg-[var(--app-bg-elevated)] text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] transition-all flex items-center justify-center border border-transparent hover:border-[var(--app-border)] shadow-sm bg-[var(--app-bg-elevated)]/50"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-2 flex-1">
                            {selectedResource.type === 'doc' ? <FileText size={20} className="text-[var(--app-accent)]" /> : (
                                <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] dark:bg-[#1d2434] text-[var(--app-text-primary)] flex items-center justify-center font-semibold text-sm">M</div>
                            )}
                            <input
                                type="text"
                                value={selectedResource.name}
                                onChange={(e) => {
                                    if (selectedResource.type === 'whiteboard') {
                                        debouncedUpdateBoard(selectedResource.id, { name: e.target.value })
                                    } else {
                                        queueDocSave(selectedResource.id, { title: e.target.value })
                                    }
                                }}
                                className="text-xl font-bold bg-transparent border-none outline-none text-[var(--app-text-primary)] w-full focus:ring-0 max-w-[420px]"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <>
                            <div className="hidden md:flex items-center -space-x-2 mr-2">
                                {activeCollaborators.slice(0, 5).map((collab) => (
                                    <div
                                        key={collab.userId || collab.name}
                                        className="w-8 h-8 rounded-full border-2 border-[var(--app-bg-sidebar)] bg-gray-600 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white relative"
                                        style={{ backgroundColor: collab.color?.background || collab.color }}
                                        title={collab.username || collab.name}
                                    >
                                        {collab.avatarUrl ? (
                                            <img src={collab.avatarUrl} alt={collab.username || collab.name} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            (collab.username || collab.name || '?').charAt(0).toUpperCase()
                                        )}
                                    </div>
                                ))}
                                {activeCollaborators.length === 0 && (
                                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-[var(--app-border)] bg-transparent ml-1" />
                                )}
                            </div>
                            <button className="hidden md:flex p-2 rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)]">
                                <MessageSquare size={18} />
                            </button>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    alert("Skopiowano link!");
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--app-accent)] text-[var(--app-accent-text)] hover:brightness-110 transition-all font-bold"
                            >
                                <Share2 size={14} />
                                <span>Share</span>
                            </button>

                            {/* Dropdown Menu for More Options */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsOptionsMenuOpen(!isOptionsMenuOpen)}
                                    className="p-2 rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)]"
                                >
                                    <MoreVertical size={18} />
                                </button>

                                {isOptionsMenuOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsOptionsMenuOpen(false)}
                                        />
                                        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-[var(--app-shadow-card)] overflow-hidden z-50 py-1">
                                            <button
                                                onClick={() => {
                                                    setIsOptionsMenuOpen(false);
                                                    handleDelete();
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors text-left"
                                            >
                                                <Trash2 size={16} />
                                                <span>{t('resources.delete', { defaultValue: 'Usuń' })}</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    </div>
                </div>
                <div className="flex-1 relative overflow-hidden">
                    {selectedResource.type === 'whiteboard' ? (
                        <MiroBoard
                            key={selectedResource.id}
                            boardId={selectedResource.id}
                            initialData={selectedResource.data}
                            onSave={(data) => debouncedUpdateBoard(selectedResource.id, { data })}
                            boardName={selectedResource.name}
                            theme={theme}
                        />
                    ) : (
                        <>
                            <div className="h-full overflow-y-auto custom-scrollbar bg-[var(--app-bg-page)] p-6">
                                <div className="max-w-5xl mx-auto">
                                    <TiptapEditor
                                        key={selectedResource.id}
                                        documentId={selectedResource.id}
                                        user={user}
                                        onCollaboratorsChange={setActiveCollaborators}
                                        content={selectedResource.content}
                                        onChange={(content) => queueDocSave(selectedResource.id, { content })}
                                        onCharacterCountChange={setCharacterCount}
                                        onEditorActionsChange={setEditorActions}
                                    />
                                </div>
                            </div>

                            {/* Floating Undo/Redo Controls */}
                            <div className="absolute bottom-6 right-6 flex items-center bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl shadow-lg p-1 z-[50]">
                                <button
                                    onClick={editorActions.undo}
                                    disabled={!editorActions.canUndo}
                                    className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-[var(--app-bg-card)] text-[var(--app-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Cofnij"
                                >
                                    <Undo2 size={18} />
                                </button>
                                <div className="w-[1px] h-6 bg-[var(--app-border)] mx-1" />
                                <button
                                    onClick={editorActions.redo}
                                    disabled={!editorActions.canRedo}
                                    className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-[var(--app-bg-card)] text-[var(--app-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Ponów"
                                >
                                    <Redo2 size={18} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
                {!isWhiteboardSelected && (
                    <div className="flex-none h-8 border-t border-[var(--app-border)] bg-[var(--app-bg-card)] px-4 text-xs text-[var(--app-text-muted)] flex items-center justify-between">
                        <span>Ostatnia edycja: {format(lastSavedAt ? new Date(lastSavedAt) : new Date(selectedResource.updatedAt), 'd MMM yyyy, HH:mm')}</span>
                        <span>{characterCount} znaków</span>
                        <span>{isSaving ? 'Zapisywanie...' : 'Zapisano automatycznie'}</span>
                    </div>
                )}
                {isWhiteboardSelected && (
                    <div className="flex-none h-8 border-t border-[var(--app-border)] bg-[var(--app-bg-card)] px-4 text-xs text-[var(--app-text-muted)] flex items-center justify-between">
                        <span>Last saved: {format(new Date(selectedResource.updatedAt), 'HH:mm')}</span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Connected • {activeCollaborators.length} online
                        </span>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-[var(--app-bg-deepest)]">
            {/* Header */}
            <div className="flex-none px-6 pt-5 pb-4 flex items-center justify-between border-b border-[var(--app-border)]">
                <h1 className="text-2xl font-bold text-[var(--app-text-primary)]">{t('resources.title')}</h1>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]" />
                        <input
                            type="text"
                            placeholder={t('resources.search_placeholder')}
                            className="bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-full py-1.5 pl-9 pr-4 text-xs focus:ring-1 focus:ring-[var(--app-accent)] outline-none min-w-[200px]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsCreationModalOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--app-accent)] text-[var(--app-accent-text)] text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-amber-500/20 border border-white/10"
                    >
                        <Plus size={16} strokeWidth={3} />
                        {t('resources.new_content')}
                    </button>
                </div>
            </div>

            {/* Content Hub Grid */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {filteredResources.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredResources.map(resource => (
                            <button
                                key={resource.id}
                                onClick={() => setSelectedResourceId(resource.id)}
                                className="group flex flex-col items-start p-4 rounded-2xl bg-[var(--app-bg-card)] border border-[var(--app-border)] hover:border-[var(--app-accent)]/30 hover:bg-[var(--app-bg-elevated)] transition-all text-left shadow-sm hover:shadow-md"
                            >
                                <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-[var(--app-bg-deepest)] to-[var(--app-bg-elevated)] border border-[var(--app-border)] mb-4 flex items-center justify-center overflow-hidden group-hover:scale-[1.02] transition-transform relative">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--app-accent)_0%,transparent_70%)] opacity-[0.03] group-hover:opacity-[0.07] transition-opacity" />
                                    {resource.type === 'doc' ? (
                                        <FileText size={32} className="text-[var(--app-text-muted)] opacity-20 relative z-10" />
                                    ) : (
                                        <Palette size={32} className="text-[var(--app-text-muted)] opacity-20 relative z-10" />
                                    )}

                                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-[var(--app-bg-deepest)]/60 backdrop-blur-md border border-[var(--app-border)] text-[8px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                        {resource.type === 'doc' ? 'DOC' : 'BOARD'}
                                    </div>
                                </div>
                                <h3 className="font-bold text-[var(--app-text-primary)] mb-1 truncate w-full group-hover:text-[var(--app-accent)] transition-colors">{resource.name}</h3>
                                <p className="text-[10px] text-[var(--app-text-muted)] uppercase tracking-wider font-medium">
                                    {format(new Date(resource.updatedAt), 'd MMM yyyy', {
                                        locale: (locales as any)[i18n.language] || (locales as any).enUS
                                    })}
                                </p>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
                        <h2 className="text-2xl font-bold text-[var(--app-text-primary)] mb-3">
                            {t('resources.page.empty_title')}
                        </h2>
                        <p className="text-[var(--app-text-muted)] text-sm leading-relaxed mb-8">
                            {t('resources.page.empty_description')}
                        </p>
                        <button
                            onClick={() => setIsCreationModalOpen(true)}
                            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[var(--app-accent)] text-[var(--app-accent-text)] text-sm font-bold hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-amber-500/20 border border-white/10"
                        >
                            <Plus size={18} strokeWidth={3} />
                            {t('resources.create_new_content')}
                        </button>
                    </div>
                )}
            </div>

            <CreationSidePanel
                isOpen={isCreationModalOpen}
                onClose={() => setIsCreationModalOpen(false)}
                onCreateDocument={handleCreateDocument}
                onCreateBoard={handleCreateBoard}
            />
        </div>
    )
}
