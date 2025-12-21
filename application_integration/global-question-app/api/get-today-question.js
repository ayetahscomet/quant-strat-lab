// api/get-today-question.js
import Airtable from 'airtable'

// Safety check so the function fails loudly in logs, not silently
if (!process.env.AIRTABLE_TOKEN || !process.env.AIRTABLE_BASE_ID) {
  throw new Error('Missing Airtable environment variables')
}

const base = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN,
}).base(process.env.AIRTABLE_BASE_ID)

export default async function handler(req, res) {
  try {
    // ─────────────────────────────────────────────
    // Build today's DateKey (YYYY-MM-DD)
    // ─────────────────────────────────────────────
    const todayKey = new Date().toISOString().slice(0, 10)

    // ─────────────────────────────────────────────
    // Query Airtable by DateKey (bulletproof)
    // ─────────────────────────────────────────────
    const records = await base('Questions')
      .select({
        filterByFormula: `{DateKey} = "${todayKey}"`,
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
      correctAnswers: String(fields.CorrectAnswers || '')
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    })
  } catch (error) {
    console.error('get-today-question error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
