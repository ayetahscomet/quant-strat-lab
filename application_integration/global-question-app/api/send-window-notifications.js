// /api/send-window-notifications.js
import webpush from 'web-push'
import { base } from '../lib/airtable.js'

webpush.setVapidDetails(
  'mailto:support@akinto.io',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

export default async function handler(req, res) {
  try {
    const subs = await base('PushSubscriptions').select().all()

    const payload = JSON.stringify({
      title: 'Akinto',
      body: 'Your next window has opened!',
      icon: '/push-icon.png',
    })

    await Promise.all(
      subs.map((record) => {
        const sub = JSON.parse(record.fields.SubscriptionJSON)
        return webpush.sendNotification(sub, payload).catch(() => null)
      }),
    )

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Notification send failed' })
  }
}
