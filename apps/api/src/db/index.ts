import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import * as schema from './schema'
import path from 'path'

// Get database URL from environment
const connectionString = process.env.DATABASE_URL

console.log('📍 Database URL loaded:', connectionString ? 'YES' : 'NO')

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

// Auto-run migrations on startup
export async function runMigrations() {
    try {
        console.log('🔄 Running database migrations...')
        const migrationsFolder = path.resolve(import.meta.dir, '../../drizzle/migrations')
        await migrate(db, { migrationsFolder })
        console.log('✅ Database migrations applied successfully')
    } catch (error) {
        console.error('❌ Migration failed:', error)
        // Don't crash the server, just log the error
    }
}

// Export schema for convenience
export * from './schema'

