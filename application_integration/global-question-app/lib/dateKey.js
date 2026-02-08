// /lib/dateKey.js
export const DEFAULT_TZ = 'Europe/London'

// Build a Date that is safely "in" the target calendar day regardless of DST shifts.
// We do this by constructing a UTC date at 12:00 (noon) for the day in the target TZ.
function utcNoonFromTzToday(tz = DEFAULT_TZ) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const y = Number(parts.find((p) => p.type === 'year')?.value)
  const m = Number(parts.find((p) => p.type === 'month')?.value)
  const d = Number(parts.find((p) => p.type === 'day')?.value)

  // Noon UTC avoids DST edge weirdness when adding/subtracting days
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

// en-CA yields YYYY-MM-DD
export function formatDateKey(date, tz = DEFAULT_TZ) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function dateKeyToday(tz = DEFAULT_TZ) {
  return formatDateKey(new Date(), tz)
}

export function dateKeyOffsetDays(offsetDays = 0, tz = DEFAULT_TZ) {
  const base = utcNoonFromTzToday(tz)
  const shifted = new Date(base.getTime() + offsetDays * 86400000)
  return formatDateKey(shifted, tz)
}

export function pickDateKey(req, { defaultOffsetDays = 0 } = {}) {
  const tz = (req.query?.tz || req.body?.tz || DEFAULT_TZ).toString()
  const candidate = (req.query?.dateKey || req.body?.dateKey || '').toString()

  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return { dateKey: candidate, tz }
  return { dateKey: dateKeyOffsetDays(defaultOffsetDays, tz), tz }
}
