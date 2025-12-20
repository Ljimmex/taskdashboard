import { createRoute, z, OpenAPIHono } from '@hono/zod-openapi'

export const usersRoutes = new OpenAPIHono()

// GET /api/users/me
usersRoutes.openapi(
    createRoute({
        method: 'get',
        path: '/me',
        tags: ['Users'],
        summary: 'Get current user profile',
        responses: {
            200: {
                description: 'User profile',
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
            message: 'Get current user profile',
            todo: 'Sprint 2',
        })
    }
)

// PATCH /api/users/me
usersRoutes.openapi(
    createRoute({
        method: 'patch',
        path: '/me',
        tags: ['Users'],
        summary: 'Update current user profile',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: z.object({
                            firstName: z.string().optional(),
                            lastName: z.string().optional(),
                        }),
                    },
                },
            },
        },
        responses: {
            200: {
                description: 'Updated user profile',
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
            message: 'Update current user profile',
            todo: 'Sprint 8, Task 8.6',
        })
    }
)
