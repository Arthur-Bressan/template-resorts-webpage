'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BedDouble,
  Mountain,
  MessageSquareQuote,
  Mail,
  Inbox,
  CalendarCheck,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { adminApi } from '@/lib/admin-client'

interface DashboardData {
  rooms: number
  experiences: number
  testimonials: number
  newsletter: number
  contacts: number
  contactsUnread: number
  reservations: number
  reservationsPending: number
  recentContacts: Array<{
    id: string
    name: string
    email: string
    message: string
    read: boolean
    createdAt: string
  }>
}

const defaultData: DashboardData = {
  rooms: 0,
  experiences: 0,
  testimonials: 0,
  newsletter: 0,
  contacts: 0,
  contactsUnread: 0,
  reservations: 0,
  reservationsPending: 0,
  recentContacts: [],
}

const statCards = [
  { key: 'rooms' as const, label: 'Quartos (publicados)', href: '/admin/rooms', icon: BedDouble, color: 'bg-emerald-50 text-emerald-600' },
  { key: 'experiences' as const, label: 'Experiências', href: '/admin/experiences', icon: Mountain, color: 'bg-amber-50 text-amber-600' },
  { key: 'testimonials' as const, label: 'Depoimentos', href: '/admin/testimonials', icon: MessageSquareQuote, color: 'bg-purple-50 text-purple-600' },
  { key: 'newsletter' as const, label: 'Newsletter', href: '/admin/newsletter', icon: Mail, color: 'bg-blue-50 text-blue-600' },
  { key: 'contactsUnread' as const, label: 'Contatos não lidos', href: '/admin/contacts', icon: Inbox, color: 'bg-orange-50 text-orange-600' },
  { key: 'reservationsPending' as const, label: 'Reservas pendentes', href: '/admin/reservations', icon: CalendarCheck, color: 'bg-rose-50 text-rose-600' },
]

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData>(defaultData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.dashboard()
      .then((res) => {
        if (res) setData(res)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500">Visão geral do seu site</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <Link key={card.key} href={card.href}>
            <Card className="transition-shadow hover:shadow-md cursor-pointer border border-gray-200">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.color}`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-bold text-gray-900">{data[card.key]}</p>
                  <p className="truncate text-sm text-gray-500">{card.label}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent contacts */}
      <Card className="border border-gray-200">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Últimos contatos</h3>
            <Link href="/admin/contacts" className="text-sm text-[var(--color-primary)] hover:underline">
              Ver todos
            </Link>
          </div>
          {data.recentContacts?.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {data.recentContacts.map((c) => (
                <div key={c.id} className="flex items-start gap-3 py-3">
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${c.read ? 'bg-gray-300' : 'bg-[var(--color-primary)]'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <span className="text-xs text-gray-400">{c.email}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-gray-500">{c.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">Nenhum contato recebido</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
