// /api/cron/daily-aggregate.js

import { base } from '../../lib/airtable.js'
import { pickDateKey } from '../../lib/dateKey.js'
import { continentFromCountry } from '../../src/data/continents.js'

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

async function fetchAll(table, formula) {
  return base(table)
    .select({
      ...(typeof formula === 'string' && formula.length ? { filterByFormula: formula } : {}),
      maxRecords: 5000,
    })

    .all()
}

async function createInBatches(table, rows, size = 10) {
  for (let i = 0; i < rows.length; i += size) {
    await base(table).create(rows.slice(i, i + size))
  }
}

async function updateInBatches(table, rows, size = 10) {
  for (let i = 0; i < rows.length; i += size) {
    await base(table).update(rows.slice(i, i + size))
  }
}

async function upsertSingleByDateKey(table, dateKey, fields) {
  const existing = await fetchAll(table, `{DateKey}='${dateKey}'`)
  if (existing.length) {
    await updateInBatches(table, [{ id: existing[0].id, fields }])
    return { mode: 'update', id: existing[0].id }
  }
  const created = await base(table).create([{ fields }])
  return { mode: 'create', id: created?.[0]?.id }
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

  // ✅ Default to TODAY in Europe/London (aligns with frontend)
  const { dateKey } = pickDateKey(req, { defaultOffsetDays: 0 })
  console.log('📊 Aggregating DateKey:', dateKey)

  const records = await fetchAll('UserAnswers', `{DateKey}='${dateKey}'`)
  if (!records.length) return res.status(200).json({ ok: true, message: 'no data', dateKey })

  const rows = records.map((r) => r.fields || {})

  /* =====================================================
     Load USERS master table (for FirstSolveToday)
  ===================================================== */

  const usersTable = await fetchAll('Users')
  const usersById = new Map(usersTable.map((r) => [String(r.fields.UserID), r.fields]))

  // group by user
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
    const cc = r.Country || usersById.get(String(r.UserID))?.CountryCode || null

    if (cc) countrySet.add(String(cc).toLowerCase())
  }

  // answer stats
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

          countries: new Set(),
          regions: new Set(),
        })
      }

      const st = answerStats.get(a)
      st.mentions += 1
      st.players.add(userId)

      const userMaster = usersById.get(String(userId))

      const rawCountry = r.CountryCode || r.Country || r.country || userMaster?.CountryCode || null

      if (rawCountry && rawCountry !== 'xx') {
        const cc = String(rawCountry).toLowerCase()

        st.countries.add(cc)

        const reg = continentFromCountry(cc)
        if (reg) st.regions.add(reg)
      }

      if (created && (!st.firstTime || created < st.firstTime)) {
        st.firstTime = created
        st.firstUserId = userId
      }
    }
  }

  // totalSlots = max correct list length seen today
  let totalSlots = 0
  for (const r of attemptRows) {
    const ca = safeJsonArray(r.CorrectAnswersJSON)
    if (ca.length > totalSlots) totalSlots = ca.length
  }

  // build user daily profiles
  const userProfiles = []
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

    const completion = totalSlots ? correct.size / totalSlots : 0
    const accuracy = submitted.size ? correct.size / submitted.size : 0

    const userMaster = usersById.get(String(userId))

    const firstSolveToday =
      completion > 0 &&
      (!userMaster || !userMaster.FirstSeenDate || userMaster.FirstSeenDate === dateKey)

    const logCountry = logs.find((x) => x.Country)?.Country

    const countryCode = String(logCountry || userMaster?.CountryCode || 'xx').toLowerCase()

    const region = continentFromCountry(countryCode) || 'Unknown'

    let rareAnswers = 0
    for (const a of submitted) {
      const st = answerStats.get(a)
      if (st && st.players.size <= 2) rareAnswers++
    }

    const archetype = classifyArchetype({
      AttemptsUsed: attempts.length,
      Accuracy: accuracy,
      Completion: completion,
      SolveSeconds: solveSeconds,
      DistinctAnswers: submitted.size,
      HintCount: hintCount,
    })

    const yesterday = new Date(dateKey)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const yesterdayKey = yesterday.toISOString().slice(0, 10)

    const streakContinues = logs.some((x) => x.DateKey === yesterdayKey)

    userProfiles.push({
      UserID: String(userId),
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

      StreakContinues: streakContinues,
      FirstSolveToday: firstSolveToday,

      GeneratedAt: new Date().toISOString(),
    })
  }

  // ✅ UPSERT UserDailyProfile by (UserID, DateKey)
  const existingProfiles = await fetchAll('UserDailyProfile', `{DateKey}='${dateKey}'`)
  const profileKeyToId = new Map(
    existingProfiles.map((r) => [`${r.fields.UserID}::${r.fields.DateKey}`, r.id]),
  )

  const profileCreates = []
  const profileUpdates = []

  for (const p of userProfiles) {
    const key = `${p.UserID}::${p.DateKey}`
    const id = profileKeyToId.get(key)
    if (id) profileUpdates.push({ id, fields: p })
    else profileCreates.push({ fields: p })
  }

  if (profileCreates.length) await createInBatches('UserDailyProfile', profileCreates)
  if (profileUpdates.length) await updateInBatches('UserDailyProfile', profileUpdates)

  // ✅ DailyRegionStats (UPSERT by DateKey+Region)
  const regionBuckets = new Map()
  for (const p of userProfiles) {
    if (!regionBuckets.has(p.Region)) regionBuckets.set(p.Region, [])
    regionBuckets.get(p.Region).push(p)
  }

  const existingRegions = await fetchAll('DailyRegionStats', `{DateKey}='${dateKey}'`)
  const regionKeyToId = new Map(
    existingRegions.map((r) => [`${r.fields.DateKey}::${r.fields.Region}`, r.id]),
  )

  const regionCreates = []
  const regionUpdates = []

  for (const [region, ps] of regionBuckets.entries()) {
    const players = ps.length
    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

    const fields = {
      DateKey: dateKey,
      Region: region,
      Players: players,
      AvgHints: avg(ps.map((x) => x.HintCount || 0)),
      AvgAccuracy: avg(ps.map((x) => x.Accuracy || 0)),
      AvgSolveSeconds: avg(ps.map((x) => (Number.isFinite(x.SolveSeconds) ? x.SolveSeconds : 0))),
      AvgCompletion: avg(ps.map((x) => x.Completion || 0)),
      ShareOfPlayers: totalPlayers ? players / totalPlayers : 0,
      GeneratedAt: new Date().toISOString(),
    }

    const key = `${dateKey}::${region}`
    const id = regionKeyToId.get(key)
    if (id) regionUpdates.push({ id, fields })
    else regionCreates.push({ fields })
  }

  if (regionCreates.length) await createInBatches('DailyRegionStats', regionCreates)
  if (regionUpdates.length) await updateInBatches('DailyRegionStats', regionUpdates)

  // ✅ DailyAnswerStats (UPSERT by DateKey+Answer)
  const existingAnswers = await fetchAll('DailyAnswerStats', `{DateKey}='${dateKey}'`)
  const ansKeyToId = new Map(
    existingAnswers.map((r) => [`${r.fields.DateKey}::${normalise(r.fields.Answer)}`, r.id]),
  )

  const answerRows = Array.from(answerStats.entries())
    .map(([answer, st]) => ({
      answer,
      players: st.players.size,
      firstUserId: st.firstUserId,
      firstTime: st.firstTime ? new Date(st.firstTime).toISOString() : null,

      countries: Array.from(st.countries),
      regions: Array.from(st.regions),
    }))

    .sort((a, b) => b.players - a.players)

  const answerCreates = []
  const answerUpdates = []

  answerRows.forEach((a, idx) => {
    const fields = {
      DateKey: dateKey,
      Answer: a.answer,
      Count: a.players,
      PercentOfPlayers: totalPlayers ? a.players / totalPlayers : 0,

      FirstMentionUser: a.firstUserId || null,
      FirstMentionTime: a.firstTime || null,

      Countries: a.countries.length ? a.countries.join(', ') : 'unknown',
      Regions: a.regions.length ? a.regions.join(', ') : 'unknown',

      IsRare: a.players <= 2,
      Rank: idx + 1,
      CreatedAt: new Date().toISOString(),
    }

    const key = `${dateKey}::${a.answer}`
    const id = ansKeyToId.get(key)
    if (id) answerUpdates.push({ id, fields })
    else answerCreates.push({ fields })
  })

  if (answerCreates.length) await createInBatches('DailyAnswerStats', answerCreates)
  if (answerUpdates.length) await updateInBatches('DailyAnswerStats', answerUpdates)

  // ✅ DailyAggregates UPSERT (stops duplicates)
  const regionCounts = {}
  for (const p of userProfiles) regionCounts[p.Region] = (regionCounts[p.Region] || 0) + 1

  const dailyAgg = {
    DateKey: dateKey,
    TotalPlayers: totalPlayers,
    TotalAttempts: totalAttempts,
    TotalHints: totalHints,
    DistinctAnswers: answerStats.size,
    DistinctCountriesCount: countrySet.size,
    CountriesMentioned: Array.from(countrySet).join(', '),
    DiversityScore: computeDiversity(regionCounts),
    GeneratedAt: new Date().toISOString(),
  }

  const aggUpsert = await upsertSingleByDateKey('DailyAggregates', dateKey, dailyAgg)

  return res.status(200).json({
    ok: true,
    dateKey,
    players: totalPlayers,
    profileCreates: profileCreates.length,
    profileUpdates: profileUpdates.length,
    regionCreates: regionCreates.length,
    regionUpdates: regionUpdates.length,
    answerCreates: answerCreates.length,
    answerUpdates: answerUpdates.length,
    dailyAggregate: aggUpsert,
  })
}
