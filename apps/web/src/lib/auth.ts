import { createAuthClient } from 'better-auth/react'
import { emailOTPClient } from 'better-auth/client/plugins'

// Better Auth client for frontend
export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    plugins: [
        emailOTPClient(),
    ],
})

// Export auth hooks
export const {
    signIn,
    signUp,
    signOut,
    useSession,
    getSession,
} = authClient

// Email OTP methods
export const { emailOtp, forgetPassword } = authClient

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
    const session = await getSession()
    return !!session?.data?.session
}

// Types
export type AuthSession = Awaited<ReturnType<typeof getSession>>
