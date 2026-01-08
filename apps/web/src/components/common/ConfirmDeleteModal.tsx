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
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center">
                {/* Modal */}
                <div
                    ref={modalRef}
                    className="bg-[#1a1a24] rounded-2xl w-full max-w-md mx-4 shadow-2xl border border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                >
                    {/* Icon */}
                    <div className="pt-8 pb-4 flex justify-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path d="M6 10V24C6 26.2091 7.79086 28 10 28H22C24.2091 28 26 26.2091 26 24V10H6Z" fill="#ef4444" />
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
                        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                        <p className="text-sm text-gray-400">{message}</p>
                    </div>

                    {/* Actions */}
                    <div className="p-6 border-t border-gray-800 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-800 text-gray-300 rounded-xl font-medium hover:bg-gray-700 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm()
                                onClose()
                            }}
                            className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
