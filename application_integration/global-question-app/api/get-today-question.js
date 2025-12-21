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

    return res.status(200).json({
      text: q.QuestionText,
      answerCount: q.AnswerCount,
      correctAnswers: q.CorrectAnswers,
      date: q.DateKey,
    })
  } catch (err) {
    console.error('get-today-question error:', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
