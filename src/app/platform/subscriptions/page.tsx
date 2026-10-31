'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type BillingPayment = {
  id: string
  status: string
  amountCents: number | null
  currencyId: string
  retryAttempt: number | null
  debitAt: string | null
  paidAt: string | null
  createdAt: string
}

type CompanySubscription = {
  id: string
  monthlyAmountCents: number | null
  trialDays: number | null
  status: string
  checkoutExternalReference: string | null
  providerStatus: string | null
  trialStartedAt: string | null
  trialEndsAt: string | null
  currentPeriodStartedAt: string | null
  currentPeriodEndsAt: string | null
  nextBillingAt: string | null
  delinquentAt: string | null
  graceEndsAt: string | null
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  accessUntilAt: string | null
  lastPaymentAt: string | null
  payments: BillingPayment[]
}

type BillingCompany = {
  company: {
    id: string
    name: string
    slug: string
    status: string
    admin: { name: string; email: string } | null
  }
  subscription: CompanySubscription | null
}

type Draft = { amount: string; trialDays: string }

function getPlatformToken() {
  return localStorage.getItem('platform_admin_token')
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR')
}

function formatMoney(cents: number | null) {
  if (cents === null) return 'Não configurada'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function statusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    unconfigured: 'Não configurada',
    configured: 'Configurada',
    creating_checkout: 'Criando checkout',
    checkout_unknown: 'Checkout precisa de conciliação',
    checkout_failed: 'Falha ao criar checkout',
    awaiting_card: 'Aguardando cartão',
    card_required: 'Cartão necessário',
    awaiting_payment: 'Aguardando primeira cobrança',
    trialing: 'Em teste',
    active: 'Ativa',
    past_due: 'Pagamento pendente',
    cancel_scheduled: 'Cancelada ao fim do período',
    restricted: 'Acesso restrito',
  }
  return status ? labels[status] || status : 'Não configurada'
}

