import { db } from '../../db'
import { calendarEvents, type NewCalendarEvent } from '../../db/schema/calendar'
import { eq } from 'drizzle-orm'
import { type Task } from '../../db/schema/tasks'

/**
 * Syncs a task to the calendar.
 * - If task has a dueDate, creates or updates a calendar event.
 * - If task has no dueDate, deletes any existing calendar event for this task.
 */
export async function syncTaskToCalendar(task: Task, userId: string) {
    try {
        // 1. Check if event exists for this task
        const existingEvent = await db.query.calendarEvents.findFirst({
            where: (e, { eq }) => eq(e.taskId, task.id)
        })

        // 2. If task has NO due date -> Delete existing event if present
        if (!task.dueDate) {
            if (existingEvent) {
                await db.delete(calendarEvents).where(eq(calendarEvents.id, existingEvent.id))
            }
            return
        }

        // 3. Task HAS due date -> Create or Update
        const startAt = new Date(task.dueDate)
        const endAt = new Date(startAt.getTime() + 60 * 60 * 1000) // Default 1 hour duration
        // Ideally we could have estimatedHours here if present, but for now fixed duration or all-day logic

        // Get teamId from project
        const project = await db.query.projects.findFirst({
            where: (p, { eq }) => eq(p.id, task.projectId),
            columns: { teamId: true }
        })

        if (!project) return // Should not happen given FK constraints

        const eventData: Partial<NewCalendarEvent> = {
            title: task.title,
            description: task.description || undefined,
            startAt: startAt,
            endAt: endAt,
            allDay: true, // Tasks with due dates are typically "all day" deliverables
            teamIds: [project.teamId],
            taskId: task.id,
            // type: 'task', // Removed as likely not in schema or defaults to 'event'
            createdBy: task.reporterId // Or userId of who triggered the sync? Let's use reporter or maybe the user who updated it.
        }

        if (existingEvent) {
            // Update
            await db.update(calendarEvents)
                .set({
                    ...eventData,
                    ...eventData,
                    // updatedAt: new Date() // Removed if schema handles it or it's not in type
                })
                .where(eq(calendarEvents.id, existingEvent.id))
        } else {
            // Create
            await db.insert(calendarEvents).values({
                ...eventData,
                createdBy: userId, // Creator of the sync action usually
                // required fields not in Partial
                title: eventData.title!,
                startAt: eventData.startAt!,
                endAt: eventData.endAt!,
                teamIds: eventData.teamIds!,
            } as NewCalendarEvent)
        }

    } catch (error) {
        console.error('Failed to sync task to calendar:', error)
        // Don't throw, we don't want to block task operations if sync fails? 
        // Or maybe strictly we should? For now let's log error.
    }
}

/**
 * Deletes calendar event for a task
 */
export async function deleteTaskCalendarEvent(taskId: string) {
    try {
        await db.delete(calendarEvents).where(eq(calendarEvents.taskId, taskId))
    } catch (error) {
        console.error('Failed to delete calendar event for task:', error)
    }
}
