'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarCheck, List, Plus, Wrench, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { adminApi } from '@/lib/admin-client'
import { toast } from 'sonner'
import { ManualReservationForm } from '@/components/admin/reservations/ManualReservationForm'
import {
  ReservationCalendar,
  type CalendarBlock,
  type CalendarCategory,
  type CalendarMode,
  type CalendarReservation,
} from '@/components/admin/reservations/ReservationCalendar'

interface Category extends CalendarCategory {
  price: number
  capacity: number
  units: Array<{ id: string; identifier: string; isActive: boolean }>
}

interface ReservationPayload { items?: CalendarReservation[]; blocks?: CalendarBlock[]; total?: number }

const STATUS_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'manual_review', label: 'Análise manual' },
  { value: 'completed', label: 'Concluídas' },
  { value: 'cancelled', label: 'Canceladas' },
  { value: 'expired', label: 'Expiradas' },
]

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function calendarRange(date: Date, mode: CalendarMode) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (mode === 'month') {
    start.setDate(1)
    const to = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    return { from: localDateKey(start), to: localDateKey(to) }
  }
  if (mode === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
    const to = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
    return { from: localDateKey(start), to: localDateKey(to) }
  }
  start.setDate(1)
  const to = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 90)
  return { from: localDateKey(start), to: localDateKey(to) }
}

function dateField(value: string) { return value.slice(0, 10) }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function isRefundEligible(item: CalendarReservation['items'][number]) {
  return ['cancelled', 'expired'].includes(item.status) && item.refundStatus === 'manual_refund_required'
}

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Não foi possível concluir a operação.'
  try { const parsed = JSON.parse(error.message); return parsed.error || error.message } catch { return error.message }
}

const CANCELLATION_EVENT_LABELS: Record<string, string> = {
  guest_requested_review: 'Hóspede pediu análise',
  guest_cancelled_directly: 'Cancelamento direto do hóspede',
  request_approved: 'Pousada aprovou o pedido',
  request_denied: 'Pousada recusou o pedido',
  staff_cancelled: 'Pousada cancelou a unidade',
  manual_review_cancelled: 'Cancelada após revisão manual',
  manual_review_partial_refund_required: 'Reembolso pendente após confirmação parcial',
  manual_refund_recorded: 'Reembolso manual registrado',
}

function formatCancellationEvent(entry: NonNullable<CalendarReservation['items'][number]['cancellationEvents']>[number]) {
  const label = CANCELLATION_EVENT_LABELS[entry.action] || entry.action
  const isGuestDecision = ['guest_requested_review', 'guest_cancelled_directly'].includes(entry.action)
  const policy = !isGuestDecision ? '' : entry.policyWindowHours === null ? ' · sem prazo configurado' : ` · prazo vigente: ${entry.policyWindowHours} h`
  return `${label}${policy} · ${new Date(entry.createdAt).toLocaleString('pt-BR')}`
}

