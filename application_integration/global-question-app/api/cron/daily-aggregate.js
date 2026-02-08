// /api/cron/daily-aggregate.js

import { base } from '../../lib/airtable.js'
import { pickDateKey } from '../../lib/dateKey.js'
import { continentFromCountry } from '../../lib/continents.js'
import { dateKeyOffsetDays } from '../../lib/dateKey.js'

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

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

function pct(x) {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(100, Math.round(x)))
}

function pct100(x) {
  // x is 0–1 fraction -> 0–100 integer
  if (!Number.isFinite(x)) return 0
  return clamp(Math.round(x * 100), 0, 100)
}

function median(nums) {
  const arr = nums.filter((x) => typeof x === 'number' && isFinite(x)).sort((a, b) => a - b)
  if (!arr.length) return null
  const mid = Math.floor(arr.length / 2)
  return arr.length % 2 ? arr[mid] : Math.round((arr[mid - 1] + arr[mid]) / 2)
}

function mean(nums) {
  const arr = nums.filter((x) => typeof x === 'number' && isFinite(x))
  if (!arr.length) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
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
  // u.Accuracy / u.Completion are now stored as 0–100 (%)
  if (u.HintCount >= 2) return 'Hint-lover'
  if (u.SolveSeconds && u.SolveSeconds < 40 && u.Accuracy >= 80) return 'Speedrunner'
  if (u.Accuracy >= 80 && u.AttemptsUsed <= 2) return 'Sniper'
  if (u.Completion < 40) return 'Struggler'
  if (u.DistinctAnswers >= 8) return 'Explorer'
  return 'Balanced'
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed')

  // Vercel Cron calls don't support custom Authorisation headers.
  // Vercel sets x-vercel-cron: 1 on Cron requests, so we trust that.
  const isVercelCron = req.headers['x-vercel-cron'] === '1'

  // Still allow manual triggering via Bearer header or ?secret=...
  const headerSecret = req.headers.authorization
  const querySecret = req.query?.secret ? `Bearer ${req.query.secret}` : null
  const expected = `Bearer ${process.env.CRON_SECRET || 'akinto-to-the-moon'}`

  if (!isVercelCron && headerSecret !== expected && querySecret !== expected) {
    return res.status(401).json({ error: 'unauthorised' })
  }

  // ✅ Default to TODAY in Europe/London (aligns with frontend)
  const { dateKey } = pickDateKey(req, { defaultOffsetDays: 0 })

  const yesterdayKey = dateKeyOffsetDays(-1)

  // Prefetch yesterday profiles once (fast)
  const yesterdayProfiles = await fetchAll('UserDailyProfile', `{DateKey}='${yesterdayKey}'`)
  const yesterdayUserSet = new Set(yesterdayProfiles.map((r) => String(r.fields?.UserID || '')))

  console.log('📊 Aggregating DateKey:', dateKey)

  // ... keep the rest of your file unchanged

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

    const completionRaw = totalSlots ? correct.size / totalSlots : 0
    const accuracyRaw = submitted.size ? correct.size / submitted.size : 0

    const completion = pct(completionRaw * 100)
    const accuracy = pct(accuracyRaw * 100)

    const userMaster = usersById.get(String(userId))

    const firstSolveToday =
      completion >= 1 &&
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

    const streakContinues = yesterdayUserSet.has(String(userId))

    userProfiles.push({
      UserID: String(userId),
      DateKey: dateKey,
      Country: countryCode,
      Region: region,
      AttemptsUsed: attempts.length,
      HintCount: hintCount,

      AvgAccuracy: pct(mean(ps.map((x) => x.Accuracy || 0))),
      AvgCompletion: pct(mean(ps.map((x) => x.Completion || 0))),

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

  // headline aggregates (0–100)
  const completionVals = userProfiles
    .map((p) => Number(p.Completion))
    .filter((x) => Number.isFinite(x))
  const accuracyVals = userProfiles.map((p) => Number(p.Accuracy)).filter((x) => Number.isFinite(x))
  const hintVals = userProfiles.map((p) => Number(p.HintCount)).filter((x) => Number.isFinite(x))
  const solveVals = userProfiles
    .map((p) => (Number.isFinite(p.SolveSeconds) ? Number(p.SolveSeconds) : null))
    .filter((x) => typeof x === 'number' && x > 0)

  const AvgCompletion = mean(completionVals)
  const AvgAccuracy = mean(accuracyVals)
  const AvgHints = mean(hintVals)

  const MedianPaceSeconds = median(solveVals)
  const AvgSolveSeconds = mean(solveVals)

  const dailyAgg = {
    DateKey: dateKey,
    TotalPlayers: totalPlayers,
    TotalAttempts: totalAttempts,
    TotalHints: totalHints,

    // ✅ headline metrics used by /api/load-global-analytics Path A
    AvgAccuracy: pct(AvgAccuracy),
    AvgCompletion: pct(AvgCompletion),

    AvgHints: AvgHints, // numeric (can be decimal)
    MedianPaceSeconds: MedianPaceSeconds, // seconds
    AvgSolveSeconds: AvgSolveSeconds, // seconds

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
