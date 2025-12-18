// api/save-answer.js
import Airtable from 'airtable'

const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN,
}).base('appJruOxLGdiwKrRw')

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

    res.status(200).json({ success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to save answer' })
  }
}
