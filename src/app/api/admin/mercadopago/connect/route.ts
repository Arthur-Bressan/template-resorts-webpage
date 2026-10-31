import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireCompanyAdmin } from '@/lib/admin-auth'
import {
  createMercadoPagoCodeChallenge,
  createMercadoPagoCodeVerifier,
  encryptMercadoPagoSecret,
  getMercadoPagoAppCredentials,
  hashMercadoPagoOAuthState,
} from '@/lib/mercadopago'
import { db } from '@/lib/db'
import { getTenantFromHost } from '@/lib/tenant-context'

function isValidRedirectUri(value: string) {
  try {
    const url = new URL(value)
    return (
      !url.username &&
      !url.password &&
      url.pathname === '/api/admin/mercadopago/callback' &&
      !url.search &&
      !url.hash &&
      (url.protocol === 'https:' || (process.env.NODE_ENV === 'development' && url.hostname === 'localhost'))
    )
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin, tenantId } = await requireCompanyAdmin()
    const tenant = await getTenantFromHost(request.headers.get('host'))
    if (!tenant || tenant.id !== tenantId) {
      return NextResponse.json({ error: 'Hospedagem não encontrada.' }, { status: 403 })
    }
    const credentials = getMercadoPagoAppCredentials()
    if (!credentials || !isValidRedirectUri(credentials.redirectUri)) {
      return NextResponse.json(
        { error: 'Conexão com Mercado Pago não está configurada.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const state = randomBytes(32).toString('base64url')
    const codeVerifier = createMercadoPagoCodeVerifier()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    const host = request.headers.get('host')!
    const requestUrl = new URL(request.url)
    const returnOrigin = new URL(
      `${process.env.NODE_ENV === 'development' ? requestUrl.protocol : 'https:'}//${host}`,
    ).origin

    await db.mercadoPagoOAuthState.deleteMany({
      where: {
        tenantId,
        OR: [{ expiresAt: { lte: new Date() } }, { consumedAt: { not: null } }],
      },
    })
    await db.mercadoPagoOAuthState.create({
      data: {
        tenantId,
        adminId: admin.id,
        returnOrigin,
        stateHash: hashMercadoPagoOAuthState(state),
        codeVerifierEncrypted: encryptMercadoPagoSecret(codeVerifier),
        expiresAt,
      },
    })

    const authorizationUrl = new URL('https://auth.mercadopago.com/authorization')
    authorizationUrl.searchParams.set('client_id', credentials.clientId)
    authorizationUrl.searchParams.set('response_type', 'code')
    authorizationUrl.searchParams.set('platform_id', 'mp')
    authorizationUrl.searchParams.set('state', state)
    authorizationUrl.searchParams.set('redirect_uri', credentials.redirectUri)
    authorizationUrl.searchParams.set('code_challenge', createMercadoPagoCodeChallenge(codeVerifier))
    authorizationUrl.searchParams.set('code_challenge_method', 'S256')

    return NextResponse.json(
      { authorizationUrl: authorizationUrl.toString() },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Não foi possível iniciar a conexão com o Mercado Pago.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
