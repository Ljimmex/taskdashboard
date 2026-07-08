// Load environment variables FIRST, before any other imports
// This is critical for ES module loading order
import './loadEnv'

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import { sql } from 'drizzle-orm'
import { db } from './db'
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
import { sessionsRoutes } from './modules/sessions/routes'
import { docsRoutes } from './modules/docs/routes'
import { whiteboardsRoutes } from './modules/whiteboards/routes'
import { notificationRoutes } from './modules/notifications/routes'
import annotationsRoutes from './modules/annotations/routes'
import { billingRoutes } from './modules/billing/routes'

// Import Webhook Worker
import { startWebhookWorker } from './modules/webhooks/worker'

// Create OpenAPI Hono app
const app = new OpenAPIHono()

console.log('🚀 API initializing...')
console.log('🌍 Environment:', process.env.NODE_ENV || 'development')
console.log('📡 Expected Port:', process.env.PORT || 3000)

// =============================================================================
// MIDDLEWARE
// =============================================================================

import { rateLimiter } from 'hono-rate-limiter'

// 1. CORS - MUST be first to handle preflight OPTIONS requests before any other middleware
// This ensures that even if other middleware fails or has security policies, CORS preflight still succeeds.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://taskdashboard.pages.dev',
  'https://taskdashboard-api.onrender.com',
  'https://taskdashboard-web.onrender.com',
  'https://zadanoapp.com',
  'https://www.zadanoapp.com',
  'https://api.zadanoapp.com',
]

app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow if origin is in our list or matches our domains
      if (!origin) return null
      if (ALLOWED_ORIGINS.includes(origin)) return origin
      if (origin.endsWith('.zadanoapp.com')) return origin
      return null
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'x-user-id',
      'User-Agent',
      'X-Requested-With',
      'better-auth-agent',
      'x-better-auth-version',
    ],
    exposeHeaders: ['Content-Length', 'set-auth-token', 'X-Total-Count'],
    maxAge: 86400,
    credentials: true,
  })
)

// 2. Security headers
app.use(
  '*',
  secureHeaders({
    strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net', 'https://fonts.gstatic.com'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      frameSrc: ["'none'"],
      imgSrc: ["'self'", 'data:', 'https://*.r2.cloudflarestorage.com', 'https://*.supabase.co'],
      manifestSrc: ["'self'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline often needed for styled-components/emotion
      connectSrc: [
        "'self'",
        'https://*.supabase.co',
        'wss://*.supabase.co',
        'https://opwnyaxsxutmodbapjrc.supabase.co',
        'wss://opwnyaxsxutmodbapjrc.supabase.co',
        'https://*.r2.cloudflarestorage.com',
        'https://taskdashboard-api.onrender.com',
        'https://api.zadanoapp.com',
        'https://zadanoapp.com',
      ],
      upgradeInsecureRequests: [],
      workerSrc: ["'self'"],
    },
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      usb: [],
      magnetometer: [],
      gyroscope: [],
      accelerometer: [],
      ambientLightSensor: [],
      autoplay: [],
      encryptedMedia: [],
      pictureInPicture: [],
    },
  })
)

// Rate Limiting (500 reqs per 15 min per IP in production, 5000 in dev)
const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: process.env.NODE_ENV === 'production' ? 500 : 5000,
  standardHeaders: 'draft-6',
  keyGenerator: (c) => {
    return (
      c.req.header('cf-connecting-ip') ||
      (c.env as any)?.remoteAddr || // Fallback for some runtimes
      c.req.header('x-forwarded-for')?.split(',')[0] ||
      '127.0.0.1' // Default fallback
    )
  },
})
app.use('/api/*', limiter)

// Logger (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use('*', logger())
}

// Global Auth Middleware (Enforce Session)
import { authMiddleware } from './middleware/auth'
import { csrfMiddleware } from './middleware/csrf'

app.use('/api/*', async (c, next) => {
  // Only apply to /api routes
  const path = c.req.path
  if (!path.startsWith('/api')) {
    return next()
  }

  // Public routes that don't need auth
  const publicPaths = [
    '/api/auth',
    '/api/health',
    '/api/workspaces/invites/resolve',
    '/api/billing/webhook',
    '/docs',
    '/openapi.json',
  ]
  if (publicPaths.some((p) => path.startsWith(p))) {
    return next()
  }

  return authMiddleware(c, next)
})

// CSRF protection: require an explicit bearer token for state-changing requests.
// This prevents cross-origin cookie-only CSRF because the bearer token is stored
// in localStorage and cannot be read by another origin.
app.use('/api/*', csrfMiddleware)

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

// Readiness check - verifies the API can connect to the database before accepting traffic
app.get('/ready', async (c) => {
  try {
    await db.execute(sql`SELECT 1`)
    return c.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Readiness check failed:', error)
    return c.json(
      {
        status: 'not ready',
        error: 'Database connection failed',
      },
      503
    )
  }
})

// API info - Redirect to main website in production, show info in development
app.openapi(
  createRoute({
    method: 'get',
    path: '/',
    responses: {
      200: {
        description: 'Redirect to main website or API information',
      },
    },
    tags: ['System'],
  }),
  (c) => {
    if (process.env.NODE_ENV === 'production') {
      return c.redirect('https://zadanoapp.com')
    }
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

if (process.env.NODE_ENV !== 'production') {
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
      },
    } as any)
  )
}

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
app.route('/api/projects', projectStagesRoutes) // Adds stages endpoints under /api/projects/:id/stages
app.route('/api/filters', filtersRoutes)
app.route('/api/templates', templatesRoutes)
app.route('/api/conversations', conversationsRoutes)
app.route('/api/webhooks', webhooksRoutes)
app.route('/api/sessions', sessionsRoutes)
app.route('/api/docs', docsRoutes)
app.route('/api/whiteboards', whiteboardsRoutes)
app.route('/api/notifications', notificationRoutes)
app.route('/api/annotations', annotationsRoutes)
app.route('/api/billing', billingRoutes)

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.onError((err, c) => {
  console.error('Error:', err.message)
  console.error('Stack:', err.stack)

  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'Internal Server Error' }, 500)
  }

  return c.json(
    {
      error: err.message,
      stack: err.stack,
    },
    500
  )
})

app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: `Route ${c.req.path} not found`,
    },
    404
  )
})

// =============================================================================
// START SERVER
// =============================================================================

const port = Number(process.env.PORT) || 3000

console.log(`🚀 Server running at http://localhost:${port}`)

// Start Background Workers
startWebhookWorker(60000) // Process every minute

export default {
  port,
  fetch: app.fetch,
}
