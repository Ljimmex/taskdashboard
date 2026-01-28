import { Hono } from 'hono'
import { initAuth } from '../../lib/auth'

// Use regular Hono instead of OpenAPIHono to avoid body parsing conflicts
export const authRoutes = new Hono()

// =============================================================================
// BETTER AUTH HANDLER
// =============================================================================

// Mount Better Auth handler for ALL auth routes
// Better Auth handles its own routing internally
authRoutes.all('/*', (c) => {
    // Initialize auth with environment variables from context
    const auth = initAuth(c.env)
    return auth.handler(c.req.raw)
})
