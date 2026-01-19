// api/save-subscription.js

import { base } from '../lib/airtable.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { sub } = req.body

    await base('PushSubscriptions').create([
      {
        fields: {
          SubscriptionJSON: JSON.stringify(sub),
          Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    ])

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to save subscription' })
  }
}
