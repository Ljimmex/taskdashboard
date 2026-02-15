import { useState } from 'react'
import { Search, Grid, List, Check, File, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

    // Fetch files
    // TODO: Add search and filter params via hook if supported needed
    const { data: files = [] } = useFiles(workspaceSlug)

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
                selected ? "border-primary bg-primary/5" : "border-transparent bg-muted/50 hover:bg-muted"
            )}
        >
            {/* Selection Indicator */}
            <div className={cn(
                "absolute top-2 right-2 z-10 w-5 h-5 rounded-full flex items-center justify-center transition-all",
                selected ? "bg-primary text-primary-foreground" : "bg-black/20 text-transparent group-hover:bg-black/40"
            )}>
                <Check className="w-3 h-3" />
            </div>

            {/* Thumbnail */}
            {file.thumbnailUrl ? (
                <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                    <File className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-center text-muted-foreground line-clamp-2 break-all">
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
                selected ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"
            )}
        >
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                {file.thumbnailUrl ? (
                    <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover rounded" />
                ) : (
                    <File className="w-5 h-5 text-muted-foreground" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{file.size ? (file.size / 1024).toFixed(1) : '0.0'} KB</p>
            </div>
            <div className={cn(
                "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
            )}>
                {selected && <Check className="w-3 h-3" />}
            </div>
        </div>
    )

    return (
        <div className="flex flex-col h-[600px] w-full max-w-3xl bg-background rounded-xl border shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">{t('files.picker.title')}</h2>
                <Button variant="ghost" size="icon" onClick={onCancel}>
                    <X className="w-5 h-5" />
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as 'select' | 'upload')} className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 border-b">
                    <TabsList className="bg-transparent p-0 gap-6">
                        <TabsTrigger
                            value="select"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 py-3"
                        >
                            {t('files.picker.select_mode')}
                        </TabsTrigger>
                        <TabsTrigger
                            value="upload"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 py-3"
                        >
                            {t('files.picker.upload_mode')}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="select" className="flex-1 flex flex-col min-h-0 mt-0">
                    <div className="px-6 py-4 flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder={t('files.picker.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-muted/30"
                            />
                        </div>
                        <div className="flex items-center border rounded-md p-1">
                            <Button
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewMode('list')}
                            >
                                <List className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="px-6 pb-6">
                            {filteredFiles.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                        <Search className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <p className="text-lg font-medium mb-1">{t('files.picker.no_files')}</p>
                                    <p className="text-sm text-muted-foreground">
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

                    <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            {t('files.picker.selected', { count: selectedIds.size })}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onCancel}>
                                {t('files.picker.cancel')}
                            </Button>
                            <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
                                {selectedIds.size > 0 ? t('files.picker.select_plural', { count: selectedIds.size }) : t('files.picker.select')}
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="upload" className="flex-1 min-h-0 mt-0 p-6">
                    <FileUploader
                        onUploadComplete={() => setActiveTab('select')}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
