import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FileText, Palette, X, Sparkles, ArrowRight, Check } from 'lucide-react'
import { clsx } from 'clsx'

interface CreationSidePanelProps {
  isOpen: boolean
  onClose: () => void
  onCreateDocument: (name: string) => void
  onCreateBoard: (name: string) => void
}

export const CreationSidePanel: React.FC<CreationSidePanelProps> = ({
  isOpen,
  onClose,
  onCreateDocument,
  onCreateBoard,
}) => {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [type, setType] = useState<'document' | 'board'>('document')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setName('')
      setType('document')
    }
  }, [isOpen])

  if (!mounted) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalName =
      name.trim() ||
      (type === 'document'
        ? t('docs.new_untitled', { defaultValue: 'Bez tytułu' })
        : t('board.new_untitled', { defaultValue: 'Nowa tablica' }))

    if (type === 'document') {
      onCreateDocument(finalName)
    } else {
      onCreateBoard(finalName)
    }
    onClose()
    setName('')
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={clsx(
          'fixed inset-0 z-[70] flex w-full max-w-none transform flex-col rounded-none border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-2xl transition-transform duration-300 ease-out sm:inset-auto sm:bottom-4 sm:right-4 sm:top-4 sm:w-[448px] sm:max-w-md sm:rounded-2xl',
          isOpen ? 'translate-x-0' : 'translate-x-full sm:translate-x-[calc(100%+2rem)]'
        )}
      >
        {/* Header */}
        <div className="flex-none rounded-t-2xl border-b border-[var(--app-border)] bg-[var(--app-bg-sidebar)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--app-text-primary)]">
                {t('creation.title', { defaultValue: 'Nowy zasób' })}
              </h2>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                {t('creation.subtitle', { defaultValue: 'Wybierz typ i nazwij swój nowy element' })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
            {/* Name Input */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
                {t('creation.name_label', { defaultValue: 'Nazwa zasobu' })}
              </label>
              <div className="relative">
                <Sparkles
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--app-accent)]"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('creation.name_placeholder', { defaultValue: 'Wpisz nazwę...' })}
                  autoFocus
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-elevated)] px-4 py-3 pl-11 text-sm text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] outline-none transition-colors focus:border-[var(--app-accent)]"
                />
              </div>
            </div>

            {/* Type Selection */}
            <div>
              <label className="mb-3 block text-sm font-medium text-[var(--app-text-secondary)]">
                {t('creation.type_select', { defaultValue: 'Typ zasobu' })}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Document */}
                <button
                  type="button"
                  onClick={() => setType('document')}
                  className={clsx(
                    'group flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition-all',
                    type === 'document'
                      ? 'bg-[var(--app-accent)]/10 border-[var(--app-accent)]'
                      : 'hover:border-[var(--app-accent)]/30 border-[var(--app-border)] bg-[var(--app-bg-elevated)]'
                  )}
                >
                  <div
                    className={clsx(
                      'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                      type === 'document'
                        ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)]'
                        : 'bg-[var(--app-bg-card)] text-[var(--app-text-muted)] group-hover:text-[var(--app-accent)]'
                    )}
                  >
                    <FileText size={22} />
                  </div>
                  <div>
                    <div
                      className={clsx(
                        'text-sm font-semibold',
                        type === 'document'
                          ? 'text-[var(--app-text-primary)]'
                          : 'text-[var(--app-text-secondary)]'
                      )}
                    >
                      {t('creation.document', { defaultValue: 'Dokument' })}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-tight text-[var(--app-text-muted)]">
                      {t('creation.document_desc', { defaultValue: 'Notatki i dokumentacja' })}
                    </div>
                  </div>
                  {type === 'document' && (
                    <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--app-accent)]">
                      <Check size={12} className="text-[var(--app-accent-text)]" strokeWidth={3} />
                    </div>
                  )}
                </button>

                {/* Board */}
                <button
                  type="button"
                  onClick={() => setType('board')}
                  className={clsx(
                    'group relative flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition-all',
                    type === 'board'
                      ? 'bg-[var(--app-accent)]/10 border-[var(--app-accent)]'
                      : 'hover:border-[var(--app-accent)]/30 border-[var(--app-border)] bg-[var(--app-bg-elevated)]'
                  )}
                >
                  <div
                    className={clsx(
                      'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                      type === 'board'
                        ? 'bg-[var(--app-accent)]/20 text-[var(--app-accent)]'
                        : 'bg-[var(--app-bg-card)] text-[var(--app-text-muted)] group-hover:text-[var(--app-accent)]'
                    )}
                  >
                    <Palette size={22} />
                  </div>
                  <div>
                    <div
                      className={clsx(
                        'text-sm font-semibold',
                        type === 'board'
                          ? 'text-[var(--app-text-primary)]'
                          : 'text-[var(--app-text-secondary)]'
                      )}
                    >
                      {t('creation.board', { defaultValue: 'Tablica' })}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-tight text-[var(--app-text-muted)]">
                      {t('creation.board_desc', { defaultValue: 'Wizualne planowanie' })}
                    </div>
                  </div>
                  {type === 'board' && (
                    <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--app-accent)]">
                      <Check size={12} className="text-[var(--app-accent-text)]" strokeWidth={3} />
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-none border-t border-[var(--app-border)] p-6">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--app-accent)] py-3 font-semibold text-[var(--app-accent-text)] transition-opacity hover:opacity-90"
            >
              <span>{t('creation.submit', { defaultValue: 'Stwórz zasób' })}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  )
}
