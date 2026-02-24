import dotenv from 'dotenv'
import path from 'path'
// Load env files - .env.local takes priority over .env
const envLocalPath = path.resolve(process.cwd(), '.env.local')
console.log('[ENV] Loading from:', envLocalPath)
const result = dotenv.config({ path: envLocalPath, override: true })
console.log('[ENV] Loaded .env.local, AI_MODEL_FREE =', process.env.AI_MODEL_FREE, ', AI_MODEL_PAID =', process.env.AI_MODEL_PAID, ', AI_MODEL_AGENTS =', process.env.AI_MODEL_AGENTS)
dotenv.config({ path: '.env' })

import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { fileURLToPath } from 'url'
import * as schema from './schema.js'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Create postgres client
const client = postgres(process.env.DATABASE_URL, {
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idle_timeout: 20,
  connect_timeout: 10,
})

// Create drizzle instance
export const db = drizzle(client, { schema })

// Run pending migrations automatically on startup
// In dev: db/index.ts -> db/migrations
// In prod (compiled): dist-server/db/index.js -> but migrations are at db/migrations (project root)
const __dbFilename = fileURLToPath(import.meta.url)
const __dbDirname = path.dirname(__dbFilename)
const isCompiled = __dbDirname.includes('dist-server')
const migrationsFolder = isCompiled
  ? path.join(__dbDirname, '..', '..', 'db', 'migrations')
  : path.join(__dbDirname, 'migrations')

export async function runMigrations() {
  console.log('[DB] Running migrations from:', migrationsFolder)
  try {
    await migrate(db, { migrationsFolder })
    console.log('[DB] Migrations applied successfully')
  } catch (error) {
    console.error('[DB] Migration failed:', error)
    throw error
  }
}

// Export schema for use in other files
export { schema }
