import { useState } from 'react'
import { X, Link as LinkIcon, Check } from 'lucide-react'

interface LinkInputProps {
  open: boolean
  onClose: () => void
  onAdd: (link: { url: string; title?: string }) => void
}

export function LinkInput({ open, onClose, onAdd }: LinkInputProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  const validateUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url)
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  const handleSubmit = () => {
    if (!url.trim()) {
      setError('URL jest wymagany')
      return
    }

    if (!validateUrl(url)) {
      setError('Nieprawidłowy format URL. Użyj http:// lub https://')
      return
    }

    onAdd({
      url: url.trim(),
      title: title.trim() || undefined,
    })

    // Reset
    setUrl('')
    setTitle('')
    setError('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-xl border border-gray-800 bg-[#12121a] p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <LinkIcon className="h-5 w-5" />
            Dodaj link
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 transition-colors hover:bg-gray-800">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* URL Input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              URL <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setError('')
              }}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-gray-800 bg-[#1a1a24] px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-amber-500/50"
              autoFocus
            />
          </div>

          {/* Title Input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Tytuł (opcjonalny)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nazwa linku"
              className="w-full rounded-lg border border-gray-800 bg-[#1a1a24] px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            Anuluj
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-medium text-black transition-colors hover:bg-amber-400"
          >
            <Check className="h-4 w-4" />
            Dodaj link
          </button>
        </div>
      </div>
    </div>
  )
}