export default function PlatformSubscriptionsPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<BillingCompany[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [checkoutLinks, setCheckoutLinks] = useState<Record<string, string>>({})
  const [busyCompanyId, setBusyCompanyId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadSubscriptions = useCallback(async () => {
    const token = getPlatformToken()
    if (!token) {
      router.replace('/platform/login')
      return
    }

    const response = await fetch('/api/platform/subscriptions', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (response.status === 401) {
      localStorage.removeItem('platform_admin_token')
      localStorage.removeItem('platform_admin_user')
      router.replace('/platform/login')
      return
    }
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Não foi possível carregar as assinaturas.')
    const loaded = result.companies as BillingCompany[]
    setCompanies(loaded)
    setDrafts((current) => Object.fromEntries(loaded.map(({ company, subscription }) => [
      company.id,
      current[company.id] || {
        amount: subscription?.monthlyAmountCents === null || subscription?.monthlyAmountCents === undefined
          ? ''
          : (subscription.monthlyAmountCents / 100).toFixed(2),
        trialDays: subscription?.trialDays === null || subscription?.trialDays === undefined
          ? ''
          : String(subscription.trialDays),
      },
    ])))
  }, [router])

  useEffect(() => {
    let active = true
    loadSubscriptions()
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as assinaturas.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [loadSubscriptions])

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('checkout') === 'return') {
      setMessage('Retorno do checkout recebido. O status exibido é atualizado pelas notificações do Mercado Pago.')
    }
  }, [])

  const performAction = async (companyId: string, action: string, payload: Record<string, unknown> = {}) => {
    setBusyCompanyId(companyId)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/platform/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getPlatformToken() || ''}`,
        },
        body: JSON.stringify({ companyId, action, ...payload }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar a assinatura.')
      if (typeof result.initPoint === 'string') {
        setCheckoutLinks((links) => ({ ...links, [companyId]: result.initPoint }))
        setMessage('Checkout hospedado pronto. Envie o link ao administrador da hospedagem.')
      } else if (action === 'cancel_at_period_end') {
        setMessage(`Renovação cancelada. O acesso termina em ${formatDate(result.accessUntilAt)}.`)
      } else {
        setMessage('Configuração da assinatura salva.')
      }
      await loadSubscriptions()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a assinatura.')
    } finally {
      setBusyCompanyId('')
    }
  }

  const configure = (companyId: string) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const draft = drafts[companyId]
    const amount = Number(draft?.amount)
    const trialDays = Number(draft?.trialDays)
    if (!draft?.amount.trim() || !draft.trialDays.trim() || !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(trialDays) || trialDays < 0 || trialDays > 365) {
      setError('Informe uma mensalidade válida e um teste entre 0 e 365 dias.')
      return
    }
    await performAction(companyId, 'configure', {
      monthlyAmountCents: Math.round(amount * 100),
      trialDays,
    })
  }

  const logout = () => {
    localStorage.removeItem('platform_admin_token')
    localStorage.removeItem('platform_admin_user')
    router.replace('/platform/login')
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Plataforma</p>
            <h1 className="mt-1 text-3xl font-semibold text-gray-900">Assinaturas</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Defina a mensalidade e o teste. O cartão é cadastrado no checkout hospedado do Mercado Pago.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/platform/companies" className="text-sm font-medium text-blue-700 hover:underline">Empresas</Link>
            <Button type="button" variant="outline" onClick={logout}>Sair</Button>
          </div>
        </header>

        {message && <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">{message}</p>}
        {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Carregando assinaturas...</p>
        ) : companies.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Nenhuma empresa cadastrada.</p>
        ) : (
          <div className="space-y-5">
            {companies.map(({ company, subscription }) => {
              const draft = drafts[company.id] || { amount: '', trialDays: '' }
              const status = subscription?.status || 'unconfigured'
              const checkoutNeedsReconciliation = Boolean(subscription?.checkoutExternalReference)
              const editable = !checkoutNeedsReconciliation &&
                (!subscription || ['unconfigured', 'configured', 'checkout_failed'].includes(status))
              const canStartCheckout = Boolean(subscription?.monthlyAmountCents && subscription.trialDays !== null) &&
                !checkoutNeedsReconciliation &&
                ['configured', 'checkout_failed', 'awaiting_card', 'card_required', 'restricted', 'cancel_scheduled'].includes(status)
              const canCancel = Boolean(subscription && !subscription.cancelAtPeriodEnd &&
                !checkoutNeedsReconciliation &&
                ['awaiting_card', 'awaiting_payment', 'trialing', 'active', 'past_due', 'restricted'].includes(status))

              return (
                <article key={company.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{company.name}</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {company.admin?.name || 'Administrador'} · {company.admin?.email || 'Sem perfil associado'} · {company.slug}
                      </p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                      {statusLabel(status)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div><p className="text-gray-500">Mensalidade</p><p className="mt-1 font-medium text-gray-900">{formatMoney(subscription?.monthlyAmountCents ?? null)}</p></div>
                    <div><p className="text-gray-500">Teste</p><p className="mt-1 font-medium text-gray-900">{subscription?.trialDays === null || subscription?.trialDays === undefined ? 'Não configurado' : `${subscription.trialDays} dias`}</p></div>
                    <div><p className="text-gray-500">Próxima cobrança</p><p className="mt-1 font-medium text-gray-900">{formatDate(subscription?.nextBillingAt || subscription?.trialEndsAt || null)}</p></div>
                    <div><p className="text-gray-500">Acesso até</p><p className="mt-1 font-medium text-gray-900">{formatDate(subscription?.accessUntilAt || subscription?.currentPeriodEndsAt || subscription?.trialEndsAt || null)}</p></div>
                  </div>

                  {(subscription?.graceEndsAt || subscription?.cancelAtPeriodEnd || subscription?.providerStatus) && (
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                      {subscription.graceEndsAt && <span>Tolerância até {formatDate(subscription.graceEndsAt)}</span>}
                      {subscription.cancelAtPeriodEnd && <span>Renovação cancelada; acesso mantido até a data indicada</span>}
                      {subscription.providerStatus && <span>Status Mercado Pago: {subscription.providerStatus}</span>}
                    </div>
                  )}

                  {checkoutNeedsReconciliation && subscription?.checkoutExternalReference && (
                    <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                      Checkout pendente de conciliação no Mercado Pago. Não inicie outro contrato até confirmar o estado desta referência: {subscription.checkoutExternalReference}
                    </p>
                  )}

                  <form onSubmit={configure(company.id)} className="mt-5 grid gap-3 border-t border-gray-100 pt-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <div className="space-y-2">
                      <Label htmlFor={`amount-${company.id}`}>Mensalidade (R$)</Label>
                      <Input
                        id={`amount-${company.id}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={draft.amount}
                        onChange={(event) => setDrafts((values) => ({ ...values, [company.id]: { ...draft, amount: event.target.value } }))}
                        disabled={!editable || busyCompanyId === company.id}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`trial-${company.id}`}>Dias de teste</Label>
                      <Input
                        id={`trial-${company.id}`}
                        type="number"
                        min="0"
                        max="365"
                        step="1"
                        value={draft.trialDays}
                        onChange={(event) => setDrafts((values) => ({ ...values, [company.id]: { ...draft, trialDays: event.target.value } }))}
                        disabled={!editable || busyCompanyId === company.id}
                        required
                      />
                    </div>
                    <Button type="submit" variant="outline" disabled={!editable || busyCompanyId === company.id}>
                      Salvar valores
                    </Button>
                  </form>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      disabled={!canStartCheckout || busyCompanyId === company.id}
                      onClick={() => void performAction(company.id, 'start_checkout')}
                    >
                      {status === 'awaiting_card' ? 'Recuperar checkout' : 'Gerar checkout do cartão'}
                    </Button>
                    {canCancel && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyCompanyId === company.id}
                        onClick={() => {
                          if (window.confirm(`Cancelar a próxima renovação de ${company.name}? O acesso permanece até o fim do período atual.`)) {
                            void performAction(company.id, 'cancel_at_period_end')
                          }
                        }}
                      >
                        Cancelar próxima renovação
                      </Button>
                    )}
                    {checkoutLinks[company.id] && (
                      <a href={checkoutLinks[company.id]} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-700 underline">
                        Abrir checkout hospedado
                      </a>
                    )}
                  </div>

                  {subscription?.payments.length ? (
                    <details className="mt-5 border-t border-gray-100 pt-4">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700">Cobranças recentes</summary>
                      <ul className="mt-3 space-y-2 text-sm text-gray-600">
                        {subscription.payments.map((payment) => (
                          <li key={payment.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                            <span>{formatMoney(payment.amountCents)} · {statusLabel(payment.status)}</span>
                            <span>{formatDate(payment.paidAt || payment.debitAt || payment.createdAt)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
