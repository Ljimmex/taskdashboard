import { Hono } from 'hono'

export const teamsRoutes = new Hono()

// Placeholder routes - will be implemented in Sprint 4
teamsRoutes.get('/', (c) => {
    return c.json({
        message: 'Get all teams',
        todo: 'Sprint 4, Task 4.4',
        data: [],
    })
})

teamsRoutes.post('/', (c) => {
    return c.json({
        message: 'Create team',
        todo: 'Sprint 4, Task 4.4',
    })
})

teamsRoutes.get('/:id', (c) => {
    const id = c.req.param('id')
    return c.json({
        message: `Get team ${id}`,
        todo: 'Sprint 4',
    })
})

teamsRoutes.get('/:id/members', (c) => {
    const id = c.req.param('id')
    return c.json({
        message: `Get team ${id} members`,
        todo: 'Sprint 4, Task 4.5',
        data: [],
    })
})

teamsRoutes.post('/:id/invite', (c) => {
    const id = c.req.param('id')
    return c.json({
        message: `Invite member to team ${id}`,
        todo: 'Sprint 4, Task 4.6',
    })
})
