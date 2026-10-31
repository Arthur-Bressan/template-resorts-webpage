'use client'

import { useState, type FormEvent } from 'react'
import type { Room, SiteSettings } from '@/lib/data'

interface LeadFormProps {
  siteSettings: SiteSettings
  rooms: Room[]
}

export function LeadForm({ siteSettings, rooms }: LeadFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('')

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const form = event.currentTarget
    const formData = new FormData(form)
    setSubmitting(true)
    setStatus('')

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          contact: formData.get('contact'),
          message: formData.get('message'),
          consent: formData.get('consent') === 'on',
          checkIn: formData.get('checkIn') || undefined,
          checkOut: formData.get('checkOut') || undefined,
          desiredCategoryId: formData.get('desiredCategoryId') || undefined,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Não foi possível enviar sua consulta.')

      form.reset()
      setStatus('Consulta enviada. A equipe da hospedagem entrará em contato.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível enviar sua consulta.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="contato" className="bg-[var(--color-background)] py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div className="max-w-xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-primary)]">Fale conosco</p>
          <h2 className="font-serif text-4xl leading-tight text-[var(--color-text)] md:text-5xl">
            Planeje sua estadia em {siteSettings.name}
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-[var(--color-text-muted)]">
            Conte um pouco sobre sua viagem. Nossa equipe recebe sua mensagem e responde pelos dados de contato informados.
          </p>
          {siteSettings.phone && <a className="mt-6 inline-block text-sm font-medium text-[var(--color-primary)] underline underline-offset-4" href={`tel:${siteSettings.phone}`}>{siteSettings.phone}</a>}
        </div>

        <form onSubmit={submitLead} className="rounded-3xl border border-[var(--color-primary)]/10 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-[var(--color-text)]">
              Nome
              <input name="name" required maxLength={120} autoComplete="name" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-normal outline-none transition focus:border-[var(--color-primary)]" />
            </label>
            <label className="space-y-2 text-sm font-medium text-[var(--color-text)]">
              E-mail ou telefone para contato
              <input name="contact" required maxLength={254} autoComplete="email" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-normal outline-none transition focus:border-[var(--color-primary)]" />
            </label>
            <label className="space-y-2 text-sm font-medium text-[var(--color-text)]">
              Entrada (opcional)
              <input type="date" name="checkIn" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-normal outline-none transition focus:border-[var(--color-primary)]" />
            </label>
            <label className="space-y-2 text-sm font-medium text-[var(--color-text)]">
              Saída (opcional)
              <input type="date" name="checkOut" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-normal outline-none transition focus:border-[var(--color-primary)]" />
            </label>
            <label className="space-y-2 text-sm font-medium text-[var(--color-text)] sm:col-span-2">
              Categoria desejada (opcional)
              <select name="desiredCategoryId" defaultValue="" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-normal outline-none transition focus:border-[var(--color-primary)]">
                <option value="">Ainda não decidi</option>
                {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-[var(--color-text)] sm:col-span-2">
              Mensagem
              <textarea name="message" required maxLength={5000} rows={4} className="w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 font-normal outline-none transition focus:border-[var(--color-primary)]" />
            </label>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-6 text-[var(--color-text-muted)]">
            <input type="checkbox" name="consent" required className="mt-1 accent-[var(--color-primary)]" />
            <span>Autorizo {siteSettings.name} a usar estes dados para responder à minha consulta, conforme a <a href="/politica-de-privacidade" className="underline underline-offset-2">Política de Privacidade</a>.</span>
          </label>

          <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <button type="submit" disabled={submitting} className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Enviando…' : 'Enviar consulta'}
            </button>
            <p role="status" aria-live="polite" className="text-sm text-[var(--color-text-muted)]">{status}</p>
          </div>
        </form>
      </div>
    </section>
  )
}
