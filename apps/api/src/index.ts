// Load environment variables FIRST, before any other imports
// This is critical for ES module loading order
import './loadEnv'

import { Hono } from 'hono'
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
import { industryTemplatesRoutes } from './modules/pipelines/routes'
import { projectStagesRoutes } from './modules/stages/routes'
import { workspacesRoutes } from './modules/workspaces/routes'


// Create Hono app (using regular Hono instead of OpenAPIHono for compatibility)
const app = new Hono()

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

// Activity tracking - update lastActiveAt for authenticated users
import { updateLastActivity } from './middleware/activity'
app.use('/api/*', updateLastActivity)

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
        name: 'Zadano.app API',
        version: '0.1.0',
        endpoints: {
            auth: '/api/auth/*',
            users: '/api/users/*',
            workspaces: '/api/workspaces/*', // New endpoint
            tasks: '/api/tasks/*',
            projects: '/api/projects/*',
            teams: '/api/teams/*',
            labels: '/api/labels/*',
            comments: '/api/comments/*',
            time: '/api/time/*',
            industryTemplates: '/api/industry-templates/*',
            projectStages: '/api/projects/:id/stages/*',
        },
    })
})

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
app.route('/api/time', timeRoutes)
app.route('/api/industry-templates', industryTemplatesRoutes)
app.route('/api/projects', projectStagesRoutes)  // Adds stages endpoints under /api/projects/:id/stages


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
