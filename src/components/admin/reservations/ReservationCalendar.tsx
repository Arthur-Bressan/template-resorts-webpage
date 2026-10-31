'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'

export interface CalendarRoomUnit {
  id: string
  identifier: string
}

export interface CalendarRoom {
  id: string
  name: string
  price?: number
}

export interface CalendarReservationItem {
  id: string
  roomId: string
  roomUnitId: string
  checkIn: string
  checkOut: string
  status: string
  totalPrice: number
  refundStatus?: string
  cancellationEvents?: Array<{ action: string; actorType: string; policyWindowHours: number | null; createdAt: string }>
  room: CalendarRoom
  roomUnit: CalendarRoomUnit
}

export interface CalendarReservation {
  id: string
  guestName: string
  guestEmail: string
  guestPhone: string
  checkIn: string
  checkOut: string
  guests: number
  totalPrice: number
  status: string
  bookingSource: string
  paymentReviewRequired: boolean
  notes: string
  room?: CalendarRoom | null
  items: CalendarReservationItem[]
}

export interface CalendarBlock {
  id: string
  roomUnitId: string
  checkIn: string
  checkOut: string
  reason: string
  roomUnit: { id: string; identifier: string; room: { id: string; name: string } }
}

export interface CalendarCategory { id: string; name: string }
export type CalendarMode = 'month' | 'week' | 'overview'

const STATUS_CLASS: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-900',
  confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  manual_review: 'border-orange-300 bg-orange-100 text-orange-950 ring-1 ring-orange-200',
  cancellation_requested: 'border-violet-200 bg-violet-50 text-violet-900',
  cancelled: 'border-rose-200 bg-rose-50 text-rose-800',
  completed: 'border-stone-200 bg-stone-100 text-stone-700',
  expired: 'border-stone-200 bg-stone-100 text-stone-500',
}

function localDateKey(value: string | Date) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  const date = value instanceof Date ? value : new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatShortDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(`${value.slice(0, 10)}T12:00:00`)
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date)
}

function getDisplayedStatus(reservation: CalendarReservation, item: CalendarReservationItem) {
  return reservation.status === 'manual_review' ? 'manual_review' : item.status || reservation.status
}

function reservationCategoryLines(reservation: CalendarReservation, categoryId: string, expanded: boolean) {
  const items = reservation.items.filter((item) => !categoryId || item.roomId === categoryId)
  if (expanded) return items.length ? [{
    key: items.map((item) => item.id).join(':'),
    label: items.map((item) => `${item.room.name} · ${item.roomUnit.identifier}`).join(' / '),
    status: getDisplayedStatus(reservation, items.find((item) => item.status === 'cancellation_requested') || items.find((item) => item.status !== 'cancelled' && item.status !== 'expired') || items[0]),
  }] : []
  const grouped = new Map<string, { name: string; count: number; status: string }>()
  for (const item of items) {
    const current = grouped.get(item.roomId)
    if (current) current.count += 1
    else grouped.set(item.roomId, { name: item.room.name, count: 1, status: getDisplayedStatus(reservation, item) })
  }
  return [...grouped].map(([id, group]) => ({ key: id, label: `${group.count > 1 ? `${group.count} × ` : ''}${group.name}`, status: group.status }))
}

