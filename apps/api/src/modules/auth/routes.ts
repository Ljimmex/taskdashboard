import { Hono } from 'hono'

export const authRoutes = new Hono()

// Placeholder routes - will be implemented in Sprint 2
authRoutes.post('/register', (c) => {
    return c.json({
        message: 'Registration endpoint - will be implemented with Better Auth',
        todo: 'Sprint 2, Task 2.5',
    })
})

authRoutes.post('/login', (c) => {
    return c.json({
        message: 'Login endpoint - will be implemented with Better Auth',
        todo: 'Sprint 2, Task 2.6',
    })
})

authRoutes.post('/logout', (c) => {
    return c.json({
        message: 'Logout endpoint - will be implemented with Better Auth',
        todo: 'Sprint 2, Task 2.7',
    })
})

authRoutes.get('/me', (c) => {
    return c.json({
        message: 'Get current user - will be implemented with Better Auth',
        todo: 'Sprint 2, Task 2.8',
    })
})
