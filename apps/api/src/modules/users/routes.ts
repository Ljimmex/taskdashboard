import { Hono } from 'hono'

export const usersRoutes = new Hono()

// GET /api/users/me
usersRoutes.get('/me', (c) => {
    return c.json({
        message: 'Get current user profile',
        todo: 'Sprint 2',
    })
})

// PATCH /api/users/me
usersRoutes.patch('/me', (c) => {
    return c.json({
        message: 'Update current user profile',
        todo: 'Sprint 8, Task 8.6',
    })
})
