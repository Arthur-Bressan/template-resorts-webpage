import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { db } from '@/lib/db'

const TOKEN_REFRESH_SKEW_MS = 2 * 60 * 1000
const REFRESH_LEASE_MS = 30 * 1000
const REFRESH_REQUEST_TIMEOUT_MS = 12 * 1000
const REFRESH_PERSIST_RETRY_MS = 20 * 1000
const REFRESH_CONTENTION_POLL_MS = 200
const REFRESH_RECOVERY_RETRY_DEADLINE_MS = 3 * 1000
const REFRESH_RECOVERY_MAX_ATTEMPTS = 6
const REFRESH_RECOVERY_INITIAL_BACKOFF_MS = 100
const REFRESH_RECOVERY_MAX_BACKOFF_MS = 800
const refreshesInProcess = new Map<string, Promise<{ accessToken: string; mpUserId: string } | null>>()

export class MercadoPagoTemporaryUnavailableError extends Error {
  readonly code = 'MERCADO_PAGO_TEMPORARILY_UNAVAILABLE'
  readonly statusCode = 503
  readonly underlyingError: unknown

  constructor(underlyingError?: unknown) {
    super('Mercado Pago is temporarily unavailable. Please retry shortly.')
    this.name = 'MercadoPagoTemporaryUnavailableError'
    this.underlyingError = underlyingError
  }
}

type StoredMercadoPagoConnection = {
  id: string
  tenantId: string
  mpUserId: string
  accessTokenEncrypted: string
  refreshTokenEncrypted: string
  expiresAt: Date
  status: string
  refreshLeaseToken: string | null
  refreshLeaseExpiresAt: Date | null
  refreshRequestStartedAt: Date | null
}

type RefreshResult =
  | { kind: 'complete'; token: { accessToken: string; mpUserId: string } | null }
  | { kind: 'retry' }

export interface MercadoPagoAppCredentials {
  clientId: string
  clientSecret: string
  redirectUri: string
}

function getEncryptionKey() {
  const value = process.env.MERCADO_PAGO_TOKEN_ENCRYPTION_KEY?.trim()
  if (!value) throw new Error('Mercado Pago token encryption is not configured')

  const key = /^[a-f0-9]{64}$/i.test(value)
    ? Buffer.from(value, 'hex')
    : Buffer.from(value, 'base64')
  if (key.length !== 32) throw new Error('Mercado Pago token encryption key must be 32 bytes')
  return key
}

