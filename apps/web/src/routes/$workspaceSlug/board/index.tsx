import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, FileText, Palette, Search, Trash2, Undo2, Redo2 } from 'lucide-react'
import { useWhiteboards, useCreateBoard, useDeleteBoard, useUpdateBoard } from '@/hooks/useWhiteboards'
import { useDocuments, useCreateDocument, useDeleteDocument, useUpdateDocument } from '@/hooks/useDocuments'
import { MiroBoard } from '@/components/features/whiteboards/Miroboard'
import { TiptapEditor } from '@/components/features/docs/TiptapEditor'
import { CreationSidePanel } from '@/components/features/shared/CreationSidePanel'
import { ResourceEditorHeader } from '@/components/features/shared/ResourceEditorHeader'
import { ResourceEditorFooter } from '@/components/features/shared/ResourceEditorFooter'
import { useSession } from '@/lib/auth'
import { format } from 'date-fns'
import { debounce } from 'lodash'
import * as locales from 'date-fns/locale'
import { useThemeStore } from '@/lib/themeStore'

export interface BoardSearch {
    resourceId?: string
}

export const Route = createFileRoute('/$workspaceSlug/board/')({
    component: BoardPage,
    validateSearch: (search: Record<string, unknown>): BoardSearch => {
        return {
            resourceId: search.resourceId as string | undefined,
        }
    },
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
    const navigate = useNavigate()
    const search = Route.useSearch()
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

    const [selectedResourceId, setSelectedResourceIdState] = useState<string | null>(search.resourceId || null)
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

    // Sync selected resource with URL search param
    const setSelectedResourceId = useCallback((id: string | null) => {
        setSelectedResourceIdState(id)
        navigate({
            to: '.',
            search: id ? { resourceId: id } : {},
            replace: true,
        })
    }, [navigate])

    useEffect(() => {
        if (!search.resourceId) {
            setSelectedResourceIdState(null)
            return
        }
        if (resources.some(r => r.id === search.resourceId)) {
            setSelectedResourceIdState(search.resourceId)
        }
    }, [search.resourceId, resources])

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
            <div className="flex flex-col h-full bg-[var(--app-bg-page)]">
                <ResourceEditorHeader
                    title={selectedResource.name}
                    onTitleChange={(name) => {
                        if (selectedResource.type === 'whiteboard') {
                            debouncedUpdateBoard(selectedResource.id, { name })
                        } else {
                            queueDocSave(selectedResource.id, { title: name })
                        }
                    }}
                    onBack={() => setSelectedResourceId(null)}
                    type={selectedResource.type === 'whiteboard' ? 'whiteboard' : 'doc'}
                    collaborators={activeCollaborators}
                    onShare={() => {
                        const url = new URL(window.location.href)
                        url.searchParams.set('resourceId', selectedResource.id)
                        navigator.clipboard.writeText(url.toString())
                        alert('Skopiowano link do zasobu!')
                    }}
                    rightSlot={
                        <button
                            onClick={handleDelete}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                            title={t('resources.delete', { defaultValue: 'Usuń' })}
                        >
                            <Trash2 size={18} />
                        </button>
                    }
                />
                <div className="flex-1 relative overflow-hidden bg-[var(--app-bg-page)]">
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
                            <div className="h-full overflow-hidden">
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

                            {/* Floating Undo/Redo Controls */}
                            <div className="absolute bottom-12 right-6 flex items-center bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl shadow-lg p-1 z-[50]">
                                <button
                                    onClick={editorActions.undo}
                                    disabled={!editorActions.canUndo}
                                    className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Cofnij"
                                >
                                    <Undo2 size={18} />
                                </button>
                                <div className="w-[1px] h-6 bg-[var(--app-divider)] mx-1" />
                                <button
                                    onClick={editorActions.redo}
                                    disabled={!editorActions.canRedo}
                                    className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Ponów"
                                >
                                    <Redo2 size={18} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
                {!isWhiteboardSelected && (
                    <ResourceEditorFooter
                        left={<>Ostatnia edycja: {format(lastSavedAt ? new Date(lastSavedAt) : new Date(selectedResource.updatedAt), 'd MMM yyyy, HH:mm')}</>}
                        center={<>{characterCount} znaków</>}
                        right={<>{isSaving ? 'Zapisywanie...' : 'Zapisano automatycznie'}</>}
                    />
                )}
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-[var(--app-bg-deepest)]">
            {/* Header */}
            <div className="flex-none px-4 lg:px-6 pt-5 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--app-border)]">
                <h1 className="text-3xl font-bold text-[var(--app-text-primary)] tracking-tight">{t('resources.title')}</h1>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative group flex-1 sm:w-64">
                        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]" />
                        <input
                            type="text"
                            placeholder={t('resources.search_placeholder')}
                            className="w-full bg-[var(--app-bg-input)] border border-[var(--app-border)] rounded-full py-2 pl-10 pr-4 text-sm text-[var(--app-text-secondary)] focus:outline-none focus:border-[var(--app-accent)]/50 focus:bg-[var(--app-bg-elevated)] transition-all placeholder:text-[var(--app-text-muted)]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsCreationModalOpen(true)}
                        className="bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-[var(--app-accent-text)] font-semibold px-5 py-2 rounded-full flex items-center gap-2 transition-all shrink-0 text-sm"
                    >
                        <Plus size={18} strokeWidth={3} />
                        <span className="hidden sm:inline">{t('resources.new_content')}</span>
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
                                className="group bg-[var(--app-bg-card)] rounded-2xl border border-[var(--app-border)] overflow-hidden hover:border-[var(--app-accent)]/30 transition-all duration-300 cursor-pointer text-left"
                            >
                                <div className="aspect-video w-full bg-[var(--app-bg-page)] flex items-center justify-center border-b border-[var(--app-border)] relative overflow-hidden">
                                    {resource.type === 'doc' ? (
                                        <FileText size={64} className="text-[var(--app-text-muted)]/20 group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <Palette size={64} className="text-[var(--app-text-muted)]/20 group-hover:scale-110 transition-transform duration-500" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--app-bg-card)]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>
                                <div className="p-5">
                                    <h3 className="font-semibold text-[var(--app-text-primary)] text-lg mb-1 group-hover:text-[var(--app-accent)] transition-colors truncate">{resource.name}</h3>
                                    <p className="text-xs text-[var(--app-text-muted)] uppercase tracking-wider font-medium">
                                        {format(new Date(resource.updatedAt), 'd MMM yyyy', {
                                            locale: (locales as any)[i18n.language] || (locales as any).enUS
                                        })}
                                    </p>
                                </div>
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
                            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-[var(--app-accent-text)] text-sm font-bold transition-all shadow-xl shadow-[var(--app-accent)]/20"
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
