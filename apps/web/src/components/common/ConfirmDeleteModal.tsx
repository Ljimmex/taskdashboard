import { useRef, useEffect } from 'react'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Usuń zadanie',
  message = 'Czy na pewno chcesz usunąć to zadanie? Ta operacja jest nieodwracalna.',
  confirmText = 'Usuń',
  cancelText = 'Anuluj',
}: ConfirmDeleteModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center">
        {/* Modal */}
        <div
          ref={modalRef}
          className="animate-in fade-in slide-in-from-bottom sm:zoom-in-95 mx-0 w-full max-w-md overflow-hidden rounded-b-none rounded-t-3xl border border-gray-800 bg-[#1a1a24] shadow-2xl duration-200 sm:mx-4 sm:rounded-2xl"
        >
          {/* Icon */}
          <div className="flex justify-center pb-4 pt-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path
                  d="M6 10V24C6 26.2091 7.79086 28 10 28H22C24.2091 28 26 26.2091 26 24V10H6Z"
                  fill="#ef4444"
                />
                <rect x="4" y="6" width="24" height="4" rx="2" fill="#fca5a5" />
                <path d="M12 4H20V6H12V4Z" fill="#fca5a5" />
                <path d="M12 14V22" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M16 14V22" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M20 14V22" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 text-center">
            <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
            <p className="text-sm text-gray-400">{message}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-gray-800 p-6">
            <button
              onClick={onClose}
              className="flex-1 rounded-b-none rounded-t-3xl bg-gray-800 px-4 py-3 font-medium text-gray-300 transition-colors hover:bg-gray-700 sm:rounded-xl"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className="flex-1 rounded-b-none rounded-t-3xl bg-red-500 px-4 py-3 font-bold text-white transition-colors hover:bg-red-600 sm:rounded-xl"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
