// /lib/dateKey.js
export const DEFAULT_TZ = 'Europe/London'

export function formatDateKey(date, tz = DEFAULT_TZ) {
  // en-CA yields YYYY-MM-DD
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
  const d = new Date(Date.now() + offsetDays * 86400000)
  return formatDateKey(d, tz)
}

export function pickDateKey(req, { defaultOffsetDays = 0 } = {}) {
  const tz = (req.query?.tz || req.body?.tz || DEFAULT_TZ).toString()
  const candidate = (req.query?.dateKey || req.body?.dateKey || '').toString()

  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return { dateKey: candidate, tz }
  return { dateKey: dateKeyOffsetDays(defaultOffsetDays, tz), tz }
}
