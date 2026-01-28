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
            title: title.trim() || undefined
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
            <div className="relative bg-[#12121a] border border-gray-800 rounded-xl max-w-md w-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <LinkIcon className="w-5 h-5" />
                        Dodaj link
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    {/* URL Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
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
                            className="w-full px-3 py-2 bg-[#1a1a24] border border-gray-800 rounded-lg text-white placeholder-gray-500 outline-none focus:border-amber-500/50"
                            autoFocus
                        />
                    </div>

                    {/* Title Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Tytuł (opcjonalny)
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Nazwa linku"
                            className="w-full px-3 py-2 bg-[#1a1a24] border border-gray-800 rounded-lg text-white placeholder-gray-500 outline-none focus:border-amber-500/50"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors flex items-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        Dodaj link
                    </button>
                </div>
            </div>
        </div>
    )
}
