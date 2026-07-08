import { format } from 'date-fns'
import { enUS, pl } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  Share2,
  Clipboard,
  Check,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { CalendarEventType } from './CalendarView'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ProjectOption {
  id: string
  name: string
}

export interface MemberOption {
  id: string
  name: string
  image?: string | null
}

// Custom Checkbox Component matching Teams page style
export const CustomCheckbox = ({
  checked,
  onClick,
  colorClass = 'bg-amber-500 border-amber-500',
}: {
  checked: boolean
  onClick?: () => void
  colorClass?: string
}) => (
  <div
    onClick={(e) => {
      e.stopPropagation()
      onClick?.()
    }}
    className={cn(
      'flex h-4 w-4 cursor-pointer items-center justify-center rounded border-2 transition-all',
      checked
        ? colorClass
        : 'border-[var(--app-border)] bg-transparent hover:border-[var(--app-text-muted)]'
    )}
  >
    {checked && (
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="black"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )}
  </div>
)

interface CalendarHeaderProps {
  currentDate: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void

  // Filter props
  selectedTypes: CalendarEventType[]
  toggleType: (type: CalendarEventType) => void
  clearFilters: () => void

  // Schedule settings props
  showWeekends: boolean
  setShowWeekends: (show: boolean) => void
  weekStartDay: 'monday' | 'sunday'
  setWeekStartDay: (day: 'monday' | 'sunday') => void

  view: 'month' | 'week' | 'day'
  setView: (view: 'month' | 'week' | 'day') => void

  // New Filter Props
  projects?: ProjectOption[]
  filterProjectIds?: string[]
  setFilterProjectIds?: (ids: string[]) => void

  members?: MemberOption[]
  filterMemberIds?: string[]
  setFilterMemberIds?: (ids: string[]) => void

  events?: any[]
}

