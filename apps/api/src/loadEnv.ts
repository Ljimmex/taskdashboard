import * as dotenv from 'dotenv'

// Load environment variables FIRST, before any other module
// TurboRepo loads root .env with empty values, we must override
dotenv.config({ override: true })
