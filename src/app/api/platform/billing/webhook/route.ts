import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'
import {
  cancelPlatformPreapproval,
  getPlatformAuthorizedPayment,
  getPlatformPayment,
  getPlatformPreapproval,
  getPlatformSaasWebhookEventId,
  parseProviderDate,
  parseProviderId,
  searchPlatformAuthorizedPaymentsByPaymentId,
  validatePlatformSaasWebhookSignature,
  type MercadoPagoResource,
} from '@/lib/platform-saas-mercadopago'
import { createCompanySubscriptionNotice, emailCompanySubscriptionNotice } from '@/lib/platform-subscription-notifications'

type BillingNotice = { tenantId: string; title: string; message: string }

function hasPrismaCode(error: unknown, code: string) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function cents(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) && amount >= 0 ? Math.round((amount + Number.EPSILON) * 100) : null
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function addCalendarMonth(date: Date) {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  const nextMonth = new Date(Date.UTC(year, month + 1, 1, date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()))
  const lastDay = new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0)).getUTCDate()
  nextMonth.setUTCDate(Math.min(day, lastDay))
  return nextMonth
}

function effectiveAccessUntil(subscription: {
  status: string
  cancelAtPeriodEnd: boolean
  trialEndsAt: Date | null
  currentPeriodEndsAt: Date | null
  graceEndsAt: Date | null
  nextBillingAt: Date | null
  accessUntilAt: Date | null
}, now: Date) {
  const boundaries = subscription.status === 'trialing'
    ? [subscription.trialEndsAt, subscription.currentPeriodEndsAt, subscription.accessUntilAt, subscription.graceEndsAt]
    : subscription.status === 'past_due'
      ? [subscription.trialEndsAt, subscription.currentPeriodEndsAt, subscription.accessUntilAt, subscription.graceEndsAt]
      : subscription.status === 'cancel_scheduled' || subscription.cancelAtPeriodEnd
        ? [subscription.accessUntilAt]
        : subscription.status === 'active'
          ? [subscription.currentPeriodEndsAt, subscription.nextBillingAt, subscription.accessUntilAt]
          : [subscription.currentPeriodEndsAt, subscription.trialEndsAt]
  return boundaries
    .filter((value): value is Date => Boolean(value && value.getTime() > now.getTime()))
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => right.getTime() - left.getTime())[0] ?? now
}

