import { Hono } from 'hono'
import { auth } from '../../lib/auth'

// Use regular Hono instead of OpenAPIHono to avoid body parsing conflicts
export const authRoutes = new Hono()

// =============================================================================
// BETTER AUTH HANDLER
// =============================================================================

// Mount Better Auth handler for ALL auth routes
// Better Auth handles its own routing internally
authRoutes.all('/*', (c) => {
    return auth.handler(c.req.raw)
})
