// Load environment variables FIRST, before any other imports
// This is critical for ES module loading order
import './loadEnv'

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
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
import { projectsRoutes } from './modules/projects/routes'
import { labelsRoutes } from './modules/labels/routes'
import { commentsRoutes } from './modules/comments/routes'
import { timeRoutes } from './modules/time/routes'
import { calendarRoutes } from './modules/calendar/routes'
import { industryTemplatesRoutes } from './modules/pipelines/routes'
import { projectStagesRoutes } from './modules/stages/routes'
import { workspacesRoutes } from './modules/workspaces/routes'
import { filtersRoutes } from './modules/filters/routes'
import { templatesRoutes } from './modules/templates/routes'
import filesRoutes from './modules/files/routes'
import foldersRoutes from './modules/folders/routes'
import conversationsRoutes from './modules/conversations/routes'
import { webhooksRoutes } from './modules/webhooks/routes'
import { startWebhookWorker } from './modules/webhooks/worker'
import { runMigrations } from './db'

// Run migrations on startup, then start workers
// Migrations are handled manually via CLI commands to avoid startup errors
// runMigrations() code removed as requested
console.log('🔄 Starting webhook worker...')
startWebhookWorker()

// Create OpenAPI Hono app
const app = new OpenAPIHono()

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Security headers
app.use('*', secureHeaders())

// CORS
app.use('*', cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://taskdashboard.pages.dev',
        'https://*.taskdashboard.pages.dev',
        'https://taskdashboard-api.onrender.com',
        'https://taskdashboard-web.onrender.com',
        'https://zadanoapp.com',
        'https://www.zadanoapp.com',
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
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

// Activity tracking - update lastActiveAt for authenticated users
import { updateLastActivity } from './middleware/activity'
app.use('/api/*', updateLastActivity)

// =============================================================================
// ROUTES
// =============================================================================

// Health check
app.openapi(
    createRoute({
        method: 'get',
        path: '/health',
        responses: {
            200: {
                content: {
                    'application/json': {
                        schema: z.object({
                            status: z.string(),
                            timestamp: z.string(),
                            uptime: z.number(),
                        }),
                    },
                },
                description: 'Retrieve the health status of the API',
            },
        },
        tags: ['System'],
    }),
    (c) => {
        return c.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        })
    }
)

// API info
app.openapi(
    createRoute({
        method: 'get',
        path: '/',
        responses: {
            200: {
                content: {
                    'application/json': {
                        schema: z.object({
                            name: z.string(),
                            version: z.string(),
                            endpoints: z.record(z.string()),
                        }),
                    },
                },
                description: 'Retrieve API information and common endpoints',
            },
        },
        tags: ['System'],
    }),
    (c) => {
        return c.json({
            name: 'Zadano.app API',
            version: '0.1.0',
            endpoints: {
                auth: '/api/auth/*',
                users: '/api/users/*',
                workspaces: '/api/workspaces/*',
                tasks: '/api/tasks/*',
                projects: '/api/projects/*',
                teams: '/api/teams/*',
                labels: '/api/labels/*',
                comments: '/api/comments/*',
                time: '/api/time/*',
                industryTemplates: '/api/industry-templates/*',
                projectStages: '/api/projects/:id/stages/*',
                filters: '/api/filters/*',
                templates: '/api/templates/*',
            },
        })
    }
)

// =============================================================================
// API DOCUMENTATION (SCALAR)
// =============================================================================

app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: {
        version: '0.1.0',
        title: 'Zadano.app API',
    },
})

app.get(
    '/docs',
    apiReference({
        theme: 'saturn',
        spec: {
            url: '/openapi.json',
        }
    } as any)
)

// ... (docs skipped)

// Mount routes under /api prefix
app.route('/api/auth', authRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/workspaces', workspacesRoutes) // Mount new routes
app.route('/api/tasks', tasksRoutes)
app.route('/api/teams', teamsRoutes)
app.route('/api/projects', projectsRoutes)
app.route('/api/labels', labelsRoutes)
app.route('/api/comments', commentsRoutes)
app.route('/api/files', filesRoutes)
app.route('/api/folders', foldersRoutes)
app.route('/api/time', timeRoutes)
app.route('/api/calendar', calendarRoutes)
app.route('/api/industry-templates', industryTemplatesRoutes)
app.route('/api/projects', projectStagesRoutes)  // Adds stages endpoints under /api/projects/:id/stages
app.route('/api/filters', filtersRoutes)
app.route('/api/templates', templatesRoutes)
app.route('/api/conversations', conversationsRoutes)
app.route('/api/webhooks', webhooksRoutes)


// =============================================================================
// ERROR HANDLING
// =============================================================================

app.onError((err, c) => {
    console.error('Error:', err.message)
    console.error('Stack:', err.stack)

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
