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

export function EditEventPanel({ event, isOpen, onClose, workspaceSlug, onUpdated, canCreateTeamEvents = true }: EditEventPanelProps) {
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
    const [teams, setTeams] = useState<{ id: string, name: string, color?: string }[]>([])

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
            <div
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed inset-0 sm:inset-auto sm:top-4 sm:right-4 sm:bottom-4 w-full sm:w-[448px] max-w-none sm:max-w-xl bg-[var(--app-bg-card)] rounded-none sm:rounded-2xl shadow-2xl z-50 flex flex-col animate-slide-in-right border border-[var(--app-border)]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--app-border)] bg-[var(--app-bg-sidebar)] rounded-t-2xl gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-none sm:rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            ✏️
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-semibold text-[var(--app-text-primary)] truncate">{t('calendar.panels.edit_event.title')}</h2>
                            <p className="text-sm text-[var(--app-text-muted)] truncate">{t('calendar.panels.edit_event.subtitle')}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] rounded-lg transition-colors flex-shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                    {/* Title */}
                    <div>
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('calendar.panels.common.title_placeholder_event')}
                            className="w-full text-xl font-semibold text-[var(--app-text-primary)] bg-[var(--app-bg-input)] placeholder-[var(--app-text-muted)] outline-none px-4 py-3 rounded-none sm:rounded-xl focus:border-amber-500/50 transition-colors"
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
                            className="w-full text-sm text-[var(--app-text-primary)] bg-[var(--app-bg-input)] placeholder-[var(--app-text-muted)] outline-none px-4 py-3 rounded-none sm:rounded-xl focus:border-amber-500/50 transition-colors resize-none"
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-[var(--app-text-secondary)]">
                                {t('calendar.fields.date_time')}
                            </label>
                            {eventType === CalendarEventType.EVENT && (
                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsAllDay(!isAllDay)}>
                                    <CustomCheckbox checked={isAllDay} />
                                    <span className="text-sm text-[var(--app-text-muted)]">{t('calendar.panels.all_day')}</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <span className="text-xs text-[var(--app-text-muted)] font-bold uppercase ml-1">{t('calendar.panels.starts')}</span>
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
                                    <span className="text-xs text-[var(--app-text-muted)] font-bold uppercase ml-1">{t('calendar.panels.ends')}</span>
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
                            <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-2">
                                {t('calendar.panels.teams_label')} <span className="text-red-400">*</span>
                            </label>
                            <div className="relative group">
                                <div className={cn(
                                    "w-full min-h-[48px] px-4 py-2.5 rounded-none sm:rounded-xl bg-[var(--app-bg-input)] text-[var(--app-text-primary)] cursor-pointer flex flex-wrap gap-2 items-center transition-all border border-transparent ring-0 outline-none focus-within:border-amber-500/30",
                                    teamIds.length === 0 && "text-[var(--app-text-muted)]"
                                )}>
                                    <Select value="" onValueChange={(val) => {
                                        if (!teamIds.includes(val)) {
                                            setTeamIds([...teamIds, val])
                                        }
                                    }}>
                                        <SelectTrigger className="w-full h-full border-none bg-transparent p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 focus:outline-none shadow-none text-sm font-normal">
                                            <div className="flex flex-wrap gap-2 w-full">
                                                {teamIds.length > 0 ? (
                                                    teamIds.map(id => {
                                                        const team = teams.find(t => t.id === id)
                                                        if (!team) return null
                                                        return (
                                                            <div key={id} onPointerDown={(e) => {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                setTeamIds(teamIds.filter(t => t !== id))
                                                            }} className="flex items-center gap-1 bg-[var(--app-bg-elevated)] pl-2 pr-1 py-1 rounded-lg text-xs font-medium text-[var(--app-text-secondary)] border border-[var(--app-border)] group/tag transition-colors z-50 relative cursor-pointer">
                                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: team.color || '#666' }} />
                                                                {team.name}
                                                                <X size={12} className="ml-1 text-[var(--app-text-muted)] group-hover/tag:text-red-400 transition-colors" />
                                                            </div>
                                                        )
                                                    })
                                                ) : (
                                                    <span className="text-[var(--app-text-muted)] py-1">{t('settings.organization.edit_panel.select_teams')}</span>
                                                )}
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-[var(--app-bg-card)] border-[var(--app-border)] text-[var(--app-text-primary)]">
                                            {teams.map((team) => (
                                                <SelectItem
                                                    key={team.id}
                                                    value={team.id}
                                                    className={cn(
                                                        "focus:bg-[var(--app-bg-elevated)] focus:text-[var(--app-text-primary)] cursor-pointer py-3 text-[var(--app-text-secondary)] data-[state=checked]:text-[var(--app-text-primary)]",
                                                        teamIds.includes(team.id) && "opacity-50 pointer-events-none"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {team.color && (
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                                                        )}
                                                        {team.name}
                                                        {teamIds.includes(team.id) && <CheckCircle2 className="w-3 h-3 text-amber-500 ml-auto" />}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                            {teams.length === 0 && (
                                                <div className="p-3 text-xs text-[var(--app-text-muted)] text-center">{t('settings.organization.edit_panel.no_teams_found')}</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Meeting Link/Location Selection */}
                    <div className="space-y-4">
                        <div className="flex bg-[var(--app-bg-input)] p-1 rounded-full w-full">
                            <button
                                onClick={() => {
                                    setMeetingType('physical')
                                    setMeetingLink('')
                                }}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all",
                                    meetingType === 'physical'
                                        ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                                        : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'
                                )}
                            >
                                <Building className="w-3.5 h-3.5" />
                                {t('calendar.panels.in_person')}
                            </button>
                            <button
                                onClick={() => {
                                    setMeetingType('virtual')
                                    setLocation('')
                                }}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all",
                                    meetingType === 'virtual'
                                        ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                                        : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'
                                )}
                            >
                                <Monitor className="w-3.5 h-3.5" />
                                {t('calendar.panels.virtual')}
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-2">
                                {meetingType === 'physical' ? t('calendar.panels.location') : t('calendar.panels.meeting_link')}
                            </label>
                            <div className="relative group focus-within:ring-2 ring-amber-500/30 rounded-none sm:rounded-xl transition-all">
                                {meetingType === 'physical' ? (
                                    <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-[var(--app-text-muted)] group-focus-within:text-amber-500 transition-colors" />
                                ) : (
                                    <LinkIcon className="absolute left-4 top-3.5 w-5 h-5 text-[var(--app-text-muted)] group-focus-within:text-amber-500 transition-colors" />
                                )}
                                <input
                                    type="text"
                                    value={meetingType === 'physical' ? location : meetingLink}
                                    onChange={(e) => meetingType === 'physical' ? setLocation(e.target.value) : setMeetingLink(e.target.value)}
                                    placeholder={meetingType === 'physical' ? t('calendar.panels.location_placeholder') : t('calendar.panels.meeting_link_placeholder')}
                                    className="w-full pl-11 pr-4 py-3 rounded-none sm:rounded-xl bg-[var(--app-bg-input)] text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] focus:outline-none focus:bg-[var(--app-bg-elevated)] transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[var(--app-border)] flex gap-3 bg-[var(--app-bg-card)] rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-none sm:rounded-xl border border-[var(--app-border)] text-[var(--app-text-secondary)] font-medium hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] transition-colors"
                    >
                        {t('calendar.actions.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 px-4 py-3 rounded-none sm:rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                    >
                        {loading ? t('calendar.panels.saving') : t('calendar.panels.save_changes')}
                    </button>
                </div>
            </div >
        </>
    )
}
