import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { emailOTP } from 'better-auth/plugins'
import { db } from '../db'
import * as schema from '../db/schema'
import { eq } from 'drizzle-orm'
import { sendOTPEmail } from './email'

// Better Auth configuration
export const auth = betterAuth({
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

    // OAuth Social Providers
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        },
        slack: {
            clientId: process.env.SLACK_CLIENT_ID!,
            clientSecret: process.env.SLACK_CLIENT_SECRET!,
        },
    },

    // Trusted origins for CORS
    trustedOrigins: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://flowboard.bartlomiejorianski.workers.dev',
        'https://taskdashboard.bartlomiejorianski.workers.dev',
        'https://taskdashboard-api.bartlomiejorianski.workers.dev',
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

    // User hooks - parse name into first_name and last_name
    user: {
        additionalFields: {
            firstName: {
                type: 'string',
                required: false,
            },
            lastName: {
                type: 'string',
                required: false,
            },
            birthDate: {
                type: 'date',
                required: false,
            },
            gender: {
                type: 'string',
                required: false,
            },
            position: {
                type: 'string',
                required: false,
            },
            role: {
                type: 'string',
                required: false,
                defaultValue: 'member',
            },
            status: {
                type: 'string',
                required: false,
                defaultValue: 'pending',
            },
        },
    },

    // Hooks to set first_name and last_name from name
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    // Parse name into first_name and last_name
                    if (user.name) {
                        const nameParts = user.name.trim().split(' ')
                        const firstName = nameParts[0] || ''
                        const lastName = nameParts.slice(1).join(' ') || ''

                        // Update user with parsed names
                        await db.update(schema.users)
                            .set({
                                firstName,
                                lastName,
                                status: 'active',
                            })
                            .where(eq(schema.users.id, user.id))
                    }
                },
            },
        },
    },
})

// Export auth types
export type Auth = typeof auth


