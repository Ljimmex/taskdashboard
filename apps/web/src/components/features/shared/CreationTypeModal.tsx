import React from 'react';
import { FileText, Palette, X } from 'lucide-react';

interface CreationTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateDocument: () => void;
    onCreateBoard: () => void;
}

export const CreationTypeModal: React.FC<CreationTypeModalProps> = ({
    isOpen,
    onClose,
    onCreateDocument,
    onCreateBoard
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-lg bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--app-border)]">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--app-text-primary)]">Co chcesz stworzyć?</h2>
                        <p className="text-sm text-[var(--app-text-muted)] mt-1">Wybierz rodzaj nowej zawartości</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-[var(--app-bg-elevated)] text-[var(--app-text-muted)] transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 grid grid-cols-2 gap-4">
                    <button
                        onClick={() => {
                            onCreateDocument();
                            onClose();
                        }}
                        className="group relative flex flex-col items-center gap-4 p-8 rounded-2xl bg-[var(--app-bg-elevated)] border border-transparent hover:border-[var(--app-accent)]/30 hover:bg-[var(--app-bg-card)] transition-all text-center"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-[var(--app-accent)]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FileText size={32} className="text-[var(--app-accent)]" />
                        </div>
                        <div>
                            <h3 className="font-bold text-[var(--app-text-primary)]">Nowy Dokument</h3>
                            <p className="text-xs text-[var(--app-text-muted)] mt-1 leading-relaxed">
                                Notatki, plany i dokumentacja tekstowa
                            </p>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            onCreateBoard();
                            onClose();
                        }}
                        className="group relative flex flex-col items-center gap-4 p-8 rounded-2xl bg-[var(--app-bg-elevated)] border border-transparent hover:border-purple-500/30 hover:bg-[var(--app-bg-card)] transition-all text-center"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Palette size={32} className="text-purple-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-[var(--app-text-primary)]">Nowa Tablica</h3>
                            <p className="text-xs text-[var(--app-text-muted)] mt-1 leading-relaxed">
                                Szkice, diagramy i wizualna praca z zespołem
                            </p>
                        </div>
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4 bg-[var(--app-bg-sidebar)]/50 border-t border-[var(--app-border)] text-center">
                    <p className="text-[10px] text-[var(--app-text-muted)] uppercase tracking-widest font-bold">
                        Nowa zawartość zostanie przypisana do aktualnego obszaru roboczego
                    </p>
                </div>
            </div>

            {/* Click outside to close */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>
    );
};