export function ReservationCalendar({
  reservations,
  blocks,
  categories,
  date,
  mode,
  onDateChange,
  onSelectReservation,
}: {
  reservations: CalendarReservation[]
  blocks: CalendarBlock[]
  categories: CalendarCategory[]
  date: Date
  mode: CalendarMode
  onDateChange: (date: Date) => void
  onSelectReservation: (reservation: CalendarReservation) => void
}) {
  const [categoryId, setCategoryId] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [selectedDate, setSelectedDate] = useState(localDateKey(date))

  useEffect(() => setSelectedDate(localDateKey(date)), [date])

  const days = useMemo(() => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    if (mode === 'month') {
      start.setDate(1)
      const offset = (start.getDay() + 6) % 7
      start.setDate(start.getDate() - offset)
      return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
    }
    const offset = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - offset)
    return Array.from({ length: 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
  }, [date, mode])

  const visibleReservations = useMemo(() => reservations.filter((reservation) =>
    !categoryId || reservation.items.some((item) => item.roomId === categoryId),
  ), [reservations, categoryId])

  const isOnDay = (reservation: CalendarReservation, day: Date) => {
    const key = localDateKey(day)
    return localDateKey(reservation.checkIn) <= key && key < localDateKey(reservation.checkOut)
  }

  const title = mode === 'month'
    ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
    : `${formatShortDate(days[0])} – ${formatShortDate(days[days.length - 1])}`

  if (mode === 'overview') {
    return (
      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Visão geral · {reservations.length} reservas</h3>
          <div className="flex flex-wrap items-center gap-3">
            <CategoryFilter categories={categories} value={categoryId} onChange={setCategoryId} />
            <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={expanded} onChange={(event) => setExpanded(event.target.checked)} /> Expandir por unidade</label>
          </div>
        </div>
        {visibleReservations.length ? <div className="divide-y divide-gray-100">
          {visibleReservations.map((reservation) => (
            <button key={reservation.id} type="button" onClick={() => onSelectReservation(reservation)} className={`flex w-full flex-col gap-2 py-4 text-left sm:flex-row sm:items-center sm:justify-between ${reservation.status === 'manual_review' ? 'rounded-lg bg-orange-50 px-3 ring-1 ring-orange-200' : ''}`}>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 font-medium text-gray-900">{reservation.guestName}
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${STATUS_CLASS[reservation.status] || 'border-gray-200 bg-gray-50 text-gray-700'}`}>{reservation.status === 'manual_review' ? 'ANÁLISE MANUAL' : reservation.status}</span>
                </span>
                <span className="mt-1 block text-sm text-gray-500">{formatShortDate(reservation.checkIn)} – {formatShortDate(reservation.checkOut)} · {reservation.guests} hóspedes</span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">{reservationCategoryLines(reservation, categoryId, expanded).map((line) => <span key={line.key}>{line.label}</span>)}</span>
              </span>
              <span className="shrink-0 text-sm font-medium text-gray-800">{reservation.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </button>
          ))}
        </div> : <p className="py-8 text-center text-sm text-gray-500">Nenhuma reserva neste período.</p>}
      </section>
    )
  }

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-lg font-semibold capitalize text-gray-900">{title}</h3><p className="text-xs text-gray-500">As reservas ocupam todas as noites até a data de saída.</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <CategoryFilter categories={categories} value={categoryId} onChange={setCategoryId} />
          <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={expanded} onChange={(event) => setExpanded(event.target.checked)} /> Expandir por unidade</label>
          <Button size="sm" variant="outline" onClick={() => onDateChange(new Date(date.getFullYear(), date.getMonth(), date.getDate() - (mode === 'week' ? 7 : 28)))}>Anterior</Button>
          <Button size="sm" variant="outline" onClick={() => onDateChange(new Date())}>Hoje</Button>
          <Button size="sm" variant="outline" onClick={() => onDateChange(new Date(date.getFullYear(), date.getMonth(), date.getDate() + (mode === 'week' ? 7 : 28)))}>Próximo</Button>
        </div>
      </div>
      <div className={`grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 ${mode === 'month' ? 'text-xs' : 'text-sm'}`}>
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((label) => <div key={label} className="bg-gray-50 px-2 py-2 text-center font-medium text-gray-500">{label}</div>)}
        {days.map((day) => {
          const key = localDateKey(day)
          const dayReservations = visibleReservations.filter((reservation) => isOnDay(reservation, day))
          const dayBlocks = blocks.filter((block) => localDateKey(block.checkIn) <= key && key < localDateKey(block.checkOut) && (!categoryId || block.roomUnit.room.id === categoryId))
          const outsideMonth = mode === 'month' && day.getMonth() !== date.getMonth()
          return (
            <button key={key} type="button" onClick={() => { setSelectedDate(key); onDateChange(day) }} className={`min-h-28 bg-white p-1.5 text-left align-top transition hover:bg-gray-50 sm:min-h-36 sm:p-2 ${outsideMonth ? 'text-gray-300' : 'text-gray-800'} ${selectedDate === key ? 'ring-2 ring-inset ring-[var(--color-primary)]' : ''}`}>
              <span className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${selectedDate === key ? 'bg-[var(--color-primary)] text-white' : ''}`}>{day.getDate()}</span>
              <div className="space-y-1">
                {dayReservations.slice(0, mode === 'month' ? 3 : 6).map((reservation) => {
                  const lines = reservationCategoryLines(reservation, categoryId, expanded)
                  const status = reservation.status === 'manual_review' ? 'manual_review' : reservation.items.find((item) => !categoryId || item.roomId === categoryId)?.status || reservation.status
                  return <span key={reservation.id} role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); onSelectReservation(reservation) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onSelectReservation(reservation) } }} className={`block truncate rounded border px-1 py-0.5 text-[10px] leading-tight sm:text-xs ${STATUS_CLASS[status] || 'border-gray-200 bg-gray-50 text-gray-700'}`} title={`${reservation.guestName} · ${lines.map((line) => line.label).join(', ')}`}>
                    <span className="font-semibold">{status === 'manual_review' ? '⚠ ' : ''}{reservation.guestName}</span>{expanded && lines.length ? <span className="hidden sm:inline"> · {lines[0].label}</span> : null}
                  </span>
                })}
                {dayReservations.length > (mode === 'month' ? 3 : 6) && <span className="block text-[10px] text-gray-500">+{dayReservations.length - (mode === 'month' ? 3 : 6)} reservas</span>}
                {dayBlocks.slice(0, 1).map((block) => <span key={block.id} className="block truncate rounded border border-stone-300 bg-stone-100 px-1 py-0.5 text-[10px] text-stone-600" title={block.reason}>Bloqueio · {block.roomUnit.identifier}</span>)}
                {dayBlocks.length > 1 && <span className="block text-[10px] text-gray-500">+{dayBlocks.length - 1} bloqueios</span>}
              </div>
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-gray-500"><Legend color="bg-amber-100" label="Pendente" /><Legend color="bg-emerald-100" label="Confirmada" /><Legend color="bg-orange-200" label="Análise manual" /><Legend color="bg-violet-100" label="Pedido de cancelamento" /><Legend color="bg-stone-200" label="Bloqueio" /></div>
    </section>
  )
}

function CategoryFilter({ categories, value, onChange }: { categories: CalendarCategory[]; value: string; onChange: (value: string) => void }) {
  return <label className="flex items-center gap-2 text-sm text-gray-600">Categoria
    <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800">
      <option value="">Todas</option>
      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
    </select>
  </label>
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-sm ${color}`} />{label}</span>
}
