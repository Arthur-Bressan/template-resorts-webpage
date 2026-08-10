const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key)
    }
    lastCleanup = now
  }
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const existing = rateLimitMap.get(key)

  if (!existing || now > existing.resetAt) {
    const resetAt = now + windowMs
    rateLimitMap.set(key, { count: 1, resetAt })
    return { success: true, remaining: maxRequests - 1, resetAt }
  }

  if (existing.count >= maxRequests) {
    return { success: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count++
  return { success: true, remaining: maxRequests - existing.count, resetAt: existing.resetAt }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return 'unknown'
}
