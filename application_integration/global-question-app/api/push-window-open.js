// api/push-window-open.js

import webpush from 'web-push'
import { base } from '../lib/airtable.js'
import { WINDOWS } from '../utils/windows.js'

// Configure VAPID keys
webpush.setVapidDetails(
  'mailto:support@akinto.io',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

export default async function handler(req, res) {
  // Enforce cron-only execution for security
  const isCron = req.headers['x-vercel-cron'] === '1'
  const isSecret = req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`

  if (!isCron && !isSecret) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const now = new Date()
  const hh = now.getHours()
  const mm = now.getMinutes()
  const current = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`

  // Find if a window starts exactly right now
  const win = WINDOWS.find((w) => w.start === current)

  if (!win) {
    return res.status(200).json({ message: 'No window start at this exact minute' })
  }

  console.log(`🔔 Window Trigger: ${win.label} started at ${current}`)

  try {
    const records = await base('PushSubscriptions').select().all()

    for (const r of records) {
      try {
        const sub = JSON.parse(r.get('SubscriptionJSON'))

        await webpush.sendNotification(
          sub,
          JSON.stringify({
            title: `Akinto · ${win.label} Window Open`,
            body: `Your ${win.label} window just opened — check in now!`,
            icon: '/push-icon.png',
            url: 'https://akinto.io/play',
          }),
        )
      } catch (err) {
        console.warn(`❌ Push failed: `, err.statusCode || err.message)
      }
    }

    return res.status(200).json({
      status: 'ok',
      window: win.id,
      label: win.label,
      count: records.length,
    })
  } catch (err) {
    console.error('❌ push-window-open error:', err)
    return res.status(500).json({ error: 'Failed to send pushes' })
  }
}
