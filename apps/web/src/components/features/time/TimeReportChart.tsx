import { BarChart2 } from 'lucide-react'

export function TimeReportChart() {
    // Simple mock chart visualization
    const days = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']
    const values = [65, 45, 85, 30, 95, 20, 10]
    const maxValue = Math.max(...values)

    return (
        <div className="bg-[#12121a]/50 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-sm font-semibold text-white mb-1">Raport Tygodniowy</h3>
                    <p className="text-xs text-gray-500">Czas spędzony w tym tygodniu</p>
                </div>
                <div className="p-2 bg-[#F2CE88]/10 rounded-lg">
                    <BarChart2 className="w-5 h-5 text-[#F2CE88]" />
                </div>
            </div>

            <div className="flex items-end justify-between gap-2 h-40">
                {days.map((day, index) => (
                    <div key={day} className="flex-1 flex flex-col items-center gap-3">
                        <div className="w-full relative group">
                            <div
                                className="w-full bg-gradient-to-t from-[#F2CE88]/20 to-[#F2CE88] rounded-t-lg transition-all duration-500 group-hover:brightness-110"
                                style={{
                                    height: `${(values[index] / maxValue) * 100}%`,
                                    minHeight: '4px'
                                }}
                            >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    {Math.floor(values[index] / 10)}h {values[index] % 10 * 6}m
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{day}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-gray-800/50">
                <div className="text-center border-r border-gray-800/50">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Suma</p>
                    <p className="text-lg font-mono font-bold text-white">35h 24m</p>
                </div>
                <div className="text-center border-r border-gray-800/50">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Średnia</p>
                    <p className="text-lg font-mono font-bold text-white">5h 03m</p>
                </div>
                <div className="text-center text-[#10b981]">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Cel</p>
                    <p className="text-lg font-mono font-bold text-[#10b981]">88%</p>
                </div>
            </div>
        </div>
    )
}
