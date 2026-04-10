import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Palette, X, Sparkles, ChevronRight } from 'lucide-react';
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
                    "fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Panel */}
            <div className={clsx(
                "fixed inset-0 sm:inset-auto sm:top-4 sm:right-4 sm:bottom-4 w-full sm:w-[448px] max-w-none sm:max-w-md bg-[var(--app-bg-card)] rounded-none sm:rounded-2xl z-[110] flex flex-col shadow-2xl transform transition-transform duration-300 ease-out border border-[var(--app-border)] font-sans overflow-hidden",
                isOpen ? "translate-x-0" : "translate-x-[calc(100%+2rem)]"
            )}>
                {/* Header */}
                <div className="p-6 border-b border-[var(--app-border)] flex items-center justify-between bg-[var(--app-bg-sidebar)]">
                    <div>
                        <h3 className="text-xl font-bold text-[var(--app-text-primary)]">{t('creation.title')}</h3>
                        <p className="text-sm text-[var(--app-text-muted)] mt-1">{t('creation.subtitle')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--app-bg-elevated)] rounded-none sm:rounded-xl text-[var(--app-text-muted)] transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        {/* Name Input */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-widest px-1">
                                {t('creation.name_label')}
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('creation.name_placeholder')}
                                    autoFocus
                                    className="w-full bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-none sm:rounded-xl py-3 px-4 text-sm text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/50 focus:border-[var(--app-accent)] transition-all"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                    <Sparkles size={14} className="text-[var(--app-accent)] animate-pulse" />
                                </div>
                            </div>
                        </div>

                        {/* Type Selection */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-widest px-1">
                                {t('creation.type_select', { defaultValue: 'Wybierz typ' })}
                            </label>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setType('document')}
                                    className={clsx(
                                        "group flex items-center gap-4 p-4 rounded-none sm:rounded-xl border transition-all text-left",
                                        type === 'document'
                                            ? "bg-[var(--app-accent)]/10 border-[var(--app-accent)] shadow-sm"
                                            : "bg-[var(--app-bg-elevated)] border-transparent hover:border-[var(--app-border-hover)]"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-12 h-12 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                                        type === 'document' ? "bg-[var(--app-accent)] text-[var(--app-accent-text)]" : "bg-[var(--app-bg-card)] text-[var(--app-text-muted)]"
                                    )}>
                                        <FileText size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={clsx(
                                            "text-sm font-bold",
                                            type === 'document' ? "text-[var(--app-text-primary)]" : "text-[var(--app-text-secondary)]"
                                        )}>
                                            {t('creation.document')}
                                        </h4>
                                        <p className="text-xs text-[var(--app-text-muted)] truncate">
                                            {t('creation.document_desc')}
                                        </p>
                                    </div>
                                    {type === 'document' && <ChevronRight size={18} className="text-[var(--app-accent)]" />}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setType('board')}
                                    className={clsx(
                                        "group flex items-center gap-4 p-4 rounded-none sm:rounded-xl border transition-all text-left",
                                        type === 'board'
                                            ? "bg-purple-500/10 border-purple-500 shadow-sm"
                                            : "bg-[var(--app-bg-elevated)] border-transparent hover:border-[var(--app-border-hover)]"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-12 h-12 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                                        type === 'board' ? "bg-purple-500 text-white" : "bg-[var(--app-bg-card)] text-[var(--app-text-muted)]"
                                    )}>
                                        <Palette size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={clsx(
                                            "text-sm font-bold",
                                            type === 'board' ? "text-[var(--app-text-primary)]" : "text-[var(--app-text-secondary)]"
                                        )}>
                                            {t('creation.board')}
                                        </h4>
                                        <p className="text-xs text-[var(--app-text-muted)] truncate">
                                            {t('creation.board_desc')}
                                        </p>
                                    </div>
                                    {type === 'board' && <ChevronRight size={18} className="text-purple-500" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-[var(--app-bg-sidebar)] border-t border-[var(--app-border)] space-y-4">
                        <button
                            type="submit"
                            className="w-full py-4 rounded-none sm:rounded-xl bg-[var(--app-accent)] text-[var(--app-accent-text)] font-bold shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            {t('creation.submit')}
                            <ChevronRight size={18} />
                        </button>
                        <p className="text-[10px] text-[var(--app-text-muted)] text-center uppercase tracking-widest font-bold">
                            {t('creation.footer_note')}
                        </p>
                    </div>
                </form>
            </div>
        </>,
        document.body
    );
};
