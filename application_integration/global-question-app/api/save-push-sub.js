// /api/save-push-sub.js

import { base } from '../lib/airtable.js'

export default async function handler(req, res) {
  console.log('[SAVE PUSH] hit')

  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { sub, timezone, userId, country, source } = req.body || {}

    console.log('[SAVE PUSH] body:', sub?.endpoint)

    if (!sub?.endpoint) {
      return res.status(400).json({ error: 'Missing subscription payload' })
    }

    const tz = typeof timezone === 'string' && timezone.length ? timezone : 'Europe/London'

    const existing = await base('PushSubscriptions')
      .select({
        filterByFormula: `{Endpoint} = '${sub.endpoint}'`,
      })
      .firstPage()

    if (existing.length) {
      await base('PushSubscriptions').update(existing[0].id, {
        Timezone: tz,
        Source: source || '',
      })

      return res.status(200).json({ ok: true, reused: true })
    }

    await base('PushSubscriptions').create([
      {
        fields: {
          Endpoint: sub.endpoint,
          SubscriptionJSON: JSON.stringify(sub),
          Timezone: tz,
          UserID: userId || null,
          Country: country || null,
          Source: source || '',
          FirstSeenAt: new Date().toISOString(),
          LastPushedKey: null,
          LastWindowId: null,
        },
      },
    ])

    return res.status(200).json({ ok: true, created: true })
  } catch (err) {
    console.error('[SAVE PUSH] error:', err)
    return res.status(500).json({ error: 'Failed to save push sub' })
  }
}
