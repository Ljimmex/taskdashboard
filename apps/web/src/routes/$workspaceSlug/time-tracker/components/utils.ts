export const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export const formatMinutes = (minutes: number): string => {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

export const formatHours = (hours: number): string => {
  const totalMinutes = Math.floor(hours * 60)
  return formatMinutes(totalMinutes)
}
