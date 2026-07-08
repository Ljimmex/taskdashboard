import React from 'react'
import { FileText, Palette, X } from 'lucide-react'

interface CreationTypeModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateDocument: () => void
  onCreateBoard: () => void
}

export const CreationTypeModal: React.FC<CreationTypeModalProps> = ({
  isOpen,
  onClose,
  onCreateDocument,
  onCreateBoard,
}) => {
  if (!isOpen) return null

  return (
    <div className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div
        className="animate-in zoom-in-95 relative w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-2xl duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--app-border)] p-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--app-text-primary)]">
              Co chcesz stworzyć?
            </h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">
              Wybierz rodzaj nowej zawartości
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-2 gap-4 p-6">
          <button
            onClick={() => {
              onCreateDocument()
              onClose()
            }}
            className="hover:border-[var(--app-accent)]/30 group relative flex flex-col items-center gap-4 rounded-2xl border border-transparent bg-[var(--app-bg-elevated)] p-8 text-center transition-all hover:bg-[var(--app-bg-card)]"
          >
            <div className="bg-[var(--app-accent)]/10 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform group-hover:scale-110">
              <FileText size={32} className="text-[var(--app-accent)]" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--app-text-primary)]">Nowy Dokument</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--app-text-muted)]">
                Notatki, plany i dokumentacja tekstowa
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              onCreateBoard()
              onClose()
            }}
            className="group relative flex flex-col items-center gap-4 rounded-2xl border border-transparent bg-[var(--app-bg-elevated)] p-8 text-center transition-all hover:border-purple-500/30 hover:bg-[var(--app-bg-card)]"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 transition-transform group-hover:scale-110">
              <Palette size={32} className="text-purple-500" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--app-text-primary)]">Nowa Tablica</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--app-text-muted)]">
                Szkice, diagramy i wizualna praca z zespołem
              </p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="bg-[var(--app-bg-sidebar)]/50 border-t border-[var(--app-border)] p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">
            Nowa zawartość zostanie przypisana do aktualnego obszaru roboczego
          </p>
        </div>
      </div>

      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  )
}
