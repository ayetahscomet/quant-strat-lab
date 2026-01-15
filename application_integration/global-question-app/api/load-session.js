// /api/load-session.js
import { base } from '../lib/airtable.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId, dateKey, windowId } = req.body

  if (!userId || !dateKey || !windowId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const records = await base('UserAnswers')
      .select({
        maxRecords: 10,
        filterByFormula: `AND(
          {UserID} = '${userId}',
          {DateKey} = '${dateKey}',
          {WindowID} = '${windowId}'
        )`,
        sort: [{ field: 'CreatedAt', direction: 'asc' }],
      })
      .firstPage()

    if (!records.length) {
      return res.status(200).json({ attempts: [] })
    }

    const attempts = records.map((r) => {
      let state = {}
      try {
        state = JSON.parse(r.fields.AttemptStateJSON || '{}')
      } catch {}

      return {
        answers: state.answers || [],
        result: state.result || 'attempt',
        attemptIndex: state.attemptIndex || 1,
        timestamp: state.timestamp || 0,
      }
    })

    return res.status(200).json({ attempts })
  } catch (err) {
    console.error('load-session error:', err)
    return res.status(500).json({ error: 'Failed to load session' })
  }
}
