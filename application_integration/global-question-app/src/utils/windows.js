// =====================================================
// TIME WINDOW DEFINITIONS
// =====================================================

export const WINDOWS = [
  { id: 'nightowl', label: 'Night Owl', start: '00:00', end: '04:30' },
  { id: 'early', label: 'Early Bird', start: '04:30', end: '10:00' },
  { id: 'midmorning', label: 'Mid-Morning', start: '10:00', end: '12:00' },
  { id: 'midday', label: 'Midday', start: '12:00', end: '15:00' },
  { id: 'evening', label: 'Evening', start: '15:00', end: '20:00' },
  { id: 'late', label: 'Late Evening', start: '20:00', end: '21:00' },
  { id: 'last', label: 'Last Chance', start: '21:00', end: '00:00' }, // midnight rollover
]

// =====================================================
// TIMEZONE HANDLING (FALLBACK SAFE)
// =====================================================

export function getTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return tz || 'Europe/London'
  } catch (err) {
    return 'Europe/London'
  }
}

// =====================================================
// MINUTE CALCULATION — TZ SAFE
// =====================================================

export function getMinutesNow(tz = getTimezone()) {
  // we force the date to the correct timezone
  const now = new Date().toLocaleString('en-GB', { timeZone: tz })
  const d = new Date(now)
  return d.getHours() * 60 + d.getMinutes()
}

// =====================================================
// CURRENT WINDOW DETECTION
// =====================================================

export function getCurrentWindow(tz = getTimezone()) {
  const mins = getMinutesNow(tz)

  for (const w of WINDOWS) {
    const [sh, sm] = w.start.split(':').map(Number)
    const [eh, em] = w.end.split(':').map(Number)
    const start = sh * 60 + sm
    const end = eh * 60 + em

    // midnight rollover case (21:00 → 00:00)
    if (w.end === '00:00') {
      if (mins >= start) return w // 21:00 → midnight
      continue
    }

    // normal case
    if (mins >= start && mins < end) return w
  }

  // fallback: before first window → belongs to W0
  return WINDOWS[0]
}

// =====================================================
// NEXT WINDOW DETECTION
// =====================================================

export function getNextWindow(tz = getTimezone()) {
  const mins = getMinutesNow(tz)

  for (const w of WINDOWS) {
    const [eh, em] = w.end.split(':').map(Number)
    const end = eh * 60 + em

    if (w.end === '00:00') {
      return WINDOWS[0] // last → nightowl next day
    }

    if (mins < end) return w
  }

  // beyond last window for today → start at next-day nightowl
  return WINDOWS[0]
}

// =====================================================
// COUNTDOWN FUNCTION (NO NaN)
// =====================================================

export function getTimeRemainingToNextWindow(tz = getTimezone()) {
  const curr = getCurrentWindow(tz)
  const next = getNextWindow(tz)

  const target = curr.id === next.id ? curr.end : next.start
  const [th, tm] = target.split(':').map(Number)

  const local = new Date(new Date().toLocaleString('en-GB', { timeZone: tz }))

  let targetDate = new Date(local)
  targetDate.setHours(th, tm, 0, 0)

  // If target already passed today → move to tomorrow
  if (targetDate <= local) {
    targetDate.setDate(targetDate.getDate() + 1)
  }

  let diff = targetDate - local

  // Fallback guard: if diff is invalid (NaN or <= 0)
  // compute next valid window tomorrow
  if (!diff || isNaN(diff) || diff <= 0) {
    const nextTomorrow = new Date(local)
    nextTomorrow.setDate(local.getDate() + 1)
    nextTomorrow.setHours(th, tm, 0, 0)
    diff = nextTomorrow - local
  }

  const hrs = Math.floor(diff / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  const secs = Math.floor((diff % 60000) / 1000)

  return {
    hours: hrs,
    minutes: mins,
    seconds: secs,
    formatted: `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
    currentWindow: curr.id,
    nextWindow: next.id,
  }
}

// =====================================================
// END OF CURRENT WINDOW UTILITY
// =====================================================

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

// =====================================================
// DATE KEY (FOR STORAGE)
// =====================================================

export function todayKey(tz = getTimezone()) {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz })
}
