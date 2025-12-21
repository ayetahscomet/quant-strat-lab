// api/get-today-question.js
import Airtable from 'airtable'

const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN,
}).base(process.env.AIRTABLE_BASE_ID)

export default async function handler(req, res) {
  try {
    // ─────────────────────────────────────────────
    // Calculate today's date window (timezone-safe)
    // ─────────────────────────────────────────────
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const startOfTomorrow = new Date(startOfToday)
    startOfTomorrow.setDate(startOfToday.getDate() + 1)

    const filterByFormula = `
      AND(
        IS_AFTER({Date}, "${startOfToday.toISOString()}"),
        IS_BEFORE({Date}, "${startOfTomorrow.toISOString()}")
      )
    `

    // ─────────────────────────────────────────────
    // Fetch today's question
    // ─────────────────────────────────────────────
    const records = await base('Questions')
      .select({
        filterByFormula,
        maxRecords: 1,
      })
      .firstPage()

    if (!records || records.length === 0) {
      return res.status(404).json({ error: 'No question found for today.' })
    }

    const fields = records[0].fields

    // ─────────────────────────────────────────────
    // Return only what the frontend needs
    // ─────────────────────────────────────────────
    res.status(200).json({
      text: fields.QuestionText || '',
      count: Number(fields.AnswerCount || 1),
      date: fields.Date || '',
      hint: fields.HintText || '',
      correctAnswers: Array.isArray(fields.CorrectAnswers)
        ? fields.CorrectAnswers
        : String(fields.CorrectAnswers || '')
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean),
    })
  } catch (error) {
    console.error('get-today-question error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
