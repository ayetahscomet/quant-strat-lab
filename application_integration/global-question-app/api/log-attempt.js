// /api/log-attempt.js
import { base } from '../lib/airtable.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    const { userId, country, dateKey, windowId, attemptIndex, answers, correctAnswers, result } =
      req.body

    if (!userId || !dateKey || !windowId || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Calculate incorrect for analytics
    const correctSet = new Set(correctAnswers || [])
    const incorrect = answers.filter((a) => !correctSet.has(a))

    await base('UserAnswers').create([
      {
        fields: {
          UserID: userId,
          Country: country || 'xx',
          DateKey: dateKey,
          WindowID: windowId,
          AttemptIndex: attemptIndex || 1,
          Result: result || 'attempt',
          AnswersJSON: JSON.stringify(answers),
          CorrectAnswersJSON: JSON.stringify(correctAnswers || []),
          IncorrectAnswersJSON: JSON.stringify(incorrect),
          CreatedAt: new Date().toISOString(),
        },
      },
    ])

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('log-attempt error:', err)
    return res.status(500).json({ error: 'Failed to log attempt' })
  }
}
