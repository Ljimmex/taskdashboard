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
        <div className="relative z-10 flex flex-col h-[600px] w-full max-w-3xl bg-[#12121a] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold text-white">{t('files.picker.title')}</h2>
                <button
                    onClick={onCancel}
                    className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as 'select' | 'upload')} className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 border-b border-gray-800">
                    <TabsList className="bg-transparent p-0 gap-6 h-auto">
                        <TabsTrigger
                            value="select"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 py-3 text-gray-300 data-[state=active]:text-amber-500 hover:text-white transition-colors font-medium"
                        >
                            {t('files.picker.select_mode')}
                        </TabsTrigger>
                        <TabsTrigger
                            value="upload"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 py-3 text-gray-300 data-[state=active]:text-amber-500 hover:text-white transition-colors font-medium"
                        >
                            {t('files.picker.upload_mode')}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="select" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
                    <div className="px-6 py-4 flex items-center gap-4">
                        <div className="relative flex-1 flex items-center bg-[#1a1a24] border border-gray-700/50 rounded-lg h-10 px-3 focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/50 transition-all">
                            <Search className="w-4 h-4 text-gray-400 shrink-0" />
                            <input
                                placeholder={t('files.picker.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent border-none text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-0 ml-2"
                            />
                        </div>
                        <div className="flex items-center gap-0.5 bg-[#1a1a24] border border-gray-700/50 rounded-lg p-1">
                            <button
                                className={cn("p-1.5 rounded-md transition-colors", viewMode === 'grid' ? "bg-amber-500/10 text-amber-500" : "text-gray-400 hover:text-white hover:bg-gray-800")}
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid className="w-4 h-4" />
                            </button>
                            <button
                                className={cn("p-1.5 rounded-md transition-colors", viewMode === 'list' ? "bg-amber-500/10 text-amber-500" : "text-gray-400 hover:text-white hover:bg-gray-800")}
                                onClick={() => setViewMode('list')}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="px-6 pb-6">
                            {filteredFiles.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-16 h-16 rounded-full bg-[#1a1a24] flex items-center justify-center mb-4">
                                        <Search className="w-8 h-8 text-gray-500" />
                                    </div>
                                    <p className="text-lg font-medium text-white mb-1">{t('files.picker.no_files')}</p>
                                    <p className="text-sm text-gray-500">
                                        {files.length === 0
                                            ? t('files.messages.drag_drop_desc') // Reuse or generic "Upload some files first"
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

                    <div className="p-4 border-t border-gray-800 bg-[#16161f] flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-300">
                            {t('files.picker.selected', { count: selectedIds.size })}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onCancel}
                                className="px-4 py-2 text-sm font-bold text-gray-300 hover:text-white transition-colors"
                            >
                                {t('files.picker.cancel')}
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={selectedIds.size === 0}
                                className="px-4 py-2 text-sm font-medium bg-amber-500 text-black hover:bg-amber-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
