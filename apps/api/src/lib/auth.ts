import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { emailOTP } from 'better-auth/plugins'
import { db } from '../db'
import * as schema from '../db/schema'
import { eq } from 'drizzle-orm'
import { sendOTPEmail } from './email'

// Factory function to initialize auth with environment variables
export const initAuth = (env: any) => {
    return betterAuth({
        // Base path for auth routes
        basePath: '/api/auth',

        database: drizzleAdapter(db, {
            provider: 'pg',
            schema: {
                // Map Better Auth tables to our schema
                user: schema.users,
                session: schema.sessions,
                account: schema.accounts,
                verification: schema.verifications,
            },
        }),

        // Email & password authentication
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: false, // Can enable with OTP
            minPasswordLength: 8,
        },

        // Session configuration
        session: {
            expiresIn: 60 * 60 * 24 * 7, // 7 days
            updateAge: 60 * 60 * 24, // Update session every 24 hours
            cookieCache: {
                enabled: true,
                maxAge: 60 * 5, // 5 minutes
            },
        },

        // Security
        rateLimit: {
            window: 60, // 1 minute
            max: 10, // 10 requests per minute
        },

        // Make sure secret is passed from the environment context
        secret: env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET,

        // OAuth Social Providers
        socialProviders: {
            google: {
                clientId: env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
                clientSecret: env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
            },
            github: {
                clientId: env.GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID || '',
                clientSecret: env.GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET || '',
            },
            slack: {
                clientId: env.SLACK_CLIENT_ID || process.env.SLACK_CLIENT_ID || '',
                clientSecret: env.SLACK_CLIENT_SECRET || process.env.SLACK_CLIENT_SECRET || '',
            },
        },

        // Trusted origins
        trustedOrigins: [
            'http://localhost:5173',
            'http://localhost:3000',
            'https://taskdashboard.pages.dev',
            'https://taskdashboard-api.zadanoio.workers.dev',
        ],

        // Plugins
        plugins: [
            emailOTP({
                // OTP configuration
                otpLength: 6,
                expiresIn: 600, // 10 minutes

                // Send OTP email
                async sendVerificationOTP({ email, otp, type }) {
                    await sendOTPEmail({
                        to: email,
                        otp,
                        type: type as 'sign-in' | 'email-verification' | 'forget-password',
                    })
                },
            }),
        ],

        user: {
            additionalFields: {
                firstName: { type: 'string', required: false },
                lastName: { type: 'string', required: false },
                birthDate: { type: 'date', required: false },
                gender: { type: 'string', required: false },
                position: { type: 'string', required: false },
                role: { type: 'string', required: false, defaultValue: 'member' },
                status: { type: 'string', required: false, defaultValue: 'pending' },
            },
        },

        databaseHooks: {
            user: {
                create: {
                    after: async (user) => {
                        if (user.name) {
                            const nameParts = user.name.trim().split(' ')
                            const firstName = nameParts[0] || ''
                            const lastName = nameParts.slice(1).join(' ') || ''

                            await db.update(schema.users)
                                .set({ firstName, lastName, status: 'active' })
                                .where(eq(schema.users.id, user.id))
                        }
                    },
                },
            },
        },
    })
}

// Helper type
export type Auth = ReturnType<typeof initAuth>
