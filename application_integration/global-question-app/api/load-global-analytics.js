import { base } from '../lib/airtable.js'

function normalise(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    const { dateKey } = req.body || {}

    if (!dateKey) {
      return res.status(400).json({ error: 'Missing dateKey' })
    }

    const records = await base('UserAnswers')
      .select({
        maxRecords: 5000,
        filterByFormula: `{DateKey} = '${dateKey}'`,
      })
      .all()

    const byUser = new Map()
    const countryMap = new Map()

    for (const r of records) {
      const f = r.fields || {}

      const userId = f.UserID
      if (!userId) continue

      if (!byUser.has(userId)) byUser.set(userId, [])

      byUser.get(userId).push({
        result: f.Result,
        windowId: f.WindowID,
        createdAt: f.CreatedAt,
        country: f.Country || 'unknown',
        correct: f.CorrectAnswersJSON ? JSON.parse(f.CorrectAnswersJSON) : [],
        answers: f.AnswersJSON ? JSON.parse(f.AnswersJSON) : [],
      })
    }

    const userSummaries = []

    for (const [userId, rows] of byUser.entries()) {
      const correctSet = new Set()
      const answers = []

      for (const r of rows) {
        for (const c of r.correct || []) correctSet.add(normalise(c))
        for (const a of r.answers || []) answers.push(a)
      }

      const completion = correctSet.size
      const accuracy = answers.length > 0 ? Math.round((completion / answers.length) * 100) : 0

      userSummaries.push({
        userId,
        completion,
        accuracy,
        country: rows[0]?.country || 'unknown',
      })
    }

    const completionVals = userSummaries.map((u) => u.completion)
    const accuracyVals = userSummaries.map((u) => u.accuracy)

    const avgCompletion = completionVals.reduce((a, b) => a + b, 0) / completionVals.length || 0

    const avgAccuracy = accuracyVals.reduce((a, b) => a + b, 0) / accuracyVals.length || 0

    for (const u of userSummaries) {
      const c = u.country || 'unknown'
      if (!countryMap.has(c)) {
        countryMap.set(c, { users: 0, completion: 0 })
      }
      countryMap.get(c).users++
      countryMap.get(c).completion += u.completion
    }

    const countryStats = [...countryMap.entries()].map(([country, v]) => ({
      country,
      users: v.users,
      avgCompletion: Math.round(v.completion / v.users),
    }))

    // distributions
    const accuracyBuckets = [0, 0, 0, 0, 0]
    for (const v of accuracyVals) {
      if (v < 20) accuracyBuckets[0]++
      else if (v < 40) accuracyBuckets[1]++
      else if (v < 60) accuracyBuckets[2]++
      else if (v < 80) accuracyBuckets[3]++
      else accuracyBuckets[4]++
    }

    return res.status(200).json({
      totals: {
        users: userSummaries.length,
        avgCompletion: Math.round(avgCompletion),
        avgAccuracy: Math.round(avgAccuracy),
      },

      distributions: {
        accuracyBuckets,
      },

      countryLeaderboard: countryStats
        .sort((a, b) => b.avgCompletion - a.avgCompletion)
        .slice(0, 10),

      rawUsers: userSummaries,
    })
  } catch (err) {
    console.error('load-global-analytics error:', err)
    return res.status(500).json({ error: 'Failed to load global analytics' })
  }
}
