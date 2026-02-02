// /api/cron/daily-aggregate.js

import { base } from '../../lib/airtable.js'
import { continentFromCountry } from '../../src/data/continents.js'
import { lookupCountry } from '../../src/data/countryMeta.js'

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

function safeJsonArray(v) {
  try {
    const arr = v ? JSON.parse(v) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function computeDiversity(regionCounts) {
  const total = Object.values(regionCounts).reduce((a, b) => a + b, 0)
  if (!total) return 0

  let entropy = 0
  for (const c of Object.values(regionCounts)) {
    const p = c / total
    entropy -= p * Math.log2(p)
  }

  return Number(entropy.toFixed(3))
}

function classifyArchetype(u) {
  if (u.HintCount >= 2) return 'Hint-lover'
  if (u.SolveSeconds && u.SolveSeconds < 40 && u.Accuracy > 0.8) return 'Speedrunner'
  if (u.Accuracy > 0.8 && u.AttemptsUsed <= 2) return 'Sniper'
  if (u.Completion < 0.4) return 'Struggler'
  if (u.DistinctAnswers >= 8) return 'Explorer'
  return 'Balanced'
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

  const rows = records.map((r) => r.fields || {})

  // =====================================================
  // Group by user
  // =====================================================

  const byUser = new Map()
  for (const r of rows) {
    if (!r.UserID) continue
    if (!byUser.has(r.UserID)) byUser.set(r.UserID, [])
    byUser.get(r.UserID).push(r)
  }

  const totalPlayers = byUser.size

  const attemptRows = rows.filter((r) => {
    const ai = Number(r.AttemptIndex)
    return ai >= 1 && ai <= 3
  })

  const totalAttempts = attemptRows.length

  const totalHints = rows.filter(
    (r) => r.HintUsed || Number(r.AttemptIndex) === 998 || r.Result === 'hint-used',
  ).length

  const countrySet = new Set()
  for (const r of rows) {
    if (r.Country) countrySet.add(String(r.Country).toLowerCase())
  }

  // =====================================================
  // Answer stats
  // =====================================================

  const answerStats = new Map()

  for (const r of attemptRows) {
    const userId = String(r.UserID)
    const created = r.CreatedAt ? new Date(r.CreatedAt).getTime() : null

    for (const raw of safeJsonArray(r.AnswersJSON)) {
      const a = normalise(raw)
      if (!a) continue

      if (!answerStats.has(a)) {
        answerStats.set(a, {
          mentions: 0,
          players: new Set(),
          firstUserId: null,
          firstTime: null,
        })
      }

      const st = answerStats.get(a)
      st.mentions += 1
      st.players.add(userId)

      if (created && (!st.firstTime || created < st.firstTime)) {
        st.firstTime = created
        st.firstUserId = userId
      }
    }
  }

  // =====================================================
  // Streak lookup
  // =====================================================

  const prevDate = new Date(dateKey)
  prevDate.setUTCDate(prevDate.getUTCDate() - 1)

  const prevProfiles = await base('UserDailyProfile')
    .select({
      filterByFormula: `{DateKey}='${prevDate.toISOString().slice(0, 10)}'`,
    })
    .all()

  const prevStreaks = new Map()
  for (const r of prevProfiles) {
    prevStreaks.set(r.fields.UserID, r.fields.StreakContinues || 0)
  }

  // =====================================================
  // Per-user profile
  // =====================================================

  const userProfiles = []

  let totalSlots = 0
  for (const r of attemptRows) {
    const ca = safeJsonArray(r.CorrectAnswersJSON)
    if (ca.length > totalSlots) totalSlots = ca.length
  }

  for (const [userId, logs] of byUser.entries()) {
    const attempts = logs
      .map((x) => ({
        ...x,
        _ai: Number(x.AttemptIndex),
        _t: x.CreatedAt ? new Date(x.CreatedAt).getTime() : null,
      }))
      .filter((x) => x._ai >= 1 && x._ai <= 3)
      .sort((a, b) => (a._t || 0) - (b._t || 0))

    const hintCount = logs.filter(
      (r) => r.HintUsed || Number(r.AttemptIndex) === 998 || r.Result === 'hint-used',
    ).length

    const submitted = new Set()
    const correct = new Set()

    for (const r of attempts) {
      for (const a of safeJsonArray(r.AnswersJSON)) submitted.add(normalise(a))
      for (const c of safeJsonArray(r.CorrectAnswersJSON)) correct.add(normalise(c))
    }

    let solveSeconds = null
    if (attempts.length && attempts[0]._t && attempts.at(-1)._t) {
      solveSeconds = Math.round((attempts.at(-1)._t - attempts[0]._t) / 1000)
    }

    const accuracy = totalSlots ? correct.size / totalSlots : 0
    const completion = totalSlots ? correct.size / totalSlots : 0

    const countryCode = String(logs.find((x) => x.Country)?.Country || 'xx').toLowerCase()
    const region = continentFromCountry(countryCode)

    let rareAnswers = 0
    for (const a of submitted) {
      const st = answerStats.get(a)
      if (st && st.players.size <= 2) rareAnswers++
    }

    const prev = prevStreaks.get(userId) || 0
    const streak = prev + 1

    const archetype = classifyArchetype({
      AttemptsUsed: attempts.length,
      Accuracy: accuracy,
      Completion: completion,
      SolveSeconds: solveSeconds,
      DistinctAnswers: submitted.size,
      HintCount: hintCount,
    })

    userProfiles.push({
      UserID: userId,
      DateKey: dateKey,

      Country: countryCode,
      Region: region,

      AttemptsUsed: attempts.length,
      HintCount: hintCount,

      Accuracy: accuracy,
      Completion: completion,
      SolveSeconds: solveSeconds,

      DistinctAnswers: submitted.size,
      RareAnswers: rareAnswers,

      Archetype: archetype,
      StreakContinues: streak,
    })
  }

  // =====================================================
  // DailyAggregates (with diversity)
  // =====================================================

  const regionCounts = {}
  for (const u of userProfiles) {
    regionCounts[u.Region] = (regionCounts[u.Region] || 0) + 1
  }

  const diversity = computeDiversity(regionCounts)

  const dailyAgg = {
    DateKey: dateKey,
    TotalPlayers: totalPlayers,
    TotalAttempts: totalAttempts,
    TotalHints: totalHints,

    DistinctAnswers: answerStats.size,
    DistinctCountriesCount: countrySet.size,

    CountriesMentioned: Array.from(countrySet).join(', '),

    DiversityScore: diversity,

    GeneratedAt: new Date().toISOString(),
  }

  await base('DailyAggregates').create([{ fields: dailyAgg }])

  return res.status(200).json({
    ok: true,
    dateKey,
    players: totalPlayers,
    answers: answerStats.size,
  })
}
