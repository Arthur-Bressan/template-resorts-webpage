'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CalendarDays, Home, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ManageItem {
  id: string
  roomName: string
  unitIdentifier: string
  checkIn: string
  checkOut: string
  status: string
  refundStatus: string
  cancellationWindowHours: number | null
  cancellationDeadline: string | null
  canCancelDirectly: boolean
  canRequestCancellation: boolean
}

interface ManageReservation {
  id: string
  guestName: string
  checkIn: string
  checkOut: string
  guests: number
  totalPrice: number
  status: string
  propertyName: string
  items: ManageItem[]
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando confirmação',
  confirmed: 'Confirmada',
  manual_review: 'Em análise pela pousada',
  cancellation_requested: 'Cancelamento em análise',
  cancelled: 'Cancelada',
  expired: 'Prazo encerrado',
}

export default function ManageReservationPage() {
  const params = useParams<{ token: string }>()
  const token = typeof params.token === 'string' ? params.token : ''
  const [reservation, setReservation] = useState<ManageReservation | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/reservations/manage/${encodeURIComponent(token)}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível consultar a reserva.')
      setReservation(data.reservation)
      setSelected([])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível consultar a reserva.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { if (token) void load() }, [load, token])

  const submit = async () => {
    if (!selected.length) return
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/reservations/manage/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: selected }),
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível processar o pedido.')
      setMessage(data.message)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível processar o pedido.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Carregando reserva…</div>
  if (error && !reservation) return <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4"><div className="max-w-md rounded-2xl border bg-white p-8 text-center"><ShieldCheck className="mx-auto mb-4 h-9 w-9 text-stone-400" /><h1 className="text-xl font-semibold">Link indisponível</h1><p className="mt-2 text-sm text-gray-600">{error}</p><Button className="mt-6" asChild><a href="/">Voltar ao site</a></Button></div></main>
  if (!reservation) return null

  const selectedItems = reservation.items.filter((item) => selected.includes(item.id))
  const willRequireReview = selectedItems.some((item) => !item.canCancelDirectly)

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{reservation.propertyName}</p>
          <h1 className="mt-3 text-2xl font-semibold text-stone-900">Gerenciar reserva</h1>
          <p className="mt-2 text-sm text-stone-600">Olá, {reservation.guestName}. Confira os dados e escolha unidades para cancelar ou enviar à análise da pousada.</p>
          <div className="mt-5 grid gap-3 rounded-xl bg-stone-50 p-4 text-sm sm:grid-cols-2">
            <div><span className="text-stone-500">Entrada</span><p className="font-medium text-stone-900">{formatDate(reservation.checkIn)}</p></div>
            <div><span className="text-stone-500">Saída</span><p className="font-medium text-stone-900">{formatDate(reservation.checkOut)}</p></div>
            <div><span className="text-stone-500">Hóspedes</span><p className="font-medium text-stone-900">{reservation.guests}</p></div>
            <div><span className="text-stone-500">Reserva</span><p className="font-medium text-stone-900">{STATUS_LABELS[reservation.status] || reservation.status}</p></div>
          </div>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-semibold text-stone-900">Unidades da reserva</h2>
          <div className="mt-4 divide-y divide-stone-100">
            {reservation.items.map((item) => {
              const selectable = item.canRequestCancellation
              return (
                <label key={item.id} className={`flex gap-3 py-4 ${selectable ? 'cursor-pointer' : 'opacity-75'}`}>
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-stone-800"
                    checked={selected.includes(item.id)}
                    disabled={!selectable || submitting}
                    onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))}
                  />
                  <span className="flex-1">
                    <span className="block font-medium text-stone-900">{item.roomName} · {item.unitIdentifier}</span>
                    <span className="mt-1 flex items-center gap-1 text-xs text-stone-500"><CalendarDays className="h-3.5 w-3.5" />{formatDate(item.checkIn)} a {formatDate(item.checkOut)}</span>
                    <span className="mt-1 block text-xs font-medium text-stone-600">{STATUS_LABELS[item.status] || item.status}</span>
                    {item.canRequestCancellation && (
                      <span className="mt-1 block text-xs text-stone-500">
                        {item.canCancelDirectly
                          ? `Cancelamento direto até ${item.cancellationDeadline ? formatDateTime(item.cancellationDeadline) : 'o prazo configurado'}.`
                          : 'O pedido será analisado pela pousada; a unidade permanece reservada até a decisão.'}
                      </span>
                    )}
                    {item.refundStatus === 'manual_refund_required' && <span className="mt-1 block text-xs text-amber-700">A pousada precisa processar eventual reembolso manualmente.</span>}
                    {item.refundStatus === 'recorded' && <span className="mt-1 block text-xs text-emerald-700">A pousada registrou o reembolso manual.</span>}
                  </span>
                </label>
              )
            })}
          </div>
          {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button className="mt-5 w-full sm:w-auto" disabled={!selected.length || submitting} onClick={submit}>
            {submitting ? 'Enviando pedido…' : willRequireReview ? 'Enviar pedido para análise' : 'Cancelar unidades selecionadas'}
          </Button>
          <p className="mt-3 text-xs text-stone-500">Pedidos fora do prazo ou sem política configurada permanecem sujeitos à aprovação da pousada. Reembolsos são processados manualmente pela hospedagem.</p>
        </section>

        <Button variant="ghost" asChild className="text-stone-600"><a href="/"><Home className="mr-2 h-4 w-4" /> Voltar ao site</a></Button>
      </div>
    </main>
  )
}
