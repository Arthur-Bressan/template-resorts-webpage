import { db } from '@/lib/db'

const GRACE_PERIOD_MS = 72 * 60 * 60 * 1000

export type CompanyWriteAccess = {
  allowed: boolean
  status: string
  reason: 'not_configured' | 'awaiting_card' | 'trial_or_paid' | 'grace_period' | 'period_ended' | 'restricted'
  accessUntilAt: Date | null
}

function addGracePeriod(date: Date) {
  return new Date(date.getTime() + GRACE_PERIOD_MS)
}

/** Resolve the current write entitlement without changing Company.status. */
export async function getCompanyWriteAccess(
  tenantId: string,
  now = new Date(),
): Promise<CompanyWriteAccess> {
  const subscription = await db.companySubscription.findUnique({
    where: { tenantId },
    select: {
      status: true,
      trialEndsAt: true,
      currentPeriodEndsAt: true,
      nextBillingAt: true,
      graceEndsAt: true,
      delinquentAt: true,
      cancelAtPeriodEnd: true,
      accessUntilAt: true,
    },
  })

  if (!subscription) {
    return { allowed: false, status: 'unconfigured', reason: 'not_configured', accessUntilAt: null }
  }

  if (subscription.cancelAtPeriodEnd || subscription.status === 'cancel_scheduled') {
    const accessUntilAt = subscription.accessUntilAt ?? subscription.currentPeriodEndsAt ?? subscription.trialEndsAt
    return {
      allowed: Boolean(accessUntilAt && accessUntilAt.getTime() > now.getTime()),
      status: subscription.status,
      reason: accessUntilAt && accessUntilAt.getTime() > now.getTime() ? 'trial_or_paid' : 'period_ended',
      accessUntilAt,
    }
  }

  if (subscription.status === 'trialing') {
    const trialEndsAt = subscription.trialEndsAt
    const trialGraceEndsAt = trialEndsAt ? addGracePeriod(trialEndsAt) : now
    const accessUntilAt = [trialGraceEndsAt, subscription.currentPeriodEndsAt, subscription.accessUntilAt]
      .filter((date): date is Date => Boolean(date && date.getTime() > now.getTime()))
      .sort((left, right) => right.getTime() - left.getTime())[0] ?? null
    const insideTrialOrPaidPeriod = Boolean(
      (trialEndsAt && now.getTime() < trialEndsAt.getTime()) ||
      (subscription.currentPeriodEndsAt && now.getTime() < subscription.currentPeriodEndsAt.getTime()) ||
      (subscription.accessUntilAt && now.getTime() < subscription.accessUntilAt.getTime()),
    )
    return {
      allowed: Boolean(accessUntilAt),
      status: subscription.status,
      reason: accessUntilAt ? insideTrialOrPaidPeriod ? 'trial_or_paid' : 'grace_period' : 'period_ended',
      accessUntilAt,
    }
  }

  if (subscription.status === 'active') {
    const periodEnd = subscription.currentPeriodEndsAt ?? subscription.nextBillingAt
    if (!periodEnd) {
      return { allowed: false, status: subscription.status, reason: 'restricted', accessUntilAt: null }
    }
    const graceEndsAt = addGracePeriod(periodEnd)
    return {
      allowed: now.getTime() < graceEndsAt.getTime(),
      status: subscription.status,
      reason: now.getTime() < periodEnd.getTime() ? 'trial_or_paid' : 'grace_period',
      accessUntilAt: graceEndsAt,
    }
  }

  if (subscription.status === 'past_due') {
    const graceEndsAt = subscription.graceEndsAt ?? (
      subscription.delinquentAt ? addGracePeriod(subscription.delinquentAt) : null
    )
    return {
      allowed: Boolean(graceEndsAt && now.getTime() < graceEndsAt.getTime()),
      status: subscription.status,
      reason: graceEndsAt && now.getTime() < graceEndsAt.getTime() ? 'grace_period' : 'period_ended',
      accessUntilAt: graceEndsAt,
    }
  }

  return {
    allowed: false,
    status: subscription.status,
    reason: subscription.status === 'awaiting_card' || subscription.status === 'configured'
      ? 'awaiting_card'
      : 'restricted',
    accessUntilAt: null,
  }
}

export async function assertCompanyWriteAccess(tenantId: string, now = new Date()) {
  const access = await getCompanyWriteAccess(tenantId, now)
  if (!access.allowed) {
    const error = new Error('Company subscription does not allow writes') as Error & {
      code: string
      access: CompanyWriteAccess
    }
    error.name = 'CompanyWriteRestrictedError'
    error.code = 'COMPANY_SUBSCRIPTION_RESTRICTED'
    error.access = access
    throw error
  }
  return access
}
