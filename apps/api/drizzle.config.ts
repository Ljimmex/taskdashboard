import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env from current dir first (priority)
config({ path: resolve(__dirname, '.env') })
// Load .env.local from root (fallback)
config({ path: resolve(__dirname, '../../.env.local') })

export default defineConfig({
    schema: './src/db/schema/index.ts',
    out: './drizzle/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
    verbose: true,
    strict: true,
})
