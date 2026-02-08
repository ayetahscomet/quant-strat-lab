// /api/push-window-open.js

import webpush from 'web-push'
import { base } from '../lib/airtable.js'
import { WINDOWS } from '../lib/windows.js'
import { dateKeyToday } from '../lib/dateKey.js'

webpush.setVapidDetails(
  'mailto:hello@akinto.io',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

function getLocalTime(tz) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  const hour = Number(parts.find((p) => p.type === 'hour')?.value)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value)

  return { hour, minute }
}

export default async function handler(req, res) {
  const isCron = req.headers['x-vercel-cron'] === '1'

  const headerSecret = req.headers['authorization']
  const querySecret = req.query?.secret ? `Bearer ${req.query.secret}` : null
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`

  const isAuthorised = isCron || headerSecret === expected || querySecret === expected

  if (!isAuthorised) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  console.log('[WINDOW PUSH] cron fired')

  const records = await base('PushSubscriptions').select().all()
  console.log('[WINDOW PUSH] subscriptions found:', records.length)

  let pushed = 0

  for (const r of records) {
    try {
      const raw = r.get('SubscriptionJSON')
      if (!raw) continue

      const sub = JSON.parse(raw)
      const tz = r.get('Timezone') || 'UTC'
      console.log('[WINDOW PUSH] sub tz:', tz)

      const { hour, minute } = getLocalTime(tz)
      const hhmm = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

      console.log('[WINDOW PUSH] check', {
        tz,
        hhmm,
      })

      const win = WINDOWS.find((w) => {
        const [h, m] = w.start.split(':').map(Number)
        return hour === h && minute >= m && minute < m + 60
      })

      if (!win) {
        console.log('[WINDOW PUSH] no window match for', hhmm)
        continue
      }

      const todayKey = dateKeyToday(tz)

      const pushKey = `${todayKey}_${win.id}`

      if (r.get('LastPushedKey') === pushKey) continue

      await webpush.sendNotification(
        sub,
        JSON.stringify({
          title: `Akinto · ${win.label} window open`,
          body: `Your ${win.label} window just started.`,
          icon: '/push-icon.png',

          // ✅ flattened for service worker
          url: 'https://akinto.io/play',
          windowId: win.id,
        }),
      )

      await base('PushSubscriptions').update(r.id, {
        LastPushedKey: pushKey,
        LastWindowId: win.id,
      })

      pushed++
      console.log('[WINDOW PUSH] sent:', sub.endpoint)
    } catch (err) {
      console.warn('[WINDOW PUSH] failed:', err.statusCode || err.message)

      if (err.statusCode === 404 || err.statusCode === 410) {
        await base('PushSubscriptions').destroy(r.id)
      }
    }
  }

  return res.status(200).json({ pushed })
}
