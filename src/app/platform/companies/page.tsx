'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type PlatformCompany = {
  id: string
  name: string
  slug: string
  status: string
  createdAt: string
  admin: { name: string; email: string } | null
}

function getPlatformToken() {
  return localStorage.getItem('platform_admin_token')
}

export default function PlatformCompaniesPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<PlatformCompany[]>([])
  const [slugDrafts, setSlugDrafts] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [email, setEmail] = useState('')
  const [slug, setSlug] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadCompanies = async () => {
    const token = getPlatformToken()
    if (!token) {
      router.replace('/platform/login')
      return
    }

    const response = await fetch('/api/platform/companies', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.status === 401) {
      localStorage.removeItem('platform_admin_token')
      localStorage.removeItem('platform_admin_user')
      router.replace('/platform/login')
      return
    }
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Não foi possível carregar as empresas')
    setCompanies(result.companies)
    setSlugDrafts(Object.fromEntries(result.companies.map((company: PlatformCompany) => [company.id, company.slug])))
  }

  useEffect(() => {
    let active = true
    loadCompanies()
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as empresas')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/platform/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getPlatformToken() || ''}`,
        },
        body: JSON.stringify({ name, adminName, email, slug }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Não foi possível cadastrar a empresa')

      setName('')
      setAdminName('')
      setEmail('')
      setSlug('')
      setMessage(
        result.invitationSent
          ? `Empresa ${result.company.name} cadastrada. O convite foi enviado por e-mail.`
          : `Empresa ${result.company.name} cadastrada. O convite não foi confirmado pelo provedor; tente cadastrar o mesmo e-mail novamente para reenviá-lo.`,
      )
      await loadCompanies()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível cadastrar a empresa')
    } finally {
      setSaving(false)
    }
  }

  const handleSlugUpdate = async (company: PlatformCompany) => {
    setError('')
    setMessage('')
    const token = getPlatformToken()
    try {
      const response = await fetch('/api/platform/companies', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ id: company.id, slug: slugDrafts[company.id] || company.slug }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar o subdomínio')
      setMessage(`Subdomínio de ${company.name} atualizado para ${result.company.slug}.`)
      await loadCompanies()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o subdomínio')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('platform_admin_token')
    localStorage.removeItem('platform_admin_user')
    router.replace('/platform/login')
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Plataforma</p>
            <h1 className="mt-1 text-3xl font-semibold text-gray-900">Empresas</h1>
            <p className="mt-2 text-sm text-gray-600">Cadastre uma hospedagem e convide seu perfil administrador.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/platform/subscriptions" className="text-sm font-medium text-blue-700 hover:underline">Assinaturas</Link>
            <Button type="button" variant="outline" onClick={handleLogout}>Sair</Button>
          </div>
        </header>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Cadastrar empresa</h2>
          <form onSubmit={handleCreate} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company-name">Nome da hospedagem</Label>
              <Input id="company-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-name">Nome do administrador</Label>
              <Input id="admin-name" value={adminName} onChange={(event) => setAdminName(event.target.value)} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">E-mail do administrador</Label>
              <Input id="admin-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-slug">Subdomínio (opcional)</Label>
              <Input id="company-slug" value={slug} onChange={(event) => setSlug(event.target.value)} maxLength={63} placeholder="gerado a partir do nome" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Cadastrando...' : 'Cadastrar e enviar convite'}
              </Button>
            </div>
          </form>
          {message && <p className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-800">{message}</p>}
          {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Empresas cadastradas</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Carregando...</p>
          ) : companies.length === 0 ? (
            <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Nenhuma empresa cadastrada.</p>
          ) : (
            <div className="space-y-3">
              {companies.map((company) => (
                <article key={company.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{company.name}</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {company.admin?.name || 'Administrador'} · {company.admin?.email || 'Sem perfil associado'} · {company.status}
                      </p>
                    </div>
                    <form
                      className="flex w-full gap-2 sm:max-w-sm"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void handleSlugUpdate(company)
                      }}
                    >
                      <Input
                        aria-label={`Subdomínio de ${company.name}`}
                        value={slugDrafts[company.id] ?? company.slug}
                        onChange={(event) => setSlugDrafts((drafts) => ({ ...drafts, [company.id]: event.target.value }))}
                        maxLength={63}
                      />
                      <Button type="submit" variant="outline">Salvar</Button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
