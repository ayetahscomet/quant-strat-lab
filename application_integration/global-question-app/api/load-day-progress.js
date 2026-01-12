// api/load-day-progress.js
import { base } from '../lib/airtable.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    const { userId, dateKey } = req.body || {}

    if (!userId || !dateKey) {
      return res.status(400).json({ error: 'Missing userId or dateKey' })
    }

    const records = await base('UserAnswers')
      .select({
        maxRecords: 200, // plenty for a single day
        filterByFormula: `AND({UserID} = '${userId}', {DateKey} = '${dateKey}')`,
        sort: [{ field: 'CreatedAt', direction: 'asc' }],
      })
      .firstPage()

    const attempts = records.map((r) => {
      const f = r.fields
      let answers = []

      try {
        answers = f.AnswersJSON ? JSON.parse(f.AnswersJSON) : []
      } catch {
        answers = []
      }

      return {
        windowId: f.WindowID || null,
        attemptIndex: f.AttemptIndex || null,
        result: f.Result || null, // 'success' | 'fail' | 'lockout' | 'attempt'
        answers,
        createdAt: f.CreatedAt || null,
      }
    })

    return res.status(200).json({ attempts })
  } catch (err) {
    console.error('load-day-progress error:', err)
    return res.status(500).json({ error: 'Failed to load day progress' })
  }
}
