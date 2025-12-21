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

// API Documentation - Manual OpenAPI spec
const openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'Zadano.app API',
        version: '0.1.0',
        description: 'Task Dashboard API for Zadano.app - Complete task management system with projects, tasks, subtasks, labels, comments, and time tracking.',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Development server' }],
    tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Projects', description: 'Project management' },
        { name: 'Tasks', description: 'Task management' },
        { name: 'Subtasks', description: 'Subtask management' },
        { name: 'Labels', description: 'Label management' },
        { name: 'Comments', description: 'Task comments' },
        { name: 'Time Tracking', description: 'Time tracking' },
    ],
    paths: {
        '/api/auth/sign-up': { post: { tags: ['Auth'], summary: 'Register new user', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' }, name: { type: 'string' } } } } } }, responses: { '200': { description: 'User created' } } } },
        '/api/auth/sign-in/email': { post: { tags: ['Auth'], summary: 'Login with email', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } } }, responses: { '200': { description: 'Logged in' } } } },
        '/api/auth/get-session': { get: { tags: ['Auth'], summary: 'Get current session', responses: { '200': { description: 'Session info' } } } },
        '/api/projects': {
            get: { tags: ['Projects'], summary: 'List all projects', responses: { '200': { description: 'List of projects' } } },
            post: { tags: ['Projects'], summary: 'Create project', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { teamId: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, deadline: { type: 'string' } } } } } }, responses: { '201': { description: 'Project created' } } }
        },
        '/api/projects/{id}': {
            get: { tags: ['Projects'], summary: 'Get project by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Project details' } } },
            patch: { tags: ['Projects'], summary: 'Update project', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Project updated' } } },
            delete: { tags: ['Projects'], summary: 'Delete project', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Project deleted' } } }
        },
        '/api/tasks': {
            get: { tags: ['Tasks'], summary: 'List all tasks', parameters: [{ name: 'projectId', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done'] } }], responses: { '200': { description: 'List of tasks' } } },
            post: { tags: ['Tasks'], summary: 'Create task', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { projectId: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, status: { type: 'string' }, priority: { type: 'string' }, assigneeId: { type: 'string' }, reporterId: { type: 'string' }, dueDate: { type: 'string' } } } } } }, responses: { '201': { description: 'Task created' } } }
        },
        '/api/tasks/{id}': {
            get: { tags: ['Tasks'], summary: 'Get task with subtasks and labels', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Task details' } } },
            patch: { tags: ['Tasks'], summary: 'Update task', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Task updated' } } },
            delete: { tags: ['Tasks'], summary: 'Delete task', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Task deleted' } } }
        },
        '/api/tasks/{id}/move': { patch: { tags: ['Tasks'], summary: 'Move task (change status/position)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, position: { type: 'number' } } } } } }, responses: { '200': { description: 'Task moved' } } } },
        '/api/tasks/{id}/subtasks': {
            get: { tags: ['Subtasks'], summary: 'List subtasks', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'List of subtasks' } } },
            post: { tags: ['Subtasks'], summary: 'Create subtask', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' } } } } } }, responses: { '201': { description: 'Subtask created' } } }
        },
        '/api/tasks/{taskId}/subtasks/{subtaskId}': {
            patch: { tags: ['Subtasks'], summary: 'Update subtask', parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'subtaskId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Subtask updated' } } },
            delete: { tags: ['Subtasks'], summary: 'Delete subtask', parameters: [{ name: 'taskId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'subtaskId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Subtask deleted' } } }
        },
        '/api/tasks/{id}/labels': { post: { tags: ['Labels'], summary: 'Add label to task', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { labelId: { type: 'string' } } } } } }, responses: { '201': { description: 'Label added' } } } },
        '/api/tasks/{id}/labels/{labelId}': { delete: { tags: ['Labels'], summary: 'Remove label from task', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'labelId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Label removed' } } } },
        '/api/tasks/{id}/activity': { get: { tags: ['Tasks'], summary: 'Get task activity log', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Activity log' } } } },
        '/api/labels': {
            get: { tags: ['Labels'], summary: 'List labels for project', parameters: [{ name: 'projectId', in: 'query', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'List of labels' } } },
            post: { tags: ['Labels'], summary: 'Create label', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { projectId: { type: 'string' }, name: { type: 'string' }, color: { type: 'string' } } } } } }, responses: { '201': { description: 'Label created' } } }
        },
        '/api/labels/{id}': {
            patch: { tags: ['Labels'], summary: 'Update label', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Label updated' } } },
            delete: { tags: ['Labels'], summary: 'Delete label', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Label deleted' } } }
        },
        '/api/comments': {
            get: { tags: ['Comments'], summary: 'List comments for task', parameters: [{ name: 'taskId', in: 'query', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'List of comments' } } },
            post: { tags: ['Comments'], summary: 'Create comment', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { taskId: { type: 'string' }, userId: { type: 'string' }, content: { type: 'string' } } } } } }, responses: { '201': { description: 'Comment created' } } }
        },
        '/api/comments/{id}': {
            patch: { tags: ['Comments'], summary: 'Update comment', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Comment updated' } } },
            delete: { tags: ['Comments'], summary: 'Delete comment', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Comment deleted' } } }
        },
        '/api/time': {
            get: { tags: ['Time Tracking'], summary: 'List time entries', parameters: [{ name: 'taskId', in: 'query', schema: { type: 'string' } }, { name: 'userId', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'List of time entries' } } },
            post: { tags: ['Time Tracking'], summary: 'Log time entry', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { taskId: { type: 'string' }, userId: { type: 'string' }, durationMinutes: { type: 'number' }, startedAt: { type: 'string' } } } } } }, responses: { '201': { description: 'Time entry created' } } }
        },
        '/api/time/summary': { get: { tags: ['Time Tracking'], summary: 'Get time summary', parameters: [{ name: 'userId', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Time summary' } } } },
        '/api/time/start': { post: { tags: ['Time Tracking'], summary: 'Start timer', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { taskId: { type: 'string' }, userId: { type: 'string' } } } } } }, responses: { '201': { description: 'Timer started' } } } },
        '/api/time/{id}/stop': { patch: { tags: ['Time Tracking'], summary: 'Stop timer', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Timer stopped' } } } },
        '/api/time/{id}': {
            patch: { tags: ['Time Tracking'], summary: 'Update time entry', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Entry updated' } } },
            delete: { tags: ['Time Tracking'], summary: 'Delete time entry', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Entry deleted' } } }
        },
    }
}

app.get('/doc', (c) => c.json(openApiSpec))

app.get('/reference', (c) => {
    return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Zadano.app API Reference</title>
    <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
    <style>
        html, body { height: 100%; margin: 0; }
        elements-api { height: 100%; }
    </style>
</head>
<body>
    <elements-api
        apiDescriptionUrl="/doc"
        router="hash"
        layout="sidebar"
        tryItCredentialsPolicy="same-origin"
    />
</body>
</html>`)
})

// Mount routes under /api prefix
app.route('/api/auth', authRoutes)
app.route('/api/users', usersRoutes)
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
