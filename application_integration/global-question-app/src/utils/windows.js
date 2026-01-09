export const WINDOWS = [
  { id: 'nightowl', label: 'Night Owl', start: '00:00', end: '04:30' },
  { id: 'early', label: 'Early Bird', start: '04:30', end: '10:00' },
  { id: 'midmorning', label: 'Mid-Morning', start: '10:00', end: '12:00' },
  { id: 'midday', label: 'Midday', start: '12:00', end: '15:00' },
  { id: 'evening', label: 'Evening', start: '15:00', end: '20:00' },
  { id: 'late', label: 'Late Evening', start: '20:00', end: '21:00' },
  { id: 'last', label: 'Last Chance', start: '21:00', end: '24:00' },
]

export function getTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function getMinutesNow(tz) {
  const now = new Date().toLocaleString('en-GB', { timeZone: tz })
  const d = new Date(now)
  return d.getHours() * 60 + d.getMinutes()
}

export function getCurrentWindow(tz = getTimezone()) {
  const mins = getMinutesNow(tz)
  for (const w of WINDOWS) {
    const [sh, sm] = w.start.split(':').map(Number)
    const [eh, em] = w.end.split(':').map(Number)
    const start = sh * 60 + sm
    const end = eh * 60 + em
    if (mins >= start && mins < end) return w
  }
  return WINDOWS[WINDOWS.length - 1]
}

export function getNextWindow(tz = getTimezone()) {
  const mins = getMinutesNow(tz)
  for (const w of WINDOWS) {
    const [eh, em] = w.end.split(':').map(Number)
    const end = eh * 60 + em
    if (mins < end) return w
  }
  return WINDOWS[0] // rollover next day
}

export function getTimeRemainingToNextWindow(tz = getTimezone()) {
  const now = new Date()
  const curr = getCurrentWindow(tz)
  const next = getNextWindow(tz)

  const target = next.id === curr.id ? curr.end : next.start

  const [th, tm] = target.split(':').map(Number)
  const local = new Date(now.toLocaleString('en-GB', { timeZone: tz }))
  const targetDate = new Date(local)
  targetDate.setHours(th, tm, 0, 0)

  if (targetDate.getTime() <= local.getTime()) {
    targetDate.setDate(targetDate.getDate() + 1)
  }

  const diff = targetDate.getTime() - local.getTime()
  const hrs = Math.floor(diff / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  const secs = Math.floor((diff % 60000) / 1000)

  return {
    hours: hrs,
    minutes: mins,
    seconds: secs,
    formatted: `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
    nextWindow: next.id,
    currentWindow: curr.id,
  }
}

export function getTimeRemainingToEndOfCurrent(tz = getTimezone()) {
  const curr = getCurrentWindow(tz)
  const mins = getMinutesNow(tz)
  const [eh, em] = curr.end.split(':').map(Number)
  const end = eh * 60 + em
  const diff = end - mins

  return {
    window: curr.id,
    minutes: diff,
    hours: Math.floor(diff / 60),
    mins: diff % 60,
  }
}

export function todayKey(tz = getTimezone()) {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz })
}
