// /api/send-window-notifications.js
import webpush from 'web-push'
import Airtable from 'airtable'

webpush.setVapidDetails(
  'mailto:you@akinto.io',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base('YOUR_BASE_ID')

export default async function handler(req, res) {
  const subs = await base('PushSubscriptions').select().all()

  const payload = JSON.stringify({
    title: 'Akinto',
    body: 'Your next window has opened – you have fresh attempts.',
  })

  await Promise.all(
    subs.map((record) => {
      const sub = JSON.parse(record.get('SubscriptionJSON'))
      return webpush.sendNotification(sub, payload).catch(() => null)
    }),
  )

  res.status(200).json({ ok: true })
}
