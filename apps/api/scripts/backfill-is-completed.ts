import { db } from '../src/db'
import { tasks } from '../src/db/schema/tasks'
import { eq } from 'drizzle-orm'

async function backfillTasks() {
    console.log('Backfilling isCompleted for existing tasks...')

    try {
        const result = await db.update(tasks)
            .set({ isCompleted: true })
            .where(eq(tasks.status, 'done'))

        console.log('Update result:', result)
        console.log('Successfully backfilled isCompleted for tasks with status="done".')
    } catch (error) {
        console.error('Error backfilling tasks:', error)
    }

    process.exit(0)
}

backfillTasks()
