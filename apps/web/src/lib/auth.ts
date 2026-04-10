import { createAuthClient } from 'better-auth/react'
import { emailOTPClient, twoFactorClient } from 'better-auth/client/plugins'

// Better Auth client for frontend
export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_API_URL || window.location.origin,
    fetchOptions: {
        auth: {
            type: "Bearer",
            token: () => localStorage.getItem("bearer_token") || "",
        }
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
