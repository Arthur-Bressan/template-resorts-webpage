import Link from 'next/link'
import { Clock, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPublicTenant, getSiteConfig } from '@/lib/data'
import { notFound } from 'next/navigation'

type PageProps = { searchParams: Promise<{ reservationId?: string; external_reference?: string; mock?: string }> }

export default async function PendentePage({ searchParams }: PageProps) {
  const tenant = await getPublicTenant()
  if (!tenant) notFound()
  const { settings } = await getSiteConfig(tenant.id, tenant.name)
  const params = await searchParams
  const reservationId = params.reservationId || params.external_reference
  const isDevelopmentMock = params.mock === '1'
  const propertyName = settings.name || tenant.name

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100"><Clock className="h-10 w-10 text-amber-600" /></div>
        <p className="mb-2 text-sm font-medium text-[var(--color-text-muted)]">{propertyName}</p>
        <h1 className="mb-3 font-serif text-3xl font-medium text-[var(--color-text)] sm:text-4xl">{isDevelopmentMock ? 'Reserva de teste criada' : 'Pagamento pendente'}</h1>
        <p className="mb-8 text-lg text-[var(--color-text-muted)]">
          {isDevelopmentMock
            ? 'Modo simulado de desenvolvimento. Nenhum pagamento foi processado e esta reserva não será confirmada automaticamente.'
            : `Aguardamos a confirmação do pagamento da sua reserva em ${propertyName}. Enviaremos um e-mail assim que o pagamento for processado.`}
        </p>
        {reservationId && <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-4"><p className="mb-1 text-xs text-[var(--color-text-muted)]">Número da reserva</p><p className="font-mono text-sm font-medium text-[var(--color-text)]">{reservationId}</p></div>}
        <Button asChild className="h-12 rounded-xl bg-[var(--color-primary)] px-8 font-semibold text-white hover:bg-[var(--color-primary-dark)]"><Link href="/"><Home className="mr-2 h-4 w-4" />Voltar ao início</Link></Button>
      </div>
    </div>
  )
}
