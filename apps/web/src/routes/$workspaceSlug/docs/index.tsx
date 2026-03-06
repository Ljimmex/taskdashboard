import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { Plus, Search, FileText, Trash2 } from 'lucide-react'
import { useDocuments, useCreateDocument, useDeleteDocument, useUpdateDocument } from '@/hooks/useDocuments'
import { useCreateBoard } from '@/hooks/useWhiteboards'
import { TiptapEditor } from '@/components/features/docs/TiptapEditor'
import { CreationSidePanel } from '@/components/features/shared/CreationSidePanel'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { debounce } from 'lodash'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/$workspaceSlug/docs/')({
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

    const selectedDoc = documents?.find(d => d.id === selectedDocId)

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
            <div className="w-80 flex flex-col border-r border-[var(--app-border)] bg-[var(--app-bg-sidebar)]">
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
                    <div className="flex-1 flex flex-col overflow-hidden p-6 max-w-5xl mx-auto w-full">
                        <div className="flex items-center justify-between mb-6">
                            <input
                                type="text"
                                className="text-3xl font-bold bg-transparent border-none outline-none text-[var(--app-text-primary)] w-full focus:ring-0"
                                value={selectedDoc.title}
                                onChange={(e) => debouncedUpdate(selectedDoc.id, { title: e.target.value })}
                            />
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        if (confirm('Czy na pewno chcesz usunąć ten dokument?')) {
                                            deleteDoc(selectedDoc.id, { onSuccess: () => setSelectedDocId(null) })
                                        }
                                    }}
                                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                                    title="Usuń"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <TiptapEditor
                                key={selectedDoc.id} // Important: remount editor when changing doc
                                content={selectedDoc.content}
                                onChange={(content) => debouncedUpdate(selectedDoc.id, { content })}
                            />
                        </div>
                        <div className="mt-4 flex items-center justify-end">
                            <span className="text-[10px] text-[var(--app-text-muted)] bg-[var(--app-bg-elevated)] px-2 py-1 rounded-full">
                                Zmiany zapisywane automatycznie
                            </span>
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
