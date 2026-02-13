import * as dotenv from 'dotenv'

// Load environment variables FIRST, before any other module
// TurboRepo loads root .env with empty values, we must override
dotenv.config({ override: true })

console.log('📍 Database URL loaded:', process.env.DATABASE_URL ? 'YES' : 'NO')
console.log('🔐 OAuth config:', {
    google: process.env.GOOGLE_CLIENT_ID ? 'CONFIGURED' : 'NOT SET',
    github: process.env.GITHUB_CLIENT_ID ? 'CONFIGURED' : 'NOT SET',
    slack: process.env.SLACK_CLIENT_ID ? 'CONFIGURED' : 'NOT SET',
})
console.log('🔑 Better Auth Secret:', process.env.BETTER_AUTH_SECRET ? `SET (length: ${process.env.BETTER_AUTH_SECRET.length})` : 'NOT SET')
