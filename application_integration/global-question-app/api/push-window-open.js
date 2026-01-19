// api/push-window-open.js

import webpush from 'web-push'
import Airtable from 'airtable'
import { WINDOWS } from '../utils/windows.js'

webpush.setVapidDetails(
  'mailto:support@akinto.io',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID)

export default async function handler(req, res) {
  const isCron = req.headers['x-vercel-cron'] === '1'
  const isSecret = req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`

  if (!isCron && !isSecret) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const now = new Date()
  const hh = now.getHours()
  const mm = now.getMinutes()
  const current = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`

  const win = WINDOWS.find((w) => w.start === current)

  if (!win) {
    return res.status(200).json({ message: 'No window start at this minute' })
  }

  const records = await base('PushSubscriptions').select().all()

  for (const r of records) {
    try {
      const sub = JSON.parse(r.get('SubscriptionJSON'))

      await webpush.sendNotification(
        sub,
        JSON.stringify({
          title: `Akinto · ${win.label} Window Open`,
          body: `Your ${win.label} window just opened!`,
          icon: '/push-icon.png',
          url: 'https://akinto.io/play',
        }),
      )
    } catch (err) {
      console.warn('❌ Push failed:', err.statusCode)
    }
  }

  return res.status(200).json({
    status: 'ok',
    window: win.id,
    label: win.label,
    count: records.length,
  })
}
