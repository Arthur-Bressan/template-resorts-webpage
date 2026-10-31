import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/platform-auth'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'
import {
  cancelPlatformPreapproval,
  createPendingPlatformPreapproval,
  getPlatformPreapproval,
  isMercadoPagoHostedCheckoutUrl,
  parseProviderDate,
  parseProviderId,
} from '@/lib/platform-saas-mercadopago'
import { createCompanySubscriptionNotice, emailCompanySubscriptionNotice } from '@/lib/platform-subscription-notifications'

const MAX_AMOUNT_CENTS = 2_147_483_647
const MAX_TRIAL_DAYS = 365

function iso(value: Date | null) {
  return value?.toISOString() ?? null
}

function hasPrismaCode(error: unknown, code: string) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code
}

function readBody(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

type CheckoutBillingSnapshot = {
  id: string
  tenantId: string
  status: string
  providerPreapprovalId: string | null
  providerExternalReference: string | null
  checkoutExternalReference: string | null
  currentPeriodStartedAt: Date | null
  currentPeriodEndsAt: Date | null
  nextBillingAt: Date | null
  lastPaymentAt: Date | null
  trialEndsAt: Date | null
  delinquentAt: Date | null
  graceEndsAt: Date | null
  accessUntilAt: Date | null
  cancelAtPeriodEnd: boolean
  monthlyAmountCents: number | null
  trialDays: number | null
}

function sameNullableDate(left: Date | null, right: Date | null) {
  return left?.getTime() === right?.getTime()
}

function sameCheckoutBillingSnapshot(left: CheckoutBillingSnapshot, right: CheckoutBillingSnapshot) {
  return left.id === right.id && left.tenantId === right.tenantId && left.status === right.status &&
    left.providerPreapprovalId === right.providerPreapprovalId &&
    left.providerExternalReference === right.providerExternalReference &&
    left.checkoutExternalReference === right.checkoutExternalReference &&
    left.cancelAtPeriodEnd === right.cancelAtPeriodEnd &&
    left.monthlyAmountCents === right.monthlyAmountCents &&
    left.trialDays === right.trialDays &&
    sameNullableDate(left.currentPeriodStartedAt, right.currentPeriodStartedAt) &&
    sameNullableDate(left.currentPeriodEndsAt, right.currentPeriodEndsAt) &&
    sameNullableDate(left.nextBillingAt, right.nextBillingAt) &&
    sameNullableDate(left.lastPaymentAt, right.lastPaymentAt) &&
    sameNullableDate(left.trialEndsAt, right.trialEndsAt) &&
    sameNullableDate(left.delinquentAt, right.delinquentAt) &&
    sameNullableDate(left.graceEndsAt, right.graceEndsAt) &&
    sameNullableDate(left.accessUntilAt, right.accessUntilAt)
}

const checkoutBillingSnapshotSelect = {
  id: true,
  tenantId: true,
  status: true,
  providerPreapprovalId: true,
  providerExternalReference: true,
  checkoutExternalReference: true,
  currentPeriodStartedAt: true,
  currentPeriodEndsAt: true,
  nextBillingAt: true,
  lastPaymentAt: true,
  trialEndsAt: true,
  delinquentAt: true,
  graceEndsAt: true,
  accessUntilAt: true,
  cancelAtPeriodEnd: true,
  monthlyAmountCents: true,
  trialDays: true,
} as const

async function cancelAndConfirmPreapproval(preapprovalId: string, externalReference: string) {
  const current = await getPlatformPreapproval(preapprovalId)
  if (
    parseProviderId(current.id) !== preapprovalId ||
    current.external_reference !== externalReference
  ) return false

  const currentStatus = typeof current.status === 'string' ? current.status : ''
  if (currentStatus === 'canceled' || currentStatus === 'cancelled') return true

  try {
    await cancelPlatformPreapproval(preapprovalId)
  } catch {
    // The response can be lost after the provider accepts the cancellation.
    // The authoritative read below decides whether it is safe to unlink.
  }

  const confirmed = await getPlatformPreapproval(preapprovalId)
  return parseProviderId(confirmed.id) === preapprovalId &&
    confirmed.external_reference === externalReference &&
    (confirmed.status === 'canceled' || confirmed.status === 'cancelled')
}

async function companySubscriptionList() {
  const companies = await db.company.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      memberships: { take: 1, select: { admin: { select: { name: true, email: true } } } },
      subscription: {
        include: { payments: { orderBy: { createdAt: 'desc' }, take: 5 } },
      },
    },
  })

  return companies.map((company) => {
    const subscription = company.subscription
    return {
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        status: company.status,
        admin: company.memberships[0]?.admin ?? null,
      },
      subscription: subscription ? {
        id: subscription.id,
        monthlyAmountCents: subscription.monthlyAmountCents,
        trialDays: subscription.trialDays,
        status: subscription.status,
        checkoutExternalReference: subscription.checkoutExternalReference,
        providerStatus: subscription.providerStatus,
        trialStartedAt: iso(subscription.trialStartedAt),
        trialEndsAt: iso(subscription.trialEndsAt),
        currentPeriodStartedAt: iso(subscription.currentPeriodStartedAt),
        currentPeriodEndsAt: iso(subscription.currentPeriodEndsAt),
        nextBillingAt: iso(subscription.nextBillingAt),
        delinquentAt: iso(subscription.delinquentAt),
        graceEndsAt: iso(subscription.graceEndsAt),
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: iso(subscription.canceledAt),
        accessUntilAt: iso(subscription.accessUntilAt),
        lastPaymentAt: iso(subscription.lastPaymentAt),
        payments: subscription.payments.map((payment) => ({
          id: payment.id,
          status: payment.status,
          amountCents: payment.amountCents,
          currencyId: payment.currencyId,
          retryAttempt: payment.retryAttempt,
          debitAt: iso(payment.debitAt),
          paidAt: iso(payment.paidAt),
          createdAt: payment.createdAt.toISOString(),
        })),
      } : null,
    }
  })
}

