import 'dotenv/config'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
    console.error('DATABASE_URL not set')
    process.exit(1)
}

const sql = postgres(connectionString, { prepare: false })

async function main() {
    console.log('Fixing Users table schema...')
    try {
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS position varchar(100)`
        console.log('✅ Added position column')

        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name varchar(100)`
        console.log('✅ Added first_name column')

        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name varchar(100)`
        console.log('✅ Added last_name column')

        console.log('Schema fixed successfully.')
    } catch (e) {
        console.error('Error fixing schema:', e)
    } finally {
        await sql.end()
    }
}

main()
