// api/save-answer.js

import { base } from '../lib/airtable.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { answerText, userId, timeTaken } = req.body

    await base('UserAnswers').create([
      {
        fields: {
          AnswerText: answerText,
          UserID: userId,
          TimeTaken: timeTaken,
          Timestamp: new Date().toISOString(),
        },
      },
    ])

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to save answer' })
  }
}
