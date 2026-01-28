import { createMiddleware } from 'hono/factory'
import { initAuth, type Auth } from '../lib/auth'

type Env = {
    Variables: {
        user: Auth['$Infer']['Session']['user']
        session: Auth['$Infer']['Session']['session']
    }
}

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
    // Initialize auth with environment variables from context
    const auth = initAuth(c.env)

    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    c.set('user', session.user)
    c.set('session', session.session)

    await next()
})
