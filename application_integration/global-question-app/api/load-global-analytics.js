/* /api/load-global-analytics.js */
import { base } from '../lib/airtable.js'

function normalise(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/* ================================
   NEW: percentile helper
================================ */
function percentileRank(arr, v) {
  const sorted = [...arr].sort((a, b) => a - b)
  if (!sorted.length) return null
  const idx = sorted.findIndex((x) => x >= v)
  if (idx === -1) return 100
  return Math.round((idx / sorted.length) * 100)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    const { dateKey, userId, country } = req.body || {}

    if (!dateKey) {
      return res.status(400).json({ error: 'Missing dateKey' })
    }

    /* =====================================================
       ORIGINAL: load UserAnswers
    ===================================================== */

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

      const userIdField = f.UserID
      if (!userIdField) continue

      if (!byUser.has(userIdField)) byUser.set(userIdField, [])

      byUser.get(userIdField).push({
        result: f.Result,
        windowId: f.WindowID,
        createdAt: f.CreatedAt,
        country: f.Country || 'unknown',
        correct: f.CorrectAnswersJSON ? JSON.parse(f.CorrectAnswersJSON) : [],
        answers: f.AnswersJSON ? JSON.parse(f.AnswersJSON) : [],
      })
    }

    /* =====================================================
       ORIGINAL: per-user summaries
    ===================================================== */

    const userSummaries = []

    for (const [uid, rows] of byUser.entries()) {
      const correctSet = new Set()
      const answers = []

      let firstAt = null
      let lastAt = null

      for (const r of rows) {
        for (const c of r.correct || []) correctSet.add(normalise(c))
        for (const a of r.answers || []) answers.push(a)

        const t = r.createdAt ? new Date(r.createdAt) : null
        if (t && !isNaN(t)) {
          if (!firstAt || t < firstAt) firstAt = t
          if (!lastAt || t > lastAt) lastAt = t
        }
      }

      const completion = correctSet.size
      const accuracy = answers.length > 0 ? Math.round((completion / answers.length) * 100) : 0

      const paceSeconds = firstAt && lastAt ? Math.round((lastAt - firstAt) / 1000) : null

      userSummaries.push({
        userId: uid,
        completion,
        accuracy,
        paceSeconds,
        country: rows[0]?.country || 'unknown',
      })
    }

    /* =====================================================
       ORIGINAL: global averages
    ===================================================== */

    const completionVals = userSummaries.map((u) => u.completion)
    const accuracyVals = userSummaries.map((u) => u.accuracy)
    const paceVals = userSummaries.map((u) => u.paceSeconds || 0)

    const avgCompletion = completionVals.reduce((a, b) => a + b, 0) / completionVals.length || 0

    const avgAccuracy = accuracyVals.reduce((a, b) => a + b, 0) / accuracyVals.length || 0

    /* =====================================================
       ORIGINAL: country aggregation
    ===================================================== */

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

    /* =====================================================
       ORIGINAL: distributions
    ===================================================== */

    const accuracyBuckets = [0, 0, 0, 0, 0]
    for (const v of accuracyVals) {
      if (v < 20) accuracyBuckets[0]++
      else if (v < 40) accuracyBuckets[1]++
      else if (v < 60) accuracyBuckets[2]++
      else if (v < 80) accuracyBuckets[3]++
      else accuracyBuckets[4]++
    }

    /* =====================================================
       NEW: percentiles + country rank
    ===================================================== */

    const you = userSummaries.find((u) => u.userId === userId)

    const pacePercentileForUser =
      you && paceVals.length ? percentileRank(paceVals, you.paceSeconds || 0) : null

    const sortedCountries = countryStats.sort((a, b) => b.avgCompletion - a.avgCompletion)

    const yourCountryRank = country
      ? sortedCountries.findIndex((x) => normalise(x.country) === normalise(country)) + 1
      : null

    const yourCountryAvgCompletion =
      sortedCountries.find((x) => normalise(x.country) === normalise(country))?.avgCompletion ??
      null

    /* =====================================================
       RESPONSE — EXTENDED
    ===================================================== */

    return res.status(200).json({
      totals: {
        users: userSummaries.length,
        avgCompletion: Math.round(avgCompletion),
        avgAccuracy: Math.round(avgAccuracy),
      },

      distributions: {
        accuracyBuckets,
      },

      countryLeaderboard: sortedCountries.slice(0, 10),

      rawUsers: userSummaries,

      // 🔥 new fields used by DailyAnalytics.vue
      totalPlayers: userSummaries.length,
      avgCompletion: Math.round(avgCompletion),
      avgAccuracy: Math.round(avgAccuracy),

      yourCountryRank,
      yourCountryAvgCompletion,

      pacePercentileForUser,
    })
  } catch (err) {
    console.error('load-global-analytics error:', err)
    return res.status(500).json({ error: 'Failed to load global analytics' })
  }
}
