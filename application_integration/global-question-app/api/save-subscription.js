// /api/save-subscription.js
import Airtable from 'airtable'

const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base('YOUR_BASE_ID')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { sub } = req.body

  await base('PushSubscriptions').create([{ fields: { SubscriptionJSON: JSON.stringify(sub) } }])

  res.status(200).json({ ok: true })
}
