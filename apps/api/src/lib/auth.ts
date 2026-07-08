import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import type { BetterAuthOptions } from 'better-auth'
import { db } from '@/db'
import { twoFactor } from 'better-auth/plugins'
import { emailOTP } from 'better-auth/plugins'
import { bearer } from 'better-auth/plugins'
import * as schema from '../db/schema'
import { eq, and, lt } from 'drizzle-orm'
import { sendOTPEmail } from './email'
import { decryptTwoFactor, encryptTwoFactor } from './encryption'

// Models that hold sensitive 2FA data
const TWO_FACTOR_MODELS = new Set(['twoFactor', 'two_factors'])

function isTwoFactorModel(model: string): boolean {
  return TWO_FACTOR_MODELS.has(model)
}

function encryptTwoFactorFields(record: Record<string, unknown>): void {
  if (record.secret && typeof record.secret === 'string') {
    record.secret = encryptTwoFactor(record.secret)
  }
  if (record.backupCodes && typeof record.backupCodes === 'string') {
    record.backupCodes = encryptTwoFactor(record.backupCodes)
  }
}

function decryptTwoFactorFields(record: Record<string, unknown>): void {
  if (record.secret && typeof record.secret === 'string') {
    record.secret = decryptTwoFactor(record.secret)
  }
  if (record.backupCodes && typeof record.backupCodes === 'string') {
    record.backupCodes = decryptTwoFactor(record.backupCodes)
  }
}

/**
 * Wrap a Better Auth DB adapter so that 2FA secrets and backup codes are
 * encrypted at rest. Existing plaintext values are treated as legacy data and
 * will be re-encrypted on the next write.
 */
function withTwoFactorEncryption(adapter: any): any {
  return {
    ...adapter,
    create: async (data: { model: string; data?: Record<string, unknown> }) => {
      if (isTwoFactorModel(data.model) && data.data) {
        data.data = { ...data.data }
        encryptTwoFactorFields(data.data)
      }
      return adapter.create(data)
    },
    findOne: async (data: { model: string }) => {
      const result = await adapter.findOne(data)
      if (isTwoFactorModel(data.model) && result) {
        decryptTwoFactorFields(result as Record<string, unknown>)
      }
      return result
    },
    findMany: async (data: { model: string }) => {
      const results = (await adapter.findMany(data)) as unknown[]
      if (isTwoFactorModel(data.model)) {
        results.forEach((r) => decryptTwoFactorFields(r as Record<string, unknown>))
      }
      return results
    },
    update: async (data: { model: string; update?: Record<string, unknown> }) => {
      if (isTwoFactorModel(data.model) && data.update) {
        data.update = { ...data.update }
        encryptTwoFactorFields(data.update)
      }
      return adapter.update(data)
    },
  }
}

// Better Auth configuration
export const auth = betterAuth({
  // Explicitly pass secret from env
  secret: process.env.BETTER_AUTH_SECRET,

  // Set base URL for production (critical for CORS in cross-origin setups)
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',

  // Base path for auth routes
  basePath: '/api/auth',

  database: (options: BetterAuthOptions) => {
    const adapter = drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        // Map Better Auth tables to our schema
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        twoFactor: schema.twoFactors,
        twoFactorTrust: schema.twoFactorTrust,
      },
    })(options)
    return withTwoFactorEncryption(adapter)
  },

  // Email & password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // Can enable with OTP
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

  // Advanced cookie configuration for cross-origin
  advanced: {
    crossSubDomainCookies: {
      enabled: false, // Disabled: Enable only for custom domains, breaks on onrender.com due to Public Suffix List
    },
    defaultCookieAttributes: {
      sameSite: 'none',
      secure: true, // Requires HTTPS
    },
  },

  // Security
  rateLimit: {
    window: 60, // 1 minute
    max: process.env.NODE_ENV === 'production' ? 20 : 1000,
  },

  // OAuth Social Providers (only register providers that have credentials configured)
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          },
        }
      : {}),
    ...(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET
      ? {
          slack: {
            clientId: process.env.SLACK_CLIENT_ID,
            clientSecret: process.env.SLACK_CLIENT_SECRET,
          },
        }
      : {}),
  },

  // Trusted origins for CORS
  trustedOrigins: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://taskdashboard.pages.dev',
    'https://taskdashboard-api.onrender.com',
    'https://taskdashboard-web.onrender.com',
    'https://zadanoapp.com',
    'https://www.zadanoapp.com',
    'https://api.zadanoapp.com',
  ],

  // Plugins
  plugins: [
    bearer(),
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
    twoFactor({
      issuer: 'Zadano.app',
    }),

    // phoneNumber({
    //     sendOTP: async ({ phoneNumber, code }: { phoneNumber: string; code: string }) => {
    //         // INFORMATIONAL ONLY: Stub OTP to avoid actual sending.
    //         // User requested phone number to be informational for now.
    //         console.log(`📱 SMS OTP for ${phoneNumber}: ${code}`)
    //     },
    // }),
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
      phoneNumber: {
        type: 'string',
        required: false,
      },
    },
  },

  // Hooks to set first_name and last_name from name
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          // 1. Cleanup expired sessions
          await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()))

          // 2. Remove existing session for same user/UA (Deduplication)
          if (session.userId && session.userAgent) {
            await db
              .delete(schema.sessions)
              .where(
                and(
                  eq(schema.sessions.userId, session.userId),
                  eq(schema.sessions.userAgent, session.userAgent)
                )
              )
          }
          return { data: session }
        },
      },
    },
    user: {
      create: {
        after: async (user) => {
          // Parse name into first_name and last_name
          if (user.name) {
            const nameParts = user.name.trim().split(' ')
            const firstName = nameParts[0] || ''
            const lastName = nameParts.slice(1).join(' ') || ''

            // Update user with parsed names
            await db
              .update(schema.users)
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

  // Debugging
  logger: {
    level: 'debug',
  },
})

// Export auth types
export type Auth = typeof auth
