import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { usePanelStore } from '../../../../lib/panelStore'
import type { Label } from '../../labels/LabelBadge'
import { LabelPicker } from '../../labels/LabelPicker'
import { FilePicker } from '../../files/FilePicker'
import { useTaskFiles, useAttachFile, useRemoveFileFromTask } from '../../../../hooks/useTaskFiles'
import {
    DocumentIcon,
    DocumentIconGold,
    PaperclipIcon,
    PaperclipIconGold,
} from '../components/TaskIcons'
import type { TaskCardProps } from '../components/TaskCard'
import { SubtaskList, type Subtask } from '../subtasks/SubtaskList'
import { AssigneePicker, type Assignee } from '../components/AssigneePicker'
import { DueDatePicker } from '../components/DueDatePicker'
import { LinkInput } from '../links/LinkInput'
import { LinksList } from '../links/LinksList'
import type { TaskLink, FileRecord } from '@taskdashboard/types'
import { PrioritySelector } from '../components/PrioritySelector'

interface EditTaskPanelProps {
    task: TaskCardProps | null
    isOpen: boolean
    onClose: () => void
    onSave: (data: {
        id: string
        title: string
        description?: string
        priority: string
        status: string
        dueDate?: string
        assigneeIds?: string[]
        labelIds?: string[]
        links?: TaskLink[]
    }) => void
    subtasks?: Subtask[]
    onSubtaskToggle?: (subtaskId: string) => void
    onSubtasksChange?: (subtasks: Subtask[]) => void
    onAddSubtask?: (title: string, subtask?: Subtask) => void
    onEditSubtask?: (subtaskId: string, updates: Partial<Subtask>) => void
    onDeleteSubtask?: (subtaskId: string) => void
    stages?: { id: string; name: string; color: string }[]
    teamMembers?: {
        id: string; name: string; avatar?: string
    }[]
    availableLabels?: Label[]
    onCreateLabel?: (name: string, color: string) => Promise<Label | undefined>
    workspaceSlug?: string
    userId?: string
}

// Tab Button
const TabButton = ({
    active,
    onClick,
    icon,
    activeIcon,
    label
}: {
    active: boolean
    onClick: () => void
    icon?: React.ReactNode
    activeIcon?: React.ReactNode
    label: string
}) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${active
            ? 'text-[#F2CE88] border-[#F2CE88]'
            : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
    >
        {active ? activeIcon : icon}
        {label}
    </button>
)



// Status Selector with dropdown
import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'

const StatusSelector = ({
    status,
    stages,
    onChange
}: {
    status: string
    stages: { id: string; name: string; color: string }[]
    onChange: (s: string) => void
}) => {
    const { t } = useTranslation()
    const currentStage = stages.find(s => s.id === status)

    return (
        <Select.Root value={status} onValueChange={onChange}>
            <Select.Trigger className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer outline-none border-none focus:ring-1 focus:ring-amber-500/50">
                <Select.Value>
                    <div className="flex items-center gap-2">
                        {currentStage && (
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: currentStage.color }}
                            />
                        )}
                        <span className="text-white">{currentStage?.name || t('tasks.edit.select_status')}</span>
                    </div>
                </Select.Value>
                <Select.Icon className="text-gray-400">
                    <ChevronDown size={14} />
                </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
                <Select.Content className="overflow-hidden bg-[#1a1a24] rounded-lg border border-gray-800 shadow-xl z-50 min-w-[140px]">
                    <Select.Viewport className="p-1">
                        {stages.map(stage => (
                            <Select.Item
                                key={stage.id}
                                value={stage.id}
                                className="relative flex items-center gap-2 px-6 py-2 text-xs text-gray-300 rounded-md select-none hover:bg-gray-800 focus:bg-gray-800 focus:text-white outline-none cursor-pointer data-[state=checked]:text-amber-400"
                            >
                                <Select.ItemText>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: stage.color }}
                                        />
                                        {stage.name}
                                    </div>
                                </Select.ItemText>
                                <Select.ItemIndicator className="absolute left-1 inline-flex items-center justify-center">
                                    <Check size={12} />
                                </Select.ItemIndicator>
                            </Select.Item>
                        ))}
                    </Select.Viewport>
                </Select.Content>
            </Select.Portal>
        </Select.Root>
    )
}

