import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { usePanelStore } from '../../../../lib/panelStore'
import { LabelPicker } from '../../labels/LabelPicker'
import type { Label } from '../../labels/LabelBadge'
import { PrioritySelector } from '../components/PrioritySelector'
import { StatusSelector, type ProjectStage } from '../components/StatusBadge'
import { DueDatePicker } from '../components/DueDatePicker'
import { AssigneePicker, type Assignee } from '../components/AssigneePicker'
import { TemplateSelector } from '../filters/TemplateSelector'
import { ChevronDoubleRightIcon } from '../components/TaskIcons'
import { apiFetch, apiFetchJson } from '@/lib/api'
import { useTasks } from '@/hooks/useTasks'
import { Check, ChevronDown } from 'lucide-react'

interface Project {
  id: string
  name: string
  stages?: ProjectStage[]
}

// Types
interface CreateTaskPanelProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (task: NewTaskData) => Promise<{ id: string } | null>
  defaultStatus?: string
  defaultProject?: string
  defaultType?: 'task' | 'meeting'
  defaultDueDate?: string
  workspaceSlug?: string // Used to fetch labels from workspace
  userId?: string // Used for authenticated API calls
  projects?: Project[]
  columns?: { id: string; title: string; color?: string }[]
  teamMembers?: { id: string; name: string; avatar?: string }[]
}

interface NewTaskData {
  title: string
  description: string
  type: 'task'
  status: string
  priority: string
  assignees: string[]
  dueDate?: string
  startDate?: string
  meetingLink?: string
  labels: string[]
  projectId?: string
  subtasks: { title: string; description: string; assigneeId?: string; dependsOn?: string[] }[]
  estimate?: string
  dependsOn?: string[]
}

// Default labels
const DEFAULT_LABELS = [
  { id: 'bug', name: 'Bug', color: '#ef4444' },
  { id: 'feature', name: 'Feature', color: '#10b981' },
  { id: 'frontend', name: 'Frontend', color: '#3b82f6' },
  { id: 'backend', name: 'Backend', color: '#8b5cf6' },
  { id: 'design', name: 'Design', color: '#ec4899' },
  { id: 'docs', name: 'Dokumentacja', color: '#6b7280' },
]

// Mock projects
const MOCK_PROJECTS = [
  { id: 'marketing', name: 'Marketing' },
  { id: 'development', name: 'Development' },
  { id: 'design', name: 'Design System' },
]

const DependsOnSelector = ({
  selectedIds,
  availableTasks,
  onChange,
}: {
  selectedIds: string[]
  availableTasks: any[]
  onChange: (ids: string[]) => void
}) => {
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
        className="flex w-full items-center justify-between rounded-lg border border-gray-800 bg-gray-800/30 px-3 py-2 text-sm transition-colors hover:bg-gray-800/50"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🔗</span>
          <span className={selectedIds.length === 0 ? 'text-gray-500' : 'text-white'}>
            {selectedIds.length === 0 ? 'Zależy od...' : `${selectedIds.length} zależności`}
          </span>
        </div>
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
            <div className="p-3 text-center text-xs text-gray-500">Brak innych zadań</div>
          )}
        </div>
      )}
    </div>
  )
}

// Dropdown Component
const Dropdown = ({
  isOpen,
  onClose,
  children,
  className = '',
}: {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={ref}
      className={`absolute left-0 top-full z-50 mt-2 overflow-hidden rounded-none bg-[#1a1a24] shadow-2xl sm:rounded-xl ${className}`}
    >
      {children}
    </div>
  )
}

