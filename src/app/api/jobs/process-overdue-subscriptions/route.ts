import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isSerializationConflict, serializableTransaction } from '@/lib/serializable-transaction'
import { createCompanySubscriptionNotice, emailCompanySubscriptionNotice } from '@/lib/platform-subscription-notifications'

const GRACE_PERIOD_MS = 72 * 60 * 60 * 1000

type SubscriptionNotice = { tenantId: string; title: string; message: string }

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  const authorization = request.headers.get('authorization') || ''
  if (!secret || secret.length < 16) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const supplied = Buffer.from(authorization)
  return expected.length === supplied.length && timingSafeEqual(expected, supplied)
}

function plusGracePeriod(date: Date) {
  return new Date(date.getTime() + GRACE_PERIOD_MS)
}

function latestDate(values: Array<Date | null | undefined>) {
  return values
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => right.getTime() - left.getTime())[0] ?? null
}

function iso(date: Date | null) {
  return date?.toISOString() ?? null
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const now = new Date()
  const graceCutoff = new Date(now.getTime() - GRACE_PERIOD_MS)
  const dueSubscriptions = await db.companySubscription.findMany({
    where: {
      OR: [
        { status: 'trialing', trialEndsAt: { lte: now } },
        { status: 'trialing', trialEndsAt: null },
        { status: 'active', currentPeriodEndsAt: { lte: now } },
        { status: 'active', currentPeriodEndsAt: null, nextBillingAt: { lte: now } },
        { status: 'active', currentPeriodEndsAt: null, nextBillingAt: null },
        { status: 'past_due', graceEndsAt: { lte: now } },
        { status: 'past_due', graceEndsAt: null, delinquentAt: { lte: graceCutoff } },
        { status: 'past_due', graceEndsAt: null, delinquentAt: null },
        { status: 'cancel_scheduled', accessUntilAt: { lte: now } },
        { status: 'cancel_scheduled', accessUntilAt: null },
      ],
    },
    orderBy: { updatedAt: 'asc' },
    take: 1000,
    select: {
      id: true,
      tenantId: true,
      status: true,
      trialEndsAt: true,
      currentPeriodEndsAt: true,
      nextBillingAt: true,
      delinquentAt: true,
      graceEndsAt: true,
      accessUntilAt: true,
    },
  })

  let transitions = 0
  let restricted = 0
  for (const snapshot of dueSubscriptions) {
    try {
      const notice = await serializableTransaction(async (tx): Promise<SubscriptionNotice | null> => {
        const current = await tx.companySubscription.findUnique({ where: { id: snapshot.id } })
        if (!current || current.tenantId !== snapshot.tenantId) return null

        let status: string | null = null
        let delinquentAt = current.delinquentAt
        let graceEndsAt = current.graceEndsAt
        let accessUntilAt = current.accessUntilAt
        let event: 'subscription.overdue' | 'subscription.cancelled'
        let eventKey: string
        let title: string
        let message: string

        if (current.status === 'trialing') {
          const trialEnd = current.trialEndsAt
          if (trialEnd && trialEnd.getTime() > now.getTime()) return null
          if (!trialEnd) {
            status = 'restricted'
            accessUntilAt = now
            event = 'subscription.overdue'
            eventKey = `subscription.overdue:missing-trial-boundary:${current.id}`
            title = 'Acesso da plataforma restrito'
            message = 'Não foi possível confirmar a data final do teste. A conta foi bloqueada para alterações e novas reservas até revisão da assinatura.'
          } else {
            delinquentAt = trialEnd
            const trialGraceEndsAt = plusGracePeriod(delinquentAt)
            const paidThrough = latestDate([current.currentPeriodEndsAt, current.accessUntilAt])
            graceEndsAt = paidThrough && paidThrough.getTime() > trialGraceEndsAt.getTime()
              ? paidThrough
              : trialGraceEndsAt
            accessUntilAt = graceEndsAt
            status = 'past_due'
            event = 'subscription.overdue'
            eventKey = `subscription.overdue:trial:${current.id}:${delinquentAt.toISOString()}`
            title = 'Teste encerrado; pagamento não confirmado'
            message = paidThrough && paidThrough.getTime() > trialGraceEndsAt.getTime()
              ? `O teste terminou sem confirmação do primeiro pagamento. O acesso pago herdado permanece disponível até ${graceEndsAt.toLocaleString('pt-BR', { timeZone: 'UTC' })}; depois dessa data, o CMS e novas reservas ficarão bloqueados se o pagamento não for confirmado.`
              : `O teste terminou sem confirmação do primeiro pagamento. O CMS e novas reservas permanecem disponíveis durante a tolerância até ${graceEndsAt.toLocaleString('pt-BR', { timeZone: 'UTC' })}.`
          }
        } else if (current.status === 'active') {
          const periodEnd = current.currentPeriodEndsAt ?? current.nextBillingAt
          if (periodEnd && periodEnd.getTime() > now.getTime()) return null
          if (!periodEnd) {
            status = 'restricted'
            accessUntilAt = now
            event = 'subscription.overdue'
            eventKey = `subscription.overdue:missing-period-boundary:${current.id}`
            title = 'Acesso da plataforma restrito'
            message = 'Não foi possível confirmar o fim do período pago. A conta foi bloqueada para alterações e novas reservas até revisão da assinatura.'
          } else {
            delinquentAt = periodEnd
            graceEndsAt = plusGracePeriod(delinquentAt)
            accessUntilAt = graceEndsAt
            status = 'past_due'
            event = 'subscription.overdue'
            eventKey = `subscription.overdue:period:${current.id}:${delinquentAt.toISOString()}`
            title = 'Renovação pendente'
            message = `Ainda não há confirmação da renovação. O acesso continua durante a tolerância de 72 horas, até ${graceEndsAt.toLocaleString('pt-BR', { timeZone: 'UTC' })}.`
          }
        } else if (current.status === 'past_due') {
          graceEndsAt ??= current.delinquentAt ? plusGracePeriod(current.delinquentAt) : now
          if (graceEndsAt.getTime() > now.getTime()) {
            if (!current.graceEndsAt) {
              await tx.companySubscription.update({
                where: { id: current.id },
                data: { graceEndsAt, delinquentAt: delinquentAt ?? current.delinquentAt ?? now },
              })
            }
            return null
          }
          status = 'restricted'
          accessUntilAt = graceEndsAt
          event = 'subscription.overdue'
          eventKey = `subscription.overdue:restricted:${current.id}:${graceEndsAt.toISOString()}`
          title = 'Acesso da plataforma restrito'
          const ordinaryGraceEndsAt = current.delinquentAt ? plusGracePeriod(current.delinquentAt) : null
          const retainedPaidThroughExtendedGrace = Boolean(
            ordinaryGraceEndsAt && current.graceEndsAt &&
            current.graceEndsAt.getTime() > ordinaryGraceEndsAt.getTime(),
          )
          message = retainedPaidThroughExtendedGrace
            ? 'A tolerância e o período pago herdado terminaram sem pagamento. As alterações no CMS e novas reservas estão bloqueadas; o site público e as reservas existentes continuam acessíveis.'
            : 'A tolerância de 72 horas terminou sem pagamento. As alterações no CMS e novas reservas estão bloqueadas; o site público e as reservas existentes continuam acessíveis.'
        } else if (current.status === 'cancel_scheduled') {
          const paidThrough = current.accessUntilAt ?? current.currentPeriodEndsAt ?? current.trialEndsAt
          if (paidThrough && paidThrough.getTime() > now.getTime()) return null
          status = 'restricted'
          accessUntilAt = paidThrough ?? now
          event = 'subscription.cancelled'
          eventKey = `subscription.cancelled:period-ended:${current.id}:${iso(accessUntilAt)}`
          title = 'Período da assinatura encerrado'
          message = 'O período da assinatura terminou. O site público e as reservas existentes continuam acessíveis; o CMS e novas reservas estão restritos.'
        } else {
          return null
        }

        const updated = await tx.companySubscription.updateMany({
          where: { id: current.id, tenantId: current.tenantId, status: current.status },
          data: {
            status,
            delinquentAt,
            graceEndsAt,
            accessUntilAt,
          },
        })
        if (!updated.count) return null

        const noticeCreated = await createCompanySubscriptionNotice({
          tenantId: current.tenantId,
          event,
          eventKey,
          title,
          message,
          href: '/admin',
          data: {
            status,
            delinquentAt: iso(delinquentAt),
            graceEndsAt: iso(graceEndsAt),
            accessUntilAt: iso(accessUntilAt),
          },
        }, tx)
        return noticeCreated ? { tenantId: current.tenantId, title, message } : null
      })

      if (notice) {
        transitions += 1
        if (notice.title === 'Acesso da plataforma restrito' || notice.title === 'Período da assinatura encerrado') restricted += 1
        try {
          await emailCompanySubscriptionNotice(notice)
        } catch {
          // The subscription transition and inbox notice are already committed.
        }
      }
    } catch (error) {
      if (isSerializationConflict(error)) continue
      return NextResponse.json({ error: 'Não foi possível processar todas as assinaturas vencidas.' }, { status: 503 })
    }
  }

  return NextResponse.json({ ok: true, examined: dueSubscriptions.length, transitions, restricted })
}
