'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { adminApi } from '@/lib/admin-client'
import { toast } from 'sonner'

export interface ReservationLead {
  id: string
  name: string
  email: string
  phone: string
  checkIn: string | null
  checkOut: string | null
  desiredCategoryId: string | null
  desiredCategory: string | null
}

interface Category {
  id: string
  name: string
  price: number
  capacity: number
}

interface CategoryLine { categoryId: string; quantity: number }

function dateInput(value?: string | null) {
  if (!value) return ''
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : ''
}

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Não foi possível criar a reserva.'
  try {
    const parsed = JSON.parse(error.message)
    return typeof parsed.error === 'string' ? parsed.error : error.message
  } catch {
    return error.message || 'Não foi possível criar a reserva.'
  }
}

export function ManualReservationForm({
  lead,
  onClose,
  onCreated,
}: {
  lead?: ReservationLead
  onClose: () => void
  onCreated: () => void
}) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [guestName, setGuestName] = useState(lead?.name || '')
  const [guestEmail, setGuestEmail] = useState(lead?.email || '')
  const [guestPhone, setGuestPhone] = useState(lead?.phone || '')
  const [checkIn, setCheckIn] = useState(dateInput(lead?.checkIn))
  const [checkOut, setCheckOut] = useState(dateInput(lead?.checkOut))
  const [guests, setGuests] = useState('1')
  const [lines, setLines] = useState<CategoryLine[]>([{ categoryId: lead?.desiredCategoryId || '', quantity: 1 }])

  useEffect(() => {
    adminApi.rooms.list().then((value: Category[]) => setCategories(Array.isArray(value) ? value.filter((category) => category && category.id) : []))
      .catch(() => toast.error('Não foi possível carregar as categorias.'))
      .finally(() => setLoading(false))
  }, [])

  const estimate = useMemo(() => {
    if (!checkIn || !checkOut) return 0
    const nights = (new Date(`${checkOut}T00:00:00Z`).getTime() - new Date(`${checkIn}T00:00:00Z`).getTime()) / 86400000
    if (!Number.isSafeInteger(nights) || nights < 1) return 0
    return lines.reduce((sum, line) => sum + (categories.find((category) => category.id === line.categoryId)?.price || 0) * nights * line.quantity, 0)
  }, [categories, checkIn, checkOut, lines])

  const updateLine = (index: number, patch: Partial<CategoryLine>) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line))
  const addLine = () => setLines((current) => [...current, { categoryId: '', quantity: 1 }])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!lines.length || lines.some((line) => !line.categoryId || !Number.isSafeInteger(line.quantity) || line.quantity < 1)) {
      toast.error('Escolha categoria(s) e quantidade(s).')
      return
    }
    setSaving(true)
    try {
      const created = await adminApi.reservations.createManual({
        guestName,
        guestEmail,
        guestPhone,
        checkIn,
        checkOut,
        guests: Number(guests),
        requestedCategories: lines,
        ...(lead ? { contactId: lead.id } : {}),
      }) as { manageEmailSent?: boolean }
      if (created.manageEmailSent) toast.success(lead ? 'Contato convertido em reserva pendente; link enviado ao hóspede.' : 'Reserva manual criada e link enviado ao hóspede.')
      else toast.error('Reserva criada, mas o e-mail do link não foi enviado. Confira a configuração e reenvie pelo detalhe da reserva.')
      onCreated()
      onClose()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="manual-reservation-title" className="my-auto w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="manual-reservation-title" className="text-xl font-semibold text-gray-900">{lead ? 'Converter contato em reserva' : 'Nova reserva presencial'}</h2><p className="mt-1 text-sm text-gray-500">A reserva inicia pendente com retenção de 15 minutos. Confirme a operação pelo calendário; não registre pagamento presencial.</p></div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-md p-2 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        {loading ? <p className="py-8 text-center text-sm text-gray-500">Carregando categorias…</p> : <form onSubmit={submit} className="mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-gray-700">Nome<input required minLength={2} maxLength={120} value={guestName} onChange={(event) => setGuestName(event.target.value)} className="h-10 w-full rounded-md border border-gray-200 px-3" /></label>
            <label className="space-y-1 text-sm text-gray-700">E-mail<input required type="email" maxLength={254} value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} className="h-10 w-full rounded-md border border-gray-200 px-3" /></label>
            <label className="space-y-1 text-sm text-gray-700">Telefone<input type="tel" maxLength={30} value={guestPhone} onChange={(event) => setGuestPhone(event.target.value)} className="h-10 w-full rounded-md border border-gray-200 px-3" /></label>
            <label className="space-y-1 text-sm text-gray-700">Hóspedes<input required type="number" min="1" max="50" step="1" value={guests} onChange={(event) => setGuests(event.target.value)} className="h-10 w-full rounded-md border border-gray-200 px-3" /></label>
            <label className="space-y-1 text-sm text-gray-700">Check-in<input required type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="h-10 w-full rounded-md border border-gray-200 px-3" /></label>
            <label className="space-y-1 text-sm text-gray-700">Check-out<input required type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} className="h-10 w-full rounded-md border border-gray-200 px-3" /></label>
          </div>
          <div className="space-y-3 rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-gray-800">Unidades</h3><Button type="button" size="sm" variant="outline" onClick={addLine}><Plus className="mr-1 h-4 w-4" />Adicionar categoria</Button></div>
            {lines.map((line, index) => <div key={index} className="flex flex-col gap-2 sm:flex-row">
              <select required aria-label={`Categoria ${index + 1}`} value={line.categoryId} onChange={(event) => updateLine(index, { categoryId: event.target.value })} className="h-10 min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-3 text-sm">
                <option value="">Selecione a categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name} · {category.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/noite · até {category.capacity}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-600">Qtd.<input aria-label="Quantidade" required type="number" min="1" max="20" step="1" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} className="h-10 w-20 rounded-md border border-gray-200 px-2" /></label>
              {lines.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label="Remover categoria" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
            </div>)}
            <p className="text-sm text-gray-600">Estimativa da estadia: <strong>{estimate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p>
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Fechar</Button><Button type="submit" disabled={saving}>{saving ? 'Salvando…' : lead ? 'Criar e converter' : 'Criar reserva'}</Button></div>
        </form>}
      </div>
    </div>
  )
}
