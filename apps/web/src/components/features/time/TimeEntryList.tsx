import { Clock, User, Calendar, Trash2 } from 'lucide-react'

interface TimeEntry {
    id: string
    taskTitle: string
    projectName: string
    duration: string
    date: string
    userName: string
    userAvatar?: string
}

const MOCK_ENTRIES: TimeEntry[] = [
    {
        id: '1',
        taskTitle: 'Design system updates',
        projectName: 'Zadano Web App',
        duration: '02:15:00',
        date: 'Dzisiaj, 12:30',
        userName: 'Marcia Cross'
    },
    {
        id: '2',
        taskTitle: 'Bug fix: Mobile responsive menu',
        projectName: 'E-commerce Platform',
        duration: '00:45:30',
        date: 'Dzisiaj, 09:15',
        userName: 'Ja (Ty)'
    },
    {
        id: '3',
        taskTitle: 'API Integration for Tasks',
        projectName: 'Zadano Backend',
        duration: '04:20:15',
        date: 'Wczoraj, 14:00',
        userName: 'Agatha Mayer'
    }
]

export function TimeEntryList() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Ostatnie Wpisy</h3>
                <span className="text-xs text-gray-500">{MOCK_ENTRIES.length} wpisów</span>
            </div>

            <div className="space-y-2">
                {MOCK_ENTRIES.map((entry) => (
                    <div
                        key={entry.id}
                        className="group relative bg-[#12121a]/50 border border-gray-800 rounded-xl p-4 hover:border-[#F2CE88]/30 transition-all hover:bg-gray-800/20"
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-[#F2CE88] uppercase tracking-tighter">
                                        {entry.projectName}
                                    </span>
                                </div>
                                <h4 className="text-sm font-semibold text-white truncate group-hover:text-[#F2CE88] transition-colors">
                                    {entry.taskTitle}
                                </h4>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3 h-3 text-gray-500" />
                                        <span className="text-[10px] text-gray-500">{entry.date}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-3 h-3 text-gray-500" />
                                        <span className="text-[10px] text-gray-500">{entry.userName}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-gray-800 group-hover:border-[#F2CE88]/20 transition-all">
                                    <Clock className="w-3.5 h-3.5 text-[#F2CE88]" />
                                    <span className="text-sm font-mono font-bold text-white tracking-widest">
                                        {entry.duration}
                                    </span>
                                </div>
                                <button className="p-1.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {MOCK_ENTRIES.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-2xl">
                    <p className="text-sm text-gray-500">Brak zarejestrowanego czasu.</p>
                </div>
            )}
        </div>
    )
}
