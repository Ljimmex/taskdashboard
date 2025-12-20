import { Hono } from 'hono'

export const usersRoutes = new Hono()

// Placeholder routes - will be implemented in Sprint 2
usersRoutes.get('/me', (c) => {
    return c.json({
        message: 'Get current user profile',
        todo: 'Sprint 2',
    })
})

usersRoutes.patch('/me', (c) => {
    return c.json({
        message: 'Update current user profile',
        todo: 'Sprint 8, Task 8.6',
    })
})
