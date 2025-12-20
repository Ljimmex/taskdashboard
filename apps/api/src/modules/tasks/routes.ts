import { Hono } from 'hono'

export const tasksRoutes = new Hono()

// Placeholder routes - will be implemented in Sprint 3
tasksRoutes.get('/', (c) => {
    return c.json({
        message: 'Get all tasks',
        todo: 'Sprint 3, Task 3.6',
        data: [],
    })
})

tasksRoutes.post('/', (c) => {
    return c.json({
        message: 'Create task',
        todo: 'Sprint 3, Task 3.7',
    })
})

tasksRoutes.get('/:id', (c) => {
    const id = c.req.param('id')
    return c.json({
        message: `Get task ${id}`,
        todo: 'Sprint 3',
    })
})

tasksRoutes.patch('/:id', (c) => {
    const id = c.req.param('id')
    return c.json({
        message: `Update task ${id}`,
        todo: 'Sprint 3, Task 3.8',
    })
})

tasksRoutes.delete('/:id', (c) => {
    const id = c.req.param('id')
    return c.json({
        message: `Delete task ${id}`,
        todo: 'Sprint 3, Task 3.9',
    })
})

tasksRoutes.patch('/:id/move', (c) => {
    const id = c.req.param('id')
    return c.json({
        message: `Move task ${id}`,
        todo: 'Sprint 3, Task 3.14',
    })
})
