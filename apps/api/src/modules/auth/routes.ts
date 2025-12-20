import { createRoute, z, OpenAPIHono } from '@hono/zod-openapi'
import { auth } from '../../lib/auth'

export const authRoutes = new OpenAPIHono()

// =============================================================================
// OPENAPI DEFINITIONS FOR BETTER AUTH
// These routes are handled by Better Auth internally, but we document them here
// =============================================================================

authRoutes.openapi(
    createRoute({
        method: 'post',
        path: '/sign-in/email',
        tags: ['Auth'],
        summary: 'Sign in with email and password',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: z.object({
                            email: z.string().email(),
                            password: z.string(),
                        }),
                    },
                },
            },
        },
        responses: {
            200: {
                description: 'Successful login',
                content: {
                    'application/json': {
                        schema: z.object({
                            user: z.any(),
                            session: z.any(),
                        }),
                    },
                },
            },
        },
    }),
    (c) => auth.handler(c.req.raw) as any
)

authRoutes.openapi(
    createRoute({
        method: 'post',
        path: '/sign-up/email',
        tags: ['Auth'],
        summary: 'Sign up with email and password',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: z.object({
                            email: z.string().email(),
                            password: z.string().min(8),
                            name: z.string(),
                            phone: z.string().optional(),
                            gender: z.string().optional(),
                            birthDate: z.string().optional(),
                        }),
                    },
                },
            },
        },
        responses: {
            200: {
                description: 'Successful registration',
                content: {
                    'application/json': {
                        schema: z.object({
                            user: z.any(),
                            session: z.any(),
                        }),
                    },
                },
            },
        },
    }),
    (c) => auth.handler(c.req.raw) as any
)

// =============================================================================
// BETTER AUTH CATCH-ALL HANDLER
// =============================================================================

// Mount Better Auth handler for all other routes
authRoutes.all('/*', (c) => {
    return auth.handler(c.req.raw)
})
