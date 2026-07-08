import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSession } from '@/lib/auth'
import { apiFetch, apiFetchJson } from '@/lib/api'
import { TaskCard, AddTaskCard } from '@/components/features/tasks/components/TaskCard'
import { CalendarEventPanel } from '@/components/features/calendar/CalendarEventPanel'
import { EditEventPanel } from '@/components/features/calendar/EditEventPanel'
import { CalendarEventType } from '@/components/dashboard/CalendarSection'
import type { DashboardPanelProps } from '@/lib/dashboard'

export function UpcomingMeetingsPanel({ workspaceSlug }: DashboardPanelProps) {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [isEventPanelOpen, setIsEventPanelOpen] = useState(false)
  const [isEditEventPanelOpen, setIsEditEventPanelOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any | null>(null)

  const { data: eventsRes, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['calendar_events', workspaceSlug],
    queryFn: async () => apiFetchJson<any>(`/api/calendar?workspaceSlug=${workspaceSlug}`),
  })

  const { data: workspaceData } = useQuery({
    queryKey: ['workspace', workspaceSlug, session?.user?.id],
    queryFn: async () => {
      if (!workspaceSlug || !session?.user?.id) return null
      return apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`, {
        headers: { 'x-user-id': session.user.id },
      })
    },
    enabled: !!workspaceSlug && !!session?.user?.id,
  })

  const canCreateCalendarEvents = workspaceData?.userRole
    ? !['member', 'guest'].includes(workspaceData.userRole)
    : true

  const userId = session?.user?.id

  const events = useMemo(() => {
    const now = new Date()
    const filtered = (eventsRes?.data || []).filter((e: any) => {
      if (!e.type || !['event', 'meeting'].includes(e.type)) return false
      if (e.endAt && new Date(e.endAt) < now) return false
      if (!e.endAt && e.startAt && new Date(e.startAt) < now) return false
      const isCreator = e.createdBy === userId || e.creator?.id === userId
      const isAssignee = e.assignees?.some((a: any) => a.id === userId)
      if (!isCreator && !isAssignee) return false
      return true
    })
    return filtered.sort(
      (a: any, b: any) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    )
  }, [eventsRes, userId])

  const handleEventCreated = async () => {
    await queryClient.invalidateQueries({ queryKey: ['calendar_events', workspaceSlug] })
    setIsEventPanelOpen(false)
  }

  const handleEditEvent = (eventId: string) => {
    const event = events.find((e: any) => e.id === eventId)
    if (event) {
      setEditingEvent(event)
      setIsEditEventPanelOpen(true)
    }
  }

  const handleEventUpdated = async () => {
    await queryClient.invalidateQueries({ queryKey: ['calendar_events', workspaceSlug] })
    setIsEditEventPanelOpen(false)
    setEditingEvent(null)
  }

  return (
    <div className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-[var(--app-text-primary)]">
          {t('dashboard.upcomingMeetings', 'Nadchodzące spotkania')}
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {isLoadingEvents ? (
          <>
            <div className="h-[140px] animate-pulse rounded-2xl bg-gray-800/20" />
            <div className="h-[140px] animate-pulse rounded-2xl bg-gray-800/20" />
          </>
        ) : events.length > 0 ? (
          <>
            {events.slice(0, 4).map((event: any) => (
              <TaskCard
                key={event.id}
                id={event.id}
                title={event.title}
                description={event.description}
                type="meeting"
                priority="medium"
                status="todo"
                dueDate={event.startAt}
                meetingLink={event.meetingLink}
                assignees={(event.assignees || []).map((a: any) => ({
                  ...a,
                  avatar: a.image || a.avatar,
                }))}
                onClick={() => {}}
                onDuplicate={async () => {
                  if (confirm(t('calendar.duplicateConfirm', 'Duplicate this event?'))) {
                    try {
                      const payload = {
                        ...event,
                        id: undefined,
                        title: `${event.title} (${t('common.copy', 'Copy')})`,
                        startAt: new Date(
                          new Date(event.startAt).getTime() + 24 * 60 * 60 * 1000
                        ).toISOString(),
                        endAt: new Date(
                          new Date(event.endAt).getTime() + 24 * 60 * 60 * 1000
                        ).toISOString(),
                      }
                      await apiFetch('/api/calendar', {
                        method: 'POST',
                        body: JSON.stringify(payload),
                      })
                      window.location.reload()
                    } catch (e) {
                      console.error(e)
                      alert(t('calendar.duplicateFailed', 'Failed to duplicate'))
                    }
                  }
                }}
                onArchive={() => {
                  if (confirm(t('calendar.archiveConfirm', 'Archive this event?'))) {
                    apiFetch(`/api/calendar/${event.id}`, { method: 'DELETE' }).then(() =>
                      window.location.reload()
                    )
                  }
                }}
                onFullEdit={() => handleEditEvent(event.id)}
                onDelete={async () => {
                  if (confirm(t('calendar.deleteConfirm', 'Delete this event?'))) {
                    await apiFetch(`/api/calendar/${event.id}`, { method: 'DELETE' })
                    window.location.reload()
                  }
                }}
              />
            ))}
            {events.length < 4 && canCreateCalendarEvents && (
              <AddTaskCard
                key="add-meeting"
                label={t('dashboard.addMeeting', 'Dodaj spotkanie')}
                onClick={() => setIsEventPanelOpen(true)}
              />
            )}
          </>
        ) : (
          <>
            <div className="flex h-[140px] items-center justify-center rounded-2xl bg-[var(--app-bg-card)]">
              <p className="text-sm text-gray-500">{t('dashboard.noMeetings', 'Brak spotkań')}</p>
            </div>
            {canCreateCalendarEvents && (
              <AddTaskCard
                label={t('dashboard.addMeeting', 'Dodaj spotkanie')}
                onClick={() => setIsEventPanelOpen(true)}
              />
            )}
          </>
        )}
      </div>

      {canCreateCalendarEvents && (
        <CalendarEventPanel
          isOpen={isEventPanelOpen}
          onClose={() => setIsEventPanelOpen(false)}
          onCreate={handleEventCreated}
          defaultType={CalendarEventType.EVENT}
          workspaceSlug={workspaceSlug}
          canCreateEvents={canCreateCalendarEvents}
          userRole={workspaceData?.userRole}
        />
      )}
      <EditEventPanel
        event={editingEvent}
        isOpen={isEditEventPanelOpen}
        onClose={() => {
          setIsEditEventPanelOpen(false)
          setEditingEvent(null)
        }}
        workspaceSlug={workspaceSlug}
        onUpdated={handleEventUpdated}
        canCreateTeamEvents={canCreateCalendarEvents}
      />
    </div>
  )
}
