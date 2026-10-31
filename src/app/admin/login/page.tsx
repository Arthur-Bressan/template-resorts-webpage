'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { adminApi, setAdminUser, setToken } from '@/lib/admin-client'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [inviteChecked, setInviteChecked] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setInviteToken(new URLSearchParams(window.location.search).get('invite') || '')
    setInviteChecked(true)
  }, [])

  const invitationMode = Boolean(inviteToken)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      let result
      if (invitationMode) {
        if (password !== passwordConfirmation) {
          throw new Error('As senhas não conferem')
        }
        const response = await fetch('/api/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'accept-invitation', token: inviteToken, password }),
        })
        result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Não foi possível ativar o acesso')
      } else {
        result = await adminApi.auth.login(email, password)
      }

      if (result?.token) {
        setToken(result.token)
        setAdminUser(result.admin || { email, name: email })
        window.history.replaceState({}, '', '/admin/login')
        router.push('/admin')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível entrar'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-900">
            <LogIn className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-xl text-gray-900">
            {invitationMode ? 'Defina sua senha' : 'Painel Admin'}
          </CardTitle>
          <p className="text-sm text-gray-500">
            {invitationMode
              ? 'Crie uma senha para acessar o painel da sua empresa.'
              : 'Entre para gerenciar o site da sua empresa.'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!invitationMode && (
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete={invitationMode ? 'new-password' : 'current-password'}
                  minLength={invitationMode ? 12 : undefined}
                  maxLength={invitationMode ? 72 : undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((visible) => !visible)}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {invitationMode && (
              <div className="space-y-2">
                <Label htmlFor="password-confirmation">Confirme a senha</Label>
                <Input
                  id="password-confirmation"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={72}
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  required
                />
              </div>
            )}

            {error && (
              <p className="rounded-md bg-red-50 p-2 text-center text-sm text-red-600">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading || !inviteChecked}>
              {loading ? 'Aguarde...' : invitationMode ? 'Ativar acesso' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
