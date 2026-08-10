/**
 * Setup script for Turso (SQLite cloud).
 *
 * This script:
 * 1. Drops all existing tables (if --force flag is used)
 * 2. Generates DDL SQL from the Prisma schema
 * 3. Applies the SQL to your Turso database via @libsql/client
 * 4. Optionally seeds the database
 *
 * Usage:
 *   DATABASE_URL="libsql://your-db.turso.io?auth_token=your-token" npx tsx scripts/setup-turso.ts
 *   DATABASE_URL="libsql://your-db.turso.io?auth_token=your-token" npx tsx scripts/setup-turso.ts --force
 *   DATABASE_URL="libsql://your-db.turso.io?auth_token=your-token" npx tsx scripts/setup-turso.ts --seed
 *   DATABASE_URL="libsql://your-db.turso.io?auth_token=your-token" npx tsx scripts/setup-turso.ts --force --seed
 */
import { execSync } from 'child_process'
import { createClient } from '@libsql/client'

const databaseUrl = process.env.DATABASE_URL || ''

if (!databaseUrl.startsWith('libsql://')) {
  console.error('❌ DATABASE_URL must be a libsql:// URL (Turso)')
  console.error('   Example: DATABASE_URL="libsql://my-db.turso.io?auth_token=token" npx tsx scripts/setup-turso.ts')
  process.exit(1)
}

// Parse libsql URL
function parseLibsqlUrl(url: string) {
  const match = url.match(/\?(?:auth_token|authToken)=([^&]+)/)
  if (match) {
    return { url: url.split('?')[0], authToken: match[1] }
  }
  return { url }
}

const { url: cleanUrl, authToken } = parseLibsqlUrl(databaseUrl)

// All Prisma model table names (must match schema)
const TABLE_NAMES = [
  'UploadedImage', 'RoomImage', 'RoomAmenity', 'Reservation',
  'Room', 'Experience', 'GalleryImage',
  'Testimonial', 'Faq', 'AboutAmenity',
  'Distance', 'Direction', 'SensoryConfig',
  'Stat', 'NewsletterSubscriber', 'ContactSubmission',
  'NavLink', 'SiteSetting', 'Admin',
]

async function main() {
  console.log('🔧 Setting up Turso database...')
  console.log(`   URL: ${cleanUrl}`)

  const client = createClient({ url: cleanUrl, authToken })

  // Step 0: Optionally drop existing tables
  if (process.argv.includes('--force')) {
    console.log('\n🗑️  Step 0: Dropping existing tables...')
    try {
      // Disable FK constraints to allow dropping in any order
      await client.execute('PRAGMA foreign_keys = OFF')
      for (const table of TABLE_NAMES) {
        try {
          await client.execute(`DROP TABLE IF EXISTS "${table}"`)
        } catch {
          // Table might not exist, that's fine
        }
      }
      await client.execute('PRAGMA foreign_keys = ON')
      console.log(`   ✅ Dropped all tables`)
    } catch (e: any) {
      console.error('❌ Failed to drop tables:', e.message)
      process.exit(1)
    }
  }

  // Step 1: Generate SQL from Prisma schema
  console.log('\n📋 Step 1: Generating DDL SQL from Prisma schema...')
  let sql: string
  try {
    sql = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script', {
      encoding: 'utf-8',
      cwd: process.cwd(),
    })
  } catch (e: any) {
    console.error('❌ Failed to generate SQL:', e.message)
    process.exit(1)
  }
  console.log(`   Generated ${sql.split('\n').length} lines of SQL`)

  // Step 2: Connect to Turso and execute SQL
  console.log('\n🗄️  Step 2: Connecting to Turso and creating tables...')

  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  let executed = 0
  let skipped = 0

  for (const stmt of statements) {
    try {
      await client.execute(stmt)
      executed++
    } catch (e: any) {
      const msg = String(e.message || e.code || e)
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate') ||
        msg.includes('SQL_INPUT_ERROR') && msg.includes('already exists')
      ) {
        skipped++
        console.log(`   ⏭️  Skipped (already exists): ${stmt.substring(0, 60).replace(/\n/g, ' ')}...`)
      } else {
        console.error(`   ❌ Error executing: ${stmt.substring(0, 80)}...`)
        console.error(`   ${msg}`)
        process.exit(1)
      }
    }
  }
  console.log(`   ✅ Executed ${executed} statements, skipped ${skipped} (already exist)`)

  // Step 2.5: Migrate — add new columns to existing tables
  console.log('\n🔄 Step 2b: Checking for new columns to add...')
  const migrations: { table: string; column: string; type: string; default: string }[] = [
    { table: 'SiteSetting', column: 'heroImage', type: 'TEXT', default: "'/images/hero.jpg'" },
  ]

  let added = 0
  for (const m of migrations) {
    try {
      // Check if column already exists
      const info = await client.execute(`PRAGMA table_info("${m.table}")`)
      const colExists = info.rows.some((r: any) => r.name === m.column)
      if (colExists) {
        console.log(`   ⏭️  Column "${m.column}" already exists in "${m.table}"`)
        continue
      }
      await client.execute(`ALTER TABLE "${m.table}" ADD COLUMN "${m.column}" ${m.type} NOT NULL DEFAULT ${m.default}`)
      console.log(`   ✅ Added column "${m.column}" to "${m.table}"`)
      added++
    } catch (e: any) {
      console.error(`   ⚠️  Could not add "${m.column}": ${e.message}`)
    }
  }
  if (added === 0) console.log('   (no new columns needed)')

  // Step 3: Optionally seed
  if (process.argv.includes('--seed')) {
    console.log('\n🌱 Step 3: Seeding database...')
    try {
      execSync('npx tsx prisma/seed.ts', {
        encoding: 'utf-8',
        cwd: process.cwd(),
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: databaseUrl },
      })
    } catch (e: any) {
      console.error('❌ Seed failed:', e.message)
      process.exit(1)
    }
  }

  console.log('\n✅ Turso database setup complete!')
  console.log('\n💡 Next steps:')
  console.log('   1. Set the same DATABASE_URL in your Vercel environment variables')
  console.log('   2. Deploy with: vercel --prod')
}

main().catch(e => {
  console.error('❌ Setup failed:', e)
  process.exit(1)
})