export function CalendarHeader({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  selectedTypes,
  toggleType,
  clearFilters,
  showWeekends,
  setShowWeekends,
  weekStartDay,
  setWeekStartDay,
  view,
  setView,
  // New Filter Props
  projects = [],
  filterProjectIds = [],
  setFilterProjectIds,
  members = [],
  filterMemberIds = [],
  setFilterMemberIds,
  events = [],
}: CalendarHeaderProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'pl' ? pl : enUS

  const toggleProject = (projectId: string) => {
    if (!setFilterProjectIds) return
    if (filterProjectIds.includes(projectId)) {
      setFilterProjectIds(filterProjectIds.filter((id) => id !== projectId))
    } else {
      setFilterProjectIds([...filterProjectIds, projectId])
    }
  }

  const toggleMember = (memberId: string) => {
    if (!setFilterMemberIds) return
    if (filterMemberIds.includes(memberId)) {
      setFilterMemberIds(filterMemberIds.filter((id) => id !== memberId))
    } else {
      setFilterMemberIds([...filterMemberIds, memberId])
    }
  }

  const [isExporting, setIsExporting] = useState(false)
  const [copied, setCopied] = useState(false)

  const workspaceSlug = window.location.pathname.split('/')[1]
  const apiBaseUrl = import.meta.env.VITE_API_URL || window.location.origin
  const exportUrl = `${apiBaseUrl}/api/calendar/export/${workspaceSlug}`

  const handleCopy = () => {
    navigator.clipboard.writeText(exportUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportICAL = () => {
    const link = document.createElement('a')
    link.href = exportUrl
    link.download = `calendar-${workspaceSlug}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })

    // Add current timestamp at top-left
    const now = new Date()
    const timestamp = format(now, 'yyyy-MM-dd HH:mm:ss')
    doc.setFontSize(8)
    doc.text(timestamp, 14, 10)

    const titleText = `Calendar Export - Zadano.app`
    doc.setFontSize(16)
    doc.text(titleText, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' })

    // Filter and sort events
    const filteredEvents = events
      .filter((e) => selectedTypes.includes(e.type))
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

    const tableData = filteredEvents.map((e) => {
      const start = new Date(e.startAt)
      const end = new Date(e.endAt)
      return [
        format(start, 'yyyy-MM-dd'),
        format(start, 'HH:mm'),
        format(end, 'HH:mm'),
        e.location || e.meetingLink || '-',
        e.title,
        e.description || '-',
        e.type.charAt(0).toUpperCase() + e.type.slice(1),
      ]
    })

    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Start', 'End', 'Link', 'Title', 'Description', 'Type']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
      },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 25 }, // Date
        1: { cellWidth: 15 }, // Start
        2: { cellWidth: 15 }, // End
        3: { cellWidth: 40 }, // Link
        4: { cellWidth: 50 }, // Title
        5: { cellWidth: 'auto' }, // Description
        6: { cellWidth: 25 }, // Type
      },
      margin: { left: 14, right: 14 },
    })

    doc.save(`calendar-export-${workspaceSlug}.pdf`)
  }

  const hasActiveFilters =
    filterProjectIds.length > 0 || filterMemberIds.length > 0 || selectedTypes.length < 4

  return (
    <div className="mb-6 flex flex-col justify-between md:flex-row md:items-center">
      {/* Lewa strona: Ikonka + Miesiąc/Rok */}
      <div className="mb-4 flex items-center gap-3 md:mb-0">
        <h2 className="text-lg font-semibold tracking-wide text-[var(--app-text-primary)]">
          {format(currentDate, 'LLLL yyyy', { locale }).replace(/^\w/, (c) => c.toUpperCase())}
        </h2>
      </div>

      {/* Prawa strona: Przyciski Funkcyjne i Nawigacja */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* View Mode Selector */}
        <div className="mr-2 flex items-center rounded-full border border-[var(--app-border)] bg-[var(--app-bg-input)] p-1">
          <button
            onClick={() => setView('month')}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all',
              view === 'month'
                ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)] shadow-sm'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'
            )}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <path d="M3 10h18" />
              <path d="M8 2v4" />
              <path d="M16 2v4" />
            </svg>
            <span>{t('calendar.actions.month')}</span>
          </button>
          <button
            onClick={() => setView('week')}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all',
              view === 'week'
                ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)] shadow-sm'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'
            )}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
            </svg>
            <span>{t('calendar.actions.week')}</span>
          </button>
          <button
            onClick={() => setView('day')}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all',
              view === 'day'
                ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)] shadow-sm'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'
            )}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 12h18" />
            </svg>
            <span>{t('calendar.actions.day')}</span>
          </button>
        </div>

        {/* Przycisk Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'focus:ring-[var(--app-text-primary)]/10 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium outline-none transition-all focus:ring-1',
                hasActiveFilters
                  ? 'ring-[var(--app-accent)]/50 bg-[var(--app-bg-elevated)] text-[var(--app-text-primary)] ring-1'
                  : 'bg-[var(--app-bg-input)] text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>{t('calendar.actions.filter')}</span>
              {hasActiveFilters && (
                <span className="ml-1 h-2 w-2 rounded-full bg-[var(--app-accent)]" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="max-h-[80vh] w-64 overflow-y-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-card)] p-2 text-[var(--app-text-secondary)] shadow-2xl"
          >
            <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--app-text-muted)]">
              {t('calendar.types.event')}
            </div>

            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                toggleType(CalendarEventType.EVENT)
              }}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm outline-none hover:bg-[var(--app-bg-elevated)] focus:bg-[var(--app-bg-elevated)]"
            >
              <CustomCheckbox
                checked={selectedTypes.includes(CalendarEventType.EVENT)}
                colorClass="bg-[var(--app-accent)] border-[var(--app-accent)]"
              />
              <span
                className={cn(
                  'transition-colors',
                  selectedTypes.includes(CalendarEventType.EVENT)
                    ? 'text-[var(--app-text-primary)]'
                    : 'text-[var(--app-text-muted)]'
                )}
              >
                {t('calendar.types.event')}
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                toggleType(CalendarEventType.TASK)
              }}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm outline-none hover:bg-[var(--app-bg-elevated)] focus:bg-[var(--app-bg-elevated)]"
            >
              <CustomCheckbox
                checked={selectedTypes.includes(CalendarEventType.TASK)}
                colorClass="bg-[var(--app-accent)] border-[var(--app-accent)]"
              />
              <span
                className={cn(
                  'transition-colors',
                  selectedTypes.includes(CalendarEventType.TASK)
                    ? 'text-[var(--app-text-primary)]'
                    : 'text-[var(--app-text-muted)]'
                )}
              >
                {t('calendar.types.task')}
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                toggleType(CalendarEventType.REMINDER)
              }}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm outline-none hover:bg-[var(--app-bg-elevated)] focus:bg-[var(--app-bg-elevated)]"
            >
              <CustomCheckbox
                checked={selectedTypes.includes(CalendarEventType.REMINDER)}
                colorClass="bg-[var(--app-accent)] border-[var(--app-accent)]"
              />
              <span
                className={cn(
                  'transition-colors',
                  selectedTypes.includes(CalendarEventType.REMINDER)
                    ? 'text-[var(--app-text-primary)]'
                    : 'text-[var(--app-text-muted)]'
                )}
              >
                {t('calendar.types.reminder')}
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                toggleType(CalendarEventType.MEETING)
              }}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm outline-none hover:bg-[var(--app-bg-elevated)] focus:bg-[var(--app-bg-elevated)]"
            >
              <CustomCheckbox
                checked={selectedTypes.includes(CalendarEventType.MEETING)}
                colorClass="bg-[var(--app-accent)] border-[var(--app-accent)]"
              />
              <span
                className={cn(
                  'transition-colors',
                  selectedTypes.includes(CalendarEventType.MEETING)
                    ? 'text-[var(--app-text-primary)]'
                    : 'text-[var(--app-text-muted)]'
                )}
              >
                {t('calendar.types.meeting')}
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-2 bg-[var(--app-border)]" />

            {projects.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--app-text-muted)]">
                  {t('dashboard.projects')}
                </div>
                {projects.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={(e) => {
                      e.preventDefault()
                      toggleProject(p.id)
                    }}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm outline-none hover:bg-[var(--app-bg-elevated)] focus:bg-[var(--app-bg-elevated)]"
                  >
                    <CustomCheckbox
                      checked={filterProjectIds.includes(p.id)}
                      colorClass="bg-[var(--app-accent)] border-[var(--app-accent)]"
                    />
                    <span
                      className={cn(
                        'truncate transition-colors',
                        filterProjectIds.includes(p.id)
                          ? 'text-[var(--app-text-primary)]'
                          : 'text-[var(--app-text-muted)]'
                      )}
                    >
                      {p.name}
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="my-2 bg-[var(--app-border)]" />
              </>
            )}

            {members.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--app-text-muted)]">
                  {t('calendar.fields.members')}
                </div>
                {members.map((m) => (
                  <DropdownMenuItem
                    key={m.id}
                    onClick={(e) => {
                      e.preventDefault()
                      toggleMember(m.id)
                    }}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm outline-none hover:bg-[var(--app-bg-elevated)] focus:bg-[var(--app-bg-elevated)]"
                  >
                    <CustomCheckbox
                      checked={filterMemberIds.includes(m.id)}
                      colorClass="bg-[var(--app-accent)] border-[var(--app-accent)]"
                    />
                    <div className="flex items-center gap-2 truncate">
                      {m.image ? (
                        <img src={m.image} alt="" className="h-5 w-5 rounded-full" />
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-bg-elevated)] text-[9px] font-bold text-[var(--app-text-muted)]">
                          {m.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span
                        className={cn(
                          'transition-colors',
                          filterMemberIds.includes(m.id)
                            ? 'text-[var(--app-text-primary)]'
                            : 'text-[var(--app-text-muted)]'
                        )}
                      >
                        {m.name}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            <div className="mt-2 p-2">
              <button
                onClick={() => {
                  clearFilters()
                  // Also clear advanced filters needs to be handled by parent prop
                  setFilterProjectIds?.([])
                  setFilterMemberIds?.([])
                }}
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-input)] py-1.5 text-xs font-medium text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
              >
                {t('calendar.actions.clear_filters')}
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Przycisk Export */}
        <DropdownMenu onOpenChange={setIsExporting}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'focus:ring-[var(--app-text-primary)]/10 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium outline-none transition-all focus:ring-1',
                isExporting
                  ? 'bg-[var(--app-bg-elevated)] text-[var(--app-text-primary)]'
                  : 'bg-[var(--app-bg-input)] text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'
              )}
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{t('calendar.actions.export')}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-card)] p-4 text-[var(--app-text-secondary)] shadow-2xl"
          >
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="mb-1 text-sm font-semibold text-[var(--app-text-primary)]">
                  {t('calendar.export.title')}
                </h3>
                <p className="text-[11px] leading-relaxed text-[var(--app-text-muted)]">
                  {t('calendar.export.desc')}
                  Export your workspace calendar to PDF or iCal format.
                </p>
              </div>

              {/* Buttons Row */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleExportPDF()
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-elevated)] py-2 text-xs font-bold text-[var(--app-text-primary)] transition-all hover:bg-[var(--app-bg-deepest)]"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <path d="M10 13l2 2 2-2" />
                    <path d="M12 11v4" />
                  </svg>
                  PDF
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleExportICAL()
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 py-2 text-xs font-bold text-black shadow-lg shadow-amber-500/10 transition-all hover:bg-amber-400"
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  ICAL
                </button>
              </div>

              <DropdownMenuSeparator className="bg-[var(--app-border)]" />

              <div>
                <h3 className="mb-2 text-sm font-semibold text-[var(--app-text-primary)]">
                  {t('calendar.export.sync_title')}
                </h3>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleCopy()
                  }}
                  className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-input)] py-2.5 text-xs font-medium text-[var(--app-text-secondary)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      <span>{t('calendar.export.link_copied')}</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="h-3.5 w-3.5" />
                      <span>{t('calendar.export.copy_link')}</span>
                    </>
                  )}
                </button>

                <div className="mt-4 space-y-3">
                  <p className="border-l-2 border-amber-500/30 pl-3 text-[11px] italic leading-relaxed text-[var(--app-text-muted)]">
                    {t('calendar.export.sync_desc')}
                    Synchronize your schedule with an external calendar – e.g. Google Calendar or
                    Apple Calendar. After adding the link to your chosen calendar, events will
                    update automatically. Keep in mind, however, that changes in the external
                    calendar may be visible with a delay. Due to Google and Apple limitations,
                    synchronization can take up to several hours.
                  </p>

                  <div className="flex flex-col gap-1.5 pt-1">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--app-text-muted)]">
                      {t('calendar.export.sync_instructions')}
                    </p>
                    <a
                      href="https://support.google.com/calendar/answer/37100?hl=pl-PL&co=GENIE.Platform%3DDesktop&oco=1"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[11px] text-amber-500/80 transition-colors hover:text-amber-500"
                    >
                      <div className="h-3 w-1 rounded-full bg-amber-500/30" />{' '}
                      {t('calendar.export.google_help')}
                    </a>
                    <a
                      href="https://support.apple.com/pl-pl/guide/iphone/iph3d1110d4/ios"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[11px] text-amber-500/80 transition-colors hover:text-amber-500"
                    >
                      <div className="h-3 w-1 rounded-full bg-amber-500/30" />{' '}
                      {t('calendar.export.apple_iphone')}
                    </a>
                    <a
                      href="https://support.apple.com/pl-pl/guide/calendar/icl1022/mac"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[11px] text-amber-500/80 transition-colors hover:text-amber-500"
                    >
                      <div className="h-3 w-1 rounded-full bg-amber-500/30" />{' '}
                      {t('calendar.export.apple_mac')}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Przycisk Schedule setting */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus:ring-[var(--app-text-primary)]/10 mr-2 flex items-center gap-2 rounded-lg bg-[var(--app-bg-input)] px-3 py-1.5 text-xs font-medium text-[var(--app-text-muted)] outline-none transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] focus:ring-1">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>{t('calendar.actions.schedule_setting')}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-card)] p-2 text-[var(--app-text-secondary)] shadow-2xl"
          >
            <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--app-text-muted)]">
              {t('calendar.actions.view_options')}
            </div>

            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                setShowWeekends(!showWeekends)
              }}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm outline-none hover:bg-[var(--app-bg-elevated)] focus:bg-[var(--app-bg-elevated)]"
            >
              <CustomCheckbox
                checked={showWeekends}
                colorClass="bg-[var(--app-accent)] border-[var(--app-accent)]"
              />
              <span className="text-[var(--app-text-secondary)]">
                {t('calendar.actions.show_weekends')}
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-2 bg-[var(--app-border)]" />

            <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--app-text-muted)]">
              {t('calendar.actions.start_of_week')}
            </div>
            <DropdownMenuRadioGroup
              value={weekStartDay}
              onValueChange={(v) => setWeekStartDay(v as 'monday' | 'sunday')}
            >
              <DropdownMenuRadioItem
                value="monday"
                className="group flex cursor-pointer items-center rounded-lg px-2 py-2 text-sm text-[var(--app-text-muted)] outline-none transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] focus:bg-[var(--app-bg-elevated)] data-[state=checked]:text-amber-500"
              >
                <div className="flex w-full items-center gap-3">
                  <div
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all',
                      weekStartDay === 'monday'
                        ? 'border-amber-500'
                        : 'border-[var(--app-border)] group-hover:border-[var(--app-text-muted)]'
                    )}
                  >
                    {weekStartDay === 'monday' && (
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <span>{t('calendar.actions.monday')}</span>
                </div>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="sunday"
                className="group flex cursor-pointer items-center rounded-lg px-2 py-2 text-sm text-[var(--app-text-muted)] outline-none transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] focus:bg-[var(--app-bg-elevated)] data-[state=checked]:text-amber-500"
              >
                <div className="flex w-full items-center gap-3">
                  <div
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all',
                      weekStartDay === 'sunday'
                        ? 'border-amber-500'
                        : 'border-[var(--app-border)] group-hover:border-[var(--app-text-muted)]'
                    )}
                  >
                    {weekStartDay === 'sunday' && (
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <span>{t('calendar.actions.sunday')}</span>
                </div>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Separator */}
        <div className="mx-1 hidden h-6 w-px bg-[var(--app-border)] md:block"></div>

        {/* Nawigacja */}
        <div className="flex items-center gap-1">
          <button
            onClick={onPrevMonth}
            className="rounded-lg p-1.5 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={onToday}
            className="px-3 py-1 text-xs font-medium text-[var(--app-text-muted)] transition-colors hover:text-amber-500"
          >
            {t('calendar.actions.today')}
          </button>
          <button
            onClick={onNextMonth}
            className="rounded-lg p-1.5 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
