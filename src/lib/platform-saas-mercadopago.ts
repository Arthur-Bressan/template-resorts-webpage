import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export type MercadoPagoResource = Record<string, unknown>

type PlatformSaasSubscriptionConfig = {
  companyId: string
  companyName: string
  payerEmail: string
  externalReference: string
  internalSubscriptionId: string
  monthlyAmountCents: number
  trialDays: number
}

export type CreatedPlatformPreapproval = {
  id: string
  initPoint: string
  externalReference: string
  collectorId: string | null
  status: string
  nextPaymentDate: Date | null
  modifiedAt: Date | null
}

function requirePlatformSaasAccessToken() {
  const token = process.env.PLATFORM_SAAS_MERCADO_PAGO_ACCESS_TOKEN?.trim()
  if (!token) throw new Error('Platform SaaS Mercado Pago access token is not configured')
  return token
}

export function getPlatformPublicOrigin() {
  const value = process.env.PLATFORM_PUBLIC_ORIGIN?.trim()
  if (!value) return null
  try {
    const url = new URL(value)
    const localDevelopment = process.env.NODE_ENV === 'development' &&
      ['localhost', '127.0.0.1'].includes(url.hostname)
    if (
      (url.protocol !== 'https:' && !(localDevelopment && url.protocol === 'http:')) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash
    ) return null
    return url.origin
  } catch {
    return null
  }
}

export function isMercadoPagoHostedCheckoutUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' &&
      !url.username && !url.password &&
      /(^|\.)mercadopago\.com(\.br)?$/i.test(url.hostname)
  } catch {
    return false
  }
}

async function platformSaasRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requirePlatformSaasAccessToken()}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })
  if (!response.ok) {
    const error = new Error(`Mercado Pago SaaS request failed with ${response.status}`) as Error & { statusCode: number }
    error.statusCode = response.status
    throw error
  }
  return response.json() as Promise<MercadoPagoResource>
}

function providerDate(value: unknown) {
  if (typeof value !== 'string') return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time) : null
}

function providerId(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  const id = String(value)
  return /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : ''
}

export async function createPendingPlatformPreapproval(input: PlatformSaasSubscriptionConfig) {
  const origin = getPlatformPublicOrigin()
  if (!origin) throw new Error('Canonical platform public origin is not configured')

  const returnUrl = new URL('/platform/subscriptions', origin)
  returnUrl.searchParams.set('companyId', input.companyId)
  returnUrl.searchParams.set('checkout', 'return')

  const autoRecurring: Record<string, unknown> = {
    frequency: 1,
    frequency_type: 'months',
    transaction_amount: input.monthlyAmountCents / 100,
    currency_id: 'BRL',
  }
  if (input.trialDays > 0) {
    autoRecurring.free_trial = { frequency: input.trialDays, frequency_type: 'days' }
  }

  const response = await platformSaasRequest('/preapproval', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': `platform-saas-subscription-${input.internalSubscriptionId}` },
    body: JSON.stringify({
      reason: `Assinatura da plataforma - ${input.companyName}`,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      auto_recurring: autoRecurring,
      back_url: returnUrl.toString(),
      status: 'pending',
    }),
  })

  const id = providerId(response.id)
  const initPoint = typeof response.init_point === 'string' ? response.init_point : ''
  const externalReference = typeof response.external_reference === 'string'
    ? response.external_reference
    : ''
  if (
    !id || !externalReference || externalReference !== input.externalReference ||
    !initPoint || !isMercadoPagoHostedCheckoutUrl(initPoint)
  ) {
    throw new Error('Mercado Pago returned an invalid hosted subscription checkout')
  }

  return {
    id,
    initPoint,
    externalReference,
    collectorId: providerId(response.collector_id) || null,
    status: typeof response.status === 'string' ? response.status : 'pending',
    nextPaymentDate: providerDate(response.next_payment_date),
    modifiedAt: providerDate(response.last_modified),
  } satisfies CreatedPlatformPreapproval
}

export async function getPlatformPreapproval(id: string) {
  return platformSaasRequest(`/preapproval/${encodeURIComponent(id)}`)
}

export async function cancelPlatformPreapproval(id: string) {
  return platformSaasRequest(`/preapproval/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'canceled' }),
  })
}

export async function getPlatformAuthorizedPayment(id: string) {
  return platformSaasRequest(`/authorized_payments/${encodeURIComponent(id)}`)
}

export async function getPlatformPayment(id: string) {
  return platformSaasRequest(`/v1/payments/${encodeURIComponent(id)}`)
}

export async function searchPlatformAuthorizedPaymentsByPaymentId(paymentId: string) {
  const query = new URLSearchParams({ payment_id: paymentId })
  const response = await platformSaasRequest(`/authorized_payments/search?${query.toString()}`)
  return Array.isArray(response.results) ? response.results as MercadoPagoResource[] : []
}

export function validatePlatformSaasWebhookSignature(
  headers: Headers,
  dataId: string,
) {
  const secret = process.env.PLATFORM_SAAS_MERCADO_PAGO_WEBHOOK_SECRET?.trim()
  const signature = headers.get('x-signature')
  const requestId = headers.get('x-request-id')
  if (!secret || !signature || !requestId) return false

  const parts = new Map<string, string>()
  for (const part of signature.split(',')) {
    const separator = part.indexOf('=')
    if (separator >= 0) {
      parts.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim())
    }
  }
  const timestamp = parts.get('ts')
  const receivedHash = parts.get('v1')
  if (!timestamp || !/^\d+$/.test(timestamp) || !receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) {
    return false
  }

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`
  const expectedHash = createHmac('sha256', secret).update(manifest).digest()
  const suppliedHash = Buffer.from(receivedHash, 'hex')
  return suppliedHash.length === expectedHash.length && timingSafeEqual(suppliedHash, expectedHash)
}

/** Stable identity for the signed delivery; body.id and body.type are not signed. */
export function getPlatformSaasWebhookEventId(headers: Headers, dataId: string) {
  const requestId = headers.get('x-request-id')
  const signature = headers.get('x-signature')
  if (!requestId || !signature) return null

  const parts = new Map<string, string>()
  for (const part of signature.split(',')) {
    const separator = part.indexOf('=')
    if (separator >= 0) {
      parts.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim())
    }
  }
  const timestamp = parts.get('ts')
  if (!timestamp || !/^\d+$/.test(timestamp)) return null

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`
  return createHash('sha256').update(manifest).digest('hex')
}

export function parseProviderDate(value: unknown) {
  return providerDate(value)
}

export function parseProviderId(value: unknown) {
  return providerId(value)
}
