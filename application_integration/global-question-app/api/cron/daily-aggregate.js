//  /api/cron/daily-aggregate.js

async function createInBatches(table, rows, size = 10) {
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size)
    await base(table).create(batch)
  }
}

import { base } from '../../lib/airtable.js'

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
  // Per-user profile
  // =====================================================

  const userProfiles = []

  for (const [userId, logs] of byUser.entries()) {
    const attempts = logs.filter((r) => r.AttemptIndex >= 1 && r.AttemptIndex <= 3)

    const hintCount = logs.filter((r) => r.HintUsed).length

    const distinctAnswers = new Set()
    attempts.forEach((r) =>
      (r.AnswersJSON ? JSON.parse(r.AnswersJSON) : []).forEach((a) =>
        distinctAnswers.add(normalise(a)),
      ),
    )

    userProfiles.push({
      UserID: userId,
      DateKey: dateKey,
      Country: logs[0].Country || 'xx',
      AttemptsUsed: attempts.length,
      HintCount: hintCount,
      DistinctAnswers: distinctAnswers.size,
    })
  }

  // =====================================================
  // Answer frequency
  // =====================================================

  const answerCounts = new Map()

  for (const r of rows) {
    if (!r.AnswersJSON) continue
    const arr = JSON.parse(r.AnswersJSON)
    for (const raw of arr) {
      const n = normalise(raw)
      if (!n) continue
      answerCounts.set(n, (answerCounts.get(n) || 0) + 1)
    }
  }

  // =====================================================
  // Write DailyAnswerStats
  // =====================================================

  const answerRows = []

  for (const [answer, count] of answerCounts.entries()) {
    answerRows.push({
      fields: {
        DateKey: dateKey,
        Answer: answer,
        Count: count,
        PercentOfPlayers: count / totalPlayers,
        IsRare: count <= 2,
      },
    })
  }

  if (answerRows.length) {
    await createInBatches('DailyAnswerStats', answerRows)
  }

  // =====================================================
  // DailyAggregates
  // =====================================================

  const dailyAgg = {
    DateKey: dateKey,
    TotalPlayers: totalPlayers,
    TotalAttempts: totalAttempts,
    TotalHints: totalHints,
    DistinctAnswers: answerCounts.size,
    GeneratedAt: new Date().toISOString(),
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
    answers: answerCounts.size,
  })
}
