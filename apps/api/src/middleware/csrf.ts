import { createMiddleware } from 'hono/factory'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const SKIP_PATH_PREFIXES = [
  '/api/auth/',
  '/api/health',
  '/api/billing/webhook',
  '/api/workspaces/invites/resolve',
  '/openapi.json',
  '/doc',
]

/**
 * CSRF protection for cross-origin deployments.
 *
 * The API accepts both Better-Auth session cookies and a bearer token stored in
 * the frontend's localStorage. Because session cookies are sent automatically on
 * cross-origin requests, cookie-only requests to state-changing endpoints are
 * vulnerable to CSRF from any allowed origin.
 *
 * This middleware requires an explicit `Authorization: Bearer <token>` header
 * for mutating methods. The bearer token cannot be read by another origin, so
 * an attacker cannot forge a valid cross-origin state-changing request even if
 * they trick a logged-in user into visiting a malicious page.
 *
 * Better Auth endpoints are excluded because Better Auth implements its own
 * CSRF handling for cookie-based auth flows.
 */
export const csrfMiddleware = createMiddleware(async (c, next) => {
  if (!MUTATING_METHODS.has(c.req.method)) {
    return next()
  }

  const path = c.req.path
  if (SKIP_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return next()
  }

  const authorization = c.req.header('Authorization') || ''
  if (!authorization.startsWith('Bearer ')) {
    return c.json(
      {
        error: 'Forbidden',
        message: 'CSRF protection: bearer token required',
      },
      403
    )
  }

  return next()
})
