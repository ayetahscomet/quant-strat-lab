// /api/load-history.js
import { base } from '../../lib/airtable.js'

function normalise(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    const { userId, dateKey } = req.body

    if (!userId || !dateKey) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const records = await base('UserAnswers')
      .select({
        filterByFormula: `AND(
          {UserID} = '${userId}',
          {DateKey} = '${dateKey}'
        )`,
      })
      .all()

    const seen = new Map() // normalised -> original string (first seen)

    for (const r of records) {
      let correct = []
      try {
        correct = JSON.parse(r.fields.CorrectAnswersJSON || '[]')
      } catch {
        correct = []
      }

      for (const raw of correct || []) {
        const n = normalise(raw)
        if (n && !seen.has(n)) {
          seen.set(n, raw)
        }
      }
    }

    return res.status(200).json({
      correctGiven: Array.from(seen.values()), // de-duped, original casing
    })
  } catch (err) {
    console.error('load-history error:', err)
    return res.status(500).json({ error: 'Failed to load history' })
  }
}
