import { createRoute, z, OpenAPIHono } from '@hono/zod-openapi'

export const teamsRoutes = new OpenAPIHono()

// GET /api/teams
teamsRoutes.openapi(
    createRoute({
        method: 'get',
        path: '/',
        tags: ['Teams'],
        summary: 'Get all teams',
        responses: {
            200: {
                description: 'List of teams',
                content: {
                    'application/json': {
                        schema: z.object({
                            message: z.string(),
                            todo: z.string(),
                            data: z.array(z.any()),
                        }),
                    },
                },
            },
        },
    }),
    (c) => {
        return c.json({
            message: 'Get all teams',
            todo: 'Sprint 4, Task 4.4',
            data: [],
        })
    }
)

// POST /api/teams
teamsRoutes.openapi(
    createRoute({
        method: 'post',
        path: '/',
        tags: ['Teams'],
        summary: 'Create new team',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: z.object({
                            name: z.string(),
                            description: z.string().optional(),
                        }),
                    },
                },
            },
        },
        responses: {
            201: {
                description: 'Team created',
                content: {
                    'application/json': {
                        schema: z.object({
                            message: z.string(),
                            todo: z.string(),
                        }),
                    },
                },
            },
        },
    }),
    (c) => {
        return c.json({
            message: 'Create team',
            todo: 'Sprint 4, Task 4.4',
        }, 201)
    }
)

// GET /api/teams/:id
teamsRoutes.openapi(
    createRoute({
        method: 'get',
        path: '/{id}',
        tags: ['Teams'],
        summary: 'Get team by ID',
        request: {
            params: z.object({
                id: z.string(),
            }),
        },
        responses: {
            200: {
                description: 'Team details',
                content: {
                    'application/json': {
                        schema: z.object({
                            message: z.string(),
                            todo: z.string(),
                        }),
                    },
                },
            },
        },
    }),
    (c) => {
        const id = c.req.param('id')
        return c.json({
            message: `Get team ${id}`,
            todo: 'Sprint 4',
        })
    }
)

// GET /api/teams/:id/members
teamsRoutes.openapi(
    createRoute({
        method: 'get',
        path: '/{id}/members',
        tags: ['Teams'],
        summary: 'Get team members',
        request: {
            params: z.object({
                id: z.string(),
            }),
        },
        responses: {
            200: {
                description: 'List of team members',
                content: {
                    'application/json': {
                        schema: z.object({
                            message: z.string(),
                            todo: z.string(),
                            data: z.array(z.any()),
                        }),
                    },
                },
            },
        },
    }),
    (c) => {
        const id = c.req.param('id')
        return c.json({
            message: `Get team ${id} members`,
            todo: 'Sprint 4, Task 4.5',
            data: [],
        })
    }
)

// POST /api/teams/:id/invite
teamsRoutes.openapi(
    createRoute({
        method: 'post',
        path: '/{id}/invite',
        tags: ['Teams'],
        summary: 'Invite member to team',
        request: {
            params: z.object({
                id: z.string(),
            }),
            body: {
                content: {
                    'application/json': {
                        schema: z.object({
                            email: z.string().email(),
                            role: z.enum(['member', 'admin']),
                        }),
                    },
                },
            },
        },
        responses: {
            200: {
                description: 'Invitation sent',
                content: {
                    'application/json': {
                        schema: z.object({
                            message: z.string(),
                            todo: z.string(),
                        }),
                    },
                },
            },
        },
    }),
    (c) => {
        const id = c.req.param('id')
        return c.json({
            message: `Invite member to team ${id}`,
            todo: 'Sprint 4, Task 4.6',
        })
    }
)
