import { createMiddleware } from 'hono/factory'
import { ALLOWED_ORIGINS } from '../lib/allowedOrigins'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const SKIP_PATH_PREFIXES = [
  '/api/auth/',
  '/api/health',
  '/api/billing/webhook',
  '/api/workspaces/invites/resolve',
  '/openapi.json',
  '/doc',
]

function isTrustedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false
  if (ALLOWED_ORIGINS.includes(origin)) return true
  if (origin.endsWith('.zadanoapp.com')) return true
  return false
}

/**
 * CSRF protection for cross-origin deployments.
 *
 * The API accepts both Better-Auth session cookies and a bearer token stored in
 * the frontend's localStorage. Because session cookies are sent automatically on
 * cross-origin requests, cookie-only requests to state-changing endpoints are
 * vulnerable to CSRF from any allowed origin.
 *
 * This middleware requires an explicit `Authorization: Bearer <token>` header
 * for mutating methods UNLESS the request comes from a trusted origin that is
 * already allowed by CORS. The bearer token cannot be read by another origin, so
 * it remains the strongest protection.
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
  if (authorization.startsWith('Bearer ')) {
    return next()
  }

  // Allow cookie-only requests from trusted origins. CORS already restricts
  // credentialed requests to these origins, so a malicious third-party site
  // cannot exploit this fallback.
  const origin = c.req.header('Origin')
  if (isTrustedOrigin(origin)) {
    return next()
  }

  return c.json(
    {
      error: 'Forbidden',
      message: 'CSRF protection: bearer token required',
    },
    403
  )
})
