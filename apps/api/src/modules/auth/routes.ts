import { Hono } from 'hono'
import { auth } from '../../lib/auth'

export const authRoutes = new Hono()

// Auth routes handler
authRoutes.on(['POST', 'GET'], '/*', (c) => {
    return auth.handler(c.req.raw)
})
