// /src/utils/windows.js
// =====================================================
// TIME WINDOW DEFINITIONS
// =====================================================

import { dateKeyToday } from '../../lib/dateKey.js'

export const WINDOWS = [
  { id: 'nightowl', label: 'Night Owl', start: '00:00', end: '04:30' },
  { id: 'early', label: 'Early Bird', start: '04:30', end: '10:00' },
  { id: 'midmorning', label: 'Morning Rush', start: '10:00', end: '12:00' },
  { id: 'midday', label: 'Midday Dash', start: '12:00', end: '15:00' },
  { id: 'evening', label: 'Golden Hour', start: '15:00', end: '19:00' },
  { id: 'late', label: 'After Hours', start: '19:00', end: '21:00' },
  { id: 'last', label: 'Last Chance', start: '21:00', end: '24:00' },
]

// =====================================================
// TIMEZONE HANDLING
// =====================================================

export function getTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return tz || 'Europe/London'
  } catch {
    return 'Europe/London'
  }
}

// minutes since midnight in given timezone
export function getMinutesNow(tz = getTimezone()) {
  // Use Intl parts to avoid parsing locale strings into Date (can produce Invalid Date => NaN).
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  const hour = Number(parts.find((p) => p.type === 'hour')?.value)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value)

  // Defensive fallback (should never hit, but prevents NaN cascade)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  }

  return hour * 60 + minute
}

// helper: "HH:MM" -> minutes
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// =====================================================
// CURRENT + NEXT WINDOWS
// =====================================================

export function getCurrentWindow(tz = getTimezone()) {
  const mins = getMinutesNow(tz)

  for (const w of WINDOWS) {
    const start = timeToMinutes(w.start)
    const end = timeToMinutes(w.end)
    if (mins >= start && mins < end) return w
  }

  // after 24:00 shouldn't happen, but fallback to last
  return WINDOWS[WINDOWS.length - 1]
}

export function getNextWindow(tz = getTimezone()) {
  const mins = getMinutesNow(tz)

  // next window is the first whose *start* is after now
  for (const w of WINDOWS) {
    const start = timeToMinutes(w.start)
    if (start > mins) return w
  }

  // if we've passed all starts today, next is tomorrow's first window
  return WINDOWS[0]
}

// =====================================================
// COUNTDOWN UNTIL NEXT WINDOW START (NO NaN, NO "SOON")
// =====================================================

export function getTimeRemainingToNextWindow(tz = getTimezone()) {
  const curr = getCurrentWindow(tz)
  const next = getNextWindow(tz)

  const minsNow = getMinutesNow(tz)
  const targetStart = timeToMinutes(next.start)

  let diffMinutes = targetStart - minsNow
  if (diffMinutes <= 0) diffMinutes += 24 * 60 // into tomorrow

  const totalSeconds = diffMinutes * 60
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return {
    total: totalSeconds,
    hours,
    minutes,
    seconds,
    formatted: [
      String(hours).padStart(2, '0'),
      String(minutes).padStart(2, '0'),
      String(seconds).padStart(2, '0'),
    ].join(':'),
    currentWindow: curr.id,
    nextWindow: next.id,
  }
}

// =====================================================
// TIME UNTIL END OF CURRENT WINDOW (IF YOU NEED IT)
// =====================================================

export function getTimeRemainingToEndOfCurrent(tz = getTimezone()) {
  const curr = getCurrentWindow(tz)
  const mins = getMinutesNow(tz)
  const end = timeToMinutes(curr.end)

  let diff = end - mins
  if (diff < 0) diff += 24 * 60

  return {
    window: curr.id,
    minutes: diff,
    hours: Math.floor(diff / 60),
    mins: diff % 60,
  }
}

// =====================================================
// DATE KEY FOR STORAGE (CANONICAL)
// =====================================================

export function todayKey(tz = getTimezone()) {
  return dateKeyToday(tz)
}
