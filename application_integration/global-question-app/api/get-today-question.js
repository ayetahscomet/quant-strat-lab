// /api/get-today-question.js
import { base } from '../lib/airtable.js'

export default async function handler(req, res) {
  try {
    // Accept POST only (so we can receive dateKey cleanly)
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'POST only' })
    }

    const { dateKey } = req.body || {}

    if (!dateKey) {
      return res.status(400).json({ error: 'Missing dateKey' })
    }

    const records = await base('Questions')
      .select({
        maxRecords: 1,
        filterByFormula: `{DateKey} = '${dateKey}'`,
      })
      .firstPage()

    if (!records || records.length === 0) {
      return res.status(404).json({ error: 'No question found for this date' })
    }

    const q = records[0].fields

    let correct = q.CorrectAnswers || q.correctAnswers || []
    if (typeof correct === 'string') {
      correct = correct
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }

    return res.status(200).json({
      text: q.QuestionText || '',
      answerCount: q.AnswerCount || correct.length,
      correctAnswers: correct,
      hint: q.HintText || '',
      date: q.DateKey || '',
    })
  } catch (err) {
    console.error('get-today-question error:', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
