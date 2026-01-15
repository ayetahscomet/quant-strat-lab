import webpush from 'web-push'
import Airtable from 'airtable'
import { WINDOWS } from '../utils/windows.js'

webpush.setVapidDetails(
  'mailto:support@akinto.io',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_TOKEN,
}).base(process.env.AIRTABLE_BASE_ID)

export default async function handler(req, res) {
  // Only allow scheduled trigger
  if (req.headers['x-vercel-cron'] !== '1') {
    return res.status(403).json({ error: 'Not allowed' })
  }

  const now = new Date()
  const hh = now.getHours()
  const mm = now.getMinutes()
  const current = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`

  const win = WINDOWS.find((w) => w.start === current)
  if (!win) {
    return res.status(200).json({ message: 'No window start now' })
  }

  console.log(`🔔 Trigger window: ${win.id}`)

  const records = await base('PushSubscriptions').select().all()

  for (const r of records) {
    try {
      const sub = JSON.parse(r.get('SubscriptionJSON'))
      await webpush.sendNotification(
        sub,
        JSON.stringify({
          title: `Akinto – ${win.label} Window Open`,
          body: `Your ${win.label} window just opened — time to check in!`,
          url: 'https://akinto.io/play',
        }),
      )
    } catch (err) {
      console.warn('Push failed:', err)
    }
  }

  return res.status(200).json({ message: 'Push sent' })
}
