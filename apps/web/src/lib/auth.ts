import { createAuthClient } from 'better-auth/react'
import { emailOTPClient, twoFactorClient } from 'better-auth/client/plugins'

// Better Auth client for frontend
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || window.location.origin,
  fetchOptions: {
    // Capture bearer token from every auth response
    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get('set-auth-token')
      if (authToken) {
        try {
          localStorage.setItem('bearer_token', decodeURIComponent(authToken))
        } catch {
          localStorage.setItem('bearer_token', authToken)
        }
      }
    },
    // Use proper bearer auth config for the better-auth client
    auth: {
      type: 'Bearer',
      token: () => {
        if (typeof window === 'undefined') return ''
        return localStorage.getItem('bearer_token') || ''
      },
    },
  },
  plugins: [
    emailOTPClient(),
    twoFactorClient(),
    // phoneNumberClient(),
  ],
})

// Export auth hooks
export const { signIn, signUp, signOut: originalSignOut, useSession, getSession } = authClient

export const signOut = async (options?: Parameters<typeof originalSignOut>[0]) => {
  localStorage.removeItem('bearer_token')
  return originalSignOut(options)
}

// Email OTP methods
export const { emailOtp, forgetPassword } = authClient

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  const session = await getSession()
  return !!session?.data?.session
}

// Types
export type AuthSession = Awaited<ReturnType<typeof getSession>>

type TranslateFn = (key: string) => string

const HTTP_ERROR_KEYS: Record<number, string> = {
  400: 'auth.error.badRequest',
  401: 'auth.error.unauthorized',
  403: 'auth.error.forbidden',
  404: 'auth.error.notFound',
  409: 'auth.error.conflict',
  422: 'auth.error.validation',
  429: 'auth.error.tooManyRequests',
  500: 'auth.error.server',
  502: 'auth.error.server',
  503: 'auth.error.server',
}

export function getAuthErrorMessage(
  err: unknown,
  fallback = 'Unknown error',
  t?: TranslateFn
): string {
  let status: number | undefined
  let message = ''

  if (err instanceof Error) {
    message = err.message
  } else if (typeof err === 'string') {
    message = err
  } else if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    if (typeof e.status === 'number') status = e.status
    if (typeof e.statusCode === 'number') status = e.statusCode
    if (typeof e.message === 'string' && e.message) message = e.message
    else if (typeof e.error === 'string' && e.error) message = e.error
    else if (typeof e.errorMessage === 'string' && e.errorMessage) message = e.errorMessage
  }

  if (t && status) {
    const key = HTTP_ERROR_KEYS[status]
    if (key) {
      const translated = t(key)
      // i18next returns the key itself when the translation is missing
      if (translated !== key) return translated
    }
  }

  return message || fallback
}
