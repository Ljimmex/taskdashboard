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

export function FilePicker({ onSelect, onCancel, maxFiles = 1, allowedTypes, initialTab = 'select' }: FilePickerProps) {
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
    const filteredFiles = files.filter(file => {
        const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = !allowedTypes || allowedTypes.some(type => {
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
        const selectedFiles = files.filter(f => selectedIds.has(f.id))
        onSelect(selectedFiles)
    }

    const FileCard = ({ file, selected }: { file: FileRecord, selected: boolean }) => (
        <div
            onClick={() => toggleSelection(file.id)}
            className={cn(
                "group relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer transition-all",
                selected ? "border-amber-500 bg-amber-500/10" : "border-gray-800 bg-[#13131a] hover:bg-gray-800"
            )}
        >
            {/* Selection Indicator */}
            <div className={cn(
                "absolute top-2 right-2 z-10 w-5 h-5 rounded-full flex items-center justify-center transition-all",
                selected ? "bg-amber-500 text-black" : "bg-black/40 text-transparent group-hover:bg-black/60"
            )}>
                <Check className="w-3 h-3" />
            </div>

            {/* Thumbnail */}
            {file.thumbnailUrl ? (
                <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-gray-500 group-hover:text-gray-400 transition-colors">
                    <File className="w-8 h-8 mb-2" />
                    <span className="text-xs text-center line-clamp-2 break-all">
                        {file.name}
                    </span>
                </div>
            )}
        </div>
    )

    const FileListItem = ({ file, selected }: { file: FileRecord, selected: boolean }) => (
        <div
            onClick={() => toggleSelection(file.id)}
            className={cn(
                "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border",
                selected ? "border-amber-500 bg-amber-500/10" : "border-transparent hover:bg-gray-800/50"
            )}
        >
            <div className="w-10 h-10 rounded bg-[#13131a] flex items-center justify-center flex-shrink-0">
                {file.thumbnailUrl ? (
                    <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover rounded" />
                ) : (
                    <File className="w-5 h-5 text-gray-500" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">{file.name}</p>
                <p className="text-xs text-gray-400">{file.size ? (file.size / 1024).toFixed(1) : '0.0'} KB</p>
            </div>
            <div className={cn(
                "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                selected ? "border-amber-500 bg-amber-500 text-black" : "border-gray-600"
            )}>
                {selected && <Check className="w-3 h-3" />}
            </div>
        </div>
    )

    // Using relative z-10 so the modal is clickable and not obscured by the backdrop overlay.
    return (
        <div className="relative z-10 flex flex-col h-[600px] w-full max-w-3xl bg-[var(--app-bg-card)] rounded-2xl border border-[var(--app-border)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[var(--app-border)]/50">
                <h2 className="text-lg font-semibold text-[var(--app-text-primary)]">{t('files.picker.title')}</h2>
                <button
                    onClick={onCancel}
                    className="p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as 'select' | 'upload')} className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 border-b border-[var(--app-border)]/50">
                    <TabsList className="bg-transparent p-0 gap-6 h-auto">
                        <TabsTrigger
                            value="select"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[var(--app-accent)] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 py-3 text-[var(--app-text-muted)] data-[state=active]:text-[var(--app-accent)] hover:text-[var(--app-text-primary)] transition-colors font-semibold"
                        >
                            {t('files.picker.select_mode')}
                        </TabsTrigger>
                        <TabsTrigger
                            value="upload"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[var(--app-accent)] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 py-3 text-[var(--app-text-muted)] data-[state=active]:text-[var(--app-accent)] hover:text-[var(--app-text-primary)] transition-colors font-semibold"
                        >
                            {t('files.picker.upload_mode')}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="select" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
                    <div className="px-6 py-4 flex items-center gap-4">
                        <div className="relative flex-1 flex items-center bg-[var(--app-bg-input)] border border-[var(--app-border)]/50 rounded-xl h-11 px-3 focus-within:border-[var(--app-accent)]/50 focus-within:ring-2 focus-within:ring-[var(--app-accent)]/20 transition-all">
                            <Search className="w-4 h-4 text-[var(--app-text-muted)] shrink-0" />
                            <input
                                placeholder={t('files.picker.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent border-none text-sm text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] focus:outline-none focus:ring-0 ml-2"
                            />
                        </div>
                        <div className="flex items-center gap-1 bg-[var(--app-bg-input)] border border-[var(--app-border)]/50 rounded-xl p-1">
                            <button
                                className={cn("p-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-[var(--app-accent)]/10 text-[var(--app-accent)] shadow-sm" : "text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)]")}
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid className="w-4 h-4" />
                            </button>
                            <button
                                className={cn("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-[var(--app-accent)]/10 text-[var(--app-accent)] shadow-sm" : "text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)]")}
                                onClick={() => setViewMode('list')}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 px-1">
                        <div className="px-5 pb-6">
                            {filteredFiles.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-20 h-20 rounded-full bg-[var(--app-bg-elevated)] flex items-center justify-center mb-6 shadow-inner">
                                        <Search className="w-10 h-10 text-[var(--app-text-muted)] opacity-50" />
                                    </div>
                                    <p className="text-lg font-bold text-[var(--app-text-primary)] mb-2">{t('files.picker.no_files')}</p>
                                    <p className="text-sm text-[var(--app-text-muted)] max-w-xs mx-auto">
                                        {files.length === 0
                                            ? t('files.messages.drag_drop_desc')
                                            : t('files.picker.adjust_search_query')}
                                    </p>
                                </div>
                            ) : viewMode === 'grid' ? (
                                <div className="grid grid-cols-4 gap-4">
                                    {filteredFiles.map(file => (
                                        <FileCard
                                            key={file.id}
                                            file={file}
                                            selected={selectedIds.has(file.id)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {filteredFiles.map(file => (
                                        <FileListItem
                                            key={file.id}
                                            file={file}
                                            selected={selectedIds.has(file.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="p-4 px-6 border-t border-[var(--app-border)]/50 bg-[var(--app-bg-deepest)] flex items-center justify-between">
                        <div className="text-sm font-semibold text-[var(--app-text-secondary)]">
                            {t('files.picker.selected', { count: selectedIds.size })}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onCancel}
                                className="px-4 py-2.5 text-sm font-bold text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] rounded-xl transition-all"
                            >
                                {t('files.picker.cancel')}
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={selectedIds.size === 0}
                                className="px-4 py-2.5 text-sm font-bold bg-[var(--app-accent)] text-white hover:opacity-90 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm min-w-[100px]"
                            >
                                {selectedIds.size > 0 ? t('files.picker.select_plural', { count: selectedIds.size }) : t('files.picker.select')}
                            </button>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="upload" className="flex-1 min-h-0 mt-0 p-6 data-[state=inactive]:hidden">
                    <FileUploader
                        onUploadComplete={() => setActiveTab('select')}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
