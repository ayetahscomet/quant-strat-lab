import { base } from '../lib/airtable.js'

export default async function handler(req, res) {
  try {
    console.log('➡️ ENTER /api/get-today-question')

    // Check env first
    console.log('ENV CHECK:', {
      hasToken: !!process.env.AIRTABLE_TOKEN,
      hasBaseId: !!process.env.AIRTABLE_BASE_ID,
    })

    const today = new Date().toISOString().slice(0, 10)
    console.log('DATE:', today)

    const records = await base('Questions')
      .select({
        maxRecords: 1,
        filterByFormula: `{DateKey} = '${today}'`,
      })
      .firstPage()

    console.log('RECORDS:', records.length)

    if (!records || records.length === 0) {
      return res.status(404).json({ error: 'No question found for today' })
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
    console.error('⛔️ get-today-question error:', err)
    return res.status(500).json({ error: 'Internal Server Error', details: err.message })
  }
}
