import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarEventType } from './CalendarView'
import {
  X,
  Calendar as CalendarIcon,
  MapPin,
  Building,
  Monitor,
  CheckCircle2,
  Bell,
  Link as LinkIcon,
  RotateCw,
  User,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { CustomCheckbox } from './CalendarHeader'
import { DueDatePicker } from '../tasks/components/DueDatePicker'
import { useSession } from '@/lib/auth'
import { apiFetchJson, apiFetch } from '@/lib/api'

interface CalendarEventPanelProps {
  isOpen: boolean
  onClose: () => void
  defaultType?: CalendarEventType
  workspaceSlug?: string
  onCreate?: () => void | Promise<void>
  initialDate?: Date
  canCreateEvents?: boolean
  userRole?: string
}

export function CalendarEventPanel({
  isOpen,
  onClose,
  defaultType = CalendarEventType.EVENT,
  workspaceSlug,
  onCreate,
  initialDate,
  canCreateEvents = true,
  userRole,
}: CalendarEventPanelProps) {
  const { t } = useTranslation()
  // Common State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [selectedType, setSelectedType] = useState<CalendarEventType>(defaultType)
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)

  // Event/Reminder State
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [meetingType, setMeetingType] = useState<'physical' | 'virtual'>('physical')
  const [recurrence, setRecurrence] = useState<string>('none')
  const [recurrenceEnd, setRecurrenceEnd] = useState<string>('')

  // Scope State
  const [scope, setScope] = useState<'team' | 'personal'>('team')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  // Data State
  const [teams, setTeams] = useState<{ id: string; name: string; color?: string }[]>([])
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; avatar?: string }[]>(
    []
  )

  const titleInputRef = useRef<HTMLInputElement>(null)
  const isRestrictedMember = ['member', 'guest'].includes(userRole || '')
  const canCreateCalendarEvents = canCreateEvents
  const isCalendarEventType =
    selectedType === CalendarEventType.EVENT || selectedType === CalendarEventType.MEETING

  // Filter type options
  const typeOptions = canCreateCalendarEvents
    ? [CalendarEventType.EVENT, CalendarEventType.MEETING, CalendarEventType.REMINDER]
    : [CalendarEventType.REMINDER]

  // Reset Form
  const resetForm = () => {
    setTitle('')
    setDescription('')
    const baseDate = initialDate || new Date()
    setStartDate(baseDate.toISOString())
    setEndDate(new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString())
    setIsAllDay(false)
    setLocation('')
    setMeetingType('physical')
    setRecurrence('none')
    setRecurrenceEnd('')
    setScope(canCreateCalendarEvents ? 'team' : 'personal')
    setSelectedMembers([])
  }

  // Initialize & Fetch Data
  useEffect(() => {
    if (isOpen) {
      setSelectedType(canCreateCalendarEvents ? defaultType : CalendarEventType.REMINDER)
      setScope(canCreateCalendarEvents ? 'team' : 'personal')

      if (!canCreateCalendarEvents && session?.user?.id) {
        setSelectedMembers([session.user.id])
      }

      const baseDate = initialDate || new Date()
      if (!startDate) setStartDate(baseDate.toISOString())
      if (!endDate) setEndDate(new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString())

      // Focus title
      setTimeout(() => titleInputRef.current?.focus(), 100)

      const fetchData = async () => {
        if (!workspaceSlug) return

        try {
          // Fetch Teams
          const teamsRes = await apiFetchJson<any>(`/api/teams?workspaceSlug=${workspaceSlug}`, {
            headers: { 'x-user-id': session?.user?.id || '' },
          })
          if (teamsRes.data) {
            setTeams(teamsRes.data)
            // If no teams selected yet, select first one
            if (teamsRes.data.length > 0 && teamIds.length === 0) setTeamIds([teamsRes.data[0].id])
          }

          // Fetch Members (for Assignees/Guests)
          const membersRes = await apiFetchJson<any>(`/api/workspaces/${workspaceSlug}/members`, {
            headers: { 'x-user-id': session?.user?.id || '' },
          })
          if (membersRes.data) {
            const members = membersRes.data
              .map((m: any) => ({
                id: m.user?.id || m.id || m.userId,
                name: m.user?.name || m.name || m.userName,
                avatar: m.user?.image || m.image || m.userImage,
              }))
              .filter((m: any) => m.id)
            setTeamMembers(members)
          }
        } catch (e) {
          console.error('Failed to fetch calendar data', e)
        }
      }
      fetchData()
    }
  }, [
    isOpen,
    defaultType,
    workspaceSlug,
    session?.user?.id,
    canCreateCalendarEvents,
    initialDate,
    startDate,
    endDate,
  ])

  // Handle Create
  const handleCreate = async () => {
    if (!title.trim()) return

    // Scope validation
    if (scope === 'team' && teamIds.length === 0) {
      alert(t('calendar.panels.common.alerts.select_team'))
      return
    }
    if (scope === 'personal' && selectedMembers.length === 0) {
      alert(t('calendar.panels.common.alerts.select_member'))
      return
    }

    setLoading(true)
    try {
      // Create Event or Reminder
      let assigneeIds: string[] = []

      if (scope === 'team') {
        const selectedTeamsData = teams.filter((t) => teamIds.includes(t.id))
        const memberIds = new Set<string>()
        selectedTeamsData.forEach((team: any) => {
          if (team.members) {
            team.members.forEach((m: any) => memberIds.add(m.userId))
          }
        })
        assigneeIds = Array.from(memberIds)
      } else {
        assigneeIds = selectedMembers
      }

      const payload = {
        teamIds: scope === 'team' ? teamIds : [], // Send array of teamIds
        title: title.trim(),
        description: description.trim(),
        type: selectedType, // 'event' or 'reminder'
        startAt: startDate,
        endAt: selectedType === CalendarEventType.REMINDER ? startDate : endDate, // Reminders are point-in-time
        location: location,
        recurrence:
          recurrence !== 'none'
            ? {
                frequency:
                  recurrence === 'biweekly' || recurrence === 'quarterly'
                    ? recurrence === 'biweekly'
                      ? 'weekly'
                      : 'monthly'
                    : recurrence,
                interval: recurrence === 'biweekly' ? 2 : recurrence === 'quarterly' ? 3 : 1,
                until: recurrenceEnd || undefined,
              }
            : null,

        // Add meeting link if present
        meetingLink: meetingLink.trim(),

        meetingType:
          selectedType === CalendarEventType.EVENT || selectedType === CalendarEventType.MEETING
            ? meetingType
            : undefined,
        isAllDay,
        assignees: assigneeIds.map((id) => ({ id })),
        assigneeIds: assigneeIds,
        workspaceSlug,
      }

      const res = await apiFetch('/api/calendar', {
        method: 'POST',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to create event')

      if (onCreate) await onCreate()
      onClose()
      resetForm()
    } catch (error) {
      console.error('Failed to create event:', error)
      alert('Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const getTypeIcon = (type: CalendarEventType) => {
    switch (type) {
      case CalendarEventType.EVENT:
        return <CalendarIcon className="h-5 w-5 text-amber-500" />
      case CalendarEventType.REMINDER:
        return <Bell className="h-5 w-5 text-blue-500" />
      default:
        return <CalendarIcon className="h-5 w-5" />
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="animate-slide-in-right fixed inset-0 z-50 flex w-full max-w-none flex-col rounded-none border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-2xl sm:inset-auto sm:bottom-4 sm:right-4 sm:top-4 sm:w-[448px] sm:max-w-xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-[var(--app-border)] bg-[var(--app-bg-sidebar)] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-none bg-amber-500/10 sm:rounded-xl">
              {getTypeIcon(selectedType)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--app-text-primary)]">
                {selectedType === CalendarEventType.EVENT
                  ? t('calendar.panels.add_event.title_event')
                  : t('calendar.panels.add_event.title_reminder')}
              </h2>
              <p className="text-sm text-[var(--app-text-muted)]">
                {selectedType === CalendarEventType.EVENT
                  ? t('calendar.panels.add_event.subtitle_event')
                  : t('calendar.panels.add_event.subtitle_reminder')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs for Type Selection */}
        <div className="bg-[var(--app-bg-sidebar)] px-6">
          <div className="flex gap-4">
            {typeOptions.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={cn(
                  'relative border-b-2 py-3 text-sm font-medium transition-colors',
                  selectedType === type
                    ? 'border-amber-500 text-[var(--app-text-primary)]'
                    : 'border-transparent text-[var(--app-text-muted)] hover:border-[var(--app-border)] hover:text-[var(--app-text-primary)]'
                )}
              >
                {type === CalendarEventType.EVENT
                  ? t('calendar.panels.types.event')
                  : type === CalendarEventType.MEETING
                    ? t('calendar.panels.types.meeting')
                    : t('calendar.panels.types.reminder')}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="scrollbar-hide flex-1 space-y-6 overflow-y-auto p-6">
          {/* Title Input - Common */}
          <div>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                selectedType === CalendarEventType.REMINDER
                  ? t('calendar.panels.common.title_placeholder_reminder')
                  : t('calendar.panels.common.title_placeholder_event')
              }
              className="w-full rounded-none bg-[var(--app-bg-input)] px-4 py-3 text-xl font-semibold text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] outline-none transition-colors focus:border-amber-500/50 sm:rounded-xl"
              autoFocus
            />
          </div>

          {/* Description - Common */}
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('calendar.panels.common.desc_placeholder')}
              rows={3}
              className="w-full resize-none rounded-none bg-[var(--app-bg-input)] px-4 py-3 text-sm text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] outline-none transition-colors focus:border-amber-500/50 sm:rounded-xl"
            />
          </div>

          {/* Scope Switch (Team vs Personal) */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-[var(--app-text-secondary)]">
              {t('calendar.scope.label')}
            </label>
            <div className="flex w-full rounded-full bg-[var(--app-bg-input)] p-1">
              <button
                onClick={() => setScope('team')}
                disabled={!canCreateCalendarEvents}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all',
                  scope === 'team'
                    ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]',
                  !canCreateCalendarEvents && 'cursor-not-allowed opacity-50'
                )}
              >
                <Users className="h-3.5 w-3.5" />
                {t('calendar.panels.scope.team')}
              </button>
              <button
                onClick={() => setScope('personal')}
                disabled={userRole === 'member' || userRole === 'guest'}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all',
                  scope === 'personal'
                    ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]',
                  (userRole === 'member' || userRole === 'guest') && 'cursor-not-allowed opacity-50'
                )}
              >
                <User className="h-3.5 w-3.5" />
                {t('calendar.panels.scope.personal')}
              </button>
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-[var(--app-text-secondary)]">
                {t('calendar.fields.date_time')}
              </label>
              {selectedType === CalendarEventType.EVENT && (
                <div
                  className="flex cursor-pointer items-center gap-2"
                  onClick={() => setIsAllDay(!isAllDay)}
                >
                  <CustomCheckbox checked={isAllDay} />
                  <span className="text-sm text-[var(--app-text-muted)]">
                    {t('calendar.panels.all_day')}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="ml-1 text-xs font-bold uppercase text-[var(--app-text-muted)]">
                  {t('calendar.panels.starts')}
                </span>
                <DueDatePicker
                  value={startDate}
                  onChange={(date) => {
                    setStartDate(date || '')
                    // Auto update end date if explicit
                    if (date && (!endDate || new Date(date) > new Date(endDate))) {
                      const newStart = new Date(date)
                      setEndDate(new Date(newStart.getTime() + 60 * 60 * 1000).toISOString())
                    }
                  }}
                  placeholder={t('calendar.panels.starts')}
                  showTime={!isAllDay && selectedType === CalendarEventType.EVENT}
                  className="w-full"
                  triggerClassName="w-full pl-4 pr-4 py-3 rounded-none sm:rounded-xl bg-[var(--app-bg-input)] text-[var(--app-text-primary)] hover:bg-[var(--app-bg-input)] placeholder-[var(--app-text-muted)] border-none justify-start text-left font-normal shadow-none"
                />
              </div>

              {selectedType === CalendarEventType.EVENT && (
                <div className="space-y-1">
                  <span className="ml-1 text-xs font-bold uppercase text-[var(--app-text-muted)]">
                    {t('calendar.panels.ends')}
                  </span>
                  <DueDatePicker
                    value={endDate}
                    onChange={(date) => setEndDate(date || '')}
                    placeholder={t('calendar.panels.ends')}
                    showTime={!isAllDay}
                    className="w-full"
                    triggerClassName="w-full pl-4 pr-4 py-3 rounded-none sm:rounded-xl bg-[var(--app-bg-input)] text-[var(--app-text-primary)] hover:bg-[var(--app-bg-input)] placeholder-[var(--app-text-muted)] border-none justify-start text-left font-normal shadow-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Meeting Type & Location (Event/Meeting Only) */}
          {(selectedType === CalendarEventType.EVENT ||
            selectedType === CalendarEventType.MEETING) && (
            <div className="space-y-4">
              <div className="flex w-full rounded-full bg-[var(--app-bg-input)] p-1">
                <button
                  onClick={() => {
                    setMeetingType('physical')
                    setLocation('') // Reset location/link when switching
                  }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all',
                    meetingType === 'physical'
                      ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'
                  )}
                >
                  <Building className="h-3.5 w-3.5" />
                  {t('calendar.panels.in_person')}
                </button>
                <button
                  onClick={() => {
                    setMeetingType('virtual')
                    setLocation('') // Reset location/link when switching
                  }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all',
                    meetingType === 'virtual'
                      ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'
                  )}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  {t('calendar.panels.virtual')}
                </button>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
                  {meetingType === 'physical'
                    ? t('calendar.panels.location')
                    : t('calendar.panels.meeting_link')}
                </label>
                <div className="group relative rounded-none ring-amber-500/30 transition-all focus-within:ring-2 sm:rounded-xl">
                  {meetingType === 'physical' ? (
                    <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-[var(--app-text-muted)] transition-colors group-focus-within:text-amber-500" />
                  ) : (
                    <LinkIcon className="absolute left-4 top-3.5 h-5 w-5 text-[var(--app-text-muted)] transition-colors group-focus-within:text-amber-500" />
                  )}
                  <input
                    type="text"
                    value={meetingType === 'physical' ? location : meetingLink}
                    onChange={(e) =>
                      meetingType === 'physical'
                        ? setLocation(e.target.value)
                        : setMeetingLink(e.target.value)
                    }
                    placeholder={
                      meetingType === 'physical'
                        ? t('calendar.panels.location_placeholder')
                        : t('calendar.panels.meeting_link_placeholder')
                    }
                    className="w-full rounded-none bg-[var(--app-bg-input)] py-3 pl-11 pr-4 text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] transition-all focus:bg-[var(--app-bg-elevated)] focus:outline-none sm:rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Recurrence Selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
              {t('calendar.panels.repeat')}
            </label>
            <Select
              value={recurrence}
              onValueChange={(val) => {
                setRecurrence(val)
              }}
            >
              <SelectTrigger className="h-11 w-full rounded-none border-none bg-[var(--app-bg-input)] px-4 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] focus:ring-0 sm:rounded-xl">
                <div className="flex items-center gap-3">
                  <RotateCw size={18} className="text-[var(--app-text-muted)]" />
                  <span>
                    {recurrence === 'none'
                      ? t('calendar.panels.recurrence.none')
                      : recurrence === 'daily'
                        ? t('calendar.panels.recurrence.daily')
                        : recurrence === 'weekly'
                          ? t('calendar.panels.recurrence.weekly')
                          : recurrence === 'biweekly'
                            ? t('calendar.panels.recurrence.biweekly')
                            : recurrence === 'monthly'
                              ? t('calendar.panels.recurrence.monthly')
                              : recurrence === 'quarterly'
                                ? t('calendar.panels.recurrence.quarterly')
                                : recurrence === 'yearly'
                                  ? t('calendar.panels.recurrence.yearly')
                                  : t('calendar.panels.recurrence.custom')}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="border-[var(--app-border)] bg-[var(--app-bg-card)] text-[var(--app-text-primary)]">
                <SelectItem
                  value="none"
                  className="cursor-pointer py-2 text-sm text-[var(--app-text-secondary)] focus:bg-[var(--app-bg-elevated)] focus:text-[var(--app-text-primary)]"
                >
                  {t('calendar.panels.recurrence.none')}
                </SelectItem>
                <SelectItem
                  value="daily"
                  className="cursor-pointer py-2 text-sm text-[var(--app-text-secondary)] focus:bg-[var(--app-bg-elevated)] focus:text-[var(--app-text-primary)]"
                >
                  {t('calendar.panels.recurrence.daily')}
                </SelectItem>
                <SelectItem
                  value="weekly"
                  className="cursor-pointer py-2 text-sm text-[var(--app-text-secondary)] focus:bg-[var(--app-bg-elevated)] focus:text-[var(--app-text-primary)]"
                >
                  {t('calendar.panels.recurrence.weekly')}
                </SelectItem>
                <SelectItem
                  value="biweekly"
                  className="cursor-pointer py-2 text-sm text-[var(--app-text-secondary)] focus:bg-[var(--app-bg-elevated)] focus:text-[var(--app-text-primary)]"
                >
                  {t('calendar.panels.recurrence.biweekly')}
                </SelectItem>
                <SelectItem
                  value="monthly"
                  className="cursor-pointer py-2 text-sm text-[var(--app-text-secondary)] focus:bg-[var(--app-bg-elevated)] focus:text-[var(--app-text-primary)]"
                >
                  {t('calendar.panels.recurrence.monthly')}
                </SelectItem>
                <SelectItem
                  value="quarterly"
                  className="cursor-pointer py-2 text-sm text-[var(--app-text-secondary)] focus:bg-[var(--app-bg-elevated)] focus:text-[var(--app-text-primary)]"
                >
                  {t('calendar.panels.recurrence.quarterly')}
                </SelectItem>
                <SelectItem
                  value="yearly"
                  className="cursor-pointer py-2 text-sm text-[var(--app-text-secondary)] focus:bg-[var(--app-bg-elevated)] focus:text-[var(--app-text-primary)]"
                >
                  {t('calendar.panels.recurrence.yearly')}
                </SelectItem>
                <SelectItem
                  value="custom"
                  className="cursor-pointer py-2 text-sm text-[var(--app-text-secondary)] focus:bg-[var(--app-bg-elevated)] focus:text-[var(--app-text-primary)]"
                >
                  {t('calendar.panels.recurrence.custom')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recurrence End Date (Until) */}
          {recurrence !== 'none' && (
            <div className="animate-in fade-in slide-in-from-top-2 space-y-1 duration-200">
              <span className="ml-1 text-xs font-bold uppercase text-[var(--app-text-muted)]">
                {t('calendar.panels.until')}
              </span>
              <DueDatePicker
                value={recurrenceEnd}
                onChange={(date) => setRecurrenceEnd(date || '')}
                placeholder={t('calendar.panels.until')}
                className="w-full"
                triggerClassName="w-full pl-4 pr-4 py-3 rounded-none sm:rounded-xl bg-[var(--app-bg-input)] text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-input)] placeholder-[var(--app-text-muted)] border-none justify-start text-left font-normal shadow-none"
              />
            </div>
          )}

          {/* Team/Member Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
              {scope === 'team' ? t('calendar.panels.teams_label') : t('calendar.fields.members')}{' '}
              <span className="text-red-400">*</span>
            </label>
            <div className="group relative">
              <div
                className={cn(
                  'flex min-h-[48px] w-full cursor-pointer flex-wrap items-center gap-2 rounded-none border border-transparent bg-[var(--app-bg-input)] px-4 py-2.5 text-[var(--app-text-primary)] outline-none ring-0 transition-all focus-within:border-amber-500/30 sm:rounded-xl',
                  scope === 'team' && teamIds.length === 0 && 'text-[var(--app-text-muted)]',
                  scope === 'personal' &&
                    selectedMembers.length === 0 &&
                    'text-[var(--app-text-muted)]',
                  isRestrictedMember && 'cursor-default opacity-80'
                )}
              >
                <Select
                  disabled={isRestrictedMember && scope === 'personal'}
                  value=""
                  onValueChange={(val) => {
                    if (scope === 'team') {
                      if (!teamIds.includes(val)) setTeamIds([...teamIds, val])
                    } else {
                      if (!selectedMembers.includes(val))
                        setSelectedMembers([...selectedMembers, val])
                    }
                  }}
                >
                  <SelectTrigger className="h-full w-full border-none bg-transparent p-0 text-sm font-normal shadow-none hover:bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 disabled:cursor-default disabled:opacity-100">
                    <div className="flex w-full flex-wrap gap-2">
                      {scope === 'team' ? (
                        teamIds.length > 0 ? (
                          teamIds.map((id) => {
                            const team = teams.find((t) => t.id === id)
                            if (!team) return null
                            return (
                              <div
                                key={id}
                                onPointerDown={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setTeamIds(teamIds.filter((t) => t !== id))
                                }}
                                className="group/tag relative z-50 flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-elevated)] py-1 pl-2 pr-1 text-xs font-medium text-[var(--app-text-secondary)] transition-colors"
                              >
                                <div
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: team.color || '#666' }}
                                />
                                {team.name}
                                <X
                                  size={12}
                                  className="ml-1 text-[var(--app-text-muted)] transition-colors group-hover/tag:text-red-400"
                                />
                              </div>
                            )
                          })
                        ) : (
                          <span className="text-[var(--app-text-muted)]">
                            {t('settings.organization.edit_panel.select_teams')}
                          </span>
                        )
                      ) : selectedMembers.length > 0 ? (
                        selectedMembers.map((id) => {
                          const member = teamMembers.find((m) => m.id === id)
                          if (!member) return null
                          return (
                            <div
                              key={id}
                              onPointerDown={(e) => {
                                if (isRestrictedMember) return
                                e.preventDefault()
                                e.stopPropagation()
                                setSelectedMembers(selectedMembers.filter((m) => m !== id))
                              }}
                              className={cn(
                                'group/tag relative z-50 flex items-center gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-elevated)] py-1 pl-2 pr-1 text-xs font-medium text-[var(--app-text-secondary)] transition-colors',
                                !isRestrictedMember && 'cursor-pointer'
                              )}
                            >
                              {member.avatar && (
                                <img src={member.avatar} className="h-4 w-4 rounded-full" />
                              )}
                              {member.name}
                              {!isRestrictedMember && (
                                <X
                                  size={12}
                                  className="ml-1 text-[var(--app-text-muted)] transition-colors group-hover/tag:text-red-400"
                                />
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <span className="text-[var(--app-text-muted)]">
                          {t('calendar.placeholders.select_members')}
                        </span>
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] border-[var(--app-border)] bg-[var(--app-bg-card)] text-[var(--app-text-primary)]">
                    {scope === 'team' ? (
                      teams.length > 0 ? (
                        teams.map((team) => (
                          <SelectItem
                            key={team.id}
                            value={team.id}
                            disabled={teamIds.includes(team.id)}
                            className={cn(
                              'cursor-pointer py-3 text-[var(--app-text-secondary)] focus:bg-[var(--app-bg-elevated)] focus:text-[var(--app-text-primary)] data-[state=checked]:text-[var(--app-text-primary)]',
                              teamIds.includes(team.id) && 'opacity-50'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {team.color && (
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: team.color }}
                                />
                              )}
                              {team.name}
                              {teamIds.includes(team.id) && (
                                <CheckCircle2 className="ml-auto h-3 w-3 text-amber-500" />
                              )}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-[var(--app-text-muted)]">
                          {t('settings.organization.edit_panel.no_teams_found')}
                        </div>
                      )
                    ) : teamMembers.length > 0 ? (
                      teamMembers
                        .filter((member) =>
                          !['member', 'guest'].includes(userRole || '')
                            ? true
                            : member.id === session?.user?.id
                        )
                        .map((member) => (
                          <SelectItem
                            key={member.id}
                            value={member.id}
                            disabled={selectedMembers.includes(member.id)}
                            className={cn(
                              'cursor-pointer py-3 text-[var(--app-text-secondary)] focus:bg-[var(--app-bg-elevated)] focus:text-[var(--app-text-primary)] data-[state=checked]:text-[var(--app-text-primary)]',
                              selectedMembers.includes(member.id) && 'opacity-50'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {member.avatar && (
                                <img src={member.avatar} className="h-5 w-5 rounded-full" />
                              )}
                              {member.name}
                              {selectedMembers.includes(member.id) && (
                                <CheckCircle2 className="ml-auto h-3 w-3 text-amber-500" />
                              )}
                            </div>
                          </SelectItem>
                        ))
                    ) : (
                      <div className="p-3 text-center text-xs text-[var(--app-text-muted)]">
                        {t('calendar.placeholders.no_members_found')}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <p className="ml-1 mt-1.5 text-[10px] text-[var(--app-text-muted)]">
                {t('calendar.panels.teams_help')}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 rounded-b-2xl border-t border-[var(--app-border)] bg-[var(--app-bg-card)] p-6">
            <button
              onClick={onClose}
              className="flex-1 rounded-none border border-[var(--app-border)] px-4 py-3 font-medium text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] sm:rounded-xl"
            >
              {t('calendar.actions.cancel')}
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || (isCalendarEventType && !canCreateCalendarEvents)}
              className="flex-1 rounded-none bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 font-semibold text-black shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 sm:rounded-xl"
            >
              {loading
                ? t('calendar.actions.creating')
                : selectedType === CalendarEventType.EVENT
                  ? t('calendar.actions.add_event')
                  : t('calendar.actions.set_reminder')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
