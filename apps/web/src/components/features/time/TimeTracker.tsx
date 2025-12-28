import { TimeEntryList } from './TimeEntryList'
import { TimeReportChart } from './TimeReportChart'
import { Clock, Download, Filter, Search } from 'lucide-react'

export function TimeTracker() {
    return (
        <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Monitorowanie Czasu</h1>
                    <p className="text-sm text-gray-500">Zarządzaj swoimi wpisami czasu i analizuj produktywność.</p>
                </div>

                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white px-4 py-2 rounded-xl transition-all border border-gray-800">
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-medium">Eksportuj</span>
                    </button>
                    <button className="flex items-center gap-2 bg-[#F2CE88] hover:bg-[#e1bf7d] text-black px-4 py-2 rounded-xl transition-all shadow-lg active:scale-95">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-bold">Dodaj Wpis</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats & Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <TimeReportChart />
                </div>

                <div className="flex flex-col gap-6">
                    {/* Summary Card */}
                    <div className="bg-gradient-to-br from-[#F2CE88] to-[#d4b476] rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-black/60 text-[10px] font-bold uppercase tracking-widest mb-1">Mój Czas (Dzisiaj)</p>
                            <h2 className="text-4xl font-mono font-bold text-black mb-6">03:00:30</h2>
                            <div className="flex items-center gap-2 text-black/80">
                                <span className="bg-black/10 px-2 py-1 rounded text-xs font-bold">+12%</span>
                                <span className="text-xs font-medium">więcej niż wczoraj</span>
                            </div>
                        </div>
                        <Clock className="absolute -bottom-4 -right-4 w-32 h-32 text-black/5 rotate-12" />
                    </div>

                    {/* Active Sessions Info */}
                    <div className="bg-[#12121a]/50 border border-gray-800 rounded-2xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">Aktywne Zespoły</h3>
                        <div className="space-y-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-[#F2CE88]">
                                            {i === 1 ? 'MC' : 'AM'}
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-white">{i === 1 ? 'Marcia Cross' : 'Agatha Mayer'}</p>
                                            <p className="text-[10px] text-gray-500">Pracuje nad: Zadanie #{i + 124}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                        <span className="text-[10px] font-mono text-gray-400">01:24:00</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Entries Section */}
            <div className="bg-[#12121a]/50 border border-gray-800 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Szukaj we wpisach..."
                            className="w-full bg-black/40 border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#F2CE88]/50 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="p-2 bg-gray-800/50 text-gray-400 hover:text-white rounded-lg transition-all border border-gray-800">
                            <Filter className="w-4 h-4" />
                        </button>
                        <select className="bg-gray-800/50 border border-gray-800 rounded-lg py-2 px-3 text-sm text-gray-400 focus:outline-none focus:border-[#F2CE88]/50 transition-all">
                            <option>Ten Tydzień</option>
                            <option>Poprzedni Tydzień</option>
                            <option>Ten Miesiąc</option>
                        </select>
                    </div>
                </div>

                <TimeEntryList />
            </div>
        </div>
    )
}
