// /api/save-subscription.js
import Airtable from 'airtable'

const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN,
}).base(process.env.AIRTABLE_BASE_ID)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { sub } = req.body

    await base('PushSubscriptions').create([
      {
        fields: {
          SubscriptionJSON: JSON.stringify(sub),
        },
      },
    ])

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save subscription' })
  }
}
