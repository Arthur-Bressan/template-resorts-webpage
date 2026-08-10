'use client'

import { useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { adminApi } from '@/lib/admin-client'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  label?: string
}

export function ImageUpload({ value, onChange, label }: ImageUploadProps) {
  const [mode, setMode] = useState<'url' | 'file'>('url')
  const [urlInput, setUrlInput] = useState(value || '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim())
      setError('')
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')
    try {
      const res = await adminApi.upload(file)
      const url = res?.url || res?.src || ''
      if (url) {
        onChange(url)
        setUrlInput(url)
      } else {
        setError('Upload returned no URL')
      }
    } catch {
      setError('Falha no upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}

      {value && (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Preview"
            className="h-24 w-24 rounded-lg border border-gray-200 object-cover"
          />
          <button
            type="button"
            onClick={() => { onChange(''); setUrlInput('') }}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={mode === 'url' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('url')}
        >
          URL
        </Button>
        <Button
          type="button"
          variant={mode === 'file' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('file')}
        >
          <Upload className="mr-1 h-3 w-3" />
          Arquivo
        </Button>
      </div>

      {mode === 'url' ? (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://..."
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
          />
          <Button type="button" size="sm" onClick={handleUrlSubmit}>
            Aplicar
          </Button>
        </div>
      ) : (
        <div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 p-3 hover:border-gray-400">
            <ImageIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-500">
              {uploading ? 'Enviando...' : 'Clique para selecionar'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
