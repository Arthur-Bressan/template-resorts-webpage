/**
 * Setup script for Turso (SQLite cloud).
 *
 * This script:
 * 1. Generates DDL SQL from the Prisma schema (using prisma migrate diff)
 * 2. Applies the SQL to your Turso database via @libsql/client
 * 3. Optionally seeds the database
 *
 * Usage:
 *   DATABASE_URL="libsql://your-db.turso.io?auth_token=your-token" npx tsx scripts/setup-turso.ts
 *   DATABASE_URL="libsql://your-db.turso.io?auth_token=your-token" npx tsx scripts/setup-turso.ts --seed
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

async function main() {
  console.log('🔧 Setting up Turso database...')
  console.log(`   URL: ${cleanUrl}`)

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
  const client = createClient({ url: cleanUrl, authToken })

  try {
    // Execute each statement separately (libsql doesn't support multiple statements in one execute)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (let i = 0; i < statements.length; i++) {
      await client.execute(statements[i])
    }
    console.log(`   ✅ Executed ${statements.length} statements successfully`)
  } catch (e: any) {
    console.error('❌ Failed to execute SQL:', e.message)
    process.exit(1)
  }

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
  console.log('   1. Your database is ready at Turso')
  console.log('   2. Set the same DATABASE_URL in your Vercel environment variables')
  console.log('   3. Deploy with: vercel --prod')
}

main().catch(e => {
  console.error('❌ Setup failed:', e)
  process.exit(1)
})
