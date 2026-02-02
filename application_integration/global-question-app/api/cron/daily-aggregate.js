// /api/cron/daily-aggregate.js
import { base } from '../../lib/airtable.js'
import { continentFromCountry } from '../../src/data/continents.js'

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
    const id = r.UserID
    if (!id) continue
    if (!byUser.has(id)) byUser.set(id, [])
    byUser.get(id).push(r)
  }

  const totalPlayers = byUser.size

  // Attempts = only real attempts (1..3). (Exclude hint marker 998 + final 999)
  const attemptRows = rows.filter((r) => {
    const ai = Number(r.AttemptIndex)
    return ai >= 1 && ai <= 3
  })

  const totalAttempts = attemptRows.length

  // Hint = either explicit HintUsed checkbox OR hint marker record
  const totalHints = rows.filter(
    (r) => r.HintUsed || Number(r.AttemptIndex) === 998 || r.Result === 'hint-used',
  ).length

  // Distinct countries (from logs)
  const countrySet = new Set()
  for (const r of rows) {
    if (r.Country) countrySet.add(String(r.Country).toLowerCase())
  }

  // =====================================================
  // Answer stats: track mentions + UNIQUE PLAYERS per answer
  // =====================================================
  const answerStats = new Map()
  // shape: answer -> { mentions: number, players: Set<userId>, firstUserId: string|null, firstTime: number|null }

  for (const r of attemptRows) {
    const userId = r.UserID
    const created = r.CreatedAt ? new Date(r.CreatedAt).getTime() : null

    const answers = safeJsonArray(r.AnswersJSON)

    for (const raw of answers) {
      const a = normalise(raw)
      if (!a) continue

      if (!answerStats.has(a)) {
        answerStats.set(a, { mentions: 0, players: new Set(), firstUserId: null, firstTime: null })
      }

      const st = answerStats.get(a)
      st.mentions += 1
      if (userId) st.players.add(userId)

      if (created && (!st.firstTime || created < st.firstTime)) {
        st.firstTime = created
        st.firstUserId = userId || null
      }
    }
  }

  // =====================================================
  // Per-user daily profile (accuracy/completion/solveSeconds etc.)
  // =====================================================
  const userProfiles = []

  // For completion denominator (how many answers exist today)
  // Use the max size of CorrectAnswersJSON seen in attempt rows.
  let totalSlots = 0
  for (const r of attemptRows) {
    const ca = safeJsonArray(r.CorrectAnswersJSON)
    if (ca.length > totalSlots) totalSlots = ca.length
  }

  for (const [userId, logs] of byUser.entries()) {
    // only attempts
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

    // distinct submitted (unique answers)
    const submitted = new Set()
    for (const r of attempts) {
      for (const ans of safeJsonArray(r.AnswersJSON)) {
        const n = normalise(ans)
        if (n) submitted.add(n)
      }
    }

    // distinct correct discovered
    const correct = new Set()
    for (const r of attempts) {
      for (const c of safeJsonArray(r.CorrectAnswersJSON)) {
        const n = normalise(c)
        if (n) correct.add(n)
      }
    }

    // solve time (first attempt timestamp to last attempt timestamp)
    let solveSeconds = null
    if (attempts.length && attempts[0]._t && attempts[attempts.length - 1]._t) {
      solveSeconds = Math.round((attempts[attempts.length - 1]._t - attempts[0]._t) / 1000)
      if (solveSeconds < 0) solveSeconds = null
    }

    // accuracy and completion as 0..1 (Airtable formats as percent)
    const accuracy = submitted.size > 0 ? correct.size / submitted.size : 0
    const completion = totalSlots > 0 ? correct.size / totalSlots : 0

    const countryCode = String(logs.find((x) => x.Country)?.Country || 'xx').toLowerCase()
    const region = continentFromCountry(countryCode)

    // rare answers the user submitted (based on UNIQUE PLAYERS for that answer)
    let rareAnswers = 0
    for (const a of submitted) {
      const st = answerStats.get(a)
      const playerCount = st ? st.players.size : 0
      if (playerCount > 0 && playerCount <= 2) rareAnswers += 1
    }

    userProfiles.push({
      UserID: userId,
      DateKey: dateKey,

      // ⚠️ Make these TEXT fields in Airtable (not selects), otherwise you'll get option errors.
      Country: countryCode,
      Region: region,

      AttemptsUsed: attempts.length,
      HintCount: hintCount,

      Accuracy: accuracy, // 0..1
      Completion: completion, // 0..1
      SolveSeconds: solveSeconds,

      DistinctAnswers: submitted.size,
      RareAnswers: rareAnswers,
    })
  }

  // =====================================================
  // Write DailyAnswerStats (ranked)
  //   PercentOfPlayers MUST be based on unique players
  // =====================================================
  const answerEntries = Array.from(answerStats.entries()).map(([answer, st]) => {
    const playerCount = st.players.size
    const percentOfPlayers = totalPlayers > 0 ? playerCount / totalPlayers : 0

    return {
      answer,
      mentions: st.mentions,
      playerCount,
      percentOfPlayers,
      isRare: playerCount > 0 && playerCount <= 2,
      firstUserId: st.firstUserId,
      firstMentionTime: st.firstTime ? new Date(st.firstTime).toISOString() : null,
    }
  })

  // Rank by playerCount desc, then mentions desc
  answerEntries.sort((a, b) => b.playerCount - a.playerCount || b.mentions - a.mentions)

  const answerRows = answerEntries.map((e, idx) => ({
    fields: {
      DateKey: dateKey,
      Answer: e.answer,

      // Choose ONE meaning for Count. I recommend: UNIQUE PLAYERS.
      Count: e.playerCount,

      PercentOfPlayers: e.percentOfPlayers, // 0..1

      IsRare: e.isRare,
      Rank: idx + 1,

      // Only write these if your Airtable fields are TEXT (not selects).
      FirstMentionUser: e.firstUserId || '',
      FirstMentionTime: e.firstMentionTime || '',
    },
  }))

  if (answerRows.length) {
    await createInBatches('DailyAnswerStats', answerRows)
  }

  // =====================================================
  // AnswerDictionary: ensure every answer exists (minimal seed)
  // =====================================================
  // This just creates Answer rows so later enrichment can fill ISOCode/Region/etc.
  // Make sure AnswerDictionary.Answer is TEXT, and ideally unique.
  const existingDict = await base('AnswerDictionary')
    .select({
      filterByFormula: `{Answer} != ''`,
      maxRecords: 5000,
    })
    .all()

  const existingAnswers = new Set(existingDict.map((r) => normalise(r.fields?.Answer)))
  const missing = answerEntries
    .map((e) => e.answer)
    .filter((a) => a && !existingAnswers.has(normalise(a)))

  const dictRows = missing.map((a) => ({ fields: { Answer: a } }))
  if (dictRows.length) {
    await createInBatches('AnswerDictionary', dictRows)
  }

  // =====================================================
  // DailyAggregates
  // =====================================================
  const avgSolveSeconds = userProfiles.filter((u) => Number.isFinite(u.SolveSeconds)).length
    ? Math.round(
        userProfiles
          .filter((u) => Number.isFinite(u.SolveSeconds))
          .reduce((s, u) => s + u.SolveSeconds, 0) /
          userProfiles.filter((u) => Number.isFinite(u.SolveSeconds)).length,
      )
    : null

  const avgAccuracy = userProfiles.length
    ? userProfiles.reduce((s, u) => s + (u.Accuracy || 0), 0) / userProfiles.length
    : 0

  const avgCompletion = userProfiles.length
    ? userProfiles.reduce((s, u) => s + (u.Completion || 0), 0) / userProfiles.length
    : 0

  const ukShare = totalPlayers
    ? userProfiles.filter((u) => String(u.Country).toLowerCase() === 'gb').length / totalPlayers
    : 0

  // Top region by players
  const regionCounts = new Map()
  for (const u of userProfiles) {
    const r = u.Region || 'Unknown'
    regionCounts.set(r, (regionCounts.get(r) || 0) + 1)
  }
  const topRegion =
    Array.from(regionCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'

  const dailyAgg = {
    DateKey: dateKey,
    TotalPlayers: totalPlayers,
    TotalAttempts: totalAttempts,
    TotalHints: totalHints,

    DistinctAnswers: answerStats.size,
    DistinctCountriesCount: countrySet.size,

    // Make this a TEXT/LONG TEXT field
    CountriesMentioned: Array.from(countrySet).sort().join(', '),

    AvgSolveSeconds: avgSolveSeconds ?? 0,
    AvgAccuracy: avgAccuracy, // 0..1
    AvgCompletion: avgCompletion, // 0..1

    UKShare: ukShare, // 0..1
    TopRegion: topRegion,

    GeneratedAt: new Date().toISOString(),
  }

  await base('DailyAggregates').create([{ fields: dailyAgg }])

  // =====================================================
  // DailyRegionStats
  // =====================================================
  const byRegion = new Map()
  for (const u of userProfiles) {
    const r = u.Region || 'Unknown'
    if (!byRegion.has(r)) byRegion.set(r, [])
    byRegion.get(r).push(u)
  }

  // For region top answers: need mapping answer -> players in that region
  const regionAnswerPlayers = new Map() // region -> Map(answer -> Set(userId))
  for (const r of attemptRows) {
    const userId = r.UserID
    if (!userId) continue

    const countryCode = String(r.Country || 'xx').toLowerCase()
    const region = continentFromCountry(countryCode)

    if (!regionAnswerPlayers.has(region)) regionAnswerPlayers.set(region, new Map())
    const amap = regionAnswerPlayers.get(region)

    for (const raw of safeJsonArray(r.AnswersJSON)) {
      const a = normalise(raw)
      if (!a) continue
      if (!amap.has(a)) amap.set(a, new Set())
      amap.get(a).add(userId)
    }
  }

  const regionRows = []
  for (const [region, users] of byRegion.entries()) {
    const players = users.length
    const shareOfPlayers = totalPlayers ? players / totalPlayers : 0

    const avgHints = players ? users.reduce((s, u) => s + (u.HintCount || 0), 0) / players : 0
    const avgAcc = players ? users.reduce((s, u) => s + (u.Accuracy || 0), 0) / players : 0
    const avgComp = players ? users.reduce((s, u) => s + (u.Completion || 0), 0) / players : 0

    const solvePool = users.filter((u) => Number.isFinite(u.SolveSeconds))
    const avgSolve = solvePool.length
      ? Math.round(solvePool.reduce((s, u) => s + u.SolveSeconds, 0) / solvePool.length)
      : null

    // distinct answers in region (unique normalised answers submitted by region users)
    const aMap = regionAnswerPlayers.get(region) || new Map()
    const distinctAnswers = aMap.size

    // top answers (by unique players in region), take top 5
    const topAnswers = Array.from(aMap.entries())
      .map(([a, set]) => ({ a, c: set.size }))
      .sort((x, y) => y.c - x.c)
      .slice(0, 5)
      .map((x) => x.a)
      .join(', ')

    regionRows.push({
      fields: {
        DateKey: dateKey,

        // ⚠️ Make Region a TEXT field unless you want to pre-create options.
        Region: region,

        Players: players,
        AvgHints: avgHints,
        AvgAccuracy: avgAcc, // 0..1
        AvgSolveSeconds: avgSolve ?? 0,
        AvgCompletion: avgComp, // 0..1

        DistinctAnswers: distinctAnswers,

        // Make TopAnswers TEXT (not linked/multi-select for now)
        TopAnswers: topAnswers,

        ShareOfPlayers: shareOfPlayers, // 0..1

        GeneratedAt: new Date().toISOString(),
      },
    })
  }

  if (regionRows.length) {
    await createInBatches('DailyRegionStats', regionRows)
  }

  // =====================================================
  // UserDailyProfile
  // =====================================================
  const profileRows = userProfiles.map((u) => ({ fields: u }))
  if (profileRows.length) {
    await createInBatches('UserDailyProfile', profileRows)
  }

  return res.status(200).json({
    ok: true,
    dateKey,
    players: totalPlayers,
    answers: answerStats.size,
    regions: regionRows.length,
    dictAdded: dictRows.length,
  })
}
