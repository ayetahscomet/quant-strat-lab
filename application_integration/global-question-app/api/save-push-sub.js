import { base } from '../lib/airtable.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { sub, timezone } = req.body || {}

    if (!sub?.endpoint) {
      return res.status(400).json({ error: 'Missing subscription payload' })
    }

    const tz = typeof timezone === 'string' && timezone.length ? timezone : 'Europe/London'

    // Check if already exists
    const existing = await base('PushSubscriptions')
      .select({
        filterByFormula: `{Endpoint} = '${sub.endpoint}'`,
      })
      .firstPage()

    if (existing.length) {
      // update timezone
      await base('PushSubscriptions').update(existing[0].id, {
        Timezone: tz,
      })

      return res.status(200).json({ ok: true, reused: true })
    }

    // Create new
    await base('PushSubscriptions').create([
      {
        fields: {
          Endpoint: sub.endpoint,
          SubscriptionJSON: JSON.stringify(sub),
          Timezone: tz,
        },
      },
    ])

    return res.status(200).json({ ok: true, created: true })
  } catch (err) {
    console.error('save-push-sub error:', err)
    return res.status(500).json({ error: 'Failed to save push sub' })
  }
}
console.log('SAVE PUSH BODY:', req.body)
