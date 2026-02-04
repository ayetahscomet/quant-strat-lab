// /api/get-today-question.js

import { base } from '../lib/airtable.js'
import { dateKeyToday } from '../lib/dateKey.js'

export default async function handler(req, res) {
  try {
    const today = dateKeyToday() // Europe/London

    const records = await base('Questions')
      .select({
        maxRecords: 1,
        filterByFormula: `{DateKey} = '${today}'`,
      })
      .firstPage()

    if (!records || records.length === 0) {
      return res.status(404).json({ error: 'No question found for today', dateKey: today })
    }

    const q = records[0].fields

    let correct = q.CorrectAnswers || []
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
      dateKey: today,
    })
  } catch (err) {
    console.error('get-today-question error:', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
