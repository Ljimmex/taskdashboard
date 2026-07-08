import { TimeEntryList } from './TimeEntryList'
import { TimeReportChart } from './TimeReportChart'
import { Clock, Download, Filter, Search } from 'lucide-react'

export function TimeTracker() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-white">Monitorowanie Czasu</h1>
          <p className="text-sm text-gray-500">
            Zarządzaj swoimi wpisami czasu i analizuj produktywność.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-800/50 px-4 py-2 text-gray-400 transition-all hover:bg-gray-800 hover:text-white">
            <Download className="h-4 w-4" />
            <span className="text-sm font-medium">Eksportuj</span>
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-[#F2CE88] px-4 py-2 text-black shadow-lg transition-all hover:bg-[#e1bf7d] active:scale-95">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-bold">Dodaj Wpis</span>
          </button>
        </div>
      </div>

      {/* Quick Stats & Chart Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TimeReportChart />
        </div>

        <div className="flex flex-col gap-6">
          {/* Summary Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#F2CE88] to-[#d4b476] p-6 shadow-xl">
            <div className="relative z-10">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-black/60">
                Mój Czas (Dzisiaj)
              </p>
              <h2 className="mb-6 font-mono text-4xl font-bold text-black">03:00:30</h2>
              <div className="flex items-center gap-2 text-black/80">
                <span className="rounded bg-black/10 px-2 py-1 text-xs font-bold">+12%</span>
                <span className="text-xs font-medium">więcej niż wczoraj</span>
              </div>
            </div>
            <Clock className="absolute -bottom-4 -right-4 h-32 w-32 rotate-12 text-black/5" />
          </div>

          {/* Active Sessions Info */}
          <div className="rounded-2xl border border-gray-800 bg-[#12121a]/50 p-6">
            <h3 className="mb-4 text-sm font-semibold text-white">Aktywne Zespoły</h3>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-[#F2CE88]">
                      {i === 1 ? 'MC' : 'AM'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {i === 1 ? 'Marcia Cross' : 'Agatha Mayer'}
                      </p>
                      <p className="text-[10px] text-gray-500">Pracuje nad: Zadanie #{i + 124}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                    <span className="font-mono text-[10px] text-gray-400">01:24:00</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Entries Section */}
      <div className="rounded-2xl border border-gray-800 bg-[#12121a]/50 p-6">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Szukaj we wpisach..."
              className="w-full rounded-xl border border-gray-800 bg-black/40 py-2 pl-10 pr-4 text-sm text-white transition-all focus:border-[#F2CE88]/50 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-gray-800 bg-gray-800/50 p-2 text-gray-400 transition-all hover:text-white">
              <Filter className="h-4 w-4" />
            </button>
            <select className="rounded-lg border border-gray-800 bg-gray-800/50 px-3 py-2 text-sm text-gray-400 transition-all focus:border-[#F2CE88]/50 focus:outline-none">
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
