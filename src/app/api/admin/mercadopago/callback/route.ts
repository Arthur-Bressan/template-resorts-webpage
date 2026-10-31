import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  decryptMercadoPagoSecret,
  encryptMercadoPagoSecret,
  getMercadoPagoAppCredentials,
  hashMercadoPagoOAuthState,
} from '@/lib/mercadopago'
import { getPlatformBaseDomain } from '@/lib/tenant-context'

function settingsRedirect(origin: string, result: 'connected' | 'cancelled' | 'error') {
  const url = new URL('/admin/settings', origin)
  url.searchParams.set('mercadoPago', result)
  return NextResponse.redirect(url, { headers: { 'Cache-Control': 'no-store' } })
}

function fallbackSettingsRedirect(redirectUri: string, result: 'connected' | 'cancelled' | 'error') {
  return settingsRedirect(new URL(redirectUri).origin, result)
}

function validateTenantReturnOrigin(value: string, tenantSlug: string) {
  const baseDomain = getPlatformBaseDomain()
  if (!baseDomain) return null
  try {
    const url = new URL(value)
    const expectedHost = `${tenantSlug}.${baseDomain}`
    const validProtocol = url.protocol === 'https:' || (
      process.env.NODE_ENV === 'development' && url.protocol === 'http:'
    )
    if (
      !validProtocol ||
      url.hostname.toLowerCase() !== expectedHost.toLowerCase() ||
      (process.env.NODE_ENV !== 'development' && url.port !== '') ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash
    ) return null
    return url.origin
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const credentials = getMercadoPagoAppCredentials()
  if (!credentials) {
    return NextResponse.json({ error: 'Conexão com Mercado Pago não está configurada.' }, { status: 503 })
  }

  const query = request.nextUrl.searchParams
  const state = query.get('state') || ''
  const code = query.get('code') || ''
  const authorizationError = query.get('error')
  if (!state) return fallbackSettingsRedirect(credentials.redirectUri, 'error')

  try {
    const oauthState = await db.mercadoPagoOAuthState.findUnique({
      where: { stateHash: hashMercadoPagoOAuthState(state) },
    })
    if (!oauthState) return fallbackSettingsRedirect(credentials.redirectUri, 'error')

    const tenant = await db.company.findUnique({
      where: { id: oauthState.tenantId },
      select: { slug: true, status: true },
    })
    const returnOrigin = tenant ? validateTenantReturnOrigin(oauthState.returnOrigin, tenant.slug) : null
    if (!returnOrigin) return fallbackSettingsRedirect(credentials.redirectUri, 'error')

    const now = new Date()
    if (oauthState.consumedAt || oauthState.expiresAt <= now) {
      return settingsRedirect(returnOrigin, 'error')
    }

    const claimed = await db.mercadoPagoOAuthState.updateMany({
      where: { id: oauthState.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    })
    if (claimed.count !== 1) return settingsRedirect(returnOrigin, 'error')

    const memberships = await db.companyMembership.findMany({
      where: { adminId: oauthState.adminId },
      select: { tenantId: true, role: true, tenant: { select: { status: true } } },
    })
    const tenantMembershipCount = await db.companyMembership.count({ where: { tenantId: oauthState.tenantId } })
    const stillAuthorized = memberships.length === 1 &&
      memberships[0].tenantId === oauthState.tenantId &&
      memberships[0].role === 'admin' &&
      memberships[0].tenant.status === 'active' && tenant?.status === 'active' &&
      tenantMembershipCount === 1
    if (!stillAuthorized) return settingsRedirect(returnOrigin, 'error')
    if (authorizationError) return settingsRedirect(returnOrigin, 'cancelled')
    if (!code) return settingsRedirect(returnOrigin, 'error')

    const codeVerifier = decryptMercadoPagoSecret(oauthState.codeVerifierEncrypted)
    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: credentials.redirectUri,
        code_verifier: codeVerifier,
      }),
      cache: 'no-store',
    })
    if (!tokenResponse.ok) return settingsRedirect(returnOrigin, 'error')

    const tokens = await tokenResponse.json() as {
      access_token?: unknown
      refresh_token?: unknown
      expires_in?: unknown
      user_id?: unknown
      scope?: unknown
    }
    if (
      typeof tokens.access_token !== 'string' || !tokens.access_token ||
      typeof tokens.refresh_token !== 'string' || !tokens.refresh_token ||
      (typeof tokens.user_id !== 'string' && typeof tokens.user_id !== 'number') ||
      typeof tokens.expires_in !== 'number' || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0 ||
      typeof tokens.scope !== 'string' || !tokens.scope.split(/\s+/).includes('offline_access')
    ) return settingsRedirect(returnOrigin, 'error')

    const mpUserId = String(tokens.user_id)
    const nowConnected = new Date()
    await db.mercadoPagoConnection.upsert({
      where: { tenantId: oauthState.tenantId },
      create: {
        tenantId: oauthState.tenantId,
        mpUserId,
        accessTokenEncrypted: encryptMercadoPagoSecret(tokens.access_token),
        refreshTokenEncrypted: encryptMercadoPagoSecret(tokens.refresh_token),
        expiresAt: new Date(nowConnected.getTime() + tokens.expires_in * 1000),
        refreshLeaseToken: null,
        refreshLeaseExpiresAt: null,
        refreshRequestStartedAt: null,
        status: 'connected',
        connectedAt: nowConnected,
      },
      update: {
        mpUserId,
        accessTokenEncrypted: encryptMercadoPagoSecret(tokens.access_token),
        refreshTokenEncrypted: encryptMercadoPagoSecret(tokens.refresh_token),
        expiresAt: new Date(nowConnected.getTime() + tokens.expires_in * 1000),
        refreshLeaseToken: null,
        refreshLeaseExpiresAt: null,
        refreshRequestStartedAt: null,
        status: 'connected',
        connectedAt: nowConnected,
      },
    })

    return settingsRedirect(returnOrigin, 'connected')
  } catch {
    return fallbackSettingsRedirect(credentials.redirectUri, 'error')
  }
}
