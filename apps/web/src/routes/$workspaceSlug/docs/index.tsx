import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, FileText, Trash2 } from 'lucide-react'
import { useDocuments, useCreateDocument, useUpdateDocument, useDeleteDocument } from '@/hooks/useDocuments'
import { useCreateBoard } from '@/hooks/useWhiteboards'
import { TiptapEditor } from '@/components/features/docs/TiptapEditor'
import { CreationSidePanel } from '@/components/features/shared/CreationSidePanel'
import { ResourceEditorHeader } from '@/components/features/shared/ResourceEditorHeader'
import { ResourceEditorFooter } from '@/components/features/shared/ResourceEditorFooter'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { debounce } from 'lodash'
import { useNavigate } from '@tanstack/react-router'

export interface DocsSearch {
    docId?: string
}

export const Route = createFileRoute('/$workspaceSlug/docs/')({
    component: DocsPage,
    validateSearch: (search: Record<string, unknown>): DocsSearch => {
        return {
            docId: search.docId as string | undefined,
        }
    },
})

function DocsPage() {
    const { t } = useTranslation()
    const { workspaceSlug } = Route.useParams()
    const { data: documents, isLoading } = useDocuments(workspaceSlug)
    const { mutate: createDoc } = useCreateDocument()
    const { mutate: updateDoc } = useUpdateDocument()
    const { mutate: deleteDoc } = useDeleteDocument()
    const { mutate: createBoard } = useCreateBoard()
    const navigate = useNavigate()
    const search = Route.useSearch()

    const [selectedDocId, setSelectedDocIdState] = useState<string | null>(search.docId || null)
    const [isCreationModalOpen, setIsCreationModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [characterCount, setCharacterCount] = useState(0)

    const selectedDoc = documents?.find(d => d.id === selectedDocId)

    // Sync selected doc with URL search param
    const setSelectedDocId = useCallback((id: string | null) => {
        setSelectedDocIdState(id)
        navigate({
            to: '.',
            search: id ? { docId: id } : {},
            replace: true,
        })
    }, [navigate])

    useEffect(() => {
        if (!search.docId) {
            setSelectedDocIdState(null)
            return
        }
        if (documents?.some(d => d.id === search.docId)) {
            setSelectedDocIdState(search.docId)
        }
    }, [search.docId, documents])

    // Debounced update function
    const debouncedUpdate = useCallback(
        debounce((id: string, data: any) => {
            updateDoc({ id, ...data })
        }, 1000),
        []
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
        <div className="flex h-full overflow-hidden bg-[var(--app-bg-deepest)]">
            {/* Sidebar List */}
            <div className="w-80 flex flex-col border-r border-[var(--app-border)] bg-[var(--app-bg-sidebar)]/80 backdrop-blur-xl">
                <div className="p-4 flex items-center justify-between border-b border-[var(--app-border)]">
                    <h2 className="font-bold text-[var(--app-text-primary)]">{t('docs.title', { defaultValue: 'Dokumenty' })}</h2>
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
                            className="w-full bg-[var(--app-bg-input)] border border-[var(--app-border)] rounded-lg py-2 pl-9 pr-3 text-xs focus:ring-1 focus:ring-[var(--app-accent)] outline-none"
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
                                <span className={`text-sm font-medium truncate ${selectedDocId === doc.id ? 'text-[var(--app-text-primary)]' : 'text-[var(--app-text-secondary)]'}`}>
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
            <div className="flex-1 flex flex-col bg-[var(--app-bg-page)] overflow-hidden">
                {selectedDoc ? (
                    <>
                        <ResourceEditorHeader
                            title={selectedDoc.title}
                            onTitleChange={(title) => debouncedUpdate(selectedDoc.id, { title })}
                            onBack={() => setSelectedDocId(null)}
                            type="doc"
                            onShare={() => {
                                const url = new URL(window.location.href)
                                url.searchParams.set('docId', selectedDoc.id)
                                navigator.clipboard.writeText(url.toString())
                                alert('Skopiowano link do dokumentu!')
                            }}
                            rightSlot={
                                <button
                                    onClick={() => {
                                        if (confirm('Czy na pewno chcesz usunąć ten dokument?')) {
                                            deleteDoc(selectedDoc.id, { onSuccess: () => setSelectedDocId(null) })
                                        }
                                    }}
                                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Usuń"
                                >
                                    <Trash2 size={18} />
                                </button>
                            }
                        />
                        <div className="flex-1 overflow-hidden">
                            <TiptapEditor
                                key={selectedDoc.id}
                                content={selectedDoc.content}
                                onChange={(content) => debouncedUpdate(selectedDoc.id, { content })}
                                onCharacterCountChange={setCharacterCount}
                            />
                        </div>
                        <ResourceEditorFooter
                            left={<>Ostatnia edycja: {format(new Date(selectedDoc.updatedAt), 'd MMM yyyy, HH:mm', { locale: pl })}</>}
                            center={<>{characterCount} znaków</>}
                            right={<>Zapisywane automatycznie</>}
                        />
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                        <div className="w-20 h-20 rounded-3xl bg-[var(--app-bg-card)] border border-[var(--app-border)] flex items-center justify-center mb-6 shadow-xl">
                            <FileText size={40} className="text-[var(--app-accent)] opacity-60" />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--app-text-primary)] mb-2">Wybierz dokument</h3>
                        <p className="text-[var(--app-text-muted)] max-w-xs mx-auto text-sm">
                            Wybierz dokument z listy po lewej stronie lub utwórz nowy, aby rozpocząć edycję.
                        </p>
                        <button
                            onClick={() => setIsCreationModalOpen(true)}
                            className="mt-8 flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--app-accent)] text-[var(--app-accent-text)] font-bold hover:scale-105 transition-all shadow-lg shadow-[var(--app-accent)]/20"
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
