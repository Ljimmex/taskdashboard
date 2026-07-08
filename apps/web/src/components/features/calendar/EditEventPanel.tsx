import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarEventType } from './CalendarView'
import { X, MapPin, Building, Monitor, Link as LinkIcon, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { CustomCheckbox } from './CalendarHeader'
import { DueDatePicker } from '../tasks/components/DueDatePicker'
import { apiFetchJson, apiFetch } from '@/lib/api'
import type { CalendarEvent } from './DayEventListPanel'

interface EditEventPanelProps {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  workspaceSlug?: string
  onUpdated?: () => void
  canCreateTeamEvents?: boolean
}

export function EditEventPanel({
  event,
  isOpen,
  onClose,
  workspaceSlug,
  onUpdated,
  canCreateTeamEvents = true,
}: EditEventPanelProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  // Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [meetingType, setMeetingType] = useState<'physical' | 'virtual'>('physical')
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [teams, setTeams] = useState<{ id: string; name: string; color?: string }[]>([])

  const titleInputRef = useRef<HTMLInputElement>(null)

  // Pre-fill form when event changes
  useEffect(() => {
    if (event && isOpen) {
      setTitle(event.title || '')
      setDescription(event.description || '')
      setStartDate(event.startAt || '')
      setEndDate(event.endAt || '')
      setIsAllDay(event.isAllDay || false)
      setLocation(event.location || '')
      setMeetingLink(event.meetingLink || '')
      setMeetingType(event.meetingType || (event.meetingLink ? 'virtual' : 'physical'))
      setTeamIds(event.teamIds || [])

      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [event, isOpen])

  // Fetch teams
  useEffect(() => {
    if (!isOpen || !workspaceSlug) return
    const fetchTeams = async () => {
      try {
        const res = await apiFetchJson<any>(`/api/teams?workspaceSlug=${workspaceSlug}`)
        if (res.data) {
          setTeams(res.data.map((t: any) => ({ id: t.id, name: t.name, color: t.color })))
        }
      } catch (err) {
        console.error('Failed to fetch teams:', err)
      }
    }
    fetchTeams()
  }, [isOpen, workspaceSlug])

  const handleSave = async () => {
    if (!event || !title.trim()) return

    if (teamIds.length === 0) {
      alert('Please select at least one team')
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        description: description.trim(),
        startAt: startDate,
        endAt: endDate,
        teamIds,
        meetingLink: meetingLink.trim(),
      }

      const res = await apiFetch(`/api/calendar/${event.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to update event')

      onUpdated?.()
      onClose()
    } catch (error) {
      console.error('Error updating event:', error)
      alert(t('calendar.panels.edit_event.alerts.update_error'))
    } finally {
      setLoading(false)
    }
  }

  if (!event || !isOpen) return null

  const eventType = event.type || CalendarEventType.EVENT

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="animate-slide-in-right fixed inset-0 z-50 flex w-full max-w-none flex-col rounded-none border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-2xl sm:inset-auto sm:bottom-4 sm:right-4 sm:top-4 sm:w-[448px] sm:max-w-xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 rounded-t-2xl border-b border-[var(--app-border)] bg-[var(--app-bg-sidebar)] p-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none bg-amber-500/10 sm:rounded-xl">
              ✏️
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold text-[var(--app-text-primary)]">
                {t('calendar.panels.edit_event.title')}
              </h2>
              <p className="truncate text-sm text-[var(--app-text-muted)]">
                {t('calendar.panels.edit_event.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="scrollbar-hide flex-1 space-y-6 overflow-y-auto p-6">
          {/* Title */}
          <div>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('calendar.panels.common.title_placeholder_event')}
              className="w-full rounded-none bg-[var(--app-bg-input)] px-4 py-3 text-xl font-semibold text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] outline-none transition-colors focus:border-amber-500/50 sm:rounded-xl"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('calendar.panels.common.desc_placeholder')}
              rows={3}
              className="w-full resize-none rounded-none bg-[var(--app-bg-input)] px-4 py-3 text-sm text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] outline-none transition-colors focus:border-amber-500/50 sm:rounded-xl"
            />
          </div>

          {/* Date & Time */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-[var(--app-text-secondary)]">
                {t('calendar.fields.date_time')}
              </label>
              {eventType === CalendarEventType.EVENT && (
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
                    if (date && (!endDate || new Date(date) > new Date(endDate))) {
                      const newStart = new Date(date)
                      setEndDate(new Date(newStart.getTime() + 60 * 60 * 1000).toISOString())
                    }
                  }}
                  placeholder={t('calendar.panels.starts')}
                  showTime={!isAllDay && eventType === CalendarEventType.EVENT}
                  className="w-full"
                  triggerClassName="w-full pl-4 pr-4 py-3 rounded-none sm:rounded-xl bg-[var(--app-bg-input)] text-[var(--app-text-primary)] hover:bg-[var(--app-bg-input)] placeholder-[var(--app-text-muted)] border-none justify-start text-left font-normal shadow-none"
                />
              </div>

              {eventType !== CalendarEventType.REMINDER && (
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

          {/* Team Selection - Only if allowed */}
          {canCreateTeamEvents && (
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
                {t('calendar.panels.teams_label')} <span className="text-red-400">*</span>
              </label>
              <div className="group relative">
                <div
                  className={cn(
                    'flex min-h-[48px] w-full cursor-pointer flex-wrap items-center gap-2 rounded-none border border-transparent bg-[var(--app-bg-input)] px-4 py-2.5 text-[var(--app-text-primary)] outline-none ring-0 transition-all focus-within:border-amber-500/30 sm:rounded-xl',
                    teamIds.length === 0 && 'text-[var(--app-text-muted)]'
                  )}
                >
                  <Select
                    value=""
                    onValueChange={(val) => {
                      if (!teamIds.includes(val)) {
                        setTeamIds([...teamIds, val])
                      }
                    }}
                  >
                    <SelectTrigger className="h-full w-full border-none bg-transparent p-0 text-sm font-normal shadow-none hover:bg-transparent focus:outline-none focus:ring-0 focus:ring-offset-0">
                      <div className="flex w-full flex-wrap gap-2">
                        {teamIds.length > 0 ? (
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
                          <span className="py-1 text-[var(--app-text-muted)]">
                            {t('settings.organization.edit_panel.select_teams')}
                          </span>
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent className="border-[var(--app-border)] bg-[var(--app-bg-card)] text-[var(--app-text-primary)]">
                      {teams.map((team) => (
                        <SelectItem
                          key={team.id}
                          value={team.id}
                          className={cn(
                            'cursor-pointer py-3 text-[var(--app-text-secondary)] focus:bg-[var(--app-bg-elevated)] focus:text-[var(--app-text-primary)] data-[state=checked]:text-[var(--app-text-primary)]',
                            teamIds.includes(team.id) && 'pointer-events-none opacity-50'
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
                      ))}
                      {teams.length === 0 && (
                        <div className="p-3 text-center text-xs text-[var(--app-text-muted)]">
                          {t('settings.organization.edit_panel.no_teams_found')}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Meeting Link/Location Selection */}
          <div className="space-y-4">
            <div className="flex w-full rounded-full bg-[var(--app-bg-input)] p-1">
              <button
                onClick={() => {
                  setMeetingType('physical')
                  setMeetingLink('')
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
                  setLocation('')
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
            onClick={handleSave}
            disabled={loading}
            className="flex-1 rounded-none bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 font-semibold text-black shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 sm:rounded-xl"
          >
            {loading ? t('calendar.panels.saving') : t('calendar.panels.save_changes')}
          </button>
        </div>
      </div>
    </>
  )
}
