import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useParams } from '@tanstack/react-router'
import { usePanelStore } from '../../../../lib/panelStore'
import { useSession } from '../../../../lib/auth'
import type { Label } from '../../labels/LabelBadge'
import { LabelPicker } from '../../labels/LabelPicker'
import { FilePicker } from '../../files/FilePicker'
import { useTaskFiles, useAttachFile, useRemoveFileFromTask } from '../../../../hooks/useTaskFiles'
import { useTasks, isTaskBlocked } from '../../../../hooks/useTasks'
import {
  ChevronsRight,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Link as LinkIcon,
  Paperclip,
  MoreHorizontal,
  Trash2,
  Archive,
  Check,
  ChevronDown,
} from 'lucide-react'
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
    dependsOn?: string[]
    isCompleted?: boolean
  }) => void
  subtasks?: Subtask[]
  onSubtaskToggle?: (subtaskId: string) => void
  onSubtasksChange?: (subtasks: Subtask[]) => void
  onAddSubtask?: (title: string, subtask?: Subtask) => void
  onEditSubtask?: (subtaskId: string, updates: Partial<Subtask>) => void
  onDeleteSubtask?: (subtaskId: string) => void
  stages?: { id: string; name: string; color: string }[]
  teamMembers?: {
    id: string
    name: string
    avatar?: string
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
  label,
}: {
  active: boolean
  onClick: () => void
  icon?: React.ReactNode
  activeIcon?: React.ReactNode
  label: string
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? 'border-[#F2CE88] text-[#F2CE88]'
        : 'border-transparent text-gray-400 hover:text-gray-300'
    }`}
  >
    {active ? activeIcon : icon}
    {label}
  </button>
)

// Status Selector with dropdown
import * as Select from '@radix-ui/react-select'

const StatusSelector = ({
  status,
  stages,
  onChange,
  disabled = false,
  title,
}: {
  status: string
  stages: { id: string; name: string; color: string }[]
  onChange: (s: string) => void
  disabled?: boolean
  title?: string
}) => {
  const { t } = useTranslation()
  const currentStage = stages.find((s) => s.id === status)

  return (
    <Select.Root value={status} onValueChange={onChange} disabled={disabled}>
      <Select.Trigger
        className={`flex items-center gap-2 rounded-lg border-none bg-gray-800 px-2.5 py-1 text-xs font-medium outline-none transition-colors focus:ring-1 focus:ring-amber-500/50 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-700'}`}
        title={title}
      >
        <Select.Value>
          <div className="flex items-center gap-2">
            {currentStage && (
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: currentStage.color }}
              />
            )}
            <span className="text-white">
              {currentStage?.name || t('tasks.edit.select_status')}
            </span>
          </div>
        </Select.Value>
        <Select.Icon className="text-gray-400">
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="z-50 min-w-[140px] overflow-hidden rounded-lg border border-gray-800 bg-[#1a1a24] shadow-xl">
          <Select.Viewport className="p-1">
            {stages.map((stage) => (
              <Select.Item
                key={stage.id}
                value={stage.id}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-md px-6 py-2 text-xs text-gray-300 outline-none hover:bg-gray-800 focus:bg-gray-800 focus:text-white data-[state=checked]:text-amber-400"
              >
                <Select.ItemText>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
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

const DependsOnSelector = ({
  selectedIds,
  availableTasks,
  onChange,
}: {
  selectedIds: string[]
  availableTasks: any[]
  onChange: (ids: string[]) => void
}) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg bg-gray-800 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-gray-700"
      >
        <span className="text-white">
          {selectedIds.length === 0
            ? t('tasks.create.dependencies_placeholder')
            : t('tasks.create.dependencies_count', { count: selectedIds.length })}
        </span>
        <ChevronDown size={14} className="text-gray-400" />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-64 overflow-y-auto rounded-lg border border-gray-800 bg-[#1a1a24] p-1 shadow-xl">
          {availableTasks.map((task) => {
            const isSelected = selectedIds.includes(task.id)
            return (
              <button
                key={task.id}
                onClick={() => {
                  if (isSelected) {
                    onChange(selectedIds.filter((id) => id !== task.id))
                  } else {
                    onChange([...selectedIds, task.id])
                  }
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-gray-300 transition-colors hover:bg-gray-800"
              >
                <div
                  className={`flex h-3 w-3 items-center justify-center rounded border ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-gray-600'}`}
                >
                  {isSelected && <Check size={10} className="text-black" />}
                </div>
                <span className="flex-1 truncate">{task.title}</span>
              </button>
            )
          })}
          {availableTasks.length === 0 && (
            <div className="p-3 text-center text-xs text-gray-500">
              {t('tasks.create.no_tasks_available')}
            </div>
          )}
        </div>
      )}
    </div>
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
}: EditTaskPanelProps) {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
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
  const [selectedDependsOn, setSelectedDependsOn] = useState<string[]>([])
  const [isCompleted, setIsCompleted] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  // Handle click outside for more menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false)
      }
    }
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMoreMenu])

  // File management
  const { data: taskFiles } = useTaskFiles(task?.id)
  const attachFile = useAttachFile()
  const removeFile = useRemoveFileFromTask()

  // Fetch available tasks for dependencies
  const { data: allTasks = [] } = useTasks(workspaceSlug)
  const availableTasks = allTasks.filter((t) => t.id !== task?.id)

  const isBlocked = isTaskBlocked({ dependsOn: selectedDependsOn } as any, allTasks)
  const blockedTitle = isBlocked ? t('tasks.blocked_by_dependencies') : undefined

  // Labels
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

  // Initialize form when task changes
  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setPriority(task.priority || 'medium')
      setStatus(task.status || stages[0]?.id || '')
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined)
      setLinks((task as any).links || [])
      setSelectedDependsOn((task as any).dependsOn || [])
      setIsCompleted(task.isCompleted || false)
      setActiveTab('subtasks')
      const sourceAssignees = task.assigneeDetails || task.assignees || []
      const rawAssignees =
        (sourceAssignees as any[]).map((a) => ({
          id: a.id,
          name: a.name,
          avatar: a.avatar || a.image,
          image: a.image || a.avatar,
        })) || []
      const uniqueAssignees = Array.from(new Map(rawAssignees.map((a) => [a.id, a])).values())
      setSelectedAssignees(uniqueAssignees)
      const taskLabelIds = (task.labels as unknown as string[]) || []
      const allLabels = propAvailableLabels.length > 0 ? propAvailableLabels : defaultLabels
      const resolvedLabels = taskLabelIds
        .map((id) => allLabels.find((l) => l.id === id))
        .filter((l): l is Label => !!l)
      setSelectedLabels(resolvedLabels)
    }
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
      assigneeIds: selectedAssignees.map((a) => a.id),
      labelIds: selectedLabels.map((l) => l.id),
      links: links,
      dependsOn: selectedDependsOn,
      isCompleted: isCompleted,
    })
    onClose()
  }

  if (!task) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed inset-0 z-50 flex w-full max-w-none transform flex-col rounded-none bg-[#12121a] shadow-2xl transition-all duration-300 ease-out sm:inset-auto sm:bottom-4 sm:right-4 sm:top-4 sm:w-[448px] sm:max-w-md sm:rounded-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full sm:translate-x-[calc(100%+2rem)]'} ${isMaximized ? 'max-w-5xl' : 'max-w-lg'}`}
      >
        {/* Header */}
        <div className="flex-none rounded-t-2xl border-b border-gray-800 p-6">
          {/* Top row with actions synced with Details Panel style */}
          <div className="mb-8 flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                onClick={onClose}
                className="flex-shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                title={t('projects.details.close')}
              >
                <ChevronsRight size={18} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isBlocked) setIsCompleted(!isCompleted)
                }}
                disabled={isBlocked}
                className={`flex min-w-0 max-w-[180px] items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  isCompleted
                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                } ${isBlocked ? 'cursor-not-allowed opacity-50' : ''}`}
                title={
                  isBlocked
                    ? blockedTitle
                    : isCompleted
                      ? t('tasks.details.mark_incomplete', {
                          defaultValue: 'Oznacz jako niedokończone',
                        })
                      : t('tasks.details.mark_complete', { defaultValue: 'Oznacz jako gotowe' })
                }
              >
                <CheckCircle2
                  size={16}
                  className={`flex-shrink-0 ${isCompleted ? 'fill-emerald-500/20' : ''}`}
                />
                <span className="truncate">
                  {isCompleted
                    ? t('tasks.status.done', { defaultValue: 'Gotowe' })
                    : t('tasks.details.mark_complete', { defaultValue: 'Oznacz jako gotowe' })}
                </span>
              </button>
              <span className="flex-shrink-0 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                {t('tasks.edit.edit_mode')}
              </span>
            </div>

            <div className="flex flex-shrink-0 items-center gap-1">
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                title={isMaximized ? t('tasks.details.minimize') : t('tasks.details.maximize')}
              >
                {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>

              <div className="relative flex items-center">
                <button
                  onClick={() => {
                    const url = new URL(window.location.href)
                    url.searchParams.set('taskId', task.id)
                    navigator.clipboard.writeText(url.toString())
                    setIsCopied(true)
                    setTimeout(() => setIsCopied(false), 2000)
                  }}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                  title={t('tasks.details.copy_link')}
                >
                  <LinkIcon size={18} />
                </button>
                {isCopied && (
                  <span className="animate-in fade-in slide-in-from-bottom-2 absolute -top-10 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 px-2.5 py-1.5 text-xs text-white shadow-xl">
                    {t('tasks.details.copied', 'Copied!')}
                  </span>
                )}
              </div>

              <button
                onClick={() => setActiveTab('shared')}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                title={t('tasks.details.attachments')}
              >
                <Paperclip size={18} />
              </button>

              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className={`rounded-lg p-2 transition-colors ${showMoreMenu ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                  title={t('tasks.details.more_options')}
                >
                  <MoreHorizontal size={18} />
                </button>

                {showMoreMenu && (
                  <div className="animate-in fade-in zoom-in-95 absolute right-0 top-full z-[100] mt-2 w-48 rounded-none border border-gray-800 bg-[#1a1a24] py-1.5 shadow-2xl duration-100 sm:rounded-xl">
                    <button
                      onClick={() => {
                        setShowMoreMenu(false)
                        console.log('Archive task requested in edit mode')
                      }}
                      className="flex w-full items-center gap-2 whitespace-nowrap px-4 py-2.5 text-left text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                    >
                      <Archive size={15} className="text-gray-500" />
                      {t('common.archive', { defaultValue: 'Archiwizuj' })}
                    </button>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false)
                        console.log('Delete task requested in edit mode')
                      }}
                      className="flex w-full items-center gap-2 whitespace-nowrap px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-400/10 hover:text-red-300"
                    >
                      <Trash2 size={15} />
                      {t('common.delete', { defaultValue: 'Usuń' })}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Task Title - Editable */}
          <div className="mb-6">
            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                autoFocus
                className="w-full rounded-none border border-amber-500/50 bg-gray-800/50 px-4 py-2 text-2xl font-bold text-white shadow-[0_0_20px_rgba(245,158,11,0.05)] outline-none sm:rounded-xl"
              />
            ) : (
              <h2
                onClick={() => setIsEditingTitle(true)}
                className={`cursor-pointer text-2xl font-bold transition-all hover:text-amber-400 ${isCompleted ? 'text-gray-500/70 line-through' : 'text-white'}`}
                title={t('tasks.edit.click_to_edit')}
              >
                {title}
              </h2>
            )}
          </div>

          {/* Task Meta Grid - Synced with Details Panel layout */}
          <div className="space-y-3">
            {/* Project */}
            {task.projectName && (
              <div className="group flex items-center gap-4">
                <span className="w-28 flex-shrink-0 text-sm text-gray-500">
                  {t('tasks.edit.meta.project')}
                </span>
                <span className="truncate text-sm text-gray-300 transition-colors group-hover:text-white">
                  {task.projectName}
                </span>
              </div>
            )}

            {/* Assignees - Editable */}
            <div className="flex items-start gap-4">
              <span className="w-28 flex-shrink-0 pt-1.5 text-sm text-gray-500">
                {t('tasks.edit.meta.assignee')}
              </span>
              <div className="min-w-0 flex-1">
                <AssigneePicker
                  selectedAssignees={selectedAssignees}
                  availableAssignees={teamMembers}
                  onSelect={setSelectedAssignees}
                  maxVisible={2}
                  disabled={isBlocked}
                  title={blockedTitle}
                />
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-4">
              <span className="w-28 flex-shrink-0 text-sm text-gray-500">
                {t('tasks.edit.meta.status')}
              </span>
              <div className="min-w-0 flex-1">
                <StatusSelector
                  status={status}
                  stages={stages}
                  onChange={setStatus}
                  disabled={isBlocked}
                  title={blockedTitle}
                />
              </div>
            </div>

            {/* Due Date - Editable */}
            <div className="flex items-center gap-4">
              <span className="w-28 flex-shrink-0 text-sm text-gray-500">
                {t('tasks.edit.meta.end_date')}
              </span>
              <div className="min-w-0 flex-1">
                <DueDatePicker
                  value={dueDate}
                  onChange={setDueDate}
                  placeholder={t('tasks.edit.select_date')}
                />
              </div>
            </div>

            {/* Priority - Editable */}
            <div className="flex items-center gap-4">
              <span className="w-28 flex-shrink-0 text-sm text-gray-500">
                {t('tasks.edit.meta.priority')}
              </span>
              <div className="min-w-0 flex-1">
                <PrioritySelector value={priority} onChange={setPriority} size="sm" />
              </div>
            </div>

            {/* Labels - Editable */}
            <div className="flex items-start gap-4">
              <span className="w-28 flex-shrink-0 pt-1.5 text-sm text-gray-500">
                {t('tasks.edit.meta.labels')}
              </span>
              <div className="min-w-0 flex-1">
                <LabelPicker
                  selectedLabels={selectedLabels}
                  availableLabels={availableLabels}
                  onSelect={setSelectedLabels}
                  onCreateNew={handleCreateLabel}
                />
              </div>
            </div>

            {/* Dependencies */}
            <div className="flex items-center gap-4">
              <span className="w-28 flex-shrink-0 text-sm text-gray-500">
                {t('tasks.create.dependencies')}
              </span>
              <div className="min-w-0 flex-1">
                <DependsOnSelector
                  selectedIds={selectedDependsOn}
                  availableTasks={availableTasks}
                  onChange={setSelectedDependsOn}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Description - Editable */}
        <div className="flex-none border-b border-gray-800 p-6">
          <h3 className="mb-2 text-sm font-semibold text-white">{t('tasks.edit.description')}</h3>
          {isEditingDescription ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => setIsEditingDescription(false)}
              autoFocus
              rows={4}
              className="w-full resize-none rounded-lg border border-amber-500 bg-gray-800 px-3 py-2 text-sm leading-relaxed text-gray-400 outline-none"
              placeholder={t('tasks.edit.description_placeholder')}
            />
          ) : (
            <p
              onClick={() => setIsEditingDescription(true)}
              className="min-h-[40px] cursor-pointer break-words text-sm leading-relaxed text-gray-400 transition-colors hover:text-gray-300"
              title={t('tasks.edit.click_to_add_description')}
            >
              {description || t('tasks.edit.click_to_add_description')}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex-none border-b border-gray-800">
          <div className="scrollbar-hide flex gap-2 overflow-x-auto px-6">
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
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Subtasks Tab */}
          {activeTab === 'subtasks' && (
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  {t('tasks.edit.subtasks_header')}
                </h3>
                <span className="text-xs text-gray-500">
                  {subtasks.filter((s) => s.isCompleted).length}/{subtasks.length}
                </span>
              </div>
              <SubtaskList
                subtasks={subtasks}
                availableAssignees={teamMembers}
                onToggle={
                  isBlocked
                    ? undefined
                    : (subtaskId: string) => {
                        onSubtaskToggle?.(subtaskId)
                      }
                }
                onReorder={
                  isBlocked
                    ? undefined
                    : (newOrder: Subtask[]) => {
                        onSubtasksChange?.(newOrder)
                      }
                }
                onEdit={
                  isBlocked
                    ? undefined
                    : (id: string, updates: Partial<Subtask>) => {
                        onEditSubtask?.(id, updates)
                      }
                }
                onDelete={
                  isBlocked
                    ? undefined
                    : (id: string) => {
                        onDeleteSubtask?.(id)
                      }
                }
                onAdd={
                  isBlocked
                    ? undefined
                    : (titleStr: string) => {
                        if (titleStr.trim()) {
                          const newSubtask: Subtask = {
                            id: `subtask_${Date.now()}`,
                            title: titleStr.trim(),
                            isCompleted: false,
                          }
                          onAddSubtask?.(titleStr, newSubtask)
                        }
                      }
                }
              />
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'shared' && (
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{t('tasks.edit.files_header')}</h3>
                <button
                  onClick={() => setShowFilePicker(true)}
                  className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                >
                  {t('tasks.edit.add_file')}
                </button>
              </div>
              {taskFiles && taskFiles.length > 0 ? (
                <div className="space-y-2">
                  {taskFiles.map((file: FileRecord) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 rounded-lg bg-gray-800/50 p-3"
                    >
                      <PaperclipIcon />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          task?.id &&
                          file.id &&
                          removeFile.mutate({ taskId: task.id, fileId: file.id })
                        }
                        className="p-1 text-gray-500 transition-colors hover:text-red-400"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <PaperclipIcon />
                  <p className="mt-2 text-sm">{t('tasks.edit.no_attachments')}</p>
                  <p className="mt-1 text-xs text-gray-600">
                    {t('tasks.edit.no_attachments_hint')}
                  </p>
                </div>
              )}

              {/* FilePicker Modal */}
              {showFilePicker &&
                createPortal(
                  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                      onClick={() => setShowFilePicker(false)}
                    />
                    <FilePicker
                      onCancel={() => setShowFilePicker(false)}
                      onSelect={(files: FileRecord[]) => {
                        if (task?.id && files.length > 0) {
                          files.forEach((file) => {
                            attachFile.mutate({ taskId: task.id!, fileId: file.id })
                          })
                        }
                        setShowFilePicker(false)
                      }}
                    />
                  </div>,
                  document.body
                )}
            </div>
          )}

          {/* Links Tab */}
          {activeTab === 'links' && (
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{t('tasks.edit.links_header')}</h3>
                <button
                  onClick={() => setShowLinkInput(true)}
                  className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-500/20"
                >
                  {t('tasks.edit.add_link')}
                </button>
              </div>
              <LinksList
                links={links}
                onDelete={(linkId: string) =>
                  setLinks((prev) => prev.filter((l) => l.id !== linkId))
                }
              />
            </div>
          )}
        </div>

        {/* Footer with Save Action */}
        <div className="flex flex-none justify-end gap-3 rounded-b-2xl border-t border-gray-800 bg-[#12121a] p-6">
          <button
            onClick={onClose}
            className="rounded-none px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white sm:rounded-xl"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="transform rounded-none bg-amber-500 px-6 py-2 text-sm font-bold text-black shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all hover:-translate-y-0.5 hover:bg-amber-400 hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] active:translate-y-0 sm:rounded-xl"
          >
            {t('common.save')}
          </button>
        </div>

        <LinkInput
          open={showLinkInput}
          onClose={() => setShowLinkInput(false)}
          onAdd={(newLink) => {
            setLinks((prev) => [
              ...prev,
              {
                ...newLink,
                id: Date.now().toString(),
                addedBy: session?.user?.id || 'unknown',
                addedAt: new Date().toISOString(),
              },
            ])
            setShowLinkInput(false)
          }}
        />
      </div>
    </>
  )
}
