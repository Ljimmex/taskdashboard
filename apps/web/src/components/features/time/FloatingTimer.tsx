import { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, ChevronRight, Clock, Minimize2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { usePanelStore } from '../../../lib/panelStore'

export function FloatingTimer() {
  const isPanelOpen = usePanelStore((state) => state.isPanelOpen)
  const [time, setTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(true)

  useEffect(() => {
    let interval: any
    if (isRunning) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  // Hide when any panel is open (after all hooks!)
  if (isPanelOpen) return null

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const toggleTimer = () => setIsRunning(!isRunning)
  const resetTimer = () => {
    setIsRunning(false)
    setTime(0)
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="animate-in fade-in zoom-in fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#F2CE88] shadow-lg transition-all hover:bg-[#d4b476]"
      >
        <Clock className="h-6 w-6 text-black" />
        {isRunning && (
          <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-red-500" />
        )}
      </button>
    )
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl bg-[#12121a]/90 shadow-2xl backdrop-blur-md transition-all duration-300',
        isExpanded ? 'w-64' : 'h-16 w-16 items-center justify-center overflow-hidden'
      )}
    >
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex h-full w-full items-center justify-center transition-colors hover:bg-gray-800/50"
        >
          <div className="relative">
            <Clock className="h-6 w-6 text-[#F2CE88]" />
            {isRunning && (
              <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-red-500" />
            )}
          </div>
        </button>
      ) : (
        <>
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#F2CE88]" />
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Zadano Timer
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
                  title="Minimalizuj"
                >
                  <Minimize2 className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
                  title="Zwiń"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="mb-6 text-center">
              <div className="rounded-xl bg-black/20 py-3 font-mono text-3xl font-bold tracking-widest text-white shadow-inner">
                {formatTime(time)}
              </div>
              <p className="mt-2 text-[10px] font-medium uppercase tracking-tight text-gray-500">
                Czas trwania sesji
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={resetTimer}
                className="rounded-xl bg-gray-800/30 p-3 text-gray-400 transition-all hover:bg-gray-800/60 hover:text-white"
                title="Resetuj"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
              <button
                onClick={toggleTimer}
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all active:scale-95',
                  isRunning
                    ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                    : 'bg-[#F2CE88] text-black hover:bg-[#e1bf7d]'
                )}
              >
                {isRunning ? (
                  <Pause className="h-6 w-6 fill-current" />
                ) : (
                  <Play className="ml-1 h-6 w-6 fill-current" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-auto rounded-b-2xl bg-black/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-tighter text-gray-500">
                Aktywne Zadanie
              </span>
              <span className="max-w-[120px] truncate text-[10px] font-semibold text-[#F2CE88]">
                Brak wyboru
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
