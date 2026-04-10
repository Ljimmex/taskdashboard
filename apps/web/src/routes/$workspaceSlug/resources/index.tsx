import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { Plus, Search, FileText, Trash2, Undo2, Redo2, ZoomIn, ZoomOut, Presentation } from 'lucide-react'
import { useDocuments, useCreateDocument, useDeleteDocument, useUpdateDocument } from '@/hooks/useDocuments'
import { useCreateBoard } from '@/hooks/useWhiteboards'
import { TiptapEditor } from '@/components/features/docs/TiptapEditor'
import { CreationSidePanel } from '@/components/features/shared/CreationSidePanel'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { debounce } from 'lodash'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/$workspaceSlug/resources/')({
    component: DocsPage,
})

function DocsPage() {
    const { workspaceSlug } = Route.useParams()
    const { data: documents, isLoading } = useDocuments(workspaceSlug)
    const { mutate: createDoc } = useCreateDocument()
    const { mutate: updateDoc } = useUpdateDocument()
    const { mutate: deleteDoc } = useDeleteDocument()
    const { mutate: createBoard } = useCreateBoard()
    const navigate = useNavigate()

    const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
    const [isCreationModalOpen, setIsCreationModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [characterCount, setCharacterCount] = useState(0)
    const [isSaving, setIsSaving] = useState(false)
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
    const [editorActions, setEditorActions] = useState({
        canUndo: false,
        canRedo: false,
        undo: () => { },
        redo: () => { },
    })

    const selectedDoc = documents?.find(d => d.id === selectedDocId)

    // Debounced update function
    const debouncedUpdate = useMemo(
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
            debouncedUpdate.cancel()
        }
    }, [debouncedUpdate])

    useEffect(() => {
        if (selectedDoc?.updatedAt) {
            setLastSavedAt(new Date(selectedDoc.updatedAt))
        }
    }, [selectedDoc?.id, selectedDoc?.updatedAt])

    const queueSave = useCallback(
        (id: string, data: any) => {
            setIsSaving(true)
            debouncedUpdate(id, data)
        },
        [debouncedUpdate]
    )

    const filteredDocs = documents?.filter(d =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

    const handleCreateDocument = (name: string) => {
        createDoc({
            title: name,
            workspaceId: workspaceSlug,
            content: {
                type: 'doc',
                content: [
                    {
                        type: 'heading',
                        attrs: { level: 1 },
                        content: [{ type: 'text', text: name }]
                    }
                ]
            }
        }, {
            onSuccess: (data) => {
                setIsCreationModalOpen(false)
                setSelectedDocId(data.id)
            },
            onError: (error) => {
                alert('Failed to create document: ' + error.message)
            }
        })
    }

    const handleCreateBoard = (name: string) => {
        createBoard({
            name,
            workspaceId: workspaceSlug,
            data: {}
        }, {
            onSuccess: (data) => {
                setIsCreationModalOpen(false)
                navigate({ to: `/${workspaceSlug}/board`, search: { selectedId: data.id } as any })
            }
        })
    }

    if (isLoading) {
        return <div className="p-8 animate-pulse text-[var(--app-text-muted)]">Ładowanie dokumentów...</div>
    }

    return (
        <div className="flex h-[calc(100vh-64px)] relative overflow-hidden bg-[var(--app-bg-deepest)] -m-4 -mb-24 lg:-m-6 lg:-mb-6">
            {/* Sidebar List */}
            <div className={`absolute lg:static inset-0 z-20 transition-transform duration-300 md:translate-x-0 ${selectedDocId ? '-translate-x-full' : 'translate-x-0'} w-full lg:w-80 flex-shrink-0 flex flex-col border-r border-[var(--app-border)] bg-[var(--app-bg-sidebar)]`}>
                <div className="p-4 flex items-center justify-between border-b border-[var(--app-border)]">
                    <h2 className="font-bold text-[var(--app-text-primary)]">Dokumenty</h2>
                    <button
                        onClick={() => setIsCreationModalOpen(true)}
                        className="p-1.5 rounded-lg bg-[var(--app-accent)] text-[var(--app-accent-text)] hover:scale-105 transition-transform"
                    >
                        <Plus size={18} />
                    </button>
                </div>

                <div className="p-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]" />
                        <input
                            type="text"
                            placeholder="Szukaj..."
                            className="w-full bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-lg py-2 pl-9 pr-3 text-xs focus:ring-1 focus:ring-[var(--app-accent)] outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {filteredDocs.map(doc => (
                        <button
                            key={doc.id}
                            onClick={() => setSelectedDocId(doc.id)}
                            className={`w-full flex flex-col gap-1 p-3 rounded-xl transition-all text-left ${selectedDocId === doc.id
                                ? 'bg-[var(--app-bg-elevated)] border border-[var(--app-accent)]/30 shadow-sm'
                                : 'hover:bg-[var(--app-bg-elevated)]/50 border border-transparent'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <FileText size={16} className={selectedDocId === doc.id ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-muted)]'} />
                                <span className={`text-sm font-medium truncate ${selectedDocId === doc.id ? `text-[var(--app-text-primary)]` : `text-[var(--app-text-secondary)]`}`}>
                                    {doc.title || 'Bez tytułu'}
                                </span>
                            </div>
                            <span className="text-[10px] text-[var(--app-text-muted)]">
                                {format(new Date(doc.updatedAt), 'd MMM yyyy, HH:mm', { locale: pl })}
                            </span>
                        </button>
                    ))}

                    {filteredDocs.length === 0 && (
                        <div className="py-12 text-center text-[var(--app-text-muted)] italic text-xs">
                            Brak dokumentów
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className={`flex-1 flex flex-col h-full min-w-0 bg-[var(--app-bg-page)] overflow-hidden ${selectedDocId ? 'block' : 'hidden lg:flex'}`}>
                {selectedDoc ? (
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        {/* Board-like Header Overlay */}
                        <div className="absolute top-4 left-4 right-4 z-[50] flex flex-col lg:flex-row lg:items-center justify-between pointer-events-none gap-2">
                            {/* Left side: Title & Actions */}
                            <div className="flex items-center gap-2 pointer-events-auto">
                                <button onClick={() => setSelectedDocId(null)} className="lg:hidden p-2 bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl shadow-sm text-[var(--app-text-muted)] hover:text-white transition-colors">
                                    <Undo2 size={16} />
                                </button>
                                <div className="flex items-center bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl shadow-sm p-1">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--app-accent)]/10 text-[var(--app-accent)] mr-1">
                                        <FileText size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        className="text-sm font-semibold bg-transparent border-none outline-none text-[var(--app-text-primary)] w-24 lg:w-[200px] focus:ring-0 px-2 leading-none"
                                        value={selectedDoc.title}
                                        onChange={(e) => queueSave(selectedDoc.id, { title: e.target.value })}
                                        placeholder="Tytuł dokumentu..."
                                    />
                                </div>

                                <div className="flex items-center bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl shadow-sm p-1 ml-2">
                                    <button
                                        onClick={() => {
                                            if (confirm('Czy na pewno chcesz usunąć ten dokument?')) {
                                                deleteDoc(selectedDoc.id, { onSuccess: () => setSelectedDocId(null) })
                                            }
                                        }}
                                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-[var(--app-text-secondary)] hover:text-red-500 transition-colors"
                                        title="Usuń dokument"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>

                            {/* Center side: Zoom Controls & Stats (Mocked) */}
                            <div className="flex items-center bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl shadow-sm p-1 pointer-events-auto">
                                <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] transition-colors">
                                    <ZoomOut size={15} />
                                </button>
                                <span className="px-3 text-xs font-mono text-[var(--app-text-primary)] w-[60px] text-center">100%</span>
                                <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] transition-colors">
                                    <ZoomIn size={15} />
                                </button>
                            </div>

                            {/* Right side: Presentation/Share */}
                            <div className="flex items-center bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl shadow-sm p-1 pointer-events-auto">
                                <button className="h-8 px-3 flex items-center justify-center gap-2 rounded-lg bg-[var(--app-accent)] text-[var(--app-accent-text)] font-medium text-xs hover:opacity-90 transition-opacity">
                                    <Presentation size={14} />
                                    Zacznij
                                </button>
                            </div>
                        </div>

                        {/* White/Dark Document Canvas Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar relative pt-20">
                            <TiptapEditor
                                key={selectedDoc.id} // Important: remount editor when changing doc
                                content={selectedDoc.content}
                                onChange={(content) => queueSave(selectedDoc.id, { content })}
                                onCharacterCountChange={setCharacterCount}
                                onEditorActionsChange={setEditorActions}
                            />
                        </div>

                        {/* Floating Bottom Info & Undo/Redo */}
                        <div className="absolute bottom-6 w-full px-2 lg:px-6 flex flex-col lg:flex-row items-end lg:justify-between pointer-events-none z-[50] gap-4">
                            {/* Status Info */}
                            <div className="pointer-events-auto bg-[var(--app-bg-elevated)]/80 backdrop-blur-md border border-[var(--app-border)] rounded-lg px-4 py-2 flex items-center gap-2 lg:gap-4 text-[10px] lg:text-[11px] text-[var(--app-text-secondary)] shadow-sm truncate">
                                <span className="hidden lg:inline">Ostatnia edycja: {format(lastSavedAt ? new Date(lastSavedAt) : new Date(selectedDoc.updatedAt), 'HH:mm', { locale: pl })}</span>
                                <span className="hidden lg:inline">{characterCount} znaków</span>
                                <span className="font-medium text-[var(--app-text-muted)] flex items-center gap-1">
                                    {isSaving ? (
                                        <>Zapisywanie<span className="animate-pulse">...</span></>
                                    ) : (
                                        'Zapisano'
                                    )}
                                </span>
                            </div>

                            {/* Undo/Redo Controls */}
                            <div className="pointer-events-auto flex items-center bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl shadow-lg p-1">
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
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                        <div className="w-20 h-20 rounded-3xl bg-[var(--app-bg-card)] border border-[var(--app-border)] flex items-center justify-center mb-6 shadow-xl">
                            <FileText size={40} className="text-[var(--app-accent)] opacity-50" />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--app-text-primary)] mb-2">Wybierz dokument</h3>
                        <p className="text-[var(--app-text-muted)] max-w-xs mx-auto text-sm">
                            Wybierz dokument z listy po lewej stronie lub utwórz nowy, aby rozpocząć edycję.
                        </p>
                        <button
                            onClick={() => setIsCreationModalOpen(true)}
                            className="mt-8 flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--app-accent)] text-[var(--app-accent-text)] font-bold hover:scale-105 transition-all shadow-lg shadow-amber-500/10"
                        >
                            <Plus size={18} />
                            Utwórz nową zawartość
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
