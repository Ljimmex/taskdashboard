import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from '../../lib/auth'

export const authRoutes = new Hono()

// Apply CORS to auth routes
authRoutes.use('*', cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
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

authRoutes.on(['POST', 'GET'], '/*', (c) => {
    return auth.handler(c.req.raw)
})