export function EditTaskPanel({
    task,
    isOpen,
    onClose,
    onSave,
    subtasks = [],
    onSubtaskToggle,
    onSubtasksChange,
    onAddSubtask,
    onEditSubtask,
    onDeleteSubtask,
    stages = [],
    teamMembers = [],
    availableLabels: propAvailableLabels = [],
    onCreateLabel: propOnCreateLabel,
    userId,
}: EditTaskPanelProps) {
    const { t } = useTranslation()
    const [activeTab, setActiveTab] = useState<'subtasks' | 'shared' | 'links'>('subtasks')
    const [links, setLinks] = useState<TaskLink[]>([])
    const [showLinkInput, setShowLinkInput] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)
    const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)

    // Form state
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [priority, setPriority] = useState('medium')
    const [status, setStatus] = useState('')
    const [dueDate, setDueDate] = useState<string | undefined>(undefined)
    const [selectedAssignees, setSelectedAssignees] = useState<Assignee[]>([])
    const [selectedLabels, setSelectedLabels] = useState<Label[]>([])
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [isEditingDescription, setIsEditingDescription] = useState(false)
    const [showFilePicker, setShowFilePicker] = useState(false)

    // File management
    const { data: taskFiles } = useTaskFiles(task?.id)
    const attachFile = useAttachFile()
    const removeFile = useRemoveFileFromTask()

    // Labels - use useMemo to prevent recreation on every render
    const defaultLabels: Label[] = [
        { id: 'bug', name: 'Bug', color: '#ef4444' },
        { id: 'feature', name: 'Feature', color: '#10b981' },
        { id: 'frontend', name: 'Frontend', color: '#3b82f6' },
        { id: 'backend', name: 'Backend', color: '#8b5cf6' },
        { id: 'design', name: 'Design', color: '#ec4899' },
        { id: 'docs', name: 'Dokumentacja', color: '#6b7280' },
    ]
    const availableLabels = propAvailableLabels.length > 0 ? propAvailableLabels : defaultLabels

    // Sync isOpen with global panel store
    useEffect(() => {
        setIsPanelOpen(isOpen)
    }, [isOpen, setIsPanelOpen])

    // Initialize form when task changes - only depend on task.id and isOpen
    useEffect(() => {
        if (task && isOpen) {
            setTitle(task.title || '')
            setDescription(task.description || '')
            setPriority(task.priority || 'medium')
            setStatus(task.status || stages[0]?.id || '')
            setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined)
            setLinks((task as any).links || [])
            setActiveTab('subtasks')
            // Deduplicate assignees by ID and include image support
            const sourceAssignees = task.assigneeDetails || task.assignees || []
            const rawAssignees = (sourceAssignees as any[]).map(a => ({
                id: a.id,
                name: a.name,
                avatar: a.avatar,
                image: a.image
            })) || []
            const uniqueAssignees = Array.from(new Map(rawAssignees.map(a => [a.id, a])).values())
            setSelectedAssignees(uniqueAssignees)
            // Resolve label IDs to objects
            const taskLabelIds = (task.labels as unknown as string[]) || []
            const allLabels = propAvailableLabels.length > 0 ? propAvailableLabels : defaultLabels
            const resolvedLabels = taskLabelIds
                .map(id => allLabels.find(l => l.id === id))
                .filter((l): l is Label => !!l)
            setSelectedLabels(resolvedLabels)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [task?.id, isOpen])

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            return () => document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

    // NOTE: Removed click outside handler as it was closing the panel when clicking on 
    // dropdowns/pickers (DueDatePicker, AssigneePicker, LabelPicker, PrioritySelector).
    // Users can close the panel using the close button or Escape key.

    const handleCreateLabel = async (name: string, color: string): Promise<Label | undefined> => {
        if (propOnCreateLabel) {
            return propOnCreateLabel(name, color)
        }
        const newLabel: Label = { id: `label_${Date.now()}`, name, color }
        return newLabel
    }

    const handleSave = () => {
        if (!task?.id || !title.trim()) return
        onSave({
            id: task.id,
            title: title.trim(),
            description: description.trim() || undefined,
            priority,
            status,
            dueDate: dueDate || undefined,
            assigneeIds: selectedAssignees.map(a => a.id),
            labelIds: selectedLabels.map(l => l.id),
            links: links,
        })
        onClose()
    }

    if (!task) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={`fixed top-4 right-4 bottom-4 w-full max-w-lg bg-[#12121a] rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'
                    }`}
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-gray-800 rounded-t-2xl">
                    {/* Top row with collapse and actions */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            title="Zamknij"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M13 17L18 12L13 7" />
                                <path d="M6 17L11 12L6 7" />
                            </svg>
                        </button>
                        <span className="text-xs text-amber-400 font-medium px-2 py-1 bg-amber-500/10 rounded-lg">{t('tasks.edit.edit_mode')}</span>
                    </div>

                    {/* Task Title - Editable */}
                    {isEditingTitle ? (
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={() => setIsEditingTitle(false)}
                            onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                            autoFocus
                            className="text-xl font-bold text-white mb-4 w-full bg-gray-800 border border-amber-500 rounded-lg px-3 py-2 outline-none"
                        />
                    ) : (
                        <h2
                            onClick={() => setIsEditingTitle(true)}
                            className="text-xl font-bold text-white mb-4 cursor-pointer hover:text-amber-400 transition-colors"
                            title={t('tasks.edit.click_to_edit')}
                        >
                            {title}
                        </h2>
                    )}

                    {/* Task Meta */}
                    <div className="space-y-3">
                        {/* Project */}
                        {task.projectName && (
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-500 w-20">{t('tasks.edit.meta.project')}</span>
                                <span className="text-sm text-white">{task.projectName}</span>
                            </div>
                        )}

                        {/* Assignees - Editable */}
                        <div className="flex items-start gap-4">
                            <span className="text-sm text-gray-500 w-20 pt-2">{t('tasks.edit.meta.assignee')}</span>
                            <div className="flex-1">
                                <AssigneePicker
                                    selectedAssignees={selectedAssignees}
                                    availableAssignees={teamMembers}
                                    onSelect={setSelectedAssignees}
                                    maxVisible={2}
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 w-20">{t('tasks.edit.meta.status')}</span>
                            <StatusSelector status={status} stages={stages} onChange={setStatus} />
                        </div>

                        {/* Due Date - Editable */}
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 w-20">{t('tasks.edit.meta.end_date')}</span>
                            <DueDatePicker
                                value={dueDate}
                                onChange={setDueDate}
                                placeholder={t('tasks.edit.select_date')}
                            />
                        </div>

                        {/* Priority - Editable */}
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 w-20">{t('tasks.edit.meta.priority')}</span>
                            <PrioritySelector value={priority} onChange={setPriority} size="sm" />
                        </div>

                        {/* Labels - Editable */}
                        <div className="flex items-start gap-4">
                            <span className="text-sm text-gray-500 w-20 pt-2">{t('tasks.edit.meta.labels')}</span>
                            <div className="flex-1">
                                <LabelPicker
                                    selectedLabels={selectedLabels}
                                    availableLabels={availableLabels}
                                    onSelect={setSelectedLabels}
                                    onCreateNew={handleCreateLabel}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description - Editable */}
                <div className="flex-none p-6 border-b border-gray-800">
                    <h3 className="text-sm font-semibold text-white mb-2">{t('tasks.edit.description')}</h3>
                    {isEditingDescription ? (
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onBlur={() => setIsEditingDescription(false)}
                            autoFocus
                            rows={4}
                            className="w-full text-sm text-gray-400 leading-relaxed bg-gray-800 border border-amber-500 rounded-lg px-3 py-2 outline-none resize-none"
                            placeholder={t('tasks.edit.description_placeholder')}
                        />
                    ) : (
                        <p
                            onClick={() => setIsEditingDescription(true)}
                            className="text-sm text-gray-400 leading-relaxed break-words cursor-pointer hover:text-gray-300 transition-colors min-h-[40px]"
                            title={t('tasks.edit.click_to_add_description')}
                        >
                            {description || t('tasks.edit.click_to_add_description')}
                        </p>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex-none border-b border-gray-800">
                    <div className="flex gap-2 px-6 overflow-x-auto scrollbar-hide">
                        <TabButton
                            active={activeTab === 'subtasks'}
                            onClick={() => setActiveTab('subtasks')}
                            icon={<DocumentIcon />}
                            activeIcon={<DocumentIconGold />}
                            label={t('tasks.edit.tabs.subtasks')}
                        />
                        <TabButton
                            active={activeTab === 'shared'}
                            onClick={() => setActiveTab('shared')}
                            icon={<PaperclipIcon />}
                            activeIcon={<PaperclipIconGold />}
                            label={t('tasks.edit.tabs.files')}
                        />
                        <TabButton
                            active={activeTab === 'links'}
                            onClick={() => setActiveTab('links')}
                            label={t('tasks.edit.tabs.links')}
                        />
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Subtasks Tab */}
                    {activeTab === 'subtasks' && (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-white">{t('tasks.edit.subtasks_header')}</h3>
                                <span className="text-xs text-gray-500">{subtasks.filter(s => s.status === 'done' || s.isCompleted).length}/{subtasks.length}</span>
                            </div>
                            <SubtaskList
                                subtasks={subtasks}
                                onToggle={(subtaskId) => {
                                    onSubtaskToggle?.(subtaskId)
                                }}
                                onReorder={(newOrder) => {
                                    onSubtasksChange?.(newOrder)
                                }}
                                onEdit={(id, updates) => {
                                    onEditSubtask?.(id, updates)
                                }}
                                onDelete={(id) => {
                                    onDeleteSubtask?.(id)
                                }}
                                onAdd={(titleStr, _afterId) => {
                                    if (titleStr.trim()) {
                                        const newSubtask: Subtask = {
                                            id: `subtask_${Date.now()}`,
                                            title: titleStr.trim(),
                                            status: 'todo',
                                            priority: 'medium',
                                            isCompleted: false,
                                        }
                                        onAddSubtask?.(titleStr, newSubtask)
                                    }
                                }}
                            />
                        </div>
                    )}

                    {/* Files Tab */}
                    {activeTab === 'shared' && (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-white">{t('tasks.edit.files_header')}</h3>
                                <button
                                    onClick={() => setShowFilePicker(true)}
                                    className="px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 rounded-lg hover:bg-amber-500/20 transition-colors"
                                >
                                    {t('tasks.edit.add_file')}
                                </button>
                            </div>
                            {taskFiles && taskFiles.length > 0 ? (
                                <div className="space-y-2">
                                    {taskFiles.map((file) => (
                                        <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                                            <PaperclipIcon />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white font-medium truncate">{file.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => task?.id && file.id && removeFile.mutate({ taskId: task.id, fileId: file.id })}
                                                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M18 6L6 18M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <PaperclipIcon />
                                    <p className="text-sm mt-2">{t('tasks.edit.no_attachments')}</p>
                                    <p className="text-xs text-gray-600 mt-1">{t('tasks.edit.no_attachments_hint')}</p>
                                </div>
                            )}

                            {/* FilePicker Modal */}
                            {showFilePicker && createPortal(
                                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                                    {/* Backdrop */}
                                    <div
                                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                                        onClick={() => setShowFilePicker(false)}
                                    />

                                    {/* Modal Content */}
                                    <div className="relative w-full max-w-4xl bg-[#12121a] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
                                        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-white">{t('files.picker.title')}</h3>
                                            <button
                                                onClick={() => setShowFilePicker(false)}
                                                className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M18 6L6 18M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="p-4">
                                            <FilePicker
                                                onCancel={() => setShowFilePicker(false)}
                                                onSelect={(files: FileRecord[]) => {
                                                    if (task?.id && files.length > 0) {
                                                        files.forEach(file => {
                                                            attachFile.mutate({ taskId: task.id!, fileId: file.id })
                                                        })
                                                    }
                                                    setShowFilePicker(false)
                                                }}
                                            // workspaceSlug is handled internally by FilePicker using useParams
                                            />
                                        </div>
                                    </div>
                                </div>,
                                document.body
                            )}
                        </div>
                    )}

                    {/* Links Tab */}
                    {activeTab === 'links' && (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-white">{t('tasks.edit.links_header')}</h3>
                                <button
                                    onClick={() => setShowLinkInput(true)}
                                    className="px-3 py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-lg text-xs font-medium transition-colors"
                                >
                                    {t('tasks.edit.add_link')}
                                </button>
                            </div>
                            <LinksList
                                links={links}
                                onDelete={(linkId) => setLinks(prev => prev.filter(l => l.id !== linkId))}
                            />
                        </div>
                    )}
                </div>

                {/* LinkInput Modal */}
                <LinkInput
                    open={showLinkInput}
                    onClose={() => setShowLinkInput(false)}
                    onAdd={(link) => {
                        const newLink: TaskLink = {
                            id: crypto.randomUUID(),
                            url: link.url,
                            title: link.title,
                            addedBy: userId || 'unknown',
                            addedAt: new Date().toISOString()
                        }
                        setLinks(prev => [...prev, newLink])
                        setShowLinkInput(false)
                    }}
                />

                {/* Footer with Save Button */}
                <div className="flex-none p-6 border-t border-gray-800 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-gray-800 text-gray-300 rounded-xl font-medium hover:bg-gray-700 transition-colors"
                    >
                        {t('tasks.edit.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!title.trim()}
                        className="flex-1 px-4 py-3 bg-amber-500 text-black rounded-xl font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('tasks.edit.save')}
                    </button>
                </div>
            </div>
        </>
    )
}
