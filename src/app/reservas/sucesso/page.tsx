import Link from 'next/link'
import { CheckCircle2, Home, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPublicTenant, getSiteConfig } from '@/lib/data'
import { notFound } from 'next/navigation'

type PageProps = { searchParams: Promise<{ reservationId?: string; external_reference?: string }> }

export default async function SucessoPage({ searchParams }: PageProps) {
  const tenant = await getPublicTenant()
  if (!tenant) notFound()
  const { settings } = await getSiteConfig(tenant.id, tenant.name)
  const params = await searchParams
  const reservationId = params.reservationId || params.external_reference
  const propertyName = settings.name || tenant.name

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-10 w-10 text-emerald-600" /></div>
          <p className="mb-2 text-sm font-medium text-[var(--color-text-muted)]">{propertyName}</p>
          <h1 className="mb-3 font-serif text-3xl font-medium text-[var(--color-text)] sm:text-4xl">Pagamento recebido</h1>
          <p className="text-lg text-[var(--color-text-muted)]">Estamos validando seu pagamento. {propertyName} confirmará a reserva após a aprovação do Mercado Pago e enviará o resultado por e-mail.</p>
        </div>
        {reservationId && <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-4"><p className="mb-1 text-xs text-[var(--color-text-muted)]">Número da reserva</p><p className="font-mono text-sm font-medium text-[var(--color-text)]">{reservationId}</p></div>}
        <div className="mb-8 flex items-center justify-center gap-2 text-sm text-[var(--color-text-muted)]"><Mail className="h-4 w-4" /><span>Confira também sua caixa de spam.</span></div>
        <Button asChild className="h-12 rounded-xl bg-[var(--color-primary)] px-8 font-semibold text-white hover:bg-[var(--color-primary-dark)]"><Link href="/"><Home className="mr-2 h-4 w-4" />Voltar ao início</Link></Button>
      </div>
    </div>
  )
}
