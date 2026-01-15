export const WINDOWS = [
  { id: 'nightowl', label: 'Night Owl', start: '00:00', end: '04:30' },
  { id: 'early', label: 'Early Bird', start: '04:30', end: '10:00' },
  { id: 'midmorning', label: 'Mid-Morning', start: '10:00', end: '12:00' },
  { id: 'midday', label: 'Midday', start: '12:00', end: '15:00' },
  { id: 'evening', label: 'Evening', start: '15:00', end: '20:00' },
  { id: 'late', label: 'Late Evening', start: '20:00', end: '21:00' },
  // note: '24:00' replaced by '00:00' to avoid invalid Date edge cases
  { id: 'last', label: 'Last Chance', start: '21:00', end: '00:00' },
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

    // handling "end = 00:00" as next day rollover
    if (w.end === '00:00') {
      if (mins >= start || mins < 0) return w
    } else {
      if (mins >= start && mins < end) return w
    }
  }

  // fallback (should not usually happen)
  return WINDOWS[0]
}

export function getNextWindow(tz = getTimezone()) {
  const mins = getMinutesNow(tz)

  for (const w of WINDOWS) {
    const [eh, em] = w.end.split(':').map(Number)
    const end = eh * 60 + em

    // if this window ends after now → it's the next candidate
    if (w.end === '00:00') {
      // midnight window → next is the first next day window
      return WINDOWS[0]
    }

    if (mins < end) return w
  }

  // if all windows have passed, next window is start of next day
  return WINDOWS[0]
}

export function getTimeRemainingToNextWindow(tz = getTimezone()) {
  const curr = getCurrentWindow(tz)
  const next = getNextWindow(tz)

  // safety guard — avoid NaN issues
  if (!curr || !next) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: 'Soon',
      nextWindow: next?.id || null,
      currentWindow: curr?.id || null,
    }
  }

  const target = curr.id === next.id ? curr.end : next.start

  if (!target || typeof target !== 'string' || !target.includes(':')) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: 'Soon',
      nextWindow: next.id,
      currentWindow: curr.id,
    }
  }

  const [th, tm] = target.split(':').map(Number)

  const local = new Date(new Date().toLocaleString('en-GB', { timeZone: tz }))

  const targetDate = new Date(local)
  targetDate.setHours(th, tm, 0, 0)

  // if target has passed → schedule for tomorrow
  if (targetDate <= local) {
    targetDate.setDate(targetDate.getDate() + 1)
  }

  const diff = targetDate.getTime() - local.getTime()

  if (diff <= 0 || isNaN(diff)) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: 'Soon',
      nextWindow: next.id,
      currentWindow: curr.id,
    }
  }

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
