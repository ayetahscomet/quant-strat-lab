import Airtable from 'airtable'

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID,
)

// api/save-push-sub.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { sub, timezone } = req.body

  await base('PushSubscriptions').create([
    {
      fields: {
        SubscriptionJSON: JSON.stringify(sub),
        Timezone: timezone || 'UTC',
      },
    },
  ])

  res.status(200).json({ ok: true })
}
