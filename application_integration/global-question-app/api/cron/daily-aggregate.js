// /api/cron/daily-aggregate.js

import { base } from '../../lib/airtable.js'

async function createInBatches(table, rows, size = 10) {
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size)
    await base(table).create(batch)
  }
}

function yesterdayKey() {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function normalise(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
}

// =====================================================

export default async function handler(req, res) {
  const secret = req.headers.authorization
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorised' })
  }

  const dateKey = req.query.dateKey || yesterdayKey()

  console.log('📊 Aggregating day:', dateKey)

  const records = await base('UserAnswers')
    .select({
      filterByFormula: `{DateKey}='${dateKey}'`,
      maxRecords: 5000,
    })
    .all()

  if (!records.length) {
    return res.status(200).json({ ok: true, message: 'no data' })
  }

  const rows = records.map((r) => r.fields)

  // =====================================================
  // Group by user
  // =====================================================

  const byUser = new Map()

  for (const r of rows) {
    const id = r.UserID
    if (!id) continue
    if (!byUser.has(id)) byUser.set(id, [])
    byUser.get(id).push(r)
  }

  const totalPlayers = byUser.size
  const totalAttempts = rows.length
  const totalHints = rows.filter((r) => r.HintUsed).length

  // =====================================================
  // Per-user profile + averages
  // =====================================================

  const userProfiles = []

  let sumAccuracy = 0
  let sumCompletion = 0
  let sumSolveSeconds = 0

  for (const [userId, logs] of byUser.entries()) {
    const attempts = logs.filter((r) => r.AttemptIndex >= 1 && r.AttemptIndex <= 3)

    const hintCount = logs.filter((r) => r.HintUsed).length

    const answersSeen = new Set()
    let correct = 0
    let totalSlots = 0

    const timestamps = logs
      .map((r) => r.CreatedAt)
      .filter(Boolean)
      .sort()

    attempts.forEach((r) => {
      const a = r.AnswersJSON ? JSON.parse(r.AnswersJSON) : []
      const c = r.CorrectAnswersJSON ? JSON.parse(r.CorrectAnswersJSON) : []

      totalSlots = Math.max(totalSlots, c.length)

      a.forEach((x) => answersSeen.add(normalise(x)))
      correct += c.length
    })

    const accuracy = totalSlots ? correct / answersSeen.size : 0
    const completion = totalSlots ? answersSeen.size / totalSlots : 0

    let solveSeconds = null
    if (timestamps.length >= 2) {
      solveSeconds = (new Date(timestamps[timestamps.length - 1]) - new Date(timestamps[0])) / 1000
    }

    sumAccuracy += accuracy
    sumCompletion += completion
    if (solveSeconds) sumSolveSeconds += solveSeconds

    userProfiles.push({
      UserID: userId,
      DateKey: dateKey,
      Country: logs[0].Country || 'xx',
      AttemptsUsed: attempts.length,
      HintCount: hintCount,
      DistinctAnswers: answersSeen.size,
      Accuracy: accuracy,
      Completion: completion,
      SolveSeconds: solveSeconds,
    })
  }

  // =====================================================
  // Answer frequency (distinct players per answer)
  // =====================================================

  const answerUsers = new Map() // answer -> Set(userId)
  const answerCountries = new Map()

  for (const r of rows) {
    if (!r.AnswersJSON || !r.UserID) continue

    const arr = JSON.parse(r.AnswersJSON)

    for (const raw of arr) {
      const n = normalise(raw)
      if (!n) continue

      if (!answerUsers.has(n)) answerUsers.set(n, new Set())
      answerUsers.get(n).add(r.UserID)

      if (!answerCountries.has(n)) answerCountries.set(n, new Set())
      if (r.Country) answerCountries.get(n).add(r.Country)
    }
  }

  const sortedAnswers = [...answerUsers.entries()].sort((a, b) => b[1].size - a[1].size)

  // =====================================================
  // Write DailyAnswerStats
  // =====================================================

  const answerRows = []

  sortedAnswers.forEach(([answer, users], idx) => {
    answerRows.push({
      fields: {
        DateKey: dateKey,
        Answer: answer,
        Count: users.size,
        PercentOfPlayers: users.size / totalPlayers,
        Rank: idx + 1,
        Countries: [...(answerCountries.get(answer) || [])].join(', '),

        IsRare: users.size <= 2,
      },
    })
  })

  if (answerRows.length) {
    await createInBatches('DailyAnswerStats', answerRows)
  }

  // =====================================================
  // DailyAggregates
  // =====================================================

  const distinctCountries = new Set(rows.map((r) => r.Country).filter(Boolean))

  const dailyAgg = {
    DateKey: dateKey,
    TotalPlayers: totalPlayers,
    TotalAttempts: totalAttempts,
    TotalHints: totalHints,
    DistinctAnswers: answerUsers.size,
    DistinctCountriesCount: distinctCountries.size,
    CountriesMentioned: [...distinctCountries].join(', '),
    AvgSolveSeconds: sumSolveSeconds / totalPlayers,
    AvgAccuracy: sumAccuracy / totalPlayers,
    AvgCompletion: sumCompletion / totalPlayers,
  }

  await base('DailyAggregates').create([{ fields: dailyAgg }])

  // =====================================================
  // UserDailyProfile
  // =====================================================

  const profileRows = userProfiles.map((u) => ({
    fields: u,
  }))

  if (profileRows.length) {
    await createInBatches('UserDailyProfile', profileRows)
  }

  return res.status(200).json({
    ok: true,
    dateKey,
    players: totalPlayers,
    answers: answerUsers.size,
  })
}
