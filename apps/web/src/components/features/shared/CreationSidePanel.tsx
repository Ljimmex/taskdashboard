import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Palette, X, Sparkles, ArrowRight, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface CreationSidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateDocument: (name: string) => void;
    onCreateBoard: (name: string) => void;
}

export const CreationSidePanel: React.FC<CreationSidePanelProps> = ({
    isOpen,
    onClose,
    onCreateDocument,
    onCreateBoard
}) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [type, setType] = useState<'document' | 'board'>('document');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setName('');
            setType('document');
        }
    }, [isOpen]);

    if (!mounted) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalName = name.trim() || (type === 'document' ? t('docs.new_untitled', { defaultValue: 'Bez tytułu' }) : t('board.new_untitled', { defaultValue: 'Nowa tablica' }));

        if (type === 'document') {
            onCreateDocument(finalName);
        } else {
            onCreateBoard(finalName);
        }
        onClose();
        setName('');
    };

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={clsx(
                    "fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Panel */}
            <div className={clsx(
                "fixed inset-0 sm:inset-auto sm:top-4 sm:right-4 sm:bottom-4 w-full sm:w-[448px] max-w-none sm:max-w-md bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-none sm:rounded-2xl shadow-2xl z-[70] flex flex-col transform transition-transform duration-300 ease-out",
                isOpen ? "translate-x-0" : "translate-x-full sm:translate-x-[calc(100%+2rem)]"
            )}>
                {/* Header */}
                <div className="flex-none p-6 border-b border-[var(--app-border)] bg-[var(--app-bg-sidebar)] rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--app-text-primary)]">{t('creation.title', { defaultValue: 'Nowy zasób' })}</h2>
                            <p className="text-sm text-[var(--app-text-muted)] mt-1">{t('creation.subtitle', { defaultValue: 'Wybierz typ i nazwij swój nowy element' })}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {/* Name Input */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-2">
                                {t('creation.name_label', { defaultValue: 'Nazwa zasobu' })}
                            </label>
                            <div className="relative">
                                <Sparkles size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--app-accent)]" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('creation.name_placeholder', { defaultValue: 'Wpisz nazwę...' })}
                                    autoFocus
                                    className="w-full text-sm text-[var(--app-text-primary)] bg-[var(--app-bg-elevated)] border border-[var(--app-border)] placeholder-[var(--app-text-muted)] outline-none px-4 py-3 pl-11 rounded-xl focus:border-[var(--app-accent)] transition-colors"
                                />
                            </div>
                        </div>

                        {/* Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-3">
                                {t('creation.type_select', { defaultValue: 'Typ zasobu' })}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {/* Document */}
                                <button
                                    type="button"
                                    onClick={() => setType('document')}
                                    className={clsx(
                                        "group flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition-all",
                                        type === 'document'
                                            ? "bg-[var(--app-accent)]/10 border-[var(--app-accent)]"
                                            : "bg-[var(--app-bg-elevated)] border-[var(--app-border)] hover:border-[var(--app-accent)]/30"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                        type === 'document' ? "bg-[var(--app-accent)]/20 text-[var(--app-accent)]" : "bg-[var(--app-bg-card)] text-[var(--app-text-muted)] group-hover:text-[var(--app-accent)]"
                                    )}>
                                        <FileText size={22} />
                                    </div>
                                    <div>
                                        <div className={clsx("text-sm font-semibold", type === 'document' ? "text-[var(--app-text-primary)]" : "text-[var(--app-text-secondary)]")}>
                                            {t('creation.document', { defaultValue: 'Dokument' })}
                                        </div>
                                        <div className="text-[11px] text-[var(--app-text-muted)] mt-0.5 leading-tight">{t('creation.document_desc', { defaultValue: 'Notatki i dokumentacja' })}</div>
                                    </div>
                                    {type === 'document' && (
                                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--app-accent)] flex items-center justify-center">
                                            <Check size={12} className="text-[var(--app-accent-text)]" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>

                                {/* Board */}
                                <button
                                    type="button"
                                    onClick={() => setType('board')}
                                    className={clsx(
                                        "group relative flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition-all",
                                        type === 'board'
                                            ? "bg-[var(--app-accent)]/10 border-[var(--app-accent)]"
                                            : "bg-[var(--app-bg-elevated)] border-[var(--app-border)] hover:border-[var(--app-accent)]/30"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                        type === 'board' ? "bg-[var(--app-accent)]/20 text-[var(--app-accent)]" : "bg-[var(--app-bg-card)] text-[var(--app-text-muted)] group-hover:text-[var(--app-accent)]"
                                    )}>
                                        <Palette size={22} />
                                    </div>
                                    <div>
                                        <div className={clsx("text-sm font-semibold", type === 'board' ? "text-[var(--app-text-primary)]" : "text-[var(--app-text-secondary)]")}>
                                            {t('creation.board', { defaultValue: 'Tablica' })}
                                        </div>
                                        <div className="text-[11px] text-[var(--app-text-muted)] mt-0.5 leading-tight">{t('creation.board_desc', { defaultValue: 'Wizualne planowanie' })}</div>
                                    </div>
                                    {type === 'board' && (
                                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--app-accent)] flex items-center justify-center">
                                            <Check size={12} className="text-[var(--app-accent-text)]" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex-none p-6 border-t border-[var(--app-border)]">
                        <button
                            type="submit"
                            className="w-full bg-[var(--app-accent)] hover:opacity-90 text-[var(--app-accent-text)] font-semibold py-3 rounded-xl transition-opacity flex items-center justify-center gap-2"
                        >
                            <span>{t('creation.submit', { defaultValue: 'Stwórz zasób' })}</span>
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </form>
            </div>
        </>,
        document.body
    );
};
