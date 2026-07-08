import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../../../lib/utils'

export interface Assignee {
  id: string
  name: string
  email?: string
  avatar?: string
  image?: string
  role?: string
}

interface AssigneePickerProps {
  selectedAssignees: Assignee[]
  availableAssignees?: Assignee[]
  onSelect: (assignees: Assignee[]) => void
  maxVisible?: number
  placeholder?: string
  disabled?: boolean
  title?: string
}

// Avatar component
const Avatar = ({
  name,
  avatar,
  image,
  size = 'md',
}: {
  name: string
  avatar?: string
  image?: string
  size?: 'sm' | 'md' | 'lg'
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-[9px]',
    md: 'w-8 h-8 text-[10px]',
    lg: 'w-10 h-10 text-xs',
  }

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const userImage = avatar || image

  if (userImage) {
    return (
      <img
        src={userImage}
        alt={name}
        className={cn('rounded-full object-cover', sizeClasses[size])}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 font-semibold text-black',
        sizeClasses[size]
      )}
      title={name}
    >
      {initials}
    </div>
  )
}

export function AssigneePicker({
  selectedAssignees,
  availableAssignees = [],
  onSelect,
  maxVisible = 3,
  placeholder = 'Przypisz osobę...',
  disabled = false,
  title,
}: AssigneePickerProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Deduplicate and filter assignees by search
  const uniqueAvailableAssignees = Array.from(
    new Map(availableAssignees.map((a) => [a.id, a])).values()
  )
  const filteredAssignees = uniqueAvailableAssignees.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.role?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleToggleAssignee = (assignee: Assignee) => {
    const isSelected = selectedAssignees.some((a) => a.id === assignee.id)
    if (isSelected) {
      onSelect(selectedAssignees.filter((a) => a.id !== assignee.id))
    } else {
      onSelect([...selectedAssignees, assignee])
    }
  }

  const handleRemoveAssignee = (e: React.MouseEvent, assigneeId: string) => {
    e.stopPropagation()
    onSelect(selectedAssignees.filter((a) => a.id !== assigneeId))
  }

  const visibleAssignees = selectedAssignees.slice(0, maxVisible)
  const remainingCount = selectedAssignees.length - maxVisible

  return (
    <div className="relative" ref={containerRef}>
      {/* Selected Assignees Display */}
      <div
        role={disabled ? 'presentation' : 'button'}
        tabIndex={disabled ? -1 : 0}
        onClick={
          disabled
            ? undefined
            : () => {
                setIsOpen(!isOpen)
                if (!isOpen) {
                  setTimeout(() => inputRef.current?.focus(), 100)
                }
              }
        }
        onKeyDown={
          disabled
            ? undefined
            : (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setIsOpen(!isOpen)
                  if (!isOpen) {
                    setTimeout(() => inputRef.current?.focus(), 100)
                  }
                }
              }
        }
        className={cn(
          'flex min-h-[36px] w-full items-center gap-2 rounded-xl bg-[#1a1a24] px-3 py-2 outline-none transition-all hover:bg-gray-800 focus:ring-2 focus:ring-amber-500/50',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        )}
        title={title}
      >
        {selectedAssignees.length === 0 ? (
          <span className="text-sm font-medium text-gray-400">
            {placeholder === 'Przypisz osobę...' ? t('tasks.assignee.placeholder') : placeholder}
          </span>
        ) : (
          <div className="flex items-center gap-2 overflow-hidden">
            {visibleAssignees.map((assignee) => (
              <div key={assignee.id} className="group flex items-center gap-1">
                <Avatar
                  name={assignee.name}
                  avatar={assignee.avatar}
                  image={assignee.image}
                  size="sm"
                />
                <span className="max-w-[100px] truncate whitespace-nowrap text-xs text-gray-300">
                  {assignee.name.split(' ')[0]}
                </span>
                <button
                  onClick={(e) => handleRemoveAssignee(e, assignee.id)}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {remainingCount > 0 && (
              <span className="rounded-lg bg-gray-700 px-2 py-1 text-xs text-gray-400">
                +{remainingCount}
              </span>
            )}
          </div>
        )}

        {/* Add icon */}
        <svg
          className="ml-auto h-4 w-4 flex-shrink-0 text-gray-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M20 21C20 16.5817 16.4183 13 12 13C7.58172 13 4 16.5817 4 21" />
          <path d="M20 8V14M23 11H17" />
        </svg>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-700 bg-[#1a1a24] shadow-2xl">
          {/* Search */}
          <div className="border-b border-gray-800 p-2">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('tasks.header.search', { defaultValue: 'Szukaj osób...' })}
                className="w-full rounded-lg bg-gray-800 py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
          </div>

          {/* Assignee List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredAssignees.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                {t('tasks.assignee.no_results')}
              </div>
            ) : (
              filteredAssignees.map((assignee) => {
                const isSelected = selectedAssignees.some((a) => a.id === assignee.id)
                return (
                  <button
                    key={assignee.id}
                    onClick={() => handleToggleAssignee(assignee)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2.5 transition-colors',
                      isSelected ? 'bg-amber-500/10 hover:bg-amber-500/20' : 'hover:bg-gray-800'
                    )}
                  >
                    <Avatar
                      name={assignee.name}
                      avatar={assignee.avatar}
                      image={assignee.image}
                      size="md"
                    />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-white">
                        {assignee.name.split(' ')[0]}
                      </div>
                      {assignee.role && (
                        <div className="text-xs text-gray-500">{assignee.role}</div>
                      )}
                    </div>
                    {isSelected && (
                      <svg
                        className="h-5 w-5 text-amber-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