function latestFutureDate(values: Array<Date | null | undefined>, now: Date) {
  return values
    .filter((value): value is Date => Boolean(value && value.getTime() > now.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())[0] ?? now
}

async function cancelAndConfirmPreapproval(preapprovalId: string, externalReference: string) {
  const current = await getPlatformPreapproval(preapprovalId)
  if (
    parseProviderId(current.id) !== preapprovalId ||
    current.external_reference !== externalReference
  ) throw new Error('Current preapproval cannot be reconciled to the company subscription')

  if (current.status === 'canceled' || current.status === 'cancelled') return

  try {
    await cancelPlatformPreapproval(preapprovalId)
  } catch {
    // The provider may have accepted the cancellation before its response was lost.
  }

  const confirmed = await getPlatformPreapproval(preapprovalId)
  if (
    parseProviderId(confirmed.id) !== preapprovalId ||
    confirmed.external_reference !== externalReference ||
    (confirmed.status !== 'canceled' && confirmed.status !== 'cancelled')
  ) throw new Error('Current preapproval cancellation was not confirmed')
}

async function applyPreapproval(input: {
  eventId: string
  resourceId: string
  topic: string
  provider: MercadoPagoResource
}): Promise<BillingNotice | null> {
  const providerId = parseProviderId(input.provider.id)
  const externalReference = text(input.provider.external_reference)
  const providerStatus = text(input.provider.status)
  if (providerId !== input.resourceId || !externalReference || !providerStatus) {
    throw new Error('Mercado Pago preapproval resource could not be authoritatively identified')
  }

  const currentAssociationSelect = {
    id: true,
    tenantId: true,
    providerExternalReference: true,
    checkoutExternalReference: true,
    providerCollectorId: true,
    providerModifiedAt: true,
    monthlyAmountCents: true,
    trialDays: true,
    status: true,
    trialEndsAt: true,
    currentPeriodEndsAt: true,
    nextBillingAt: true,
    graceEndsAt: true,
    cancelAtPeriodEnd: true,
    accessUntilAt: true,
  } as const
  let local = await db.companySubscription.findUnique({
    where: { providerPreapprovalId: providerId },
    select: currentAssociationSelect,
  })
  if (!local) {
    const historical = await db.platformSubscriptionPreapproval.findUnique({
      where: { providerPreapprovalId: providerId },
      select: {
        tenantId: true,
        subscriptionId: true,
        providerExternalReference: true,
        providerCollectorId: true,
      },
    })
    if (!historical) {
      if (externalReference.startsWith('company:')) {
        throw new Error('SaaS preapproval has no current or historical local contract association')
      }
      return null
    }
    if (
      !historical.providerExternalReference.startsWith('company:') ||
      externalReference !== historical.providerExternalReference
    ) throw new Error('Historical SaaS preapproval reference does not match its association')
    const historicalCollectorId = parseProviderId(historical.providerCollectorId)
    const providerCollectorId = parseProviderId(input.provider.collector_id)
    if (!historicalCollectorId || providerCollectorId !== historicalCollectorId) {
      throw new Error('Historical SaaS preapproval collector does not match its association')
    }

    local = await db.companySubscription.findUnique({
      where: { id: historical.subscriptionId, tenantId: historical.tenantId },
      select: currentAssociationSelect,
    })
    if (!local) throw new Error('Historical SaaS preapproval has no current subscription row')

    // A history row is ACK-safe only after the contract pointer has moved away
    // from this preapproval. While it remains current, process or retry its real
    // state transition instead of silently treating it as stale.
    const remainsHistorical = await serializableTransaction(async (tx) => {
      const current = await tx.companySubscription.findUnique({
        where: { id: historical.subscriptionId, tenantId: historical.tenantId },
        select: { providerPreapprovalId: true, providerExternalReference: true },
      })
      if (!current) throw new Error('Historical SaaS subscription disappeared before event persistence')
      if (current.providerPreapprovalId === providerId) {
        if (current.providerExternalReference !== historical.providerExternalReference) {
          throw new Error('Current SaaS preapproval has a conflicting historical reference')
        }
        return false
      }

      const persistedHistory = await tx.platformSubscriptionPreapproval.findUnique({
        where: { providerPreapprovalId: providerId },
        select: {
          tenantId: true,
          subscriptionId: true,
          providerExternalReference: true,
          providerCollectorId: true,
        },
      })
      if (
        !persistedHistory || persistedHistory.tenantId !== historical.tenantId ||
        persistedHistory.subscriptionId !== historical.subscriptionId ||
        persistedHistory.providerExternalReference !== historical.providerExternalReference ||
        persistedHistory.providerCollectorId !== historical.providerCollectorId
      ) throw new Error('Historical SaaS preapproval association changed before event persistence')

      const existingEvent = await tx.platformSubscriptionWebhookEvent.findUnique({
        where: { providerEventId: input.eventId },
        select: { tenantId: true, subscriptionId: true, topic: true, resourceId: true },
      })
      if (existingEvent) {
        if (
          existingEvent.tenantId !== historical.tenantId ||
          existingEvent.subscriptionId !== historical.subscriptionId ||
          existingEvent.topic !== input.topic || existingEvent.resourceId !== providerId
        ) throw new Error('Historical webhook event conflicts with its persisted association')
        return true
      }

      await tx.platformSubscriptionWebhookEvent.create({
        data: {
          tenantId: historical.tenantId,
          subscriptionId: historical.subscriptionId,
          providerEventId: input.eventId,
          topic: input.topic,
          resourceId: providerId,
        },
      })
      return true
    })
    if (!remainsHistorical) throw new Error('Preapproval became current while reconciling its status event')
    return null
  }
  if (externalReference !== local.providerExternalReference) {
    if (externalReference.startsWith('company:') || local.providerExternalReference.startsWith('company:')) {
      throw new Error('SaaS preapproval reference does not match its local contract')
    }
    return null
  }
  if (local.checkoutExternalReference) {
    throw new Error('SaaS preapproval is in an unresolved checkout transition')
  }

  const providerCollectorId = parseProviderId(input.provider.collector_id)
  if (local.providerCollectorId && providerCollectorId && local.providerCollectorId !== providerCollectorId) {
    if (externalReference.startsWith('company:')) throw new Error('SaaS preapproval collector does not match its contract')
    return null
  }

  const modifiedAt = parseProviderDate(input.provider.last_modified)
  const now = new Date()
  const cardId = parseProviderId(input.provider.card_id)
  let statusToSave = local.status
  let trialStartedAt = undefined as Date | undefined
  let trialEndsAt = undefined as Date | undefined
  let nextBillingAt = parseProviderDate(input.provider.next_payment_date) ?? undefined
  const providerOccurrence = modifiedAt?.toISOString() ||
    `${providerStatus}:${nextBillingAt?.toISOString() || 'na'}:${cardId || 'no-card'}`
  let accessUntilAt = undefined as Date | undefined
  let cancelAtPeriodEnd = undefined as boolean | undefined
  let notice: BillingNotice | null = null
  let providerStatusToSave = providerStatus
  const retainedPaidThrough = latestFutureDate([
    local.accessUntilAt,
    local.currentPeriodEndsAt,
    local.trialEndsAt,
  ], now)
  const hasRetainedPaidThrough = retainedPaidThrough.getTime() > now.getTime()

  const awaitingCard = ['creating_checkout', 'awaiting_card', 'card_required', 'checkout_unknown'].includes(local.status)
  if (providerStatus === 'authorized' && awaitingCard && cardId) {
    if ((local.trialDays ?? 0) > 0) {
      const trialEnd = parseProviderDate(input.provider.next_payment_date) ?? addDays(now, local.trialDays!)
      statusToSave = 'trialing'
      trialStartedAt = now
      trialEndsAt = trialEnd
      nextBillingAt = trialEnd
      const message = `Seu teste começou. A primeira cobrança de ${((local.monthlyAmountCents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} está prevista para ${trialEnd.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.`
      const noticeCreated = await serializableTransaction(async (tx) => {
        await tx.platformSubscriptionWebhookEvent.create({
          data: {
            tenantId: local.tenantId,
            subscriptionId: local.id,
            providerEventId: input.eventId,
            topic: input.topic,
            resourceId: input.resourceId,
          },
        })
        if (modifiedAt && local.providerModifiedAt && modifiedAt < local.providerModifiedAt) return false
        await tx.companySubscription.update({
          where: {
            id: local.id,
            tenantId: local.tenantId,
            providerPreapprovalId: providerId,
            providerExternalReference: local.providerExternalReference,
            checkoutExternalReference: null,
            status: local.status,
          },
          data: {
            status: statusToSave,
            providerStatus: providerStatusToSave,
            ...(modifiedAt ? { providerModifiedAt: modifiedAt } : {}),
            trialStartedAt,
            trialEndsAt,
            nextBillingAt,
            accessUntilAt: hasRetainedPaidThrough ? retainedPaidThrough : null,
            cancelAtPeriodEnd: false,
            canceledAt: null,
            delinquentAt: null,
            graceEndsAt: null,
          },
        })
        return createCompanySubscriptionNotice({
          tenantId: local.tenantId,
          event: 'subscription.first_charge_scheduled',
          eventKey: `subscription.first_charge_scheduled:${local.id}:${trialEnd.toISOString()}`,
          title: 'Teste da plataforma iniciado',
          message,
          href: '/admin',
          data: { firstChargeAt: trialEnd.toISOString(), amountCents: local.monthlyAmountCents ?? 0 },
        }, tx)
      })
      if (noticeCreated) notice = { tenantId: local.tenantId, title: 'Teste da plataforma iniciado', message }
      return notice
    }

    statusToSave = 'awaiting_payment'
    const firstChargeAt = nextBillingAt ?? now
    const message = `O cartão foi cadastrado. A primeira cobrança de ${((local.monthlyAmountCents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} está prevista para ${firstChargeAt.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.`
    const noticeCreated = await serializableTransaction(async (tx) => {
      await tx.platformSubscriptionWebhookEvent.create({
        data: {
          tenantId: local.tenantId,
          subscriptionId: local.id,
          providerEventId: input.eventId,
          topic: input.topic,
          resourceId: input.resourceId,
        },
      })
      if (modifiedAt && local.providerModifiedAt && modifiedAt < local.providerModifiedAt) return false
      await tx.companySubscription.update({
        where: {
          id: local.id,
          tenantId: local.tenantId,
          providerPreapprovalId: providerId,
          providerExternalReference: local.providerExternalReference,
          checkoutExternalReference: null,
          status: local.status,
        },
        data: {
          status: statusToSave,
          providerStatus: providerStatusToSave,
          ...(modifiedAt ? { providerModifiedAt: modifiedAt } : {}),
          nextBillingAt,
          accessUntilAt: hasRetainedPaidThrough ? retainedPaidThrough : null,
          cancelAtPeriodEnd: hasRetainedPaidThrough,
          canceledAt: null,
          delinquentAt: null,
          graceEndsAt: null,
        },
      })
      return createCompanySubscriptionNotice({
        tenantId: local.tenantId,
        event: 'subscription.first_charge_scheduled',
        eventKey: `subscription.first_charge_scheduled:${local.id}:${firstChargeAt.toISOString()}`,
        title: 'Primeira cobrança programada',
        message,
        href: '/admin',
        data: { firstChargeAt: firstChargeAt.toISOString(), amountCents: local.monthlyAmountCents ?? 0 },
      }, tx)
    })
    if (noticeCreated) notice = { tenantId: local.tenantId, title: 'Primeira cobrança programada', message }
    return notice
  }

  if (providerStatus === 'authorized' && awaitingCard && !cardId) {
    try {
      await cancelPlatformPreapproval(providerId)
      providerStatusToSave = 'canceled_card_required'
      statusToSave = 'card_required'
    } catch {
      throw new Error('Mercado Pago did not cancel a subscription without a card')
    }
    const message = hasRetainedPaidThrough
      ? `O checkout não registrou um cartão. O contrato novo foi cancelado; o acesso já pago continua até ${retainedPaidThrough.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}. Cadastre um cartão antes desse prazo para continuar usando a plataforma.`
      : 'O checkout não registrou um cartão. A assinatura foi cancelada e o acesso continuará bloqueado até o cadastro de um cartão.'
    const noticeCreated = await serializableTransaction(async (tx) => {
      await tx.platformSubscriptionWebhookEvent.create({
        data: {
          tenantId: local.tenantId,
          subscriptionId: local.id,
          providerEventId: input.eventId,
          topic: input.topic,
          resourceId: input.resourceId,
        },
      })
      await tx.companySubscription.update({
        where: {
          id: local.id,
          tenantId: local.tenantId,
          providerPreapprovalId: providerId,
          providerExternalReference: local.providerExternalReference,
          checkoutExternalReference: null,
          status: local.status,
        },
        data: {
          status: statusToSave,
          providerStatus: providerStatusToSave,
          ...(modifiedAt ? { providerModifiedAt: modifiedAt } : {}),
          accessUntilAt: hasRetainedPaidThrough ? retainedPaidThrough : now,
          cancelAtPeriodEnd: hasRetainedPaidThrough,
          canceledAt: now,
          nextBillingAt: null,
        },
      })
      return createCompanySubscriptionNotice({
        tenantId: local.tenantId,
        event: 'subscription.payment_method_required',
        eventKey: `subscription.payment_method_required:${local.id}:${providerOccurrence}`,
        title: 'Cadastre um cartão para iniciar o teste',
        message,
        href: '/admin',
      }, tx)
    })
    if (noticeCreated) notice = { tenantId: local.tenantId, title: 'Cadastre um cartão para iniciar o teste', message }
    return notice
  }

  if (providerStatus === 'canceled' || providerStatus === 'cancelled') {
    const noticeCreated = await serializableTransaction(async (tx) => {
      await tx.platformSubscriptionWebhookEvent.create({
        data: {
          tenantId: local.tenantId,
          subscriptionId: local.id,
          providerEventId: input.eventId,
          topic: input.topic,
          resourceId: input.resourceId,
        },
      })
      const current = await tx.companySubscription.findUnique({
        where: { id: local.id, tenantId: local.tenantId },
        select: {
          providerPreapprovalId: true,
          providerExternalReference: true,
          checkoutExternalReference: true,
          providerModifiedAt: true,
          status: true,
          trialEndsAt: true,
          currentPeriodEndsAt: true,
          graceEndsAt: true,
          nextBillingAt: true,
          lastPaymentAt: true,
          cancelAtPeriodEnd: true,
          accessUntilAt: true,
        },
      })
      if (
        !current || current.providerPreapprovalId !== providerId ||
        current.providerExternalReference !== local.providerExternalReference ||
        current.checkoutExternalReference
      ) throw new Error('Current preapproval changed during cancellation status reconciliation')
      if (modifiedAt && current.providerModifiedAt && modifiedAt < current.providerModifiedAt) return false

      const accessUntilAt = effectiveAccessUntil(current, now)
      const nextStatus = accessUntilAt.getTime() > now.getTime() ? 'cancel_scheduled' : 'restricted'
      const updated = await tx.companySubscription.updateMany({
        where: {
          id: local.id,
          tenantId: local.tenantId,
          providerPreapprovalId: providerId,
          providerExternalReference: local.providerExternalReference,
          checkoutExternalReference: null,
          status: current.status,
          providerModifiedAt: current.providerModifiedAt,
          trialEndsAt: current.trialEndsAt,
          currentPeriodEndsAt: current.currentPeriodEndsAt,
          graceEndsAt: current.graceEndsAt,
          nextBillingAt: current.nextBillingAt,
          lastPaymentAt: current.lastPaymentAt,
          cancelAtPeriodEnd: current.cancelAtPeriodEnd,
          accessUntilAt: current.accessUntilAt,
        },
        data: {
          status: nextStatus,
          providerStatus: providerStatusToSave,
          ...(modifiedAt ? { providerModifiedAt: modifiedAt } : {}),
          ...(nextBillingAt ? { nextBillingAt } : {}),
          accessUntilAt,
          cancelAtPeriodEnd: true,
          canceledAt: now,
        },
      })
      if (!updated.count) throw new Error('Subscription changed while applying canceled preapproval status')

      const changed = nextStatus !== current.status ||
        current.accessUntilAt?.getTime() !== accessUntilAt.getTime() ||
        !current.cancelAtPeriodEnd
      if (!changed) return false

      const event: 'subscription.cancelled' | 'subscription.status_changed' = nextStatus === 'cancel_scheduled'
        ? 'subscription.cancelled'
        : 'subscription.status_changed'
      const title = nextStatus === 'cancel_scheduled'
        ? 'Assinatura cancelada ao fim do período'
        : 'Acesso da plataforma restrito'
      const message = nextStatus === 'cancel_scheduled'
        ? `A renovação foi interrompida. O acesso continua disponível até ${accessUntilAt.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.`
        : 'A assinatura está pausada ou terminou. O site público e as reservas existentes continuam acessíveis; as alterações do CMS e novas reservas estão bloqueadas.'
      const created = await createCompanySubscriptionNotice({
        tenantId: local.tenantId,
        event,
        eventKey: `${event}:${local.id}:${nextStatus}:${providerOccurrence}:${accessUntilAt.toISOString()}`,
        title,
        message,
        href: '/admin',
        data: { status: nextStatus, accessUntilAt: accessUntilAt.toISOString() },
      }, tx)
      return created ? { tenantId: local.tenantId, title, message } : false
    })
    if (noticeCreated && noticeCreated !== false) notice = noticeCreated
    return notice
  }

  if (providerStatus === 'pending' && awaitingCard) statusToSave = 'awaiting_card'
  else if (providerStatus === 'paused') {
    statusToSave = 'restricted'
    accessUntilAt = now
  } else {
    // An old preapproval status event cannot reactivate a delinquent or restricted tenant.
    if (['past_due', 'restricted', 'cancel_scheduled', 'active', 'trialing', 'awaiting_payment'].includes(local.status)) {
      statusToSave = local.status
    }
  }

  const changed = statusToSave !== local.status
  const eventDate = providerOccurrence
  const title = statusToSave === 'cancel_scheduled'
    ? 'Assinatura cancelada ao fim do período'
    : statusToSave === 'restricted'
      ? 'Acesso da plataforma restrito'
      : 'Status da assinatura atualizado'
  const message = statusToSave === 'cancel_scheduled'
    ? `A renovação foi interrompida. O acesso continua disponível até ${accessUntilAt?.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) || 'o fim do período atual'}.`
    : statusToSave === 'restricted'
      ? 'A assinatura está pausada ou terminou. O site público e as reservas existentes continuam acessíveis; as alterações do CMS e novas reservas estão bloqueadas.'
      : `O status da assinatura mudou para ${statusToSave}.`

  const noticeCreated = await serializableTransaction(async (tx) => {
    await tx.platformSubscriptionWebhookEvent.create({
      data: {
        tenantId: local.tenantId,
        subscriptionId: local.id,
        providerEventId: input.eventId,
        topic: input.topic,
        resourceId: input.resourceId,
      },
    })
    if (modifiedAt && local.providerModifiedAt && modifiedAt < local.providerModifiedAt) return false

    await tx.companySubscription.update({
      where: {
        id: local.id,
        tenantId: local.tenantId,
        providerPreapprovalId: providerId,
        providerExternalReference: local.providerExternalReference,
        checkoutExternalReference: null,
        status: local.status,
      },
      data: {
        status: statusToSave,
        providerStatus: providerStatusToSave,
        ...(modifiedAt ? { providerModifiedAt: modifiedAt } : {}),
        ...(nextBillingAt ? { nextBillingAt } : {}),
        ...(accessUntilAt ? { accessUntilAt } : {}),
        ...(cancelAtPeriodEnd !== undefined ? { cancelAtPeriodEnd } : {}),
        ...(cancelAtPeriodEnd ? { canceledAt: now } : {}),
      },
    })
    if (!changed) return false
    const event: 'subscription.cancelled' | 'subscription.status_changed' = statusToSave === 'cancel_scheduled'
      ? 'subscription.cancelled'
      : 'subscription.status_changed'
    return createCompanySubscriptionNotice({
      tenantId: local.tenantId,
      event,
      eventKey: `${event}:${local.id}:${statusToSave}:${eventDate}`,
      title,
      message,
      href: '/admin',
      data: { status: statusToSave },
    }, tx)
  })
  if (noticeCreated && changed) notice = { tenantId: local.tenantId, title, message }
  return notice
}

async function applyAuthorizedPayment(input: {
  eventId: string
  signedResourceId: string
  invoiceId: string
  topic: string
  invoice: MercadoPagoResource
  paymentIdHint?: string
}): Promise<BillingNotice | null> {
  const invoiceId = parseProviderId(input.invoice.id)
  const preapprovalId = parseProviderId(input.invoice.preapproval_id)
  const externalReference = text(input.invoice.external_reference)
  const nestedPayment = isRecord(input.invoice.payment) ? input.invoice.payment : null
  const paymentId = parseProviderId(nestedPayment?.id) || input.paymentIdHint || ''
  const paymentStatus = text(nestedPayment?.status)
  const invoiceStatus = text(input.invoice.status)
  const summarizedStatus = text(input.invoice.summarized)
  const approved = paymentStatus === 'approved' || summarizedStatus === 'processed'
  const failed = paymentStatus === 'rejected' || invoiceStatus === 'recycling' || summarizedStatus === 'rejected'
  if (invoiceId !== input.invoiceId) throw new Error('Mercado Pago invoice ID does not match the resolved invoice')
  if (!preapprovalId || !externalReference) {
    if (approved) throw new Error('Approved Mercado Pago invoice has no preapproval association')
    return null
  }

  const paymentSubscriptionSelect = {
    id: true,
    tenantId: true,
    providerPreapprovalId: true,
    providerExternalReference: true,
    checkoutExternalReference: true,
    providerCollectorId: true,
    monthlyAmountCents: true,
    trialDays: true,
    trialStartedAt: true,
    status: true,
    trialEndsAt: true,
    currentPeriodStartedAt: true,
    currentPeriodEndsAt: true,
    nextBillingAt: true,
    delinquentAt: true,
    graceEndsAt: true,
    cancelAtPeriodEnd: true,
    accessUntilAt: true,
    lastPaymentAt: true,
  } as const
  const contract = await db.platformSubscriptionPreapproval.findUnique({
    where: { providerPreapprovalId: preapprovalId },
    select: {
      tenantId: true,
      subscriptionId: true,
      providerExternalReference: true,
      providerCollectorId: true,
    },
  })
  const local = contract
    ? await db.companySubscription.findUnique({ where: { id: contract.subscriptionId }, select: paymentSubscriptionSelect })
    : await db.companySubscription.findUnique({ where: { providerPreapprovalId: preapprovalId }, select: paymentSubscriptionSelect })
  if (!local) {
    if (approved || externalReference.startsWith('company:')) {
      throw new Error('Mercado Pago SaaS invoice has no local contract history')
    }
    return null
  }
  if (contract && contract.tenantId !== local.tenantId) {
    if (approved || externalReference.startsWith('company:')) throw new Error('Mercado Pago SaaS invoice contract tenant does not match')
    return null
  }
  const associatedExternalReference = contract?.providerExternalReference ?? local.providerExternalReference
  const associatedCollectorId = contract?.providerCollectorId ?? local.providerCollectorId
  if (externalReference !== associatedExternalReference) {
    if (approved || externalReference.startsWith('company:')) throw new Error('Mercado Pago SaaS invoice reference does not match contract history')
    return null
  }

  const preapproval = await getPlatformPreapproval(preapprovalId)
  if (
    parseProviderId(preapproval.id) !== preapprovalId ||
    preapproval.external_reference !== associatedExternalReference
  ) {
    if (approved || externalReference.startsWith('company:')) throw new Error('Mercado Pago SaaS invoice preapproval could not be reconciled')
    return null
  }
  const providerCollectorId = parseProviderId(preapproval.collector_id)
  const providerPreapprovalCanceled = ['canceled', 'cancelled'].includes(text(preapproval.status))
  if (associatedCollectorId && providerCollectorId && associatedCollectorId !== providerCollectorId) {
    if (approved || externalReference.startsWith('company:')) throw new Error('Mercado Pago SaaS invoice collector does not match contract history')
    return null
  }

  const retryAttempt = typeof input.invoice.retry_attempt === 'number' && Number.isSafeInteger(input.invoice.retry_attempt)
    ? input.invoice.retry_attempt
    : null
  const modifiedAt = parseProviderDate(input.invoice.last_modified)
  const debitAt = parseProviderDate(input.invoice.debit_date)
  const amountCents = cents(input.invoice.transaction_amount)
  const currencyId = text(input.invoice.currency_id)
  if (
    !paymentId ||
    (approved && (
      currencyId !== 'BRL' || amountCents === null || local.monthlyAmountCents === null ||
      amountCents !== local.monthlyAmountCents
    )) ||
    (!approved && (
      (currencyId && currencyId !== 'BRL') ||
      (amountCents !== null && local.monthlyAmountCents !== null && amountCents !== local.monthlyAmountCents)
    ))
  ) {
    if (approved) throw new Error('Approved Mercado Pago invoice needs manual reconciliation')
    return null
  }

  const status = approved ? 'approved' : failed ? 'rejected' : paymentStatus || invoiceStatus || 'pending'
  const now = new Date()
  const periodStart = debitAt ?? now
  const providerNextBillingAt = parseProviderDate(preapproval.next_payment_date)
  const periodEnd = providerNextBillingAt && providerNextBillingAt.getTime() > now.getTime()
    ? providerNextBillingAt
    : addCalendarMonth(periodStart)

  const previousPaymentForOrdering = await db.platformSubscriptionPayment.findUnique({
    where: { tenantId_providerInvoiceId: { tenantId: local.tenantId, providerInvoiceId: invoiceId } },
    select: { debitAt: true, providerModifiedAt: true },
  })
  const invoiceOccurrenceForOrdering = debitAt ?? previousPaymentForOrdering?.debitAt ?? modifiedAt ?? previousPaymentForOrdering?.providerModifiedAt
  const olderThanPaidPeriodSnapshot = Boolean(
    local.lastPaymentAt && invoiceOccurrenceForOrdering && invoiceOccurrenceForOrdering.getTime() < local.lastPaymentAt.getTime(),
  ) || Boolean(
    local.currentPeriodStartedAt && invoiceOccurrenceForOrdering && invoiceOccurrenceForOrdering.getTime() < local.currentPeriodStartedAt.getTime(),
  )
  let canceledCurrentPreapprovalId: string | null = null
  if (
    approved && !olderThanPaidPeriodSnapshot && local.providerPreapprovalId &&
    local.providerPreapprovalId !== preapprovalId
  ) {
    if (!local.providerExternalReference) {
      throw new Error('Current preapproval has no external reference for safe cancellation')
    }
    await cancelAndConfirmPreapproval(local.providerPreapprovalId, local.providerExternalReference)
    canceledCurrentPreapprovalId = local.providerPreapprovalId
  }

  const result = await serializableTransaction(async (tx) => {
    await tx.platformSubscriptionWebhookEvent.upsert({
      where: { providerEventId: input.eventId },
      create: {
        tenantId: local.tenantId,
        subscriptionId: local.id,
        providerEventId: input.eventId,
        topic: input.topic,
        resourceId: input.signedResourceId,
      },
      update: { resourceId: input.signedResourceId },
    })

    const current = await tx.companySubscription.findUnique({
      where: { id: local.id, tenantId: local.tenantId },
      select: {
        providerPreapprovalId: true,
        providerExternalReference: true,
        checkoutExternalReference: true,
        monthlyAmountCents: true,
        trialDays: true,
        trialStartedAt: true,
        status: true,
        currentPeriodStartedAt: true,
        currentPeriodEndsAt: true,
        nextBillingAt: true,
        lastPaymentAt: true,
        delinquentAt: true,
        graceEndsAt: true,
        cancelAtPeriodEnd: true,
        accessUntilAt: true,
      },
    })
    if (!current) throw new Error('Subscription disappeared while reconciling an authorized invoice')
    if (
      canceledCurrentPreapprovalId &&
      (current.providerPreapprovalId !== canceledCurrentPreapprovalId ||
        current.providerExternalReference !== local.providerExternalReference)
    ) throw new Error('Current preapproval changed during payment reconciliation')

    const persistedContract = await tx.platformSubscriptionPreapproval.findUnique({
      where: { providerPreapprovalId: preapprovalId },
      select: {
        tenantId: true,
        subscriptionId: true,
        providerExternalReference: true,
        providerCollectorId: true,
      },
    })
    if (persistedContract) {
      if (
        persistedContract.tenantId !== local.tenantId || persistedContract.subscriptionId !== local.id ||
        persistedContract.providerExternalReference !== associatedExternalReference
      ) throw new Error('Preapproval history changed while reconciling an authorized invoice')
    } else if (
      current.providerPreapprovalId !== preapprovalId ||
      current.providerExternalReference !== associatedExternalReference
    ) {
      throw new Error('Approved invoice lost its preapproval history before persistence')
    }

    const previousPayment = await tx.platformSubscriptionPayment.findUnique({
      where: { tenantId_providerInvoiceId: { tenantId: local.tenantId, providerInvoiceId: invoiceId } },
      select: { status: true, retryAttempt: true, providerModifiedAt: true, debitAt: true, createdAt: true },
    })
    if (modifiedAt && previousPayment?.providerModifiedAt && modifiedAt < previousPayment.providerModifiedAt) {
      if (approved && previousPayment.status !== 'approved') {
        throw new Error('Approved invoice version is older than the stored invoice; retry or reconcile manually')
      }
      return { notice: null as BillingNotice | null }
    }

    if (previousPayment?.status === 'approved' && failed) {
      return { notice: null as BillingNotice | null }
    }

    const effectiveModifiedAt = modifiedAt ?? previousPayment?.providerModifiedAt ?? null
    const effectiveDebitAt = debitAt ?? previousPayment?.debitAt ?? null
    const notificationVersion = `${retryAttempt ?? 'na'}:${effectiveModifiedAt?.toISOString() || effectiveDebitAt?.toISOString() || status}`

    await tx.platformSubscriptionPayment.upsert({
      where: { tenantId_providerInvoiceId: { tenantId: local.tenantId, providerInvoiceId: invoiceId } },
      create: {
        tenantId: local.tenantId,
        subscriptionId: local.id,
        providerInvoiceId: invoiceId,
        providerPaymentId: paymentId,
        status,
        summarizedStatus: summarizedStatus || null,
        amountCents,
        currencyId: currencyId || 'BRL',
        retryAttempt,
        providerModifiedAt: effectiveModifiedAt,
        debitAt: effectiveDebitAt,
        paidAt: approved ? now : null,
      },
      update: {
        providerPaymentId: paymentId,
        status,
        summarizedStatus: summarizedStatus || null,
        amountCents,
        currencyId: currencyId || 'BRL',
        retryAttempt,
        providerModifiedAt: effectiveModifiedAt,
        debitAt: effectiveDebitAt,
        ...(approved && previousPayment?.status !== 'approved' ? { paidAt: now } : {}),
      },
    })

    const invoiceOccurrenceAt = effectiveDebitAt ?? effectiveModifiedAt
    const invoiceObservedBeforePayment = Boolean(
      current.lastPaymentAt && previousPayment?.createdAt &&
      previousPayment.createdAt.getTime() < current.lastPaymentAt.getTime() &&
      !(debitAt && current.currentPeriodStartedAt && debitAt.getTime() >= current.currentPeriodStartedAt.getTime()),
    )
    const olderThanCurrentPaidPeriod = Boolean(
      current.lastPaymentAt && invoiceOccurrenceAt && invoiceOccurrenceAt.getTime() < current.lastPaymentAt.getTime(),
    ) || Boolean(
      current.currentPeriodStartedAt && invoiceOccurrenceAt && invoiceOccurrenceAt.getTime() < current.currentPeriodStartedAt.getTime(),
    ) || Boolean(
      current.lastPaymentAt && !invoiceOccurrenceAt && current.currentPeriodEndsAt &&
      periodEnd.getTime() <= current.currentPeriodEndsAt.getTime(),
    ) || invoiceObservedBeforePayment
    const isCurrentPreapproval = current.providerPreapprovalId === preapprovalId &&
      current.providerExternalReference === associatedExternalReference

    // The replacement checkout can be committed after the initial snapshot above.
    // Do not ACK this payment against the old contract while leaving a newly linked
    // replacement able to renew. Roll back the event/invoice and let the provider
    // retry; the next delivery will observe and cancel the replacement first.
    if (
      approved && !olderThanCurrentPaidPeriod && current.providerPreapprovalId &&
      !isCurrentPreapproval && !canceledCurrentPreapprovalId
    ) throw new Error('Current preapproval changed during payment reconciliation; retry to cancel it')

    if (olderThanCurrentPaidPeriod) {
      if (!canceledCurrentPreapprovalId) return { notice: null as BillingNotice | null }

      const canceledAt = new Date()
      const accessUntilAt = latestFutureDate([
        current.status === 'trialing' ? current.trialEndsAt : null,
        current.currentPeriodEndsAt,
        current.cancelAtPeriodEnd ? current.accessUntilAt : null,
      ], canceledAt)
      const canceledStatus = accessUntilAt.getTime() > canceledAt.getTime() ? 'cancel_scheduled' : 'restricted'
      const updated = await tx.companySubscription.updateMany({
        where: {
          id: local.id,
          tenantId: local.tenantId,
          providerPreapprovalId: canceledCurrentPreapprovalId,
          providerExternalReference: current.providerExternalReference,
          status: current.status,
          currentPeriodEndsAt: current.currentPeriodEndsAt,
          lastPaymentAt: current.lastPaymentAt,
        },
        data: {
          status: canceledStatus,
          cancelAtPeriodEnd: true,
          canceledAt,
          accessUntilAt,
          nextBillingAt: null,
          providerStatus: 'canceled',
        },
      })
      if (!updated.count) throw new Error('Subscription changed while canceling a replacement contract')
      const title = 'Contrato substituto cancelado durante a conciliação'
      const message = `Uma fatura anterior já estava paga. Para evitar uma nova cobrança, o contrato substituto foi cancelado; o acesso continua até ${accessUntilAt.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.`
      const noticeCreated = await createCompanySubscriptionNotice({
        tenantId: local.tenantId,
        event: 'subscription.cancelled',
        eventKey: `subscription.cancelled:duplicate-contract:${canceledCurrentPreapprovalId}:${invoiceId}:${accessUntilAt.toISOString()}`,
        title,
        message,
        href: '/admin',
        data: { invoiceId, accessUntilAt: accessUntilAt.toISOString() },
      }, tx)
      return { notice: noticeCreated ? { tenantId: local.tenantId, title, message } : null }
    }

    if (approved) {
      const wasRestricted = ['past_due', 'restricted', 'awaiting_payment', 'trialing', 'creating_checkout', 'checkout_unknown', 'checkout_failed'].includes(current.status)
      // The checkout route sets this reference only after canceling and confirming
      // the previous preapproval. Until the replacement is durably linked, keep
      // the paid access period without claiming that recurring billing is active.
      const currentContractCanceled = Boolean(canceledCurrentPreapprovalId) ||
        (isCurrentPreapproval && providerPreapprovalCanceled) ||
        Boolean(current.checkoutExternalReference) ||
        !current.providerPreapprovalId
      const cancelAtPeriodEnd = currentContractCanceled || (!isCurrentPreapproval && current.cancelAtPeriodEnd)
      const extendsCurrentPeriod = !current.currentPeriodEndsAt || periodEnd.getTime() >= current.currentPeriodEndsAt.getTime()
      const currentPeriodStartedAt = extendsCurrentPeriod ? periodStart : current.currentPeriodStartedAt
      const currentPeriodEndsAt = extendsCurrentPeriod ? periodEnd : current.currentPeriodEndsAt
      const accessUntilAt = cancelAtPeriodEnd
        ? latestFutureDate([
            current.status === 'trialing' ? current.trialEndsAt : null,
            current.currentPeriodEndsAt,
            periodEnd,
            current.cancelAtPeriodEnd ? current.accessUntilAt : null,
          ], now)
        : null
      const statusAfterPayment = cancelAtPeriodEnd
        ? accessUntilAt!.getTime() > now.getTime() ? 'cancel_scheduled' : 'restricted'
        : 'active'
      await tx.companySubscription.update({
        where: { id: local.id, tenantId: local.tenantId },
        data: {
          status: statusAfterPayment,
          currentPeriodStartedAt,
          currentPeriodEndsAt,
          nextBillingAt: cancelAtPeriodEnd
            ? null
            : isCurrentPreapproval
              ? providerNextBillingAt ?? currentPeriodEndsAt
              : current.nextBillingAt ?? currentPeriodEndsAt,
          lastPaymentAt: now,
          delinquentAt: null,
          graceEndsAt: null,
          cancelAtPeriodEnd,
          accessUntilAt,
          ...(currentContractCanceled ? { canceledAt: now, providerStatus: 'canceled' } : {}),
        },
      })
      if (!wasRestricted && !currentContractCanceled) return { notice: null }
      const title = canceledCurrentPreapprovalId
        ? 'Pagamento conciliado; contrato substituto cancelado'
        : currentContractCanceled
          ? 'Pagamento conciliado; renovação encerrada'
          : 'Assinatura regularizada'
      const pendingCheckoutNote = current.checkoutExternalReference
        ? ' A tentativa de checkout substituto ainda precisa de conciliação pela equipe da plataforma.'
        : ''
      const message = currentContractCanceled
        ? `O pagamento da fatura foi aprovado. O contrato associado não está ativo para novas cobranças; o acesso pago permanece até ${accessUntilAt!.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.`
        : `O pagamento foi aprovado. O acesso da hospedagem foi regularizado até ${currentPeriodEndsAt!.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.`
      const completeMessage = currentContractCanceled ? `${message}${pendingCheckoutNote}` : message
      const noticeCreated = await createCompanySubscriptionNotice({
        tenantId: local.tenantId,
        event: currentContractCanceled ? 'subscription.cancelled' : 'subscription.reactivated',
        eventKey: `${currentContractCanceled ? 'subscription.cancelled' : 'subscription.reactivated'}:${invoiceId}:${notificationVersion}`,
        title,
        message: completeMessage,
        href: '/admin',
        data: { invoiceId, paymentId, accessUntilAt: (accessUntilAt ?? currentPeriodEndsAt)!.toISOString() },
      }, tx)
      return { notice: noticeCreated ? { tenantId: local.tenantId, title, message: completeMessage } : null }
    }

    const failureOccurrenceChanged = failed && (
      previousPayment?.status !== status ||
      previousPayment?.retryAttempt !== retryAttempt ||
      previousPayment?.providerModifiedAt?.getTime() !== effectiveModifiedAt?.getTime()
    )
    if (!failed) return { notice: null }
    if (!isCurrentPreapproval || providerPreapprovalCanceled || current.checkoutExternalReference) {
      return { notice: null }
    }

    const awaitingFirstCharge = current.status === 'awaiting_payment' &&
      current.trialDays === 0 && !current.trialStartedAt &&
      !current.lastPaymentAt && !current.currentPeriodEndsAt
    const graceEndsAt = awaitingFirstCharge ? null : current.graceEndsAt ?? addDays(now, 3)
    const nextStatus = awaitingFirstCharge
      ? 'awaiting_payment'
      : current.cancelAtPeriodEnd
        ? (current.accessUntilAt && current.accessUntilAt.getTime() > now.getTime() ? 'cancel_scheduled' : 'restricted')
        : current.status === 'restricted' ? 'restricted' : 'past_due'
    const delinquentAt = awaitingFirstCharge ? null : current.delinquentAt ?? now
    await tx.companySubscription.update({
      where: { id: local.id, tenantId: local.tenantId },
      data: {
        status: nextStatus,
        delinquentAt,
        graceEndsAt,
        nextBillingAt: providerNextBillingAt ?? current.nextBillingAt,
      },
    })
    if (!failureOccurrenceChanged) return { notice: null }

    const title = awaitingFirstCharge ? 'Primeira cobrança não aprovada' : 'Falha na cobrança da assinatura'
    const message = awaitingFirstCharge
      ? `A primeira cobrança de ${((amountCents ?? current.monthlyAmountCents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} não foi aprovada. O acesso ao CMS e a criação de novas reservas permanecem bloqueados até a confirmação do pagamento. Atualize o método de pagamento no checkout ou fale com a equipe da plataforma para obter ajuda.`
      : current.cancelAtPeriodEnd
        ? `Não foi possível aprovar uma cobrança de ${((amountCents ?? current.monthlyAmountCents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. A renovação já está cancelada e o acesso termina em ${current.accessUntilAt?.toLocaleString('pt-BR', { timeZone: 'UTC' }) || 'imediatamente'}.`
        : `Não foi possível aprovar uma cobrança de ${((amountCents ?? current.monthlyAmountCents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Atualize o cartão ou fale com a equipe até ${graceEndsAt!.toLocaleString('pt-BR', { timeZone: 'UTC' })}; o acesso será restrito após 72 horas sem pagamento.`
    const noticeCreated = await createCompanySubscriptionNotice({
      tenantId: local.tenantId,
      event: 'subscription.payment_failed',
      eventKey: `subscription.payment_failed:${invoiceId}:${notificationVersion}`,
      title,
      message,
      href: '/admin',
      data: {
        invoiceId,
        paymentId,
        retryAttempt: retryAttempt ?? 0,
        ...(graceEndsAt ? { graceEndsAt: graceEndsAt.toISOString() } : {}),
      },
    }, tx)
    return { notice: noticeCreated ? { tenantId: local.tenantId, title, message } : null }
  })
  return result.notice
}

export async function POST(request: NextRequest) {
  const requestedDataId = request.nextUrl.searchParams.get('data.id') || ''
  if (!requestedDataId || !/^[A-Za-z0-9_-]{1,128}$/.test(requestedDataId)) {
    return NextResponse.json({ error: 'Notificação inválida' }, { status: 400 })
  }
  if (!process.env.PLATFORM_SAAS_MERCADO_PAGO_WEBHOOK_SECRET?.trim()) {
    return NextResponse.json({ error: 'Webhook SaaS não configurado' }, { status: 503 })
  }
  if (!validatePlatformSaasWebhookSignature(request.headers, requestedDataId)) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    const parsed = await request.json()
    if (!isRecord(parsed) || !isRecord(parsed.data)) return NextResponse.json({ error: 'Notificação inválida' }, { status: 400 })
    body = parsed
  } catch {
    return NextResponse.json({ error: 'Notificação inválida' }, { status: 400 })
  }

  const resourceId = parseProviderId(body.data.id)
  const eventId = getPlatformSaasWebhookEventId(request.headers, requestedDataId)
  const requestedTopic = text(body.type)
  if (!resourceId || resourceId !== requestedDataId || !eventId) {
    return NextResponse.json({ error: 'Notificação ainda não pode ser conciliada' }, { status: 503 })
  }

  let topic = requestedTopic
  let previousEvent: { topic: string; resourceId: string } | null = null
  try {
    previousEvent = await db.platformSubscriptionWebhookEvent.findUnique({
      where: { providerEventId: eventId },
      select: { topic: true, resourceId: true },
    })
    if (previousEvent) {
      const isPaymentDispatch = previousEvent.topic === 'payment' || previousEvent.topic === 'payments'
      if (!['subscription_preapproval', 'subscription_authorized_payment', 'payment', 'payments'].includes(previousEvent.topic)) {
        throw new Error('Signed webhook delivery has an unsupported persisted dispatch')
      }
      if (previousEvent.resourceId !== resourceId && !isPaymentDispatch) {
        throw new Error('Signed webhook delivery conflicts with its persisted resource identity')
      }
      // body.type is not part of Mercado Pago's signed manifest. Once this signed
      // delivery has an established dispatch, retries keep that dispatch even if
      // an unsigned body field changes; payment retries still reconcile the invoice.
      topic = previousEvent.topic
    }

    let notice: BillingNotice | null = null
    if (topic === 'subscription_preapproval') {
      const provider = await getPlatformPreapproval(resourceId)
      notice = await applyPreapproval({ eventId, resourceId, topic, provider })
    } else if (topic === 'subscription_authorized_payment') {
      if (!/^\d+$/.test(resourceId)) throw new Error('Authorized SaaS invoice ID is not reconcilable')
      const invoice = await getPlatformAuthorizedPayment(resourceId)
      const invoiceExternalReference = text(invoice.external_reference)
      if (!invoiceExternalReference) throw new Error('Authorized invoice has no external reference for safe dispatch')
      if (!invoiceExternalReference.startsWith('company:')) {
        return NextResponse.json({ ok: true, ignored: true })
      }
      notice = await applyAuthorizedPayment({
        eventId,
        signedResourceId: resourceId,
        invoiceId: resourceId,
        topic,
        invoice,
      })
    } else if (topic === 'payment' || topic === 'payments') {
      if (!/^\d+$/.test(resourceId)) throw new Error('Payment resource ID is not reconcilable')
      const payment = await getPlatformPayment(resourceId)
      const paymentExternalReference = text(payment.external_reference)
      const isSaasPayment = paymentExternalReference.startsWith('company:')
      if (parseProviderId(payment.id) !== resourceId) throw new Error('Payment resource did not match the signed ID')
      if (!paymentExternalReference) throw new Error('Payment has no external reference for safe dispatch')
      const invoices = await searchPlatformAuthorizedPaymentsByPaymentId(resourceId)
      const previousInvoice = previousEvent && previousEvent.resourceId !== resourceId
        ? invoices.find((invoice) => parseProviderId(invoice.id) === previousEvent.resourceId)
        : null
      const invoiceId = parseProviderId(previousInvoice?.id ?? invoices[0]?.id)
      if (!invoiceId || !/^\d+$/.test(invoiceId)) {
        if (isSaasPayment) {
          throw new Error('SaaS payment has no authorized invoice record yet')
        }
        return NextResponse.json({ ok: true, ignored: true })
      }
      if (
        previousEvent && previousEvent.resourceId !== resourceId &&
        previousEvent.resourceId !== invoiceId
      ) throw new Error('Persisted payment event does not match the authoritative invoice')
      const invoice = await getPlatformAuthorizedPayment(invoiceId)
      const invoiceExternalReference = text(invoice.external_reference)
      if (paymentExternalReference !== invoiceExternalReference) {
        if (
          isSaasPayment || invoiceExternalReference.startsWith('company:') ||
          !invoiceExternalReference
        ) {
          throw new Error('SaaS or approved payment reference does not match its authorized invoice')
        }
        return NextResponse.json({ ok: true, ignored: true })
      }
      if (!invoiceExternalReference.startsWith('company:')) {
        return NextResponse.json({ ok: true, ignored: true })
      }
      notice = await applyAuthorizedPayment({
        eventId,
        signedResourceId: resourceId,
        invoiceId,
        topic,
        invoice,
        paymentIdHint: resourceId,
      })
    } else {
      throw new Error('Webhook topic is not supported for safe SaaS reconciliation')
    }

    if (notice) {
      try {
        await emailCompanySubscriptionNotice(notice)
      } catch {
        // The tenant inbox notice is committed with the state transition.
      }
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (hasPrismaCode(error, 'P2002')) {
      if (topic === 'subscription_authorized_payment' || topic === 'payment' || topic === 'payments') {
        return NextResponse.json({ error: 'Fatura SaaS não confirmada localmente; o Mercado Pago deve reenviar a notificação.' }, { status: 503 })
      }
      return NextResponse.json({ ok: true, duplicate: true })
    }
    if (isSerializationConflict(error)) return NextResponse.json({ error: 'Assinatura mudou durante o processamento' }, { status: 503 })
    return NextResponse.json({ error: 'Não foi possível processar a notificação SaaS' }, { status: 503 })
  }
}
