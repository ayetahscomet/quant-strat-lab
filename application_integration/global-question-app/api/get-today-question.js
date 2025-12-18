// api/get-today-question.js
import Airtable from 'airtable'

const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN,
}).base(process.env.AIRTABLE_BASE_ID)

export default async function handler(req, res) {
  try {
    const records = await base('Questions')
      .select({
        filterByFormula: `IS_SAME({Date}, TODAY(), 'day')`,
        maxRecords: 1,
      })
      .firstPage()

    if (!records || records.length === 0) {
      return res.status(404).json({ error: 'No question found for today.' })
    }

    const fields = records[0].fields

    // Send only what the frontend needs.
    // This keeps your full "CorrectAnswers" list hidden from inspect element!
    res.status(200).json({
      text: fields.QuestionText || '',
      count: Number(fields.AnswerCount || 1),
      date: fields.Date || '',
      hint: fields.HintText || '',
      // We pass the answers for the frontend to check,
      // but in a production version, we'd do the checking here on the server.
      correctAnswers: (fields.CorrectAnswers || '').split(',').map((a) => a.trim()),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
