import { Suspense } from 'react'
import { getSiteConfig } from '@/lib/data'
import StatusClient from './StatusClient'

export default async function ReservationStatusPage() {
  const { settings } = await getSiteConfig()
  return <Suspense fallback={<main id="main-content" tabIndex={-1} className="min-h-screen grid place-items-center"><p role="status">Carregando consulta da reserva…</p></main>}>
    <StatusClient phone={settings.phone} email={settings.email} />
  </Suspense>
}
