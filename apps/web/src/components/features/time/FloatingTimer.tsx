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
                setTime(prev => prev + 1)
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
                className="fixed bottom-6 right-6 w-12 h-12 bg-[#F2CE88] rounded-full flex items-center justify-center shadow-lg hover:bg-[#d4b476] transition-all z-50 animate-in fade-in zoom-in"
            >
                <Clock className="w-6 h-6 text-black" />
                {isRunning && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
            </button>
        )
    }

    return (
        <div className={cn(
            "fixed bottom-6 right-6 bg-[#12121a]/90 backdrop-blur-md rounded-2xl shadow-2xl transition-all duration-300 z-50 flex flex-col",
            isExpanded ? "w-64" : "w-16 h-16 items-center justify-center overflow-hidden"
        )}>
            {!isExpanded ? (
                <button
                    onClick={() => setIsExpanded(true)}
                    className="w-full h-full flex items-center justify-center hover:bg-gray-800/50 transition-colors"
                >
                    <div className="relative">
                        <Clock className="w-6 h-6 text-[#F2CE88]" />
                        {isRunning && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        )}
                    </div>
                </button>
            ) : (
                <>
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#F2CE88]" />
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Zadano Timer</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsMinimized(true)}
                                    className="p-1 hover:bg-gray-800 rounded-md text-gray-500 hover:text-gray-300 transition-colors"
                                    title="Minimalizuj"
                                >
                                    <Minimize2 className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="p-1 hover:bg-gray-800 rounded-md text-gray-500 hover:text-gray-300 transition-colors"
                                    title="Zwiń"
                                >
                                    <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        <div className="text-center mb-6">
                            <div className="text-3xl font-mono font-bold text-white tracking-widest bg-black/20 py-3 rounded-xl shadow-inner">
                                {formatTime(time)}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 uppercase font-medium tracking-tight">Czas trwania sesji</p>
                        </div>

                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={resetTimer}
                                className="p-3 bg-gray-800/30 hover:bg-gray-800/60 text-gray-400 hover:text-white rounded-xl transition-all"
                                title="Resetuj"
                            >
                                <RotateCcw className="w-5 h-5" />
                            </button>
                            <button
                                onClick={toggleTimer}
                                className={cn(
                                    "w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95",
                                    isRunning
                                        ? "bg-red-500/10 hover:bg-red-500/20 text-red-500"
                                        : "bg-[#F2CE88] hover:bg-[#e1bf7d] text-black"
                                )}
                            >
                                {isRunning ? (
                                    <Pause className="w-6 h-6 fill-current" />
                                ) : (
                                    <Play className="w-6 h-6 fill-current ml-1" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="mt-auto p-3 bg-black/40 rounded-b-2xl">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Aktywne Zadanie</span>
                            <span className="text-[10px] text-[#F2CE88] font-semibold truncate max-w-[120px]">Brak wyboru</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
