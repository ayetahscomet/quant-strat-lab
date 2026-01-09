import Airtable from 'airtable'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(
      process.env.AIRTABLE_BASE_ID,
    )

    const { userId, country, dateKey, windowId, answers, correctAnswers, result } = req.body

    await base('UserPlays').create({
      UserID: userId,
      Country: country,
      DateKey: dateKey,
      WindowID: windowId,
      Answers: answers.join(', '),
      CorrectAnswers: correctAnswers.join(', '),
      Result: result, // 'success' | 'fail' | 'lockout' | 'exit-early'
    })

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('log-play error:', err)
    res.status(500).json({ error: 'Failed to log play' })
  }
}
