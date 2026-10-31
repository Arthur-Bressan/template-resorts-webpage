import { db } from '@/lib/db'

const DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
const RESERVED_TENANT_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'auth',
  'login',
  'mail',
  'platform',
  'root',
  'status',
  'support',
  'www',
])

function normalizeDomain(value: string): string | null {
  const domain = value.trim().toLowerCase().replace(/\.$/, '')
  if (!domain || domain.includes('://') || /[/:?#@\s,]/.test(domain)) return null

  const labels = domain.split('.')
  if (!labels.length || labels.some((label) => !DOMAIN_LABEL_PATTERN.test(label))) return null
  return domain
}

export function getPlatformBaseDomain(): string | null {
  const value = process.env.PLATFORM_BASE_DOMAIN
  return value ? normalizeDomain(value) : null
}

export function isValidTenantSlug(slug: string): boolean {
  return (
    slug.length <= 63 &&
    DOMAIN_LABEL_PATTERN.test(slug) &&
    !RESERVED_TENANT_SLUGS.has(slug)
  )
}

function normalizeRequestHost(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const host = value.trim()
  if (!host || /[\s,/?#@%\\]/.test(host)) return null

  try {
    const parsed = new URL(`http://${host}`)
    if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      return null
    }
    return normalizeDomain(parsed.hostname)
  } catch {
    return null
  }
}

/** Resolve a public tenant from a trusted server-side Host value. */
export async function getTenantFromHost(host: string | null | undefined) {
  const baseDomain = getPlatformBaseDomain()
  const normalizedHost = normalizeRequestHost(host)
  if (!baseDomain || !normalizedHost) return null

  const suffix = `.${baseDomain}`
  if (!normalizedHost.endsWith(suffix)) return null

  const slug = normalizedHost.slice(0, -suffix.length)
  if (
    !isValidTenantSlug(slug)
  ) {
    return null
  }

  const tenant = await db.company.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, status: true },
  })
  if (!tenant || tenant.status !== 'active') return null
  return tenant
}
