import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TaskCard } from '../tasks/components/TaskCard'
import { Task } from './types'
import { usePanelStore } from '../../../lib/panelStore'

interface DayTaskListPanelProps {
  date: Date | null
  tasks: Task[]
  isOpen: boolean
  onClose: () => void
  onTaskClick: (task: Task) => void
}

export function DayTaskListPanel({
  date,
  tasks,
  isOpen,
  onClose,
  onTaskClick,
}: DayTaskListPanelProps) {
  const { t, i18n } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)
  const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)

  // Sync global panel state
  useEffect(() => {
    setIsPanelOpen(isOpen)
    return () => setIsPanelOpen(false)
  }, [isOpen, setIsPanelOpen])

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

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!date) return null

  // Dynamic date formatting
  const formattedDate = date.toLocaleDateString(i18n.language, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed inset-0 z-50 flex w-full max-w-none transform flex-col rounded-none border border-gray-800 bg-[#16161f] shadow-2xl transition-transform duration-300 ease-out sm:inset-auto sm:bottom-4 sm:right-4 sm:top-4 sm:w-[448px] sm:max-w-md sm:rounded-2xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full sm:translate-x-[calc(100%+2rem)]'
        }`}
      >
        {/* Header */}
        <div className="flex-none rounded-t-2xl border-b border-gray-800 bg-[#1e1e29] p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{t('projects.day_list.title')}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6L18 18" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-400">{formattedDate}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="rounded-lg bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-300">
              {tasks.length}{' '}
              {tasks.length === 1 ? t('tasks.labels.task_singular') : t('tasks.labels.task_plural')}
            </span>
          </div>
        </div>

        {/* Task List */}
        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
          {tasks.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-sm text-gray-500">
              <p>{t('projects.day_list.no_tasks')}</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} onClick={() => onTaskClick(task)} className="cursor-pointer">
                <TaskCard
                  id={task.id}
                  title={task.title}
                  description={task.description || ''}
                  priority={(task.priority || 'medium') as 'urgent' | 'high' | 'medium' | 'low'}
                  status={task.status || 'todo'}
                  assigneeDetails={task.assigneeDetails || []}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
