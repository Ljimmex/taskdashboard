import { createRoute, z, OpenAPIHono } from '@hono/zod-openapi'

export const tasksRoutes = new OpenAPIHono()

// GET /api/tasks
tasksRoutes.openapi(
    createRoute({
        method: 'get',
        path: '/',
        tags: ['Tasks'],
        summary: 'Get all tasks',
        responses: {
            200: {
                description: 'List of tasks',
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
            message: 'Get all tasks',
            todo: 'Sprint 3, Task 3.6',
            data: [],
        })
    }
)

// POST /api/tasks
tasksRoutes.openapi(
    createRoute({
        method: 'post',
        path: '/',
        tags: ['Tasks'],
        summary: 'Create new task',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: z.object({
                            title: z.string(),
                            description: z.string().optional(),
                        }),
                    },
                },
            },
        },
        responses: {
            201: {
                description: 'Task created',
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
            message: 'Create task',
            todo: 'Sprint 3, Task 3.7',
        }, 201)
    }
)

// GET /api/tasks/:id
tasksRoutes.openapi(
    createRoute({
        method: 'get',
        path: '/{id}',
        tags: ['Tasks'],
        summary: 'Get task by ID',
        request: {
            params: z.object({
                id: z.string(),
            }),
        },
        responses: {
            200: {
                description: 'Task details',
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
            message: `Get task ${id}`,
            todo: 'Sprint 3',
        })
    }
)

// PATCH /api/tasks/:id
tasksRoutes.openapi(
    createRoute({
        method: 'patch',
        path: '/{id}',
        tags: ['Tasks'],
        summary: 'Update task',
        request: {
            params: z.object({
                id: z.string(),
            }),
            body: {
                content: {
                    'application/json': {
                        schema: z.object({
                            title: z.string().optional(),
                            status: z.string().optional(),
                        }),
                    },
                },
            },
        },
        responses: {
            200: {
                description: 'Task updated',
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
            message: `Update task ${id}`,
            todo: 'Sprint 3, Task 3.8',
        })
    }
)

// DELETE /api/tasks/:id
tasksRoutes.openapi(
    createRoute({
        method: 'delete',
        path: '/{id}',
        tags: ['Tasks'],
        summary: 'Delete task',
        request: {
            params: z.object({
                id: z.string(),
            }),
        },
        responses: {
            200: {
                description: 'Task deleted',
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
            message: `Delete task ${id}`,
            todo: 'Sprint 3, Task 3.9',
        })
    }
)
