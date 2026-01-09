import Airtable from 'airtable'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    const { userId, country, dateKey, windowId, attemptIndex, answers, correctAnswers, result } =
      req.body

    if (!userId || !dateKey || !windowId || !answers) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(
      process.env.AIRTABLE_BASE_ID,
    )

    await base('UserPlays').create({
      UserID: userId,
      Country: country || 'XX',
      DateKey: dateKey,
      WindowID: windowId,
      AttemptIndex: attemptIndex || 1,
      Answers: answers.join(', '),
      CorrectAnswers: correctAnswers.join(', '),
      Result: result || 'fail',
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('log-attempt error:', err)
    return res.status(500).json({ error: 'Failed to log attempt' })
  }
}
