// Load environment variables FIRST, before any other imports
// This is critical for ES module loading order
import './loadEnv'

import { OpenAPIHono } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { secureHeaders } from 'hono/secure-headers'

// Import routes
import { authRoutes } from './modules/auth/routes'
import { usersRoutes } from './modules/users/routes'
import { tasksRoutes } from './modules/tasks/routes'
import { teamsRoutes } from './modules/teams/routes'

// Create Hono app
const app = new OpenAPIHono()

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Security headers
app.use('*', secureHeaders())

// CORS
app.use('*', cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
    credentials: true,
}))

// Logger (only in development)
if (process.env.NODE_ENV !== 'production') {
    app.use('*', logger())
}

// Pretty JSON (only in development)
if (process.env.NODE_ENV !== 'production') {
    app.use('*', prettyJSON())
}

// =============================================================================
// ROUTES
// =============================================================================

// Health check
app.get('/health', (c) => {
    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    })
})

// API info
app.get('/', (c) => {
    return c.json({
        name: 'Task Dashboard API',
        version: '0.1.0',
        docs: '/reference',
        openapi: '/doc',
    })
})

// Mount routes under /api prefix
app.route('/api/auth', authRoutes)
app.route('/api/users', usersRoutes)
// app.route('/api/tasks', tasksRoutes)
// app.route('/api/teams', teamsRoutes)

// OpenAPI Spec (must be registered after routes to include them)
app.doc('/doc', {
    openapi: '3.0.0',
    info: {
        version: '0.1.0',
        title: 'Zadano.app API',
        description: 'API documentation for Zadano.app',
    },
})

// Scalar API Reference
app.get(
    '/reference',
    apiReference({
        pageTitle: 'Zadano.app API Reference',
        spec: {
            url: '/doc',
        },
        theme: 'deepSpace',
        defaultHttpClient: {
            targetKey: 'js',
            clientKey: 'fetch',
        },
    } as any),
)

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.onError((err, c) => {
    console.error('Error:', err)

    if (process.env.NODE_ENV === 'production') {
        return c.json({ error: 'Internal Server Error' }, 500)
    }

    return c.json({
        error: err.message,
        stack: err.stack,
    }, 500)
})

app.notFound((c) => {
    return c.json({
        error: 'Not Found',
        message: `Route ${c.req.path} not found`,
    }, 404)
})

// =============================================================================
// START SERVER
// =============================================================================

const port = Number(process.env.PORT) || 3000

console.log(`🚀 Server running at http://localhost:${port}`)

export default {
    port,
    fetch: app.fetch,
}
