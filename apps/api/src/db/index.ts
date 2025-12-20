import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Get database URL from environment
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
    console.warn('⚠️ DATABASE_URL not set. Database operations will fail.')
}

// Create postgres connection
// IMPORTANT: prepare: false is required for Supabase Connection Pooler
const client = postgres(connectionString || 'postgresql://localhost:5432/taskdashboard', {
    prepare: false, // Required for Supabase Transaction pooler
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
})

// Create drizzle instance with schema
export const db = drizzle(client, { schema })

// Export schema for convenience
export * from './schema'