export async function GET() {
  try {
    await requirePlatformAdmin()
    return NextResponse.json({ companies: await companySubscriptionList() }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin()
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    const parsed = readBody(await request.json())
    if (!parsed) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    body = parsed
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const action = typeof body.action === 'string' ? body.action : ''
  const companyId = typeof body.companyId === 'string' ? body.companyId.trim() : ''
  if (!companyId) return NextResponse.json({ error: 'Informe a empresa' }, { status: 400 })

  if (action === 'configure') {
    const monthlyAmountCents = body.monthlyAmountCents
    const trialDays = body.trialDays
    if (
      typeof monthlyAmountCents !== 'number' || !Number.isSafeInteger(monthlyAmountCents) ||
      monthlyAmountCents < 1 || monthlyAmountCents > MAX_AMOUNT_CENTS ||
      typeof trialDays !== 'number' || !Number.isSafeInteger(trialDays) ||
      trialDays < 0 || trialDays > MAX_TRIAL_DAYS
    ) {
      return NextResponse.json({
        error: 'Informe uma mensalidade em centavos e um teste entre 0 e 365 dias.',
      }, { status: 400 })
    }

    try {
      const company = await db.company.findUnique({ where: { id: companyId }, select: { id: true } })
      if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

      const existing = await db.companySubscription.findUnique({ where: { tenantId: companyId } })
      if (existing && (
        existing.providerPreapprovalId ||
        existing.checkoutExternalReference ||
        !['unconfigured', 'configured', 'checkout_failed'].includes(existing.status)
      )) {
        return NextResponse.json({ error: existing.checkoutExternalReference
          ? 'A configuração não pode ser alterada enquanto houver checkout pendente de conciliação.'
          : 'A configuração não pode ser alterada depois de iniciar o checkout.' }, { status: 409 })
      }

      if (!existing) {
        const subscription = await db.companySubscription.create({
          data: { tenantId: companyId, monthlyAmountCents, trialDays, status: 'configured' },
          select: { id: true, monthlyAmountCents: true, trialDays: true, status: true },
        })
        return NextResponse.json({ subscription })
      }

      const updated = await db.companySubscription.updateMany({
        where: {
          id: existing.id,
          tenantId: companyId,
          status: existing.status,
          providerPreapprovalId: null,
          checkoutExternalReference: null,
        },
        data: { monthlyAmountCents, trialDays, status: 'configured' },
      })
      if (!updated.count) return NextResponse.json({ error: 'A assinatura mudou. Atualize a tela e tente novamente.' }, { status: 409 })
      const subscription = await db.companySubscription.findUnique({
        where: { tenantId: companyId },
        select: { id: true, monthlyAmountCents: true, trialDays: true, status: true },
      })
      return NextResponse.json({ subscription })
    } catch (error) {
      if (hasPrismaCode(error, 'P2002')) {
        return NextResponse.json({ error: 'A configuração mudou. Atualize a tela e tente novamente.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Não foi possível salvar a configuração da assinatura.' }, { status: 500 })
    }
  }

  if (action === 'start_checkout') {
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        memberships: { take: 1, select: { role: true, admin: { select: { email: true } } } },
        subscription: true,
      },
    })
    if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    const subscription = company.subscription
    const payerEmail = company.memberships[0]?.admin.email.trim() || ''
    if (!subscription || subscription.monthlyAmountCents === null || subscription.trialDays === null || !payerEmail) {
      return NextResponse.json({ error: 'Configure mensalidade, teste e e-mail do administrador antes do checkout.' }, { status: 409 })
    }

    if (subscription.checkoutExternalReference) {
      return NextResponse.json({ error: 'Concilie o checkout pendente no Mercado Pago antes de recuperar ou iniciar outro link.' }, { status: 409 })
    }

    if (subscription.providerPreapprovalId && subscription.status === 'awaiting_card') {
      try {
        const provider = await getPlatformPreapproval(subscription.providerPreapprovalId)
        const initPoint = typeof provider.init_point === 'string' ? provider.init_point : ''
        const reference = typeof provider.external_reference === 'string' ? provider.external_reference : ''
        if (
          parseProviderId(provider.id) !== subscription.providerPreapprovalId ||
          reference !== subscription.providerExternalReference ||
          !isMercadoPagoHostedCheckoutUrl(initPoint)
        ) {
          return NextResponse.json({ error: 'O checkout anterior precisa de reconciliação pela equipe.' }, { status: 409 })
        }
        return NextResponse.json({ initPoint, subscriptionStatus: subscription.status })
      } catch {
        return NextResponse.json({ error: 'Não foi possível recuperar o checkout do Mercado Pago.' }, { status: 503 })
      }
    }

    const checkoutAllowedStatuses = ['configured', 'checkout_failed', 'card_required', 'restricted', 'cancel_scheduled']
    if (!checkoutAllowedStatuses.includes(subscription.status)) {
      return NextResponse.json({ error: 'Esta empresa não está pronta para iniciar outro checkout.' }, { status: 409 })
    }
    if (subscription.providerPreapprovalId && !subscription.providerExternalReference) {
      return NextResponse.json({ error: 'A assinatura anterior precisa de reconciliação pela equipe.' }, { status: 409 })
    }

    const externalReference = `company:${companyId}:subscription:${subscription.id}:${randomUUID()}`
    const operationId = randomUUID()
    const started = await db.companySubscription.updateMany({
      where: {
        id: subscription.id,
        tenantId: companyId,
        providerPreapprovalId: subscription.providerPreapprovalId,
        providerExternalReference: subscription.providerExternalReference,
        checkoutExternalReference: null,
        status: subscription.status,
        monthlyAmountCents: subscription.monthlyAmountCents,
        trialDays: subscription.trialDays,
        currentPeriodStartedAt: subscription.currentPeriodStartedAt,
        currentPeriodEndsAt: subscription.currentPeriodEndsAt,
        nextBillingAt: subscription.nextBillingAt,
        lastPaymentAt: subscription.lastPaymentAt,
        trialEndsAt: subscription.trialEndsAt,
        delinquentAt: subscription.delinquentAt,
        graceEndsAt: subscription.graceEndsAt,
        accessUntilAt: subscription.accessUntilAt,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      // Reserve before any provider round trip without changing paid/access state.
      data: { checkoutExternalReference: externalReference },
    })
    if (started.count !== 1) {
      return NextResponse.json({ error: 'Outro checkout está sendo iniciado ou a assinatura mudou.' }, { status: 409 })
    }

    let previousPreapprovalCanceled = !subscription.providerPreapprovalId
    let providerPostStarted = false
    let createdCheckout: Awaited<ReturnType<typeof createPendingPlatformPreapproval>> | null = null
    let linked = false

    const releaseReservation = (markFailed: boolean) => serializableTransaction(async (tx) => {
      const current = await tx.companySubscription.findUnique({
        where: { tenantId: companyId },
        select: checkoutBillingSnapshotSelect,
      })
      if (
        !current || current.id !== subscription.id ||
        current.providerPreapprovalId !== subscription.providerPreapprovalId ||
        current.providerExternalReference !== subscription.providerExternalReference ||
        current.checkoutExternalReference !== externalReference
      ) return false

      const paymentStateChanged = current.status !== subscription.status ||
        current.monthlyAmountCents !== subscription.monthlyAmountCents ||
        current.trialDays !== subscription.trialDays ||
        !sameNullableDate(current.currentPeriodStartedAt, subscription.currentPeriodStartedAt) ||
        !sameNullableDate(current.currentPeriodEndsAt, subscription.currentPeriodEndsAt) ||
        !sameNullableDate(current.nextBillingAt, subscription.nextBillingAt) ||
        !sameNullableDate(current.lastPaymentAt, subscription.lastPaymentAt) ||
        !sameNullableDate(current.trialEndsAt, subscription.trialEndsAt) ||
        !sameNullableDate(current.delinquentAt, subscription.delinquentAt) ||
        !sameNullableDate(current.graceEndsAt, subscription.graceEndsAt) ||
        !sameNullableDate(current.accessUntilAt, subscription.accessUntilAt) ||
        current.cancelAtPeriodEnd !== subscription.cancelAtPeriodEnd
      const nextStatus = markFailed && !paymentStateChanged &&
        current.status !== 'cancel_scheduled' && !current.cancelAtPeriodEnd
        ? 'checkout_failed'
        : current.status
      const released = await tx.companySubscription.updateMany({
        where: {
          id: current.id,
          tenantId: current.tenantId,
          providerPreapprovalId: current.providerPreapprovalId,
          providerExternalReference: current.providerExternalReference,
          checkoutExternalReference: externalReference,
          status: current.status,
          currentPeriodStartedAt: current.currentPeriodStartedAt,
          currentPeriodEndsAt: current.currentPeriodEndsAt,
          nextBillingAt: current.nextBillingAt,
          lastPaymentAt: current.lastPaymentAt,
          trialEndsAt: current.trialEndsAt,
          delinquentAt: current.delinquentAt,
          graceEndsAt: current.graceEndsAt,
          accessUntilAt: current.accessUntilAt,
          cancelAtPeriodEnd: current.cancelAtPeriodEnd,
          monthlyAmountCents: current.monthlyAmountCents,
          trialDays: current.trialDays,
        },
        data: {
          checkoutExternalReference: null,
          status: nextStatus,
          ...(previousPreapprovalCanceled && subscription.providerPreapprovalId
            ? { providerStatus: 'canceled', nextBillingAt: null }
            : {}),
        },
      })
      return released.count === 1
    })

    const markUnknownWithoutChangingEntitlement = () => serializableTransaction(async (tx) => {
      const current = await tx.companySubscription.findUnique({
        where: { tenantId: companyId },
        select: checkoutBillingSnapshotSelect,
      })
      if (
        !current || current.id !== subscription.id ||
        current.providerPreapprovalId !== subscription.providerPreapprovalId ||
        current.providerExternalReference !== subscription.providerExternalReference ||
        current.checkoutExternalReference !== externalReference
      ) return false
      const preservePaidStatus = current.status === 'cancel_scheduled' || current.cancelAtPeriodEnd ||
        current.status === 'active' || current.status === 'trialing'
      const updated = await tx.companySubscription.updateMany({
        where: {
          id: current.id,
          tenantId: current.tenantId,
          providerPreapprovalId: current.providerPreapprovalId,
          providerExternalReference: current.providerExternalReference,
          checkoutExternalReference: externalReference,
          status: current.status,
          currentPeriodEndsAt: current.currentPeriodEndsAt,
          lastPaymentAt: current.lastPaymentAt,
          accessUntilAt: current.accessUntilAt,
          cancelAtPeriodEnd: current.cancelAtPeriodEnd,
          monthlyAmountCents: current.monthlyAmountCents,
          trialDays: current.trialDays,
        },
        data: { status: preservePaidStatus ? current.status : 'checkout_unknown' },
      })
      return updated.count === 1
    })

    try {
      if (subscription.providerPreapprovalId) {
        const canceled = await cancelAndConfirmPreapproval(
          subscription.providerPreapprovalId,
          subscription.providerExternalReference!,
        )
        if (!canceled) throw new Error('Previous provider contract cancellation is not confirmed')
        previousPreapprovalCanceled = true
      }

      // Re-read after GET/PUT/GET. A concurrent approved payment may have extended
      // the paid boundary while cancellation was in flight; retain that newer row.
      const currentBeforeCreate = await db.companySubscription.findUnique({
        where: { tenantId: companyId },
        select: checkoutBillingSnapshotSelect,
      })
      if (
        !currentBeforeCreate || currentBeforeCreate.id !== subscription.id ||
        currentBeforeCreate.providerPreapprovalId !== subscription.providerPreapprovalId ||
        currentBeforeCreate.providerExternalReference !== subscription.providerExternalReference ||
        currentBeforeCreate.checkoutExternalReference !== externalReference ||
        currentBeforeCreate.monthlyAmountCents !== subscription.monthlyAmountCents ||
        currentBeforeCreate.trialDays !== subscription.trialDays ||
        !checkoutAllowedStatuses.includes(currentBeforeCreate.status)
      ) throw new Error('Subscription changed after previous provider cancellation')

      providerPostStarted = true
      const checkout = await createPendingPlatformPreapproval({
        companyId,
        companyName: company.name,
        payerEmail,
        externalReference,
        internalSubscriptionId: `${subscription.id}-${operationId}`,
        monthlyAmountCents: subscription.monthlyAmountCents,
        trialDays: subscription.trialDays,
      })
      createdCheckout = checkout

      const saved = await serializableTransaction(async (tx) => {
        const current = await tx.companySubscription.findUnique({
          where: { tenantId: companyId },
          select: checkoutBillingSnapshotSelect,
        })
        if (
          !current || current.id !== subscription.id ||
          current.providerPreapprovalId !== subscription.providerPreapprovalId ||
          current.providerExternalReference !== subscription.providerExternalReference ||
          current.checkoutExternalReference !== externalReference ||
          !checkoutAllowedStatuses.includes(current.status) ||
          !sameCheckoutBillingSnapshot(currentBeforeCreate, current)
        ) return false

        const keepPaidAccess = current.status === 'cancel_scheduled' || current.cancelAtPeriodEnd

        const updated = await tx.companySubscription.updateMany({
          where: {
            id: current.id,
            tenantId: current.tenantId,
            providerPreapprovalId: current.providerPreapprovalId,
            providerExternalReference: current.providerExternalReference,
            checkoutExternalReference: externalReference,
            status: current.status,
            currentPeriodStartedAt: current.currentPeriodStartedAt,
            currentPeriodEndsAt: current.currentPeriodEndsAt,
            nextBillingAt: current.nextBillingAt,
            lastPaymentAt: current.lastPaymentAt,
            trialEndsAt: current.trialEndsAt,
            delinquentAt: current.delinquentAt,
            graceEndsAt: current.graceEndsAt,
            accessUntilAt: current.accessUntilAt,
            cancelAtPeriodEnd: current.cancelAtPeriodEnd,
            monthlyAmountCents: current.monthlyAmountCents,
            trialDays: current.trialDays,
          },
          data: {
            providerPreapprovalId: checkout.id,
            providerCollectorId: checkout.collectorId,
            providerExternalReference: checkout.externalReference,
            checkoutExternalReference: null,
            providerStatus: checkout.status,
            providerModifiedAt: checkout.modifiedAt,
            checkoutCreatedAt: new Date(),
            status: 'awaiting_card',
            ...(keepPaidAccess ? { cancelAtPeriodEnd: true } : {}),
          },
        })
        if (!updated.count) return false

        await tx.platformSubscriptionPreapproval.create({
          data: {
            tenantId: companyId,
            subscriptionId: subscription.id,
            providerPreapprovalId: checkout.id,
            providerExternalReference: checkout.externalReference,
            providerCollectorId: checkout.collectorId,
          },
        })
        return true
      })
      if (!saved) {
        throw new Error('Subscription payment state changed during provider checkout creation')
      }
      linked = true
      return NextResponse.json({ initPoint: checkout.initPoint, subscriptionStatus: 'awaiting_card' })
    } catch (error) {
      if (createdCheckout && !linked) {
        let newPreapprovalCanceled = false
        try {
          newPreapprovalCanceled = await cancelAndConfirmPreapproval(
            createdCheckout.id,
            createdCheckout.externalReference,
          )
        } catch {
          newPreapprovalCanceled = false
        }
        if (!newPreapprovalCanceled) {
          await markUnknownWithoutChangingEntitlement()
          return NextResponse.json({
            error: 'A assinatura mudou durante o checkout; o novo contrato ainda precisa de conciliação e a referência foi mantida bloqueada.',
          }, { status: 503 })
        }
        const released = await releaseReservation(false)
        if (!released) {
          await markUnknownWithoutChangingEntitlement()
          return NextResponse.json({
            error: 'O novo contrato foi cancelado, mas a reserva local mudou. A referência permanece bloqueada para conciliação.',
          }, { status: 503 })
        }
        return NextResponse.json({
          error: 'A assinatura mudou durante a criação. O novo contrato foi cancelado e o período pago atual foi preservado; atualize a tela antes de tentar novamente.',
        }, { status: 409 })
      }

      const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error &&
        typeof error.statusCode === 'number' ? error.statusCode : null
      const uncertain = !providerPostStarted || statusCode === null || statusCode >= 500
      if (uncertain) {
        await markUnknownWithoutChangingEntitlement()
      } else if (previousPreapprovalCanceled) {
        const released = await releaseReservation(true)
        if (!released) {
          await markUnknownWithoutChangingEntitlement()
          return NextResponse.json({
            error: 'A assinatura mudou após cancelar o contrato anterior; a referência permanece bloqueada para conciliação.',
          }, { status: 503 })
        }
      }
      return NextResponse.json({
        error: uncertain
          ? 'A resposta do Mercado Pago ficou incerta. Verifique a conta da plataforma antes de tentar novamente.'
          : 'Não foi possível iniciar o checkout hospedado do Mercado Pago.',
      }, { status: uncertain ? 503 : 502 })
    }
  }

  if (action === 'cancel_at_period_end') {
    const subscription = await db.companySubscription.findUnique({
      where: { tenantId: companyId },
      include: { tenant: { select: { name: true } } },
    })
    if (!subscription?.providerPreapprovalId || !subscription.providerExternalReference) {
      return NextResponse.json({ error: 'Assinatura Mercado Pago não encontrada.' }, { status: 409 })
    }
    if (subscription.checkoutExternalReference) {
      return NextResponse.json({ error: 'Concilie o checkout pendente no Mercado Pago antes de cancelar ou iniciar outro contrato.' }, { status: 409 })
    }
    if (subscription.cancelAtPeriodEnd) {
      return NextResponse.json({
        status: subscription.status,
        accessUntilAt: subscription.accessUntilAt?.toISOString() ?? null,
      })
    }

    let provider: Record<string, unknown>
    try {
      const current = await getPlatformPreapproval(subscription.providerPreapprovalId)
      if (
        parseProviderId(current.id) !== subscription.providerPreapprovalId ||
        current.external_reference !== subscription.providerExternalReference
      ) {
        return NextResponse.json({ error: 'A referência da assinatura não corresponde à empresa.' }, { status: 409 })
      }
      provider = await cancelPlatformPreapproval(subscription.providerPreapprovalId)
    } catch {
      return NextResponse.json({ error: 'Não foi possível cancelar a renovação no Mercado Pago.' }, { status: 502 })
    }

    const providerStatus = typeof provider.status === 'string' ? provider.status : 'canceled'
    const providerModifiedAt = parseProviderDate(provider.last_modified)

    try {
      const result = await serializableTransaction(async (tx) => {
        const current = await tx.companySubscription.findUnique({
          where: { id: subscription.id, tenantId: companyId },
          select: {
            providerPreapprovalId: true,
            providerExternalReference: true,
            providerModifiedAt: true,
            status: true,
            trialEndsAt: true,
            currentPeriodEndsAt: true,
            graceEndsAt: true,
            lastPaymentAt: true,
            cancelAtPeriodEnd: true,
            accessUntilAt: true,
          },
        })
        if (
          !current || current.providerPreapprovalId !== subscription.providerPreapprovalId ||
          current.providerExternalReference !== subscription.providerExternalReference
        ) throw new Error('Subscription changed during cancellation')
        if (current.cancelAtPeriodEnd) {
          return {
            notice: false,
            status: current.status,
            accessUntilAt: current.accessUntilAt,
            message: null as string | null,
          }
        }

        const canceledAt = new Date()
        const entitlementBoundaries = ['trialing', 'past_due'].includes(current.status)
          ? [current.trialEndsAt, current.currentPeriodEndsAt, current.accessUntilAt, current.graceEndsAt]
          : current.status === 'active'
            ? [current.currentPeriodEndsAt, current.accessUntilAt]
            : []
        const accessUntilAt = entitlementBoundaries
          .filter((date): date is Date => Boolean(date && date.getTime() > canceledAt.getTime()))
          .sort((left, right) => right.getTime() - left.getTime())[0] ?? canceledAt
        const nextStatus = accessUntilAt.getTime() > canceledAt.getTime() ? 'cancel_scheduled' : 'restricted'
        const message = `A próxima renovação foi cancelada. O acesso permanece disponível até ${accessUntilAt.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.`
        const updated = await tx.companySubscription.updateMany({
          where: {
            id: subscription.id,
            tenantId: companyId,
            providerPreapprovalId: subscription.providerPreapprovalId,
            providerExternalReference: subscription.providerExternalReference,
            status: current.status,
            cancelAtPeriodEnd: false,
            trialEndsAt: current.trialEndsAt,
            currentPeriodEndsAt: current.currentPeriodEndsAt,
            graceEndsAt: current.graceEndsAt,
            lastPaymentAt: current.lastPaymentAt,
            accessUntilAt: current.accessUntilAt,
          },
          data: {
            status: nextStatus,
            cancelAtPeriodEnd: true,
            canceledAt,
            accessUntilAt,
            providerStatus,
            providerModifiedAt: providerModifiedAt &&
              (!current.providerModifiedAt || providerModifiedAt >= current.providerModifiedAt)
              ? providerModifiedAt
              : current.providerModifiedAt,
          },
        })
        if (!updated.count) throw new Error('Subscription changed during cancellation')
        const notice = await createCompanySubscriptionNotice({
          tenantId: companyId,
          event: 'subscription.cancelled',
          eventKey: `subscription.cancelled:${subscription.id}:${accessUntilAt.toISOString()}`,
          title: 'Renovação cancelada',
          message,
          href: '/admin',
          data: { accessUntilAt: accessUntilAt.toISOString() },
        }, tx)
        return { notice, status: nextStatus, accessUntilAt, message }
      })
      if (result.notice && result.message) {
        await emailCompanySubscriptionNotice({
          tenantId: companyId,
          title: 'Renovação cancelada',
          message: result.message,
        })
      }
      return NextResponse.json({
        status: result.status,
        accessUntilAt: result.accessUntilAt?.toISOString() ?? null,
      })
    } catch (error) {
      if (isSerializationConflict(error)) return NextResponse.json({ error: 'A assinatura mudou durante o cancelamento.' }, { status: 409 })
      if (error instanceof Error && error.message === 'Subscription changed during cancellation') {
        return NextResponse.json({ error: 'A assinatura mudou durante o cancelamento.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'A renovação foi cancelada, mas o estado local precisa de reconciliação.' }, { status: 503 })
    }
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
