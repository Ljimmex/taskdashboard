import { Hono } from 'hono'

export const teamsRoutes = new Hono()

// GET /api/teams
teamsRoutes.get('/', (c) => {
    return c.json({
        message: 'Get all teams',
        todo: 'Sprint 4, Task 4.4',
        data: [],
    })
})

// POST /api/teams
teamsRoutes.post('/', (c) => {
    return c.json({
        message: 'Create team',
        todo: 'Sprint 4, Task 4.4',
    }, 201)
})

// GET /api/teams/:id
teamsRoutes.get('/:id', (c) => {
    return c.json({
        message: 'Get team by ID',
        todo: 'Sprint 4, Task 4.4',
    })
})

// PATCH /api/teams/:id
teamsRoutes.patch('/:id', (c) => {
    return c.json({
        message: 'Update team',
        todo: 'Sprint 4, Task 4.4',
    })
})

// DELETE /api/teams/:id
teamsRoutes.delete('/:id', (c) => {
    return c.json({
        message: 'Delete team',
        todo: 'Sprint 4, Task 4.4',
    })
})

// Team members
teamsRoutes.get('/:id/members', (c) => {
    return c.json({
        message: 'Get team members',
        todo: 'Sprint 4',
        data: [],
    })
})
