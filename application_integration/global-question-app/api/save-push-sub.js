// /api/save-push-sub.js

import { base } from '../lib/airtable.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { sub, timezone } = req.body || {}

    if (!sub) {
      return res.status(400).json({ error: 'Missing subscription payload' })
    }

    const tz = typeof timezone === 'string' && timezone.length > 0 ? timezone : 'Europe/London'

    await base('PushSubscriptions').create([
      {
        fields: {
          SubscriptionJSON: JSON.stringify(sub),
          Timezone: tz,
        },
      },
    ])

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('save-push-sub error:', err)
    return res.status(500).json({ error: 'Failed to save push sub' })
  }
}
