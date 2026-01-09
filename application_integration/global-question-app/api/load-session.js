import Airtable from 'airtable'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(
      process.env.AIRTABLE_BASE_ID,
    )

    const { userId, dateKey, windowId } = req.body

    const records = await base('UserAnswers')
      .select({
        filterByFormula: `AND(
          {UserID}='${userId}',
          {DateKey}='${dateKey}',
          {WindowID}='${windowId}'
        )`,
        sort: [{ field: 'AttemptIndex', direction: 'asc' }],
      })
      .firstPage()

    const attempts = records.map((r) => ({
      attemptIndex: r.fields.AttemptIndex,
      answers: JSON.parse(r.fields.AnswersJSON || '[]'),
      result: r.fields.Result || null,
    }))

    return res.status(200).json({ attempts })
  } catch (err) {
    console.error('load-session error:', err)
    return res.status(500).json({ error: 'Failed to load session' })
  }
}
