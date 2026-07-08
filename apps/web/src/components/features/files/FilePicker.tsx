import { useState } from 'react'
import { Search, Grid, List, Check, File, X } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs'
import { ScrollArea } from '../../ui/scroll-area'
import { FileRecord } from '@taskdashboard/types'
import { useFiles } from '@/hooks/useFiles'
import { useParams } from '@tanstack/react-router'
import { FileUploader } from './FileUploader'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface FilePickerProps {
  onSelect: (files: FileRecord[]) => void
  onCancel: () => void
  maxFiles?: number
  allowedTypes?: string[] // mime types
  initialTab?: 'select' | 'upload'
}

export function FilePicker({
  onSelect,
  onCancel,
  maxFiles = 1,
  allowedTypes,
  initialTab = 'select',
}: FilePickerProps) {
  const { t } = useTranslation()
  const { workspaceSlug } = useParams({ from: '/$workspaceSlug' })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState(initialTab)

  // Fetch files recursively to see contents of folders
  // TODO: Add search and filter params via hook if supported needed
  const { data: files = [] } = useFiles(workspaceSlug, null, true)

  // Filter files based on search and allowed types
  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType =
      !allowedTypes ||
      allowedTypes.some((type) => {
        if (!file.mimeType) return false
        if (type.endsWith('/*')) {
          const baseType = type.slice(0, -2)
          return file.mimeType.startsWith(baseType)
        }
        return file.mimeType === type
      })
    return matchesSearch && matchesType
  })

  const toggleSelection = (fileId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId)
    } else {
      if (maxFiles === 1) {
        newSelected.clear()
      } else if (newSelected.size >= maxFiles) {
        return // Max limit reached
      }
      newSelected.add(fileId)
    }
    setSelectedIds(newSelected)
  }

  const handleConfirm = () => {
    const selectedFiles = files.filter((f) => selectedIds.has(f.id))
    onSelect(selectedFiles)
  }

  const FileCard = ({ file, selected }: { file: FileRecord; selected: boolean }) => (
    <div
      onClick={() => toggleSelection(file.id)}
      className={cn(
        'group relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 transition-all',
        selected
          ? 'border-amber-500 bg-amber-500/10'
          : 'border-gray-800 bg-[#13131a] hover:bg-gray-800'
      )}
    >
      {/* Selection Indicator */}
      <div
        className={cn(
          'absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full transition-all',
          selected
            ? 'bg-amber-500 text-black'
            : 'bg-black/40 text-transparent group-hover:bg-black/60'
        )}
      >
        <Check className="h-3 w-3" />
      </div>

      {/* Thumbnail */}
      {file.thumbnailUrl ? (
        <img src={file.thumbnailUrl} alt={file.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center p-4 text-gray-500 transition-colors group-hover:text-gray-400">
          <File className="mb-2 h-8 w-8" />
          <span className="line-clamp-2 break-all text-center text-xs">{file.name}</span>
        </div>
      )}
    </div>
  )

  const FileListItem = ({ file, selected }: { file: FileRecord; selected: boolean }) => (
    <div
      onClick={() => toggleSelection(file.id)}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
        selected ? 'border-amber-500 bg-amber-500/10' : 'border-transparent hover:bg-gray-800/50'
      )}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-[#13131a]">
        {file.thumbnailUrl ? (
          <img
            src={file.thumbnailUrl}
            alt={file.name}
            className="h-full w-full rounded object-cover"
          />
        ) : (
          <File className="h-5 w-5 text-gray-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{file.name}</p>
        <p className="text-xs text-gray-400">
          {file.size ? (file.size / 1024).toFixed(1) : '0.0'} KB
        </p>
      </div>
      <div
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full border transition-colors',
          selected ? 'border-amber-500 bg-amber-500 text-black' : 'border-gray-600'
        )}
      >
        {selected && <Check className="h-3 w-3" />}
      </div>
    </div>
  )

  // Using relative z-10 so the modal is clickable and not obscured by the backdrop overlay.
  return (
    <div className="animate-in zoom-in-95 relative z-10 flex h-[600px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-2xl duration-200">
      <div className="border-[var(--app-border)]/50 flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold text-[var(--app-text-primary)]">
          {t('files.picker.title')}
        </h2>
        <button
          onClick={onCancel}
          className="rounded-lg p-1.5 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v: string) => setActiveTab(v as 'select' | 'upload')}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="border-[var(--app-border)]/50 border-b px-6">
          <TabsList className="h-auto gap-6 bg-transparent p-0">
            <TabsTrigger
              value="select"
              className="rounded-none border-b-2 border-transparent bg-transparent px-2 py-3 font-semibold text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text-primary)] data-[state=active]:border-[var(--app-accent)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--app-accent)] data-[state=active]:shadow-none"
            >
              {t('files.picker.select_mode')}
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="rounded-none border-b-2 border-transparent bg-transparent px-2 py-3 font-semibold text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text-primary)] data-[state=active]:border-[var(--app-accent)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--app-accent)] data-[state=active]:shadow-none"
            >
              {t('files.picker.upload_mode')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="select"
          className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="border-[var(--app-border)]/50 focus-within:border-[var(--app-accent)]/50 focus-within:ring-[var(--app-accent)]/20 relative flex h-11 flex-1 items-center rounded-xl border bg-[var(--app-bg-input)] px-3 transition-all focus-within:ring-2">
              <Search className="h-4 w-4 shrink-0 text-[var(--app-text-muted)]" />
              <input
                placeholder={t('files.picker.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ml-2 w-full border-none bg-transparent text-sm text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] focus:outline-none focus:ring-0"
              />
            </div>
            <div className="border-[var(--app-border)]/50 flex items-center gap-1 rounded-xl border bg-[var(--app-bg-input)] p-1">
              <button
                className={cn(
                  'rounded-lg p-1.5 transition-all',
                  viewMode === 'grid'
                    ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)] shadow-sm'
                    : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'
                )}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                className={cn(
                  'rounded-lg p-1.5 transition-all',
                  viewMode === 'list'
                    ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)] shadow-sm'
                    : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'
                )}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1 px-1">
            <div className="px-5 pb-6">
              {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--app-bg-elevated)] shadow-inner">
                    <Search className="h-10 w-10 text-[var(--app-text-muted)] opacity-50" />
                  </div>
                  <p className="mb-2 text-lg font-bold text-[var(--app-text-primary)]">
                    {t('files.picker.no_files')}
                  </p>
                  <p className="mx-auto max-w-xs text-sm text-[var(--app-text-muted)]">
                    {files.length === 0
                      ? t('files.messages.drag_drop_desc')
                      : t('files.picker.adjust_search_query')}
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-4 gap-4">
                  {filteredFiles.map((file) => (
                    <FileCard key={file.id} file={file} selected={selectedIds.has(file.id)} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredFiles.map((file) => (
                    <FileListItem key={file.id} file={file} selected={selectedIds.has(file.id)} />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-[var(--app-border)]/50 flex items-center justify-between border-t bg-[var(--app-bg-deepest)] p-4 px-6">
            <div className="text-sm font-semibold text-[var(--app-text-secondary)]">
              {t('files.picker.selected', { count: selectedIds.size })}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
              >
                {t('files.picker.cancel')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedIds.size === 0}
                className="min-w-[100px] rounded-xl bg-[var(--app-accent)] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selectedIds.size > 0
                  ? t('files.picker.select_plural', { count: selectedIds.size })
                  : t('files.picker.select')}
              </button>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="upload"
          className="mt-0 min-h-0 flex-1 p-6 data-[state=inactive]:hidden"
        >
          <FileUploader onUploadComplete={() => setActiveTab('select')} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
