import webpush from 'web-push'
import Airtable from 'airtable'
import { WINDOWS } from '../utils/windows.js'

webpush.setVapidDetails(
  'mailto:support@akinto.io',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN,
}).base(process.env.AIRTABLE_BASE_ID)

export async function sendWindowPush() {
  const now = new Date()
  const hh = now.getHours()
  const mm = now.getMinutes()
  const current = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`

  // find any window starting RIGHT NOW
  const win = WINDOWS.find((w) => w.start === current)
  if (!win) return // nothing to do

  console.log(`🔔 Sending push for window start: ${win.id}`)

  // Fetch subscriptions
  const subs = await base('PushSubscriptions').select().all()

  for (const r of subs) {
    try {
      const sub = JSON.parse(r.get('SubscriptionJSON'))
      await webpush.sendNotification(
        sub,
        JSON.stringify({
          title: 'Akinto — Window Open!',
          body: `Your ${win.label} window is now open.`,
          url: 'https://akinto.io/play',
        }),
      )
    } catch (err) {
      console.warn('Failed to notify:', err)
    }
  }
}
