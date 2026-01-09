import Airtable from 'airtable'

export default async function handler(req, res) {
  try {
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_TOKEN,
    }).base(process.env.AIRTABLE_BASE_ID)

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

    // --- Normalise correct answers ---
    let correct = q.CorrectAnswers || q.correctAnswers || []

    // If Airtable stored as a single comma-separated string
    if (typeof correct === 'string') {
      correct = correct
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }

    // Fallback for answerCount if not explicitly set
    const answerCount = q.AnswerCount || (Array.isArray(correct) ? correct.length : 0)

    // Hint normalisation (handles Hint / hint)
    const hint = q.Hint || q.hint || ''

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
