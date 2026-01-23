// /api/log-hint.js
import { base } from '../lib/airtable.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    const { userId, country, dateKey, windowId } = req.body || {}

    if (!userId || !dateKey || !windowId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    await base('UserAnswers').create([
      {
        fields: {
          UserID: userId,
          Country: country || 'xx',
          DateKey: dateKey,
          WindowID: windowId,
          AttemptIndex: 998,
          Result: 'hint-used',
          CreatedAt: new Date().toISOString(),
        },
      },
    ])

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('log-hint error:', err)
    return res.status(500).json({ error: 'Failed to log hint' })
  }
}
