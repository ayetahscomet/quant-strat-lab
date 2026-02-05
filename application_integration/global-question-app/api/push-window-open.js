import webpush from 'web-push'
import Airtable from 'airtable'
import { WINDOWS } from '../utils/windows.js'

webpush.setVapidDetails(
  'mailto:hello@akinto.io',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID)

function getLocalTime(tz) {
  const now = new Date().toLocaleString('en-GB', { timeZone: tz })
  return new Date(now)
}

export default async function handler(req, res) {
  const isCron = req.headers['x-vercel-cron'] === '1'
  const isSecret = req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`

  if (!isCron && !isSecret) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const records = await base('PushSubscriptions').select().all()

  let pushed = 0

  for (const r of records) {
    const sub = JSON.parse(r.get('SubscriptionJSON'))
    const tz = r.get('Timezone') || 'UTC'

    const local = getLocalTime(tz)
    const hhmm = `${String(local.getHours()).padStart(2, '0')}:${String(
      local.getMinutes(),
    ).padStart(2, '0')}`

    const win = WINDOWS.find((w) => w.start === hhmm)

    if (!win) continue

    try {
      const todayKey = local.toISOString().slice(0, 10)
      const pushKey = `${todayKey}_${win.id}`

      // skip duplicate pushes
      if (r.get('LastPushedKey') === pushKey) continue

      await webpush.sendNotification(
        sub,
        JSON.stringify({
          title: `Akinto · ${win.label} window open`,
          body: `Your ${win.label} window just started.`,
          icon: '/push-icon.png',
          url: 'https://akinto.io/play',
        }),
      )

      await base('PushSubscriptions').update(r.id, {
        LastPushedKey: pushKey,
        LastWindowId: win.id,
      })

      pushed++
    } catch (err) {
      console.warn('Push failed', err.statusCode)

      if (err.statusCode === 404 || err.statusCode === 410) {
        await base('PushSubscriptions').destroy(r.id)
      }
    }
  }

  res.status(200).json({ pushed })
}
