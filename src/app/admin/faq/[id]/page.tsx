'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { adminApi } from '@/lib/admin-client'
import { toast } from 'sonner'

interface FAQData {
  id: string
  question: string
  answer: string
  published: boolean
  sortOrder: number
}

export default function EditFAQPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isNew, setIsNew] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [published, setPublished] = useState(true)
  const [sortOrder, setSortOrder] = useState('0')

  useEffect(() => {
    if (id === 'new') {
      setIsNew(true)
      setLoading(false)
      return
    }
    adminApi.faq.get(id)
      .then((res: FAQData) => {
        if (res) {
          setQuestion(res.question || '')
          setAnswer(res.answer || '')
          setPublished(res.published ?? true)
          setSortOrder(String(res.sortOrder ?? 0))
        }
      })
      .catch(() => toast.error('Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    if (!question || !answer) { toast.error('Pergunta e resposta são obrigatórias'); return }
    setSaving(true)
    const data = { question, answer, published, sortOrder: parseInt(sortOrder) || 0 }
    try {
      if (isNew) {
        await adminApi.faq.create(data)
        toast.success('Pergunta criada!')
      } else {
        await adminApi.faq.update(id, data)
        toast.success('Pergunta atualizada!')
      }
      router.push('/admin/faq')
    } catch { toast.error('Erro ao salvar') }
    finally { setSaving(false) }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" /></div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/faq')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{isNew ? 'Nova Pergunta' : 'Editar Pergunta'}</h2>
          <p className="text-sm text-gray-500">{isNew ? 'Adicione ao FAQ' : 'Modifique os dados'}</p>
        </div>
      </div>

      <Card className="border border-gray-200">
        <CardHeader><CardTitle className="text-lg">Dados da pergunta</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Pergunta</Label><Input value={question} onChange={(e) => setQuestion(e.target.value)} /></div>
          <div className="space-y-2"><Label>Resposta</Label><Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={6} /></div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><Label>Publicado</Label><Switch checked={published} onCheckedChange={setPublished} /></div>
            <div className="space-y-2"><Label>Ordem</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-24" /></div>
          </div>
        </CardContent>
      </Card>

      <Separator />
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/admin/faq')}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : isNew ? 'Criar' : 'Salvar'}</Button>
      </div>
    </div>
  )
}