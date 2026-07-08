import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, FileText, Palette, Search, Trash2, Undo2, Redo2 } from 'lucide-react'
import {
  useWhiteboards,
  useCreateBoard,
  useDeleteBoard,
  useUpdateBoard,
} from '@/hooks/useWhiteboards'
import {
  useDocuments,
  useCreateDocument,
  useDeleteDocument,
  useUpdateDocument,
} from '@/hooks/useDocuments'
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

  const [selectedResourceId, setSelectedResourceIdState] = useState<string | null>(
    search.resourceId || null
  )
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCollaborators, setActiveCollaborators] = useState<any[]>([])
  const [characterCount, setCharacterCount] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [editorActions, setEditorActions] = useState({
    canUndo: false,
    canRedo: false,
    undo: () => {},
    redo: () => {},
  })

  // Consolidate resources into one list
  const resources = useMemo(() => {
    const boardsList: Resource[] = (whiteboards || []).map((b) => ({
      id: b.id,
      name: b.name,
      type: 'whiteboard',
      updatedAt: b.updatedAt.toString(),
      data: b.data,
    }))
    const docsList: Resource[] = (documents || []).map((d) => ({
      id: d.id,
      name: d.title,
      type: 'doc',
      updatedAt: d.updatedAt.toString(),
      content: d.content,
    }))
    return [...boardsList, ...docsList].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }, [whiteboards, documents])

  const selectedResource = resources.find((r) => r.id === selectedResourceId)
  const isWhiteboardSelected = selectedResource?.type === 'whiteboard'

  // Sync selected resource with URL search param
  const setSelectedResourceId = useCallback(
    (id: string | null) => {
      setSelectedResourceIdState(id)
      navigate({
        to: '.',
        search: id ? { resourceId: id } : {},
        replace: true,
      })
    },
    [navigate]
  )

  useEffect(() => {
    if (!search.resourceId) {
      setSelectedResourceIdState(null)
      return
    }
    if (resources.some((r) => r.id === search.resourceId)) {
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

  const filteredResources = resources.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateBoard = (name: string) => {
    createBoard(
      {
        name,
        workspaceId: workspaceSlug,
        data: {},
      },
      {
        onSuccess: (data) => {
          setIsCreationModalOpen(false)
          setSelectedResourceId(data.id)
        },
        onError: (error) => {
          alert(
            t('resources.creation_error', { defaultValue: 'Failed to create board: ' }) +
              error.message
          )
        },
      }
    )
  }

  const handleCreateDocument = (name: string) => {
    createDoc(
      {
        title: name,
        workspaceId: workspaceSlug,
        content: {
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: name }] },
          ],
        },
      },
      {
        onSuccess: (data) => {
          setIsCreationModalOpen(false)
          setSelectedResourceId(data.id)
        },
        onError: (error) => {
          alert(
            t('resources.creation_error', { defaultValue: 'Failed to create document: ' }) +
              error.message
          )
        },
      }
    )
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
    return (
      <div className="animate-pulse p-8 text-[var(--app-text-muted)]">{t('resources.loading')}</div>
    )
  }

  // Editor View
  if (selectedResource) {
    return (
      <div className="flex h-full flex-col bg-[var(--app-bg-page)]">
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
              className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/10"
              title={t('resources.delete', { defaultValue: 'Usuń' })}
            >
              <Trash2 size={18} />
            </button>
          }
        />
        <div className="relative flex-1 overflow-hidden bg-[var(--app-bg-page)]">
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
              <div className="absolute bottom-12 right-6 z-[50] flex items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-elevated)] p-1 shadow-lg">
                <button
                  onClick={editorActions.undo}
                  disabled={!editorActions.canUndo}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-elevated)] disabled:cursor-not-allowed disabled:opacity-30"
                  title="Cofnij"
                >
                  <Undo2 size={18} />
                </button>
                <div className="mx-1 h-6 w-[1px] bg-[var(--app-divider)]" />
                <button
                  onClick={editorActions.redo}
                  disabled={!editorActions.canRedo}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-elevated)] disabled:cursor-not-allowed disabled:opacity-30"
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
            left={
              <>
                Ostatnia edycja:{' '}
                {format(
                  lastSavedAt ? new Date(lastSavedAt) : new Date(selectedResource.updatedAt),
                  'd MMM yyyy, HH:mm'
                )}
              </>
            }
            center={<>{characterCount} znaków</>}
            right={<>{isSaving ? 'Zapisywanie...' : 'Zapisano automatycznie'}</>}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-[var(--app-bg-deepest)]">
      {/* Header */}
      <div className="flex flex-none flex-col items-start justify-between gap-4 border-b border-[var(--app-border)] px-4 pb-4 pt-5 sm:flex-row sm:items-center lg:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--app-text-primary)]">
          {t('resources.title')}
        </h1>
        <div className="flex w-full items-center gap-4 sm:w-auto">
          <div className="group relative flex-1 sm:w-64">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]"
            />
            <input
              type="text"
              placeholder={t('resources.search_placeholder')}
              className="focus:border-[var(--app-accent)]/50 w-full rounded-full border border-[var(--app-border)] bg-[var(--app-bg-input)] py-2 pl-10 pr-4 text-sm text-[var(--app-text-secondary)] transition-all placeholder:text-[var(--app-text-muted)] focus:bg-[var(--app-bg-elevated)] focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsCreationModalOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-full bg-[var(--app-accent)] px-5 py-2 text-sm font-semibold text-[var(--app-accent-text)] transition-all hover:bg-[var(--app-accent-hover)]"
          >
            <Plus size={18} strokeWidth={3} />
            <span className="hidden sm:inline">{t('resources.new_content')}</span>
          </button>
        </div>
      </div>

      {/* Content Hub Grid */}
      <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
        {filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredResources.map((resource) => (
              <button
                key={resource.id}
                onClick={() => setSelectedResourceId(resource.id)}
                className="hover:border-[var(--app-accent)]/30 group cursor-pointer overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] text-left transition-all duration-300"
              >
                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden border-b border-[var(--app-border)] bg-[var(--app-bg-page)]">
                  {resource.type === 'doc' ? (
                    <FileText
                      size={64}
                      className="text-[var(--app-text-muted)]/20 transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <Palette
                      size={64}
                      className="text-[var(--app-text-muted)]/20 transition-transform duration-500 group-hover:scale-110"
                    />
                  )}
                  <div className="from-[var(--app-bg-card)]/50 absolute inset-0 bg-gradient-to-t to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
                <div className="p-5">
                  <h3 className="mb-1 truncate text-lg font-semibold text-[var(--app-text-primary)] transition-colors group-hover:text-[var(--app-accent)]">
                    {resource.name}
                  </h3>
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
                    {format(new Date(resource.updatedAt), 'd MMM yyyy', {
                      locale: (locales as any)[i18n.language] || (locales as any).enUS,
                    })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center">
            <h2 className="mb-3 text-2xl font-bold text-[var(--app-text-primary)]">
              {t('resources.page.empty_title')}
            </h2>
            <p className="mb-8 text-sm leading-relaxed text-[var(--app-text-muted)]">
              {t('resources.page.empty_description')}
            </p>
            <button
              onClick={() => setIsCreationModalOpen(true)}
              className="shadow-[var(--app-accent)]/20 inline-flex items-center gap-2 rounded-full bg-[var(--app-accent)] px-8 py-3.5 text-sm font-bold text-[var(--app-accent-text)] shadow-xl transition-all hover:bg-[var(--app-accent-hover)]"
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
