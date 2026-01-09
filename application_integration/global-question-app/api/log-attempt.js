import Airtable from 'airtable'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(
      process.env.AIRTABLE_BASE_ID,
    )

    const { userId, country, dateKey, windowId, answers, correctAnswers, attemptIndex, result } =
      req.body

    await base('UserAnswers').create({
      UserID: userId,
      Country: country,
      DateKey: dateKey,
      WindowID: windowId,
      AttemptIndex: attemptIndex,
      AnswersJSON: JSON.stringify(answers),
      CorrectAnswersJSON: JSON.stringify(correctAnswers),
      Result: result,
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('log-attempt error:', err)
    return res.status(500).json({ error: 'Failed to log attempt' })
  }
}
