// lib/send-push.js

import Airtable from 'airtable'
import webpush from 'web-push'

// ENV Vars Required:
// VAPID_PUBLIC_KEY
// VAPID_PRIVATE_KEY
// AIRTABLE_API_KEY
// AIRTABLE_BASE_ID

webpush.setVapidDetails(
  'mailto:hello@akinto.io',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID,
)

export default async function sendPush() {
  const subs = await base('PushSubscriptions').select().all()

  if (!subs.length) return []

  const payload = JSON.stringify({
    title: 'Akinto.io',
    body: 'A new check-in window is open!',
    icon: '/push-icon.png',
  })

  const sent = []

  for (const sub of subs) {
    const data = sub.fields.subscription
    if (!data) continue

    try {
      await webpush.sendNotification(JSON.parse(data), payload)
      sent.push(sub.id)
    } catch (err) {
      console.error(`Push failed for ${sub.id}:`, err.statusCode)

      // Remove dead subscriptions
      if (err.statusCode === 410 || err.statusCode === 404) {
        await base('PushSubscriptions').destroy(sub.id)
      }
    }
  }

  return sent
}