export default function ReservationsPage() {
  const [items, setItems] = useState<CalendarReservation[]>([])
  const [blocks, setBlocks] = useState<CalendarBlock[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<CalendarMode>('month')
  const [display, setDisplay] = useState<'calendar' | 'list'>('calendar')
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedReservation, setSelectedReservation] = useState<CalendarReservation | null>(null)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [showManual, setShowManual] = useState(false)
  const [showBlock, setShowBlock] = useState(false)
  const [busy, setBusy] = useState(false)
  const [editCheckIn, setEditCheckIn] = useState('')
  const [editCheckOut, setEditCheckOut] = useState('')
  const [editGuests, setEditGuests] = useState('1')
  const [deltaMessage, setDeltaMessage] = useState('')
  const [blockUnitId, setBlockUnitId] = useState('')
  const [blockCheckIn, setBlockCheckIn] = useState('')
  const [blockCheckOut, setBlockCheckOut] = useState('')
  const [blockReason, setBlockReason] = useState('')

  const range = useMemo(() => calendarRange(calendarDate, mode), [calendarDate, mode])

  const load = useCallback(async (includeRange = true) => {
    setLoading(true)
    try {
      const listParams = includeRange ? { from: range.from, to: range.to } : {}
      const [reservationData, roomData] = await Promise.all([
        adminApi.reservations.list({ ...listParams, status: statusFilter || undefined, limit: 200 }) as Promise<ReservationPayload>,
        adminApi.rooms.list() as Promise<Category[]>,
      ])
      const nextItems = Array.isArray(reservationData?.items) ? reservationData.items : []
      setItems(nextItems)
      setBlocks(Array.isArray(reservationData?.blocks) ? reservationData.blocks : [])
      setCategories(Array.isArray(roomData) ? roomData : [])
      setSelectedReservation((current) => current ? nextItems.find((item) => item.id === current.id) || null : null)
    } catch (error) {
      toast.error(errorMessage(error) || 'Erro ao carregar reservas.')
    } finally {
      setLoading(false)
    }
  }, [range.from, range.to, statusFilter])

  useEffect(() => { void load(display === 'calendar') }, [display, load])

  const refresh = () => load(display === 'calendar')
  const closeDetails = () => { setSelectedReservation(null); setSelectedItemIds([]); setDeltaMessage('') }

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true)
    try {
      await action()
      toast.success(success)
      await refresh()
      setSelectedItemIds([])
      setDeltaMessage('')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const confirmManual = (id: string) => run(() => adminApi.reservations.confirmManual(id), 'Reserva presencial confirmada.')
  const reviewReservation = (id: string, action: 'confirm' | 'cancel') => run(() => adminApi.reservations.review(id, action), action === 'confirm' ? 'Reserva revisada e confirmada.' : 'Reserva cancelada após análise.')
  const cancelSelected = (reservation: CalendarReservation, action: 'approve' | 'deny' | 'cancel') => {
    const itemIds = action === 'approve' || action === 'deny'
      ? selectedItemIds.filter((id) => reservation.items.some((item) => item.id === id && item.status === 'cancellation_requested'))
      : selectedItemIds.filter((id) => reservation.items.some((item) => item.id === id && !['cancelled', 'expired'].includes(item.status)))
    if (!itemIds.length) return toast.error(action === 'approve' || action === 'deny' ? 'Selecione pedidos aguardando análise.' : 'Selecione unidades ainda ocupadas.')
    const labels = { approve: 'aprovar o cancelamento das unidades selecionadas', deny: 'recusar o pedido e manter as unidades', cancel: 'cancelar as unidades selecionadas' }
    if (!window.confirm(`Confirma ${labels[action]}?`)) return
    return run(() => adminApi.reservations.cancel(reservation.id, action, itemIds), action === 'deny' ? 'Pedido recusado; unidades mantidas.' : 'Cancelamento registrado.')
  }

  const savePeriod = async () => {
    if (!selectedReservation) return
    setBusy(true)
    try {
      const result = await adminApi.reservations.updatePeriod(selectedReservation.id, { checkIn: editCheckIn, checkOut: editCheckOut, guests: Number(editGuests) }) as { totalBefore: number; totalAfter: number; delta: number; paidOnline: boolean; settlementMessage: string | null }
      const delta = result.delta > 0
        ? `Diferença de ${result.delta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} a cobrar fora do CMS.`
        : result.delta < 0
          ? `Diferença de ${Math.abs(result.delta).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para reembolso manual fora do CMS.`
          : 'O total da estadia não mudou.'
      setDeltaMessage(result.paidOnline ? `${delta} A pousada processa eventual cobrança ou reembolso manualmente.` : 'Datas e hóspedes atualizados.')
      toast.success('Datas e hóspedes atualizados.')
      await refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const reassign = (reservation: CalendarReservation, itemId: string, roomUnitId: string) => {
    if (!roomUnitId) return
    void run(() => adminApi.reservations.reassign(reservation.id, itemId, roomUnitId), 'Unidade reatribuída.')
  }

  const recordRefund = (reservation: CalendarReservation, itemIds: string[]) => {
    if (!itemIds.length) return toast.error('Selecione unidades com reembolso pendente.')
    const eligibleItems = reservation.items.filter((item) => itemIds.includes(item.id) && isRefundEligible(item))
    if (!eligibleItems.length) return toast.error('Selecione unidades canceladas ou expiradas com reembolso pendente.')
    const itemSummary = eligibleItems.map((item) => item.room.name + ' · ' + item.roomUnit.identifier + ': ' + formatCurrency(item.totalPrice)).join(', ')
    if (!window.confirm('Confirma que a pousada já processou manualmente o reembolso das unidades selecionadas (' + itemSummary + ')?')) return
    void run(() => adminApi.reservations.recordRefund(reservation.id, itemIds), 'Reembolso manual registrado.')
  }

  const sendGuestManageLink = async (reservation: CalendarReservation) => {
    if (!reservation.items.length) return toast.error('Esta reserva não possui unidades físicas registradas. Reconcilie a reserva antes de enviar um link de gestão.')
    if (!reservation.guestEmail.trim()) return toast.error('Esta reserva não tem e-mail de hóspede cadastrado.')
    setBusy(true)
    try {
      const result = await adminApi.reservations.sendManageLink(reservation.id) as { rotated: boolean }
      toast.success(result.rotated ? 'Novo link enviado. O link anterior foi revogado.' : 'Link de gestão enviado ao hóspede.')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const openDetails = (reservation: CalendarReservation) => {
    setSelectedReservation(reservation)
    setSelectedItemIds([])
    setEditCheckIn(dateField(reservation.checkIn))
    setEditCheckOut(dateField(reservation.checkOut))
    setEditGuests(String(reservation.guests))
    setDeltaMessage('')
  }

  const createBlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!blockUnitId) return toast.error('Escolha a unidade que será bloqueada.')
    await run(() => adminApi.availabilityBlocks.create(blockUnitId, { checkIn: blockCheckIn, checkOut: blockCheckOut, reason: blockReason }), 'Bloqueio criado.')
    setShowBlock(false)
    setBlockCheckIn('')
    setBlockCheckOut('')
    setBlockReason('')
  }

  const listItems = useMemo(() => [...items].sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime()), [items])
  const manualReviewCancelledItems = selectedReservation?.items.filter((item) => item.status === 'cancelled') || []
  const manualReviewExpiredItems = selectedReservation?.items.filter((item) => item.status === 'expired') || []
  const manualReviewConfirmableItems = selectedReservation?.items.filter((item) => item.status !== 'cancelled') || []
  const manualReviewRefundLines = manualReviewCancelledItems
    .filter((item) => item.refundStatus !== 'recorded')
    .map((item) => item.room.name + ' · ' + item.roomUnit.identifier + ': ' + formatCurrency(item.totalPrice))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-2xl font-semibold text-gray-900">Reservas</h2><p className="text-sm text-gray-500">Calendário mensal, semanal e visão geral da ocupação.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowBlock(true)}><Wrench className="mr-2 h-4 w-4" />Bloquear unidade</Button>
          <Button onClick={() => setShowManual(true)}><Plus className="mr-2 h-4 w-4" />Reserva presencial</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['month', 'week', 'overview'] as CalendarMode[]).map((value) => <Button key={value} size="sm" variant={mode === value ? 'default' : 'outline'} onClick={() => setMode(value)}>{value === 'month' ? 'Mês' : value === 'week' ? 'Semana' : 'Visão geral'}</Button>)}
          <Button size="sm" variant={display === 'list' ? 'default' : 'outline'} onClick={() => setDisplay((value) => value === 'list' ? 'calendar' : 'list')}><List className="mr-1 h-4 w-4" />Lista</Button>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900">
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {loading ? <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" /></div> : display === 'calendar' ? (
        <ReservationCalendar reservations={items} blocks={blocks} categories={categories} date={calendarDate} mode={mode} onDateChange={setCalendarDate} onSelectReservation={openDetails} />
      ) : (
        <div className="space-y-3">
          {listItems.length === 0 ? <Card className="border border-gray-200"><CardContent className="p-12 text-center"><CalendarCheck className="mx-auto mb-2 h-8 w-8 text-gray-300" /><p className="text-gray-400">Nenhuma reserva encontrada</p></CardContent></Card> : listItems.map((reservation) => (
            <button type="button" key={reservation.id} onClick={() => openDetails(reservation)} className={`w-full rounded-xl border bg-white p-4 text-left transition hover:border-gray-300 ${reservation.status === 'manual_review' ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-200' : 'border-gray-200'}`}>
              <span className="flex flex-wrap items-center gap-2 font-medium text-gray-900">{reservation.guestName}<span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${reservation.status === 'manual_review' ? 'bg-orange-200 text-orange-950' : 'bg-gray-100 text-gray-700'}`}>{reservation.status === 'manual_review' ? 'ANÁLISE MANUAL' : reservation.status}</span></span>
              <span className="mt-1 block text-sm text-gray-500">{reservation.items.map((item) => `${item.room.name} · ${item.roomUnit.identifier}`).join(' / ') || reservation.room?.name || 'Unidade não atribuída'} · {formatDate(reservation.checkIn)} – {formatDate(reservation.checkOut)}</span>
              <span className="mt-1 block text-sm text-gray-600">{reservation.guests} hóspedes · {reservation.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </button>
          ))}
        </div>
      )}

      {selectedReservation && <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={closeDetails}>
        <aside role="dialog" aria-modal="true" aria-labelledby="reservation-detail-title" onClick={(event) => event.stopPropagation()} className="h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-xl sm:p-7">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-gray-500">{selectedReservation.bookingSource === 'manual' ? 'Reserva presencial' : 'Reserva online'}</p><h2 id="reservation-detail-title" className="mt-1 text-xl font-semibold text-gray-900">{selectedReservation.guestName}</h2><p className="text-sm text-gray-500">{formatDate(selectedReservation.checkIn)} – {formatDate(selectedReservation.checkOut)} · {selectedReservation.guests} hóspedes</p></div><button type="button" aria-label="Fechar detalhes" onClick={closeDetails} className="rounded-md p-2 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button></div>

          {selectedReservation.status === 'manual_review' && <div className="mt-5 rounded-lg border border-orange-300 bg-orange-50 p-4 text-sm text-orange-950"><strong>Revisão humana necessária.</strong> O pagamento foi aprovado após a retenção expirar. A unidade não foi reaberta automaticamente. Verifique disponibilidade antes de confirmar.</div>}
          {selectedReservation.status === 'manual_review' && (manualReviewCancelledItems.length > 0 || manualReviewExpiredItems.length > 0) && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            {manualReviewExpiredItems.length > 0 && <p><strong>Unidades expiradas:</strong> podem ser confirmadas após checar se continuam disponíveis. A confirmação valida unidade ativa, conflitos com outras reservas e bloqueios.</p>}
            {manualReviewCancelledItems.length > 0 && <p className={manualReviewExpiredItems.length ? 'mt-2' : ''}><strong>Unidades canceladas:</strong> são permanentes e nunca serão reabertas pela confirmação.</p>}
            {manualReviewRefundLines.length > 0 && <p className="mt-2">Se confirmar as unidades disponíveis, registre reembolso manual somente das linhas canceladas: {manualReviewRefundLines.join(' · ')}.</p>}
          </div>}
          {selectedReservation.bookingSource === 'manual' && selectedReservation.status === 'pending' && <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">A reserva presencial ainda está pendente. Confirme a operação dentro dos 15 minutos de retenção; o painel não registra pagamento presencial.</div>}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 p-4"><span className="text-sm text-gray-600">Total registrado</span><strong className="text-lg text-gray-900">{selectedReservation.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
          <p className="mt-3 text-sm text-gray-600">{selectedReservation.guestEmail}{selectedReservation.guestPhone ? ` · ${selectedReservation.guestPhone}` : ''}</p>
          {selectedReservation.notes && <p className="mt-2 whitespace-pre-wrap text-sm italic text-gray-500">{selectedReservation.notes}</p>}
          <section className="mt-4 rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="font-semibold text-gray-900">Link seguro do hóspede</h3><p className="mt-1 text-xs text-gray-500">Envia um link para consultar a reserva e solicitar cancelamentos parciais.</p></div>
              <Button size="sm" variant="outline" disabled={busy || !selectedReservation.guestEmail.trim() || !selectedReservation.items.length} onClick={() => void sendGuestManageLink(selectedReservation)}>Enviar link por e-mail</Button>
            </div>
            {!selectedReservation.items.length
              ? <p className="mt-3 text-sm text-amber-800">Esta reserva não possui unidades físicas registradas. Reconcilie a reserva com unidades antes de rotacionar o token ou enviar o link; nenhum e-mail será enviado.</p>
              : !selectedReservation.guestEmail.trim()
                ? <p className="mt-3 text-sm text-amber-800">Esta reserva não tem e-mail cadastrado. Atualize o contato do hóspede antes de enviar o link.</p>
                : <p className="mt-2 text-xs text-gray-500">Um novo envio substitui o link anterior e revoga o acesso dele.</p>}
          </section>

          <section className="mt-6 space-y-3"><h3 className="font-semibold text-gray-900">Unidades</h3>
            {selectedReservation.items.map((item) => {
              const hasPendingRefund = item.refundStatus === 'manual_refund_required'
              const refundEligible = isRefundEligible(item)
              const selectable = !['cancelled', 'expired'].includes(item.status) || refundEligible
              const category = categories.find((entry) => entry.id === item.roomId)
              const options = category?.units.filter((unit) => unit.isActive || unit.id === item.roomUnitId) || []
              const canReassign = ['pending', 'confirmed', 'manual_review'].includes(selectedReservation.status)
                && item.status !== 'cancelled'
                && (item.status !== 'expired' || selectedReservation.status === 'manual_review')
              const itemStatusLabel = selectedReservation.status !== 'manual_review'
                ? item.status
                : item.status === 'cancelled'
                  ? 'Cancelada · permanente; não será reaberta'
                  : item.status === 'expired'
                    ? 'Expirada · candidata após checagem de disponibilidade'
                    : item.status
              return <div key={item.id} className={`rounded-xl border p-4 ${item.status === 'cancellation_requested' ? 'border-violet-200 bg-violet-50' : 'border-gray-200'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <label className="flex items-start gap-2 text-sm text-gray-800"><input type="checkbox" disabled={!selectable} checked={selectedItemIds.includes(item.id)} onChange={(event) => setSelectedItemIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} className="mt-1 accent-gray-800" /><span><strong>{item.room.name} · {item.roomUnit.identifier}</strong><span className="mt-1 block text-xs text-gray-500">{item.status === 'cancellation_requested' ? 'Pedido de cancelamento aguardando decisão' : itemStatusLabel} · {item.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>{item.refundStatus === 'manual_refund_required' && <span className="mt-1 block text-xs font-medium text-amber-700">Reembolso manual pendente de registro</span>}{item.refundStatus === 'recorded' && <span className="mt-1 block text-xs text-emerald-700">Reembolso manual registrado</span>}{item.cancellationEvents?.length ? <span className="mt-2 block space-y-1 text-xs text-gray-500">{item.cancellationEvents.slice(0, 3).map((entry, index) => <span key={`${entry.action}-${entry.createdAt}-${index}`} className="block">{formatCancellationEvent(entry)}</span>)}</span> : null}</span></label>
                  {canReassign && <label className="text-xs text-gray-600">Reatribuir unidade
                    <select aria-label={`Reatribuir ${item.room.name}`} value={item.roomUnitId} onChange={(event) => reassign(selectedReservation, item.id, event.target.value)} disabled={busy} className="ml-2 max-w-40 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs">
                      {options.map((unit) => <option key={unit.id} value={unit.id}>{unit.identifier}</option>)}
                    </select>
                  </label>}
                </div>
              </div>
            })}
            {selectedReservation.items.some((item) => item.status === 'cancellation_requested') && <div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy || !selectedItemIds.length} onClick={() => cancelSelected(selectedReservation, 'approve')}>Aprovar cancelamento selecionado</Button><Button size="sm" variant="outline" disabled={busy || !selectedItemIds.length} onClick={() => cancelSelected(selectedReservation, 'deny')}>Recusar pedido selecionado</Button></div>}
            <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy || !selectedItemIds.some((id) => selectedReservation.items.some((item) => item.id === id && !['cancelled', 'expired'].includes(item.status)))} onClick={() => cancelSelected(selectedReservation, 'cancel')}>Cancelar unidades selecionadas</Button>
              {selectedItemIds.some((id) => selectedReservation.items.some((item) => item.id === id && isRefundEligible(item))) && <Button size="sm" variant="outline" disabled={busy} onClick={() => recordRefund(selectedReservation, selectedItemIds.filter((id) => selectedReservation.items.some((item) => item.id === id && isRefundEligible(item))))}>Registrar reembolso manual</Button>}
            </div>
          </section>

          <section className="mt-6 space-y-3 rounded-xl border border-gray-200 p-4"><h3 className="font-semibold text-gray-900">Alterar período ou hóspedes</h3><div className="grid gap-3 sm:grid-cols-3"><label className="space-y-1 text-xs text-gray-600">Check-in<input type="date" value={editCheckIn} onChange={(event) => setEditCheckIn(event.target.value)} className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm" /></label><label className="space-y-1 text-xs text-gray-600">Check-out<input type="date" value={editCheckOut} onChange={(event) => setEditCheckOut(event.target.value)} className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm" /></label><label className="space-y-1 text-xs text-gray-600">Hóspedes<input type="number" min="1" max="50" value={editGuests} onChange={(event) => setEditGuests(event.target.value)} className="h-9 w-full rounded-md border border-gray-200 px-2 text-sm" /></label></div><Button size="sm" variant="outline" disabled={busy || !['pending', 'confirmed'].includes(selectedReservation.status)} onClick={() => void savePeriod()}>Salvar alteração</Button>{!['pending', 'confirmed'].includes(selectedReservation.status) && <p className="text-xs text-gray-500">Altere o período depois que a reserva sair da revisão manual ou de um estado final.</p>}{deltaMessage && <p role="status" className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">{deltaMessage}</p>}</section>

          {selectedReservation.bookingSource === 'manual' && selectedReservation.status === 'pending' && <Button className="mt-5 w-full" disabled={busy} onClick={() => void confirmManual(selectedReservation.id)}>Confirmar reserva presencial</Button>}
          {selectedReservation.status === 'manual_review' && <div className="mt-5 flex flex-wrap gap-2"><Button disabled={busy || !manualReviewConfirmableItems.length} onClick={() => void reviewReservation(selectedReservation.id, 'confirm')}>Confirmar após análise</Button><Button variant="outline" disabled={busy} onClick={() => void reviewReservation(selectedReservation.id, 'cancel')}>Cancelar após análise</Button></div>}
        </aside>
      </div>}

      {showManual && <ManualReservationForm onClose={() => setShowManual(false)} onCreated={() => void refresh()} />}

      {showBlock && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={createBlock} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold text-gray-900">Bloquear unidade</h2><p className="text-sm text-gray-500">O sistema recusa bloqueios que conflitam com uma reserva.</p></div><button type="button" aria-label="Fechar" onClick={() => setShowBlock(false)} className="rounded p-1 text-gray-500"><X className="h-5 w-5" /></button></div><label className="block space-y-1 text-sm text-gray-700">Unidade<select required value={blockUnitId} onChange={(event) => setBlockUnitId(event.target.value)} className="h-10 w-full rounded-md border border-gray-200 bg-white px-3"><option value="">Selecione</option>{categories.flatMap((category) => category.units.filter((unit) => unit.isActive).map((unit) => <option key={unit.id} value={unit.id}>{category.name} · {unit.identifier}</option>))}</select></label><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm text-gray-700">Check-in<input required type="date" value={blockCheckIn} onChange={(event) => setBlockCheckIn(event.target.value)} className="h-10 w-full rounded-md border border-gray-200 px-3" /></label><label className="space-y-1 text-sm text-gray-700">Check-out<input required type="date" value={blockCheckOut} onChange={(event) => setBlockCheckOut(event.target.value)} className="h-10 w-full rounded-md border border-gray-200 px-3" /></label></div><label className="block space-y-1 text-sm text-gray-700">Motivo<input required maxLength={500} value={blockReason} onChange={(event) => setBlockReason(event.target.value)} className="h-10 w-full rounded-md border border-gray-200 px-3" /></label><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowBlock(false)}>Fechar</Button><Button type="submit" disabled={busy}>Criar bloqueio</Button></div></form></div>}
    </div>
  )
}