/** Encrypt tokens and short-lived OAuth verifiers with AES-256-GCM. */
export function encryptMercadoPagoSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`
}

export function decryptMercadoPagoSecret(value: string) {
  const [version, encodedIv, encodedTag, encodedCiphertext, extra] = value.split('.')
  if (version !== 'v1' || !encodedIv || !encodedTag || encodedCiphertext === undefined || extra) {
    throw new Error('Invalid encrypted Mercado Pago secret')
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(encodedIv, 'base64url'),
  )
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

export function hashMercadoPagoOAuthState(state: string) {
  return createHash('sha256').update(state).digest('hex')
}

export function createMercadoPagoCodeVerifier() {
  // 64 URL-safe characters, within Mercado Pago's documented PKCE range.
  return randomBytes(48).toString('base64url')
}

export function createMercadoPagoCodeChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url')
}

export function getMercadoPagoAppCredentials(): MercadoPagoAppCredentials | null {
  const clientId = process.env.MERCADO_PAGO_CLIENT_ID?.trim()
  const clientSecret = process.env.MERCADO_PAGO_CLIENT_SECRET?.trim()
  const redirectUri = process.env.MERCADO_PAGO_REDIRECT_URI?.trim()
  if (!clientId || !clientSecret || !redirectUri) return null
  return { clientId, clientSecret, redirectUri }
}

export function isMercadoPagoDevelopmentMockEnabled() {
  return process.env.NODE_ENV === 'development' && process.env.MERCADO_PAGO_DEV_MOCK === 'true'
}

export async function getMercadoPagoConnectionStatus(tenantId: string) {
  const connection = await db.mercadoPagoConnection.findUnique({
    where: { tenantId },
    select: { mpUserId: true, expiresAt: true, status: true, connectedAt: true },
  })
  if (!connection) return { connected: false, status: 'not_connected' as const }

  const connected = connection.status === 'connected'
  return {
    connected,
    status: connection.status,
    accountHint: connection.mpUserId.length > 4
      ? `••••${connection.mpUserId.slice(-4)}`
      : null,
    expiresAt: connection.expiresAt.toISOString(),
    connectedAt: connection.connectedAt.toISOString(),
  }
}

function usableTokenFromConnection(connection: StoredMercadoPagoConnection | null, expectedUserId?: string) {
  if (
    !connection || connection.status !== 'connected' ||
    (expectedUserId && connection.mpUserId !== expectedUserId) ||
    connection.expiresAt.getTime() <= Date.now() + TOKEN_REFRESH_SKEW_MS
  ) return null

  try {
    return {
      accessToken: decryptMercadoPagoSecret(connection.accessTokenEncrypted),
      mpUserId: connection.mpUserId,
    }
  } catch {
    return null
  }
}

async function readUsableMercadoPagoAccessToken(tenantId: string, expectedUserId?: string) {
  const connection = await db.mercadoPagoConnection.findUnique({ where: { tenantId } })
  return usableTokenFromConnection(connection, expectedUserId)
}

async function releaseMercadoPagoRefreshLease(connection: StoredMercadoPagoConnection, leaseToken: string) {
  try {
    await db.mercadoPagoConnection.updateMany({
      where: {
        id: connection.id,
        tenantId: connection.tenantId,
        status: 'connected',
        refreshTokenEncrypted: connection.refreshTokenEncrypted,
        refreshLeaseToken: leaseToken,
      },
      data: {
        refreshLeaseToken: null,
        refreshLeaseExpiresAt: null,
        refreshRequestStartedAt: null,
      },
    })
  } catch {
    // Pre-request release failure is safe to recover because no provider call ran.
  }
}

async function requireMercadoPagoReauthorization(
  connection: StoredMercadoPagoConnection,
  leaseToken?: string,
) {
  try {
    const updated = await db.mercadoPagoConnection.updateMany({
      where: {
        id: connection.id,
        tenantId: connection.tenantId,
        status: 'connected',
        refreshTokenEncrypted: connection.refreshTokenEncrypted,
        refreshRequestStartedAt: { not: null },
        ...(leaseToken ? { refreshLeaseToken: leaseToken } : {}),
      },
      data: {
        status: 'reauthorization_required',
        refreshLeaseToken: null,
        refreshLeaseExpiresAt: null,
        refreshRequestStartedAt: null,
      },
    })
    return updated.count > 0
  } catch {
    // The persisted request-start marker lets a later invocation recover safely.
    return false
  }
}

async function recoverExpiredUncertainRefresh(connection: StoredMercadoPagoConnection, now: Date) {
  try {
    const updated = await db.mercadoPagoConnection.updateMany({
      where: {
        id: connection.id,
        tenantId: connection.tenantId,
        status: 'connected',
        refreshTokenEncrypted: connection.refreshTokenEncrypted,
        refreshRequestStartedAt: { not: null },
        OR: [
          { refreshLeaseToken: null },
          { refreshLeaseExpiresAt: null },
          { refreshLeaseExpiresAt: { lte: now } },
        ],
      },
      data: {
        status: 'reauthorization_required',
        refreshLeaseToken: null,
        refreshLeaseExpiresAt: null,
        refreshRequestStartedAt: null,
      },
    })
    return updated.count > 0
  } catch (error) {
    throw new MercadoPagoTemporaryUnavailableError(error)
  }
}

async function safelyReadUsableMercadoPagoAccessToken(tenantId: string, expectedUserId: string) {
  try {
    return await readUsableMercadoPagoAccessToken(tenantId, expectedUserId)
  } catch {
    return null
  }
}

async function persistRotatedMercadoPagoTokens(
  connection: StoredMercadoPagoConnection,
  leaseToken: string,
  tokens: { accessToken: string; refreshToken: string; expiresAt: Date },
): Promise<RefreshResult> {
  const retryUntil = Date.now() + REFRESH_PERSIST_RETRY_MS
  let retryDelay = 150

  while (Date.now() < retryUntil) {
    try {
      const now = new Date()
      const renewed = await db.mercadoPagoConnection.updateMany({
        where: {
          id: connection.id,
          tenantId: connection.tenantId,
          status: 'connected',
          refreshTokenEncrypted: connection.refreshTokenEncrypted,
          refreshLeaseToken: leaseToken,
          refreshRequestStartedAt: { not: null },
        },
        data: { refreshLeaseExpiresAt: new Date(now.getTime() + REFRESH_LEASE_MS) },
      })
      if (!renewed.count) {
        const latest = await safelyReadUsableMercadoPagoAccessToken(connection.tenantId, connection.mpUserId)
        if (latest) return { kind: 'complete', token: latest }
        await requireMercadoPagoReauthorization(connection, leaseToken)
        return { kind: 'retry' }
      }

      const persisted = await db.mercadoPagoConnection.updateMany({
        // Keep both the lease owner and old refresh token as CAS guards.
        where: {
          id: connection.id,
          tenantId: connection.tenantId,
          status: 'connected',
          refreshTokenEncrypted: connection.refreshTokenEncrypted,
          refreshLeaseToken: leaseToken,
          refreshLeaseExpiresAt: { gt: new Date() },
          refreshRequestStartedAt: { not: null },
        },
        data: {
          accessTokenEncrypted: encryptMercadoPagoSecret(tokens.accessToken),
          refreshTokenEncrypted: encryptMercadoPagoSecret(tokens.refreshToken),
          expiresAt: tokens.expiresAt,
          refreshLeaseToken: null,
          refreshLeaseExpiresAt: null,
          refreshRequestStartedAt: null,
        },
      })
      if (persisted.count) {
        const latest = await safelyReadUsableMercadoPagoAccessToken(connection.tenantId, connection.mpUserId)
        return latest ? { kind: 'complete', token: latest } : { kind: 'retry' }
      }

      const latest = await safelyReadUsableMercadoPagoAccessToken(connection.tenantId, connection.mpUserId)
      if (latest) return { kind: 'complete', token: latest }
    } catch {
      // The response supplied a known rotated pair, so keep its lease and retry
      // persistence instead of ever sending the old refresh token again.
      const latest = await safelyReadUsableMercadoPagoAccessToken(connection.tenantId, connection.mpUserId)
      if (latest) return { kind: 'complete', token: latest }
    }

    const remaining = retryUntil - Date.now()
    if (remaining <= 0) break
    await new Promise((resolve) => setTimeout(resolve, Math.min(retryDelay, remaining)))
    retryDelay = Math.min(retryDelay * 2, 1_200)
  }

  const latest = await safelyReadUsableMercadoPagoAccessToken(connection.tenantId, connection.mpUserId)
  if (latest) return { kind: 'complete', token: latest }
  // Keep the uncertain request marker. If this state transition cannot be
  // persisted now, expired-lease recovery will make the connection unusable.
  await requireMercadoPagoReauthorization(connection, leaseToken)
  return { kind: 'retry' }
}

async function refreshUnderMercadoPagoLease(
  connection: StoredMercadoPagoConnection,
  leaseToken: string,
  clientId: string,
  clientSecret: string,
): Promise<RefreshResult> {
  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined
  let requestMayHaveBeenSent = false
  try {
    let refreshToken: string
    try {
      refreshToken = decryptMercadoPagoSecret(connection.refreshTokenEncrypted)
    } catch {
      return { kind: 'complete', token: null }
    }

    const requestStarted = await db.mercadoPagoConnection.updateMany({
      where: {
        id: connection.id,
        tenantId: connection.tenantId,
        status: 'connected',
        refreshTokenEncrypted: connection.refreshTokenEncrypted,
        refreshLeaseToken: leaseToken,
        refreshLeaseExpiresAt: { gt: new Date() },
        refreshRequestStartedAt: null,
      },
      data: { refreshRequestStartedAt: new Date() },
    })
    if (!requestStarted.count) {
      const latest = await safelyReadUsableMercadoPagoAccessToken(connection.tenantId, connection.mpUserId)
      return latest ? { kind: 'complete', token: latest } : { kind: 'retry' }
    }

    // From this point on a crash or any exception has an uncertain provider
    // outcome. Persisted marker prevents stale-token takeover after expiry.
    requestMayHaveBeenSent = true
    timeout = setTimeout(() => controller.abort(), REFRESH_REQUEST_TIMEOUT_MS)
    let rotatedTokens: { accessToken: string; refreshToken: string; expiresAt: Date }
    try {
      const response = await fetch('https://api.mercadopago.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!response.ok) throw new Error('Mercado Pago refresh outcome is uncertain')

      const result = await response.json() as {
        access_token?: unknown
        refresh_token?: unknown
        expires_in?: unknown
        user_id?: unknown
        scope?: unknown
      }
      if (
        typeof result.access_token !== 'string' || !result.access_token ||
        typeof result.refresh_token !== 'string' || !result.refresh_token ||
        (result.user_id !== undefined && String(result.user_id) !== connection.mpUserId) ||
        typeof result.expires_in !== 'number' || !Number.isFinite(result.expires_in) || result.expires_in <= 0 ||
        typeof result.scope !== 'string' || !result.scope.split(/\s+/).includes('offline_access')
      ) throw new Error('Mercado Pago refresh response is invalid')

      rotatedTokens = {
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        expiresAt: new Date(Date.now() + result.expires_in * 1000),
      }
    } catch {
      await requireMercadoPagoReauthorization(connection, leaseToken)
      return {
        kind: 'complete',
        token: await safelyReadUsableMercadoPagoAccessToken(connection.tenantId, connection.mpUserId),
      }
    }

    return await persistRotatedMercadoPagoTokens(connection, leaseToken, rotatedTokens)
  } catch {
    if (requestMayHaveBeenSent) {
      await requireMercadoPagoReauthorization(connection, leaseToken)
      return {
        kind: 'complete',
        token: await safelyReadUsableMercadoPagoAccessToken(connection.tenantId, connection.mpUserId),
      }
    }
    return { kind: 'complete', token: null }
  } finally {
    if (timeout) clearTimeout(timeout)
    if (!requestMayHaveBeenSent) await releaseMercadoPagoRefreshLease(connection, leaseToken)
  }
}

async function refreshMercadoPagoAccessToken(tenantId: string) {
  const credentials = getMercadoPagoAppCredentials()
  if (!credentials) return null

  let recoveryDeadline = 0
  let recoveryAttempts = 0
  let recoveryBackoffMs = REFRESH_RECOVERY_INITIAL_BACKOFF_MS

  for (;;) {
    const connection = await db.mercadoPagoConnection.findUnique({ where: { tenantId } })
    if (!connection || connection.status !== 'connected') return null
    const usableToken = usableTokenFromConnection(connection, connection.mpUserId)
    if (usableToken) return usableToken

    const now = new Date()
    if (connection.refreshRequestStartedAt) {
      const leaseIsActive = Boolean(
        connection.refreshLeaseToken && connection.refreshLeaseExpiresAt &&
        connection.refreshLeaseExpiresAt > now,
      )
      if (!leaseIsActive) {
        if (!recoveryDeadline) recoveryDeadline = Date.now() + REFRESH_RECOVERY_RETRY_DEADLINE_MS
        const recovered = await recoverExpiredUncertainRefresh(connection, now)
        if (recovered) return null

        recoveryAttempts += 1
        const remainingMs = recoveryDeadline - Date.now()
        if (recoveryAttempts >= REFRESH_RECOVERY_MAX_ATTEMPTS || remainingMs <= 0) {
          throw new MercadoPagoTemporaryUnavailableError()
        }

        const jitteredBackoffMs = Math.max(
          1,
          Math.floor(recoveryBackoffMs * (0.75 + Math.random() * 0.5)),
        )
        await new Promise((resolve) => setTimeout(resolve, Math.min(jitteredBackoffMs, remainingMs)))
        recoveryBackoffMs = Math.min(recoveryBackoffMs * 2, REFRESH_RECOVERY_MAX_BACKOFF_MS)
        continue
      }

      recoveryDeadline = 0
      recoveryAttempts = 0
      recoveryBackoffMs = REFRESH_RECOVERY_INITIAL_BACKOFF_MS
      const leaseWait = Math.max(
        25,
        Math.min(REFRESH_CONTENTION_POLL_MS, connection.refreshLeaseExpiresAt!.getTime() - Date.now()),
      )
      await new Promise((resolve) => setTimeout(resolve, leaseWait))
      continue
    }

    const leaseToken = randomBytes(32).toString('base64url')
    const acquired = await db.mercadoPagoConnection.updateMany({
      where: {
        id: connection.id,
        tenantId,
        status: 'connected',
        refreshTokenEncrypted: connection.refreshTokenEncrypted,
        refreshRequestStartedAt: null,
        OR: [
          { refreshLeaseToken: null },
          { refreshLeaseExpiresAt: null },
          { refreshLeaseExpiresAt: { lte: now } },
        ],
      },
      data: {
        refreshLeaseToken: leaseToken,
        refreshLeaseExpiresAt: new Date(now.getTime() + REFRESH_LEASE_MS),
      },
    })
    if (acquired.count) {
      const result = await refreshUnderMercadoPagoLease(
        connection,
        leaseToken,
        credentials.clientId,
        credentials.clientSecret,
      )
      if (result.kind === 'complete') return result.token
      continue
    }

    // Another instance owns the lease. Re-read rather than reporting the
    // connection as unavailable; an expired lease is safely claimable above.
    const leaseWait = connection.refreshLeaseExpiresAt
      ? Math.max(25, Math.min(REFRESH_CONTENTION_POLL_MS, connection.refreshLeaseExpiresAt.getTime() - Date.now()))
      : REFRESH_CONTENTION_POLL_MS
    await new Promise((resolve) => setTimeout(resolve, leaseWait))
  }
}

export async function getMercadoPagoAccessToken(tenantId: string) {
  const connection = await db.mercadoPagoConnection.findUnique({ where: { tenantId } })
  if (!connection || connection.status !== 'connected') return null

  if (connection.expiresAt.getTime() > Date.now() + TOKEN_REFRESH_SKEW_MS) {
    try {
      return {
        accessToken: decryptMercadoPagoSecret(connection.accessTokenEncrypted),
        mpUserId: connection.mpUserId,
      }
    } catch {
      return null
    }
  }

  const currentRefresh = refreshesInProcess.get(tenantId)
  if (currentRefresh) return currentRefresh

  const refresh = refreshMercadoPagoAccessToken(tenantId)
  refreshesInProcess.set(tenantId, refresh)
  try {
    return await refresh
  } finally {
    if (refreshesInProcess.get(tenantId) === refresh) refreshesInProcess.delete(tenantId)
  }
}
