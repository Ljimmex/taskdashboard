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
    userName: 'Marcia Cross',
  },
  {
    id: '2',
    taskTitle: 'Bug fix: Mobile responsive menu',
    projectName: 'E-commerce Platform',
    duration: '00:45:30',
    date: 'Dzisiaj, 09:15',
    userName: 'Ja (Ty)',
  },
  {
    id: '3',
    taskTitle: 'API Integration for Tasks',
    projectName: 'Zadano Backend',
    duration: '04:20:15',
    date: 'Wczoraj, 14:00',
    userName: 'Agatha Mayer',
  },
]

export function TimeEntryList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
          Ostatnie Wpisy
        </h3>
        <span className="text-xs text-gray-500">{MOCK_ENTRIES.length} wpisów</span>
      </div>

      <div className="space-y-2">
        {MOCK_ENTRIES.map((entry) => (
          <div
            key={entry.id}
            className="group relative rounded-xl border border-gray-800 bg-[#12121a]/50 p-4 transition-all hover:border-[#F2CE88]/30 hover:bg-gray-800/20"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-tighter text-[#F2CE88]">
                    {entry.projectName}
                  </span>
                </div>
                <h4 className="truncate text-sm font-semibold text-white transition-colors group-hover:text-[#F2CE88]">
                  {entry.taskTitle}
                </h4>
                <div className="mt-2 flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-gray-500" />
                    <span className="text-[10px] text-gray-500">{entry.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-gray-500" />
                    <span className="text-[10px] text-gray-500">{entry.userName}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-gray-800 bg-black/40 px-3 py-1.5 transition-all group-hover:border-[#F2CE88]/20">
                  <Clock className="h-3.5 w-3.5 text-[#F2CE88]" />
                  <span className="font-mono text-sm font-bold tracking-widest text-white">
                    {entry.duration}
                  </span>
                </div>
                <button className="p-1.5 text-gray-600 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {MOCK_ENTRIES.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-800 py-12 text-center">
          <p className="text-sm text-gray-500">Brak zarejestrowanego czasu.</p>
        </div>
      )}
    </div>
  )
}
