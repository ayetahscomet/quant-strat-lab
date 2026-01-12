import { base } from '../../lib/airtable'

export default async function handler(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10)

    const records = await base('Questions')
      .select({
        maxRecords: 1,
        filterByFormula: `{DateKey} = '${today}'`,
      })
      .firstPage()

    if (!records || records.length === 0) {
      return res.status(404).json({ error: 'No question found for today' })
    }

    const q = records[0].fields

    let correct = q.CorrectAnswers || []

    if (typeof correct === 'string') {
      correct = correct
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    }

    const answerCount = q.AnswerCount || correct.length || 0
    const hint = q.HintText || ''

    return res.status(200).json({
      text: q.QuestionText || '',
      answerCount,
      correctAnswers: correct,
      hint,
      date: q.DateKey || '',
    })
  } catch (err) {
    console.error('get-today-question error:', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
