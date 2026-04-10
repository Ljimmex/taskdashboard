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
        // Send stored bearer token with every auth request
        headers: {
            get Authorization() {
                const token = typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : null
                return token ? `Bearer ${token}` : ''
            }
        },
    },
    plugins: [
        emailOTPClient(),
        twoFactorClient(),
        // phoneNumberClient(),
    ],
})

// Export auth hooks
export const {
    signIn,
    signUp,
    signOut: originalSignOut,
    useSession,
    getSession,
} = authClient

export const signOut = async (options?: Parameters<typeof originalSignOut>[0]) => {
    localStorage.removeItem('bearer_token');
    return originalSignOut(options);
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
