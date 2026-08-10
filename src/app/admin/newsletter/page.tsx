'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { adminApi } from '@/lib/admin-client'
import { toast } from 'sonner'

interface Subscriber {
  id: string
  email: string
  consent: boolean
  createdAt: string
}

export default function NewsletterPage() {
  const [items, setItems] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let active = true
    adminApi.newsletter.list(page)
      .then((res) => {
        if (active) {
          const list = res?.items || res?.data || res || []
          setItems(Array.isArray(list) ? list : [])
        }
      })
      .catch(() => { if (active) toast.error('Erro ao carregar') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page])

  const filtered = search
    ? items.filter((s) => s.email.toLowerCase().includes(search.toLowerCase()))
    : items

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Newsletter</h2>
        <p className="text-sm text-gray-500">Inscritos da newsletter</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Buscar por email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Consentimento</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Inscrito em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-12 text-center text-gray-400">Nenhum inscrito</td></tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{item.email}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.consent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {item.consent ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
