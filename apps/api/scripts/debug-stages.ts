
import { db } from '../src/db'

async function debug() {
    try {
        console.log('Fetching a task...')
        const allTasks = await db.query.tasks.findMany({ limit: 1 })

        if (allTasks.length === 0) {
            console.log('No tasks found in DB.')
            process.exit(0)
        }

        const task = allTasks[0]
        console.log(`Testing task ID: ${task.id}, Project ID: ${task.projectId}`)

        if (!db.query.projectStages) {
            console.error('ERROR: db.query.projectStages is undefined! Schema export issue?')
        } else {
            console.log('db.query.projectStages exists. Running query...')
            const stages = await db.query.projectStages.findMany({
                where: (s, { eq }) => eq(s.projectId, task.projectId),
                orderBy: (s, { asc }) => [asc(s.position)]
            })
            console.log('Stages result:', stages)
        }

        process.exit(0)
    } catch (err) {
        console.error('Script failed:', err)
        process.exit(1)
    }
}

debug()