// Main Component
export function CreateTaskPanel({
  isOpen,
  onClose,
  onCreate,
  defaultStatus = 'todo',
  defaultProject,
  defaultDueDate,
  workspaceSlug,
  userId,
  projects = MOCK_PROJECTS,
  availableLabels: propAvailableLabels,
  onCreateLabel: propOnCreateLabel,
  teamMembers = [],
}: CreateTaskPanelProps & {
  availableLabels?: Label[]
  onCreateLabel?: (name: string, color: string) => Label
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState(defaultStatus)
  const [priority, setPriority] = useState<string>('medium')
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [dueDate, setDueDate] = useState(defaultDueDate || '')
  const [startDate, setStartDate] = useState('')
  const [labels, setLabels] = useState<Label[]>([])
  const [projectId, setProjectId] = useState(defaultProject || projects[0]?.id || '')
  const [subtasks, setSubtasks] = useState<
    { title: string; description: string; assigneeId?: string; dependsOn?: string[] }[]
  >([])
  const [newSubtask, setNewSubtask] = useState('')
  const [dependsOn, setDependsOn] = useState<string[]>([])
  const [editingSubtaskIndex, setEditingSubtaskIndex] = useState<number | null>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [createMore, setCreateMore] = useState(false)
  const [currentStages, setCurrentStages] = useState<any[]>([])
  const [showMore, setShowMore] = useState(false)

  // Fetch available tasks for dependencies
  const { data: allTasks = [] } = useTasks(workspaceSlug)
  // Filter tasks from same project? Usually depends on can be cross-project or same.
  // For simplicity, allow all visible tasks.
  const availableTasks = allTasks

  // Item type is always 'task' now
  const itemType = 'task'

  // Use props if provided, otherwise fall back to local state
  const [localAvailableLabels, setLocalAvailableLabels] = useState<Label[]>(
    workspaceSlug ? [] : DEFAULT_LABELS
  )
  const availableLabels = propAvailableLabels || localAvailableLabels

  // Fetch labels from workspace when panel opens
  useEffect(() => {
    if (isOpen && workspaceSlug && !propAvailableLabels) {
      apiFetchJson<any>(`/api/labels?workspaceSlug=${workspaceSlug}`)
        .then((data) => {
          if (data.success && data.data) {
            setLocalAvailableLabels(data.data)
          }
        })
        .catch((err) => console.error('Failed to fetch labels:', err))
    } else if (!workspaceSlug && !propAvailableLabels) {
      setLocalAvailableLabels(DEFAULT_LABELS)
    }
  }, [isOpen, workspaceSlug, propAvailableLabels])

  // Dropdown states
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)

  const titleInputRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)

  // Sync isOpen with global panel store
  useEffect(() => {
    setIsPanelOpen(isOpen)
    if (isOpen && defaultProject) {
      setProjectId(defaultProject)
    }
    if (isOpen && defaultDueDate) {
      setDueDate(defaultDueDate)
    } else if (isOpen && !defaultDueDate) {
      setDueDate('')
    }
  }, [isOpen, defaultProject, defaultDueDate, setIsPanelOpen])

  // Fetch stages when project changes
  useEffect(() => {
    if (projectId) {
      const projectData = projects.find((p) => p.id === projectId)

      const handleStagesUpdate = (stages: any[]) => {
        setCurrentStages(stages)

        // If we have stages, ensure status is valid
        if (stages && stages.length > 0) {
          // If no status is set, OR the current status doesn't exist in these stages
          // default to the first stage
          const statusExists = stages.some((s) => s.id === status)
          if (!status || !statusExists) {
            setStatus(stages[0].id)
          }
        }
      }

      if (projectData?.stages) {
        handleStagesUpdate(projectData.stages)
      } else {
        apiFetchJson<any>(`/api/projects/${projectId}`)
          .then((data) => {
            if (data.success && data.data?.stages) {
              handleStagesUpdate(data.data.stages)
            }
          })
          .catch(console.error)
      }
    }
  }, [projectId, projects, status])

  // Autofocus on title
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleInputRef.current?.focus(), 300)
    }
  }, [isOpen])

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

  // Reset form
  const resetForm = () => {
    setTitle('')
    setDescription('')
    setStatus(defaultStatus)
    setPriority('medium')
    setAssignees([])
    setDueDate('')
    setStartDate('')
    setLabels([])
    setSubtasks([])
    setNewSubtask('')
    setDependsOn([])
    setShowMore(false)
    setAttachments([])
    setEditingSubtaskIndex(null)
    setAttachments([])
    setEditingSubtaskIndex(null)
  }

  // Handle create
  const handleCreate = async () => {
    if (!title.trim()) return

    const newTask = await onCreate({
      title: title.trim(),
      description: description.trim(),
      type: itemType,
      status: status,
      priority,
      assignees: assignees.map((a) => a.id),
      dueDate: dueDate || undefined,
      startDate: startDate || undefined,
      projectId: projectId || undefined,
      labels: labels as any,
      subtasks: subtasks.filter((s) => s.title.trim()),
      dependsOn: dependsOn,
    })

    // Upload files if task was created successfully
    if (newTask?.id && attachments.length > 0) {
      console.log(`Uploading ${attachments.length} files to task ${newTask.id}`)
      try {
        // Wait for all uploads to complete before closing panel
        const uploadPromises = attachments.map(async (file, index) => {
          console.log(`Starting upload ${index + 1}/${attachments.length}: ${file.name}`)
          const formData = new FormData()
          formData.append('file', file)

          const response = await apiFetch(`/api/tasks/${newTask.id}/upload`, {
            method: 'POST',
            headers: {
              'x-user-id': userId || '',
            },
            body: formData,
          })

          if (!response.ok) {
            console.error(`Upload failed for ${file.name}:`, await response.text())
            throw new Error(`Upload failed: ${response.statusText}`)
          }

          console.log(`Upload ${index + 1}/${attachments.length} complete: ${file.name}`)
          return response
        })

        await Promise.all(uploadPromises)
        console.log('All uploads completed successfully')
      } catch (error) {
        console.error('Error uploading files:', error)
        alert('Nie udało się zauploadować niektórych plików. Sprawdź konsolę.')
      }
    }

    // Only reset and close AFTER uploads complete
    if (createMore) {
      resetForm()
      setTimeout(() => titleInputRef.current?.focus(), 100)
    } else {
      resetForm()
      onClose()
    }
  }

  // Handle Enter in title
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.metaKey || e.ctrlKey) {
        handleCreate()
      } else {
        e.preventDefault()
        descriptionRef.current?.focus()
      }
    }
  }

  // Handle Cmd+Enter anywhere
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleCreate()
    }
  }

  // Add subtask
  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([
        ...subtasks,
        {
          title: newSubtask.trim(),
          description: '',
        },
      ])
      setNewSubtask('')
    }
  }

  // Update subtask description
  const updateSubtask = (
    index: number,
    updates: Partial<{
      title: string
      description: string
      assigneeId?: string
      dependsOn?: string[]
    }>
  ) => {
    const updated = [...subtasks]
    updated[index] = { ...updated[index], ...updates }
    setSubtasks(updated)
  }

  // Remove subtask
  const removeSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index))
    if (editingSubtaskIndex === index) setEditingSubtaskIndex(null)
  }

  // Handle label creation - creates via API when workspaceSlug is available
  const handleCreateLabel = async (name: string, color: string): Promise<Label> => {
    // Use prop callback if provided
    if (propOnCreateLabel) {
      return propOnCreateLabel(name, color)
    }

    // Try to create via API if we have a workspace
    if (workspaceSlug) {
      try {
        const data = await apiFetchJson<any>('/api/labels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceSlug, name, color }),
        })
        if (data.success && data.data) {
          const newLabel = data.data as Label
          setLocalAvailableLabels((prev) => [...prev, newLabel])
          return newLabel
        }
      } catch (err) {
        console.error('Failed to create label via API:', err)
      }
    }

    // Fallback to local creation
    const newLabel: Label = {
      id: `label_${Date.now()}`,
      name,
      color,
    }
    setLocalAvailableLabels((prev) => [...prev, newLabel])
    return newLabel
  }

  const selectedProject = projects.find((p) => p.id === projectId)

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        onKeyDown={handleKeyDown}
        className={`fixed inset-0 z-50 flex w-full max-w-none transform flex-col rounded-none bg-[#12121a] shadow-2xl transition-transform duration-300 ease-out sm:inset-auto sm:bottom-4 sm:right-4 sm:top-4 sm:w-[448px] sm:max-w-md sm:rounded-2xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full sm:translate-x-[calc(100%+2rem)]'
        }`}
      >
        {/* Header */}
        <div className="flex-none border-b border-gray-800 p-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="flex-shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              title="Zamknij"
            >
              <ChevronDoubleRightIcon />
            </button>

            {/* Project Selector - in same row */}
            {!defaultProject && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className={`flex min-w-0 max-w-[140px] items-center gap-2 rounded-lg bg-gray-800/50 px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 ${showProjectDropdown ? 'bg-gray-800 text-white' : ''}`}
                >
                  <span className="flex-shrink-0 text-lg">📁</span>
                  <span className="truncate">
                    {selectedProject?.name || t('tasks.create.select_project')}
                  </span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="flex-shrink-0"
                  >
                    <path d="M6 9L12 15L18 9" />
                  </svg>
                </button>
                <Dropdown
                  isOpen={showProjectDropdown}
                  onClose={() => setShowProjectDropdown(false)}
                  className="w-48"
                >
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setProjectId(project.id)
                        setShowProjectDropdown(false)
                      }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-800 ${
                        projectId === project.id ? 'text-amber-400' : 'text-gray-300'
                      }`}
                    >
                      {project.name}
                    </button>
                  ))}
                </Dropdown>
              </div>
            )}

            <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-white">
              {t('tasks.create.title')}
            </h2>

            {/* Template Selector - for tasks */}
            {workspaceSlug && (
              <div className="flex-shrink-0">
                <TemplateSelector
                  workspaceSlug={workspaceSlug}
                  userId={userId}
                  onApplyTemplate={(templateData) => {
                    // Apply template values to form
                    if (templateData.titlePrefix) {
                      setTitle(templateData.titlePrefix)
                    }
                    if (templateData.description) {
                      setDescription(templateData.description)
                    }
                    // Ignore type from template as we only support tasks
                    if (templateData.priority) {
                      setPriority(templateData.priority)
                    }
                    if (templateData.labels && templateData.labels.length > 0) {
                      // Find matching labels from available labels
                      const matchedLabels = availableLabels.filter(
                        (l) =>
                          templateData.labels?.includes(l.id) ||
                          templateData.labels?.includes(l.name)
                      )
                      setLabels(matchedLabels)
                    }
                    if (templateData.subtasks && templateData.subtasks.length > 0) {
                      setSubtasks(
                        templateData.subtasks.map((s) => ({
                          title: s.title,
                          description: s.description || '',
                        }))
                      )
                      setShowMore(true) // Expand to show subtasks
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Title & Description wrapped in a clean, borderless container */}
          <div className="mb-6 flex flex-col gap-3">
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              placeholder={t('tasks.create.task_title_placeholder') || 'Tytuł zadania...'}
              className="w-full bg-transparent text-2xl font-bold text-white placeholder-gray-600 outline-none transition-colors"
            />
            <textarea
              ref={descriptionRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                t('tasks.create.description_placeholder') ||
                'Dodaj opis zadania... (wspiera Markdown)'
              }
              rows={3}
              className="w-full resize-none bg-transparent text-sm text-gray-300 placeholder-gray-600 outline-none"
            />
          </div>

          {/* Properties Bar - Grid Layout */}
          <div className="mb-6 grid grid-cols-2 gap-4 border-b border-gray-800 pb-6">
            {/* Status - only for tasks */}
            {itemType === 'task' && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {t('projects.details.meta.status') || 'Status'}
                </span>
                <div className="w-full">
                  <StatusSelector
                    value={status}
                    stages={currentStages}
                    onChange={(newStatus) => setStatus(newStatus)}
                    fullWidth
                  />
                </div>
              </div>
            )}

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {t('projects.details.meta.priority') || 'Priority'}
              </span>
              <div className="w-full">
                <PrioritySelector value={priority} onChange={setPriority} size="md" fullWidth />
              </div>
            </div>

            {/* Start Date */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {t('tasks.create.start_date') || 'Start'}
              </span>
              <div className="w-full">
                <DueDatePicker
                  value={startDate}
                  onChange={(date) => setStartDate(date || '')}
                  placeholder={t('tasks.create.start_date') || 'Data startu'}
                  showTime={false}
                />
              </div>
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {t('tasks.create.end_date') || 'Koniec'}
              </span>
              <div className="w-full">
                <DueDatePicker
                  value={dueDate}
                  onChange={(date) => setDueDate(date || '')}
                  placeholder={t('tasks.create.due_date_placeholder') || 'Termin (Due date)'}
                  showTime={false}
                />
              </div>
            </div>

            {/* Assignee - Full Width Bottom Row */}
            <div className="relative z-20 col-span-2 mt-1 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {t('projects.details.meta.assignee') || 'Przypisane'}
              </span>
              <div className="w-full min-w-0">
                <AssigneePicker
                  selectedAssignees={assignees}
                  availableAssignees={teamMembers as any}
                  onSelect={setAssignees}
                  maxVisible={4}
                  placeholder={t('tasks.create.assignee_placeholder') || 'Przypisz osoby...'}
                />
              </div>
            </div>
          </div>

          {/* Labels Section - Full Width Below */}
          <div className="mb-4">
            <LabelPicker
              selectedLabels={labels}
              availableLabels={availableLabels}
              onSelect={(newLabels) => setLabels(newLabels)}
              onCreateNew={handleCreateLabel}
            />
          </div>

          {/* More Options Toggle */}
          <div className="mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowMore(!showMore)}
                className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-transform ${showMore ? 'rotate-180' : ''}`}
                >
                  <path d="M6 9L12 15L18 9" />
                </svg>
                {showMore ? t('tasks.create.less_options') : t('tasks.create.more_options')}
              </button>
              <div className="h-px flex-1 bg-gray-800"></div>
            </div>
          </div>

          {/* Extended Options */}
          {showMore && (
            <div className="space-y-5 pb-6 pt-2">
              {/* Depends On */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {t('tasks.create.dependencies') || 'Zależności'}
                </label>
                <DependsOnSelector
                  selectedIds={dependsOn}
                  availableTasks={availableTasks}
                  onChange={setDependsOn}
                />
              </div>

              {/* Subtasks - only for tasks */}
              {itemType === 'task' && (
                <div>
                  <label className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {t('tasks.create.subtasks') || 'Zadania podrzędne'}
                  </label>
                  <div className="space-y-2">
                    {subtasks.map((subtask, index) => (
                      <div
                        key={index}
                        className="overflow-hidden rounded-lg border border-gray-800 bg-gray-800/30"
                      >
                        <div className="flex items-center gap-3 px-3 py-2">
                          {subtask.assigneeId ? (
                            <div className="flex-shrink-0">
                              {(() => {
                                const member = teamMembers.find((m) => m.id === subtask.assigneeId)
                                if (!member)
                                  return (
                                    <div className="h-5 w-5 flex-shrink-0 rounded-md border-2 border-gray-600" />
                                  )
                                const initials = member.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()
                                if (member.avatar) {
                                  return (
                                    <img
                                      src={member.avatar}
                                      alt={member.name}
                                      className="h-5 w-5 rounded-full object-cover"
                                    />
                                  )
                                }
                                return (
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-[9px] font-semibold text-black">
                                    {initials}
                                  </div>
                                )
                              })()}
                            </div>
                          ) : (
                            <div className="h-5 w-5 flex-shrink-0 rounded-md border-2 border-gray-600" />
                          )}
                          <span className="flex-1 text-sm font-medium text-white">
                            {subtask.title}
                          </span>

                          <button
                            onClick={() =>
                              setEditingSubtaskIndex(editingSubtaskIndex === index ? null : index)
                            }
                            className="p-1 text-gray-500 transition-colors hover:text-amber-400"
                            title={t('tasks.create.subtasks_edit_details')}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path
                                d={
                                  editingSubtaskIndex === index
                                    ? 'M18 15L12 9L6 15'
                                    : 'M6 9L12 15L18 9'
                                }
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => removeSubtask(index)}
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
                        {editingSubtaskIndex === index && (
                          <div className="flex flex-col gap-3 px-3 pb-3 pt-0">
                            <div className="flex-1">
                              <textarea
                                value={subtask.description}
                                onChange={(e) =>
                                  updateSubtask(index, { description: e.target.value })
                                }
                                placeholder={
                                  t('tasks.create.subtasks_description_placeholder') || 'Opis...'
                                }
                                rows={2}
                                className="w-full resize-none rounded-lg border border-gray-800 bg-gray-900/50 p-2 text-xs text-gray-400 placeholder-gray-600 outline-none transition-colors focus:border-amber-500/50"
                              />
                            </div>
                            <div className="w-full max-w-[200px]">
                              <AssigneePicker
                                selectedAssignees={
                                  teamMembers.filter((m) => m.id === subtask.assigneeId) as any
                                }
                                availableAssignees={teamMembers as any}
                                onSelect={(assignees) =>
                                  updateSubtask(index, { assigneeId: assignees[0]?.id })
                                }
                                maxVisible={1}
                                placeholder={
                                  t('tasks.create.subtasks_assignee_placeholder') || 'Przypisz'
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                        placeholder={
                          t('tasks.create.add_subtask_placeholder') || 'Dodaj zadanie podrzędne...'
                        }
                        className="flex-1 rounded-lg border border-gray-800 bg-gray-800/30 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-amber-500/50"
                      />
                      <button
                        onClick={addSubtask}
                        disabled={!newSubtask.trim()}
                        className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all ${newSubtask.trim() ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'cursor-not-allowed text-gray-600'}`}
                      >
                        {t('tasks.create.add_subtask_button') || 'Dodaj'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Attachments */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {t('tasks.create.attachments') || 'Załączniki'}
                </label>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
                      const newFiles = Array.from(e.target.files)

                      // Validate file sizes
                      const oversizedFiles = newFiles.filter((f) => f.size > MAX_FILE_SIZE)
                      if (oversizedFiles.length > 0) {
                        alert(
                          `Następujące pliki są za duże (max 100MB):\n${oversizedFiles.map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join('\n')}`
                        )
                        e.target.value = ''
                        return
                      }

                      setAttachments((prev) => [...prev, ...newFiles])
                    }
                    e.target.value = ''
                  }}
                />

                {/* Uploaded files list */}
                {attachments.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-800/30 px-3 py-2"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#F2CE88"
                            strokeWidth="2"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{file.name}</p>
                          <p className="text-[10px] text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
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
                )}

                {/* Drop zone */}
                <div
                  className={`cursor-pointer rounded-lg border border-dashed p-4 text-center transition-all ${
                    isDragging
                      ? 'border-amber-500/50 bg-amber-500/10'
                      : 'border-gray-700 bg-transparent hover:border-gray-600 hover:bg-gray-800/30'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    setIsDragging(false)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDragging(false)
                    if (e.dataTransfer.files) {
                      const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
                      const newFiles = Array.from(e.dataTransfer.files)

                      // Validate file sizes
                      const oversizedFiles = newFiles.filter((f) => f.size > MAX_FILE_SIZE)
                      if (oversizedFiles.length > 0) {
                        alert(
                          `Następujące pliki są za duże (max 100MB):\n${oversizedFiles.map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join('\n')}`
                        )
                        return
                      }

                      setAttachments((prev) => [...prev, ...newFiles])
                    }
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                        isDragging ? 'bg-amber-500/20' : 'bg-gray-800'
                      }`}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={isDragging ? '#F2CE88' : '#9E9E9E'}
                        strokeWidth="2"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <p
                      className={`text-xs transition-colors ${isDragging ? 'text-amber-400' : 'text-gray-500'}`}
                    >
                      {isDragging
                        ? t('tasks.create.dropzone_active') || 'Upuść tutaj...'
                        : t('tasks.create.dropzone_inactive') || 'Wgraj załącznik'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none rounded-b-2xl border-t border-gray-800/50 bg-[#0f0f14] p-5">
          <div className="flex items-center justify-between gap-3">
            {/* Left side - Create more toggle */}
            <label
              className="flex cursor-pointer select-none items-center gap-2"
              onClick={() => setCreateMore(!createMore)}
            >
              <div
                className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-gray-700 transition-all ${
                  createMore ? 'border-amber-500 bg-amber-500' : 'hover:bg-gray-800/50'
                }`}
              >
                {createMore && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="black"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span
                className="min-w-0 max-w-[80px] truncate whitespace-nowrap text-xs font-medium text-gray-400 sm:max-w-none"
                title={t('tasks.create.create_another') || 'Utwórz kolejne'}
              >
                {t('tasks.create.create_another') || 'Utwórz kolejne'}
              </span>
            </label>

            {/* Right side - Actions */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                onClick={onClose}
                className="whitespace-nowrap px-3 py-2 text-sm text-gray-400 transition-colors hover:text-white"
              >
                {t('tasks.create.cancel') || 'Anuluj'}
              </button>
              <button
                onClick={handleCreate}
                disabled={!title.trim()}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  title.trim()
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 hover:bg-amber-400'
                    : 'cursor-not-allowed bg-gray-800/50 text-gray-500'
                }`}
              >
                <span>{t('tasks.create.create_button') || 'Stwórz zadanie'}</span>
                <span className="hidden text-[10px] opacity-75 sm:inline">⌘↵</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
