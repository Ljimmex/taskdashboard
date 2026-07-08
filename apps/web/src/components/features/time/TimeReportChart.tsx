import { BarChart2 } from 'lucide-react'

export function TimeReportChart() {
  // Simple mock chart visualization
  const days = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']
  const values = [65, 45, 85, 30, 95, 20, 10]
  const maxValue = Math.max(...values)

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#12121a]/50 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h3 className="mb-1 text-sm font-semibold text-white">Raport Tygodniowy</h3>
          <p className="text-xs text-gray-500">Czas spędzony w tym tygodniu</p>
        </div>
        <div className="rounded-lg bg-[#F2CE88]/10 p-2">
          <BarChart2 className="h-5 w-5 text-[#F2CE88]" />
        </div>
      </div>

      <div className="flex h-40 items-end justify-between gap-2">
        {days.map((day, index) => (
          <div key={day} className="flex flex-1 flex-col items-center gap-3">
            <div className="group relative w-full">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-[#F2CE88]/20 to-[#F2CE88] transition-all duration-500 group-hover:brightness-110"
                style={{
                  height: `${(values[index] / maxValue) * 100}%`,
                  minHeight: '4px',
                }}
              >
                <div className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {Math.floor(values[index] / 10)}h {(values[index] % 10) * 6}m
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tighter text-gray-500">
              {day}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4 border-t border-gray-800/50 pt-8">
        <div className="border-r border-gray-800/50 text-center">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Suma</p>
          <p className="font-mono text-lg font-bold text-white">35h 24m</p>
        </div>
        <div className="border-r border-gray-800/50 text-center">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Średnia
          </p>
          <p className="font-mono text-lg font-bold text-white">5h 03m</p>
        </div>
        <div className="text-center text-[#10b981]">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Cel</p>
          <p className="font-mono text-lg font-bold text-[#10b981]">88%</p>
        </div>
      </div>
    </div>
  )
}
