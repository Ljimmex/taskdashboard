import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Plus, FileText, Image, Palette, StickyNote, Layers } from 'lucide-react'

export const Route = createFileRoute('/$workspaceSlug/board/')({
    component: BoardPage,
})

function BoardPage() {
    const { t } = useTranslation()

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-none px-6 pt-5 pb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-white">{t('dashboard.board', { defaultValue: 'Tablica' })}</h1>
                    <p className="text-sm text-gray-500 mt-1">{t('board.page.subtitle', { defaultValue: 'Dokumenty, notatki i tablice inspiracji' })}</p>
                </div>
            </div>

            {/* Empty State */}
            <div className="flex-1 flex items-center justify-center px-6 pb-16">
                <div className="max-w-md w-full text-center">
                    {/* Illustration — scattered doc/image cards */}
                    <div className="relative mx-auto mb-10 w-56 h-44">
                        {/* Glow */}
                        <div className="absolute inset-4 bg-gradient-to-br from-amber-500/8 to-purple-500/5 rounded-3xl blur-3xl" />

                        {/* Background card — tilted left */}
                        <div className="absolute left-2 top-6 w-20 h-26 rounded-xl bg-[#1a1a24] border border-gray-800/60 -rotate-6 flex flex-col items-center justify-center gap-2 p-3 shadow-lg">
                            <Image size={20} className="text-purple-400/50" />
                            <div className="space-y-1 w-full">
                                <div className="h-1.5 w-full rounded-full bg-purple-400/15" />
                                <div className="h-1.5 w-2/3 rounded-full bg-purple-400/10" />
                            </div>
                        </div>

                        {/* Center card — hero doc */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-2 w-24 h-32 rounded-xl bg-[#1e1e2a] border border-[#F2CE88]/20 flex flex-col items-center gap-2 p-3 shadow-xl z-10">
                            <div className="w-8 h-8 rounded-lg bg-[#F2CE88]/10 flex items-center justify-center">
                                <FileText size={16} className="text-[#F2CE88]/70" />
                            </div>
                            <div className="space-y-1.5 w-full">
                                <div className="h-1.5 w-full rounded-full bg-[#F2CE88]/20" />
                                <div className="h-1.5 w-4/5 rounded-full bg-[#F2CE88]/12" />
                                <div className="h-1.5 w-full rounded-full bg-[#F2CE88]/15" />
                                <div className="h-1.5 w-1/2 rounded-full bg-[#F2CE88]/10" />
                            </div>
                        </div>

                        {/* Right card — tilted right */}
                        <div className="absolute right-2 top-8 w-20 h-24 rounded-xl bg-[#1a1a24] border border-gray-800/60 rotate-6 flex flex-col items-center justify-center gap-2 p-3 shadow-lg">
                            <Palette size={20} className="text-emerald-400/50" />
                            <div className="grid grid-cols-3 gap-1 w-full">
                                <div className="h-3 rounded-sm bg-amber-400/20" />
                                <div className="h-3 rounded-sm bg-purple-400/20" />
                                <div className="h-3 rounded-sm bg-emerald-400/20" />
                                <div className="h-3 rounded-sm bg-blue-400/20" />
                                <div className="h-3 rounded-sm bg-pink-400/20" />
                                <div className="h-3 rounded-sm bg-orange-400/20" />
                            </div>
                        </div>
                    </div>

                    {/* Text */}
                    <h2 className="text-2xl font-bold text-white mb-3">
                        {t('board.page.empty_title', { defaultValue: 'Zacznij tworzyć' })}
                    </h2>
                    <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
                        {t('board.page.empty_description', { defaultValue: 'Stwórz dokumenty, tablice inspiracji, notatki i kolekcje wizualne dla swojego zespołu. Wszystko w jednym miejscu.' })}
                    </p>

                    {/* CTA */}
                    <button
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#F2CE88] text-[#0a0a0f] text-sm font-bold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus size={16} strokeWidth={3} />
                        {t('board.page.create', { defaultValue: 'Nowa tablica' })}
                    </button>

                    {/* Feature cards */}
                    <div className="mt-12 grid grid-cols-3 gap-4">
                        <div className="flex flex-col items-center gap-2.5 p-3 rounded-xl bg-[#12121a] hover:bg-[#1a1a24] transition-colors">
                            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <FileText size={16} className="text-amber-500/70" />
                            </div>
                            <span className="text-xs text-gray-500">{t('board.page.hint_docs', { defaultValue: 'Dokumenty' })}</span>
                        </div>
                        <div className="flex flex-col items-center gap-2.5 p-3 rounded-xl bg-[#12121a] hover:bg-[#1a1a24] transition-colors">
                            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                <Layers size={16} className="text-purple-500/70" />
                            </div>
                            <span className="text-xs text-gray-500">{t('board.page.hint_moodboard', { defaultValue: 'Moodboard' })}</span>
                        </div>
                        <div className="flex flex-col items-center gap-2.5 p-3 rounded-xl bg-[#12121a] hover:bg-[#1a1a24] transition-colors">
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <StickyNote size={16} className="text-emerald-500/70" />
                            </div>
                            <span className="text-xs text-gray-500">{t('board.page.hint_notes', { defaultValue: 'Notatki' })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
