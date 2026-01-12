import { base } from '../lib/airtable.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    const { userId, country, dateKey, windowId, answers, correctAnswers, result } = req.body

    if (!userId || !dateKey || !windowId) {
      return res.status(400).json({ error: 'Missing required fields (userId, dateKey, windowId)' })
    }

    await base('UserPlays').create({
      UserID: userId,
      Country: country || 'XX',
      DateKey: dateKey,
      WindowID: windowId,
      Result: result || 'attempt',
      AnswersJSON: JSON.stringify(answers || []),
      CorrectAnswersJSON: JSON.stringify(correctAnswers || []),
      CreatedAt: new Date().toISOString(),
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('log-play error:', err)
    return res.status(500).json({ error: 'Failed to log play' })
  }
}
