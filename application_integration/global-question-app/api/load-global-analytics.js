/* /api/load-global-analytics.js */

import { base } from '../lib/airtable.js'
import { pickDateKey } from '../lib/dateKey.js'

/* ======================================================
   Utils — normalisation / math
====================================================== */

function normalise(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

function pct(n) {
  if (!isFinite(n)) return 0
  return clamp(Math.round(n), 0, 100)
}

function safeJsonArray(v) {
  try {
    const arr = v ? JSON.parse(v) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
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

function bucketise(values, cuts) {
  // cuts like [20,40,60,80] produces 5 buckets
  const buckets = new Array(cuts.length + 1).fill(0)
  for (const v of values) {
    const x = typeof v === 'number' && isFinite(v) ? v : 0
    let i = 0
    while (i < cuts.length && x >= cuts[i]) i++
    buckets[i]++
  }
  return buckets
}

/* ======================================================
   Percentile helpers (pace: lower is faster)
====================================================== */

/**
 * Pace is "lower = faster".
 * Returns: faster than X% of players.
 * We clamp away 0/100 for UX (when N>=2) because "0%" reads broken.
 */
function fasterThanPercentile(values, yourValue) {
  const vals = values.filter((x) => typeof x === 'number' && isFinite(x))
  if (!vals.length || typeof yourValue !== 'number' || !isFinite(yourValue)) return null

  const slower = vals.filter((x) => x > yourValue).length
  const equal = vals.filter((x) => x === yourValue).length

  const score = (slower + 0.5 * Math.max(0, equal - 1)) / vals.length

  const raw = score * 100
  const out = pct(raw)

  if (vals.length >= 2) return clamp(out, 1, 99)
  return out
}

/* ======================================================
   Airtable robustness wrappers
====================================================== */

async function trySelectAll(tableName, selectParams) {
  try {
    return await base(tableName).select(selectParams).all()
  } catch {
    return null
  }
}

function readField(f, keys, fallback = null) {
  for (const k of keys) {
    if (f && Object.prototype.hasOwnProperty.call(f, k) && f[k] !== undefined && f[k] !== null) {
      return f[k]
    }
  }
  return fallback
}

/* ======================================================
   Country name resolver (server-side)
   - First tries fields in stats tables (CountryName / Name)
   - Then uses a small built-in map for common codes
   - Else falls back to uppercased code
====================================================== */

const COUNTRY_NAME_FALLBACK = {
  gb: 'United Kingdom',
  uk: 'United Kingdom',
  us: 'United States',
  fr: 'France',
  de: 'Germany',
  es: 'Spain',
  it: 'Italy',
  ie: 'Ireland',
  nl: 'Netherlands',
  be: 'Belgium',
  ch: 'Switzerland',
  at: 'Austria',
  se: 'Sweden',
  no: 'Norway',
  dk: 'Denmark',
  fi: 'Finland',
  pl: 'Poland',
  pt: 'Portugal',
  gr: 'Greece',
  tr: 'Türkiye',
  jp: 'Japan',
  cn: 'China',
  in: 'India',
  au: 'Australia',
  ca: 'Canada',
  nz: 'New Zealand',
  br: 'Brazil',
  mx: 'Mexico',
  ng: 'Nigeria',
  za: 'South Africa',
  gh: 'Ghana',
  ke: 'Kenya',
}

function resolveCountryName(code, maybeName) {
  const c = normalise(code || '')
  const name = String(maybeName || '').trim()

  if (name && name.length >= 2 && name.toLowerCase() !== c) return name
  if (COUNTRY_NAME_FALLBACK[c]) return COUNTRY_NAME_FALLBACK[c]
  if (c) return c.toUpperCase()
  return 'Unknown'
}

/* ======================================================
   Response builder
   - Keep backward-compatible fields your UI already reads
   - Add richer fields for “no filler” tiles + copy
====================================================== */

function buildResponse({
  dateKey,
  totalPlayers,
  totalAttempts,
  avgCompletion,
  avgAccuracy,
  avgHints,
  medianPaceSeconds,
  meanPaceSeconds,

  // leaderboard
  countryLeaderboard,
  yourCountryRank,
  yourCountryAvgCompletion,

  // percentile garnish (never required)
  pacePercentileForUser,

  // distributions
  accuracyBuckets,
  completionBuckets,
  outcomeCounts,

  // new: bubbles & ranked rare
  commonGuesses,
  rareCorrect,
  exitEarlyShare,

  // new: pace narrative
  paceDeltaSecondsForUser,
  paceRelationForUser, // 'faster' | 'slower' | 'about-average' | null
  paceSampleOK, // boolean (N threshold)
}) {
  const players = typeof totalPlayers === 'number' ? totalPlayers : 0

  return {
    dateKey,

    // ✅ fields DailyAnalytics.vue already reads
    totalPlayers: players,
    totalAttempts: typeof totalAttempts === 'number' ? totalAttempts : null,
    avgCompletion: typeof avgCompletion === 'number' ? pct(avgCompletion) : null,
    avgAccuracy: typeof avgAccuracy === 'number' ? pct(avgAccuracy) : null,

    yourCountryRank: typeof yourCountryRank === 'number' ? yourCountryRank : null,
    yourCountryAvgCompletion:
      typeof yourCountryAvgCompletion === 'number' ? pct(yourCountryAvgCompletion) : null,

    pacePercentileForUser:
      typeof pacePercentileForUser === 'number' ? pct(pacePercentileForUser) : null,

    countryLeaderboard: Array.isArray(countryLeaderboard) ? countryLeaderboard : [],

    // ✅ richer metadata
    meta: {
      players,
      countries: Array.isArray(countryLeaderboard) ? countryLeaderboard.length : 0,
      sampleTier:
        players >= 50000
          ? 'massive'
          : players >= 5000
            ? 'large'
            : players >= 500
              ? 'medium'
              : players >= 50
                ? 'small'
                : players >= 5
                  ? 'tiny'
                  : 'micro',
      hasGlobal: players > 0,
      hasCountryBoard: Array.isArray(countryLeaderboard) && countryLeaderboard.length > 0,
      paceSampleOK: !!paceSampleOK,
    },

    distributions: {
      accuracyBuckets: Array.isArray(accuracyBuckets) ? accuracyBuckets : null,
      completionBuckets: Array.isArray(completionBuckets) ? completionBuckets : null,
      outcomeCounts: outcomeCounts || null,
    },

    aggregates: {
      avgHints: typeof avgHints === 'number' ? avgHints : null,
      medianPaceSeconds: typeof medianPaceSeconds === 'number' ? medianPaceSeconds : null,
      meanPaceSeconds: typeof meanPaceSeconds === 'number' ? meanPaceSeconds : null,
    },

    // ✅ new for bubbles + rare ranking
    commonGuesses: Array.isArray(commonGuesses) ? commonGuesses : [],
    rareCorrect: Array.isArray(rareCorrect) ? rareCorrect : [],
    exitEarlyShare: typeof exitEarlyShare === 'number' ? pct(exitEarlyShare) : null,

    // ✅ new for “fast vs average” copy
    paceDeltaSecondsForUser:
      typeof paceDeltaSecondsForUser === 'number' ? paceDeltaSecondsForUser : null,
    paceRelationForUser: paceRelationForUser || null,
  }
}

/* ======================================================
   Core: derive per-user summaries from UserAnswers
   - fixes impossible accuracy
   - produces pace timings
   - produces outcomes & guess counts
====================================================== */

function deriveFromUserAnswers(rows) {
  const byUser = new Map()

  // answer frequency (unique per user)
  const guessCounts = new Map()

  // outcomes
  const outcomeCounts = {}

  // best available correct list length for the day
  let requiredSlotsGuess = 0
  let correctAnswersList = null

  for (const r of rows) {
    const f = r.fields || {}
    const uid = String(f.UserID || '')
    if (!uid) continue

    if (!byUser.has(uid)) {
      byUser.set(uid, {
        country: normalise(f.Country || 'unknown'),
        firstAt: null,
        lastAt: null,
        submittedSet: new Set(),
        correctSet: new Set(),
        resultCounts: {},
        hintsUsed: 0,
      })
    }

    const u = byUser.get(uid)

    // outcomes
    const resKey = normalise(f.Result || '')
    if (resKey) {
      outcomeCounts[resKey] = (outcomeCounts[resKey] || 0) + 1
      u.resultCounts[resKey] = (u.resultCounts[resKey] || 0) + 1
    }

    // hint usage
    if (f.HintUsed === true) u.hintsUsed += 1

    // union of submitted guesses (normalised)
    const answers = safeJsonArray(f.AnswersJSON)
    for (const a of answers) {
      const v = normalise(a)
      if (!v) continue
      if (!u.submittedSet.has(v)) {
        u.submittedSet.add(v)
        guessCounts.set(v, (guessCounts.get(v) || 0) + 1)
      }
    }

    // union of correct answers for that row
    const ca = safeJsonArray(f.CorrectAnswersJSON)
    if (Array.isArray(ca)) {
      if (ca.length > requiredSlotsGuess) requiredSlotsGuess = ca.length
      if (!correctAnswersList || ca.length > correctAnswersList.length) {
        correctAnswersList = ca
      }
      for (const c of ca) {
        const v = normalise(c)
        if (v) u.correctSet.add(v)
      }
    }

    // pace times
    const t = f.CreatedAt ? new Date(f.CreatedAt) : null
    if (t && !isNaN(t.getTime())) {
      if (!u.firstAt || t < u.firstAt) u.firstAt = t
      if (!u.lastAt || t > u.lastAt) u.lastAt = t
    }
  }

  if (!requiredSlotsGuess) requiredSlotsGuess = 1

  // per-user summaries
  const userSummaries = []
  let totalAttempts = rows.length
  let hintsSum = 0

  for (const [uid, u] of byUser.entries()) {
    const uniqueSubmitted = u.submittedSet.size
    const uniqueCorrect = Math.min(u.correctSet.size, requiredSlotsGuess)

    // Completion: coverage over required slots
    const completionPct = requiredSlotsGuess > 0 ? (uniqueCorrect / requiredSlotsGuess) * 100 : 0

    /**
     * Accuracy (sane definition):
     * - cannot exceed 100
     * - rewards efficiency in discovering the required answers
     * - prevents “17 correct out of 9 guesses” nonsense
     *
     * We compare: required answers found vs guess effort.
     * Denominator uses max(uniqueSubmitted, requiredSlotsGuess) so you can't get “free” 100
     * unless your guesses are at least on the scale of the required set.
     */
    const denom = Math.max(uniqueSubmitted, requiredSlotsGuess)
    const accuracyPct = denom > 0 ? (uniqueCorrect / denom) * 100 : 0

    let paceSeconds = null
    if (u.firstAt && u.lastAt) {
      paceSeconds = Math.max(0, Math.round((u.lastAt.getTime() - u.firstAt.getTime()) / 1000))
    }

    hintsSum += u.hintsUsed

    userSummaries.push({
      userId: uid,
      country: u.country || 'unknown',
      completionPct: pct(completionPct),
      accuracyPct: pct(accuracyPct),
      uniqueSubmitted,
      uniqueCorrect,
      paceSeconds,
      hintsUsed: u.hintsUsed,
      resultCounts: u.resultCounts,
    })
  }

  return {
    requiredSlotsGuess,
    correctAnswersList: Array.isArray(correctAnswersList) ? correctAnswersList : [],
    totalPlayers: userSummaries.length,
    totalAttempts,
    userSummaries,
    guessCounts,
    outcomeCounts,
    hintsSum,
  }
}

/* ======================================================
   Common + rare answers (ranked with %)
====================================================== */

function computeCommonAndRare({
  guessCounts,
  totalPlayers,
  correctAnswersList,
  topCommon = 8,
  topRare = 8,
}) {
  const commonGuesses = [...guessCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topCommon)
    .map(([answer, n]) => ({
      answer,
      pct: totalPlayers ? pct((n / totalPlayers) * 100) : 0,
    }))

  const correctSet = new Set(correctAnswersList.map((x) => normalise(x)).filter(Boolean))

  const rareCorrect = [...correctSet]
    .map((ans) => {
      const n = guessCounts.get(ans) || 0
      return {
        answer: ans,
        pct: totalPlayers ? pct((n / totalPlayers) * 100) : 0,
        players: n,
      }
    })
    .sort((a, b) => a.pct - b.pct)
    .slice(0, topRare)
    .map((x) => ({ answer: x.answer, pct: x.pct }))

  return { commonGuesses, rareCorrect }
}

/* ======================================================
   Main handler
====================================================== */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    const { dateKey } = pickDateKey(req)
    const { userId, country } = req.body || {}
    const userCountry = normalise(country || '')

    /* ============================================================
       PATH A (REAL TABLES): DailyAggregates + DailyCountryStats/DailyRegionStats
       - Used when cron is working and tables exist
    ============================================================ */

    const aggRows =
      (await trySelectAll('DailyAggregates', {
        maxRecords: 1,
        filterByFormula: `{DateKey} = '${dateKey}'`,
        sort: [{ field: 'GeneratedAt', direction: 'desc' }],
      })) || []

    const countryRows =
      (await trySelectAll('DailyCountryStats', {
        maxRecords: 200,
        filterByFormula: `{DateKey}='${dateKey}'`,
        sort: [{ field: 'Players', direction: 'desc' }],
      })) ||
      (await trySelectAll('DailyRegionStats', {
        maxRecords: 200,
        filterByFormula: `{DateKey}='${dateKey}'`,
        sort: [{ field: 'Players', direction: 'desc' }],
      })) ||
      []

    /* ============================================================
       ALWAYS: compute bubbles + rare + exits from UserAnswers
       - avoids “empty tiles” even when aggregates lag
    ============================================================ */

    const uaRows =
      (await trySelectAll('UserAnswers', {
        maxRecords: 5000,
        filterByFormula: `{DateKey}='${dateKey}'`,
      })) || []

    const derived = deriveFromUserAnswers(uaRows)

    const { commonGuesses, rareCorrect } = computeCommonAndRare({
      guessCounts: derived.guessCounts,
      totalPlayers: derived.totalPlayers,
      correctAnswersList: derived.correctAnswersList,
      topCommon: 8,
      topRare: 8,
    })

    const exitEarlyShare =
      derived.totalPlayers > 0 && derived.outcomeCounts['exit-early']
        ? (derived.outcomeCounts['exit-early'] / derived.totalPlayers) * 100
        : null

    /* ============================================================
       If Path A exists: use DailyAggregates for headline metrics,
       but keep our bubbles/rare/exits.
    ============================================================ */

    if (aggRows.length) {
      const f = aggRows[0].fields || {}

      const totalPlayers = Number(readField(f, ['TotalPlayers'], derived.totalPlayers || 0)) || 0
      const totalAttempts = Number(readField(f, ['TotalAttempts'], derived.totalAttempts || null))
      const avgCompletion = Number(readField(f, ['AvgCompletion'], null))
      const avgAccuracy = Number(readField(f, ['AvgAccuracy'], null))
      const avgHints = Number(readField(f, ['AvgHints'], null))

      const medianPaceSeconds = Number(readField(f, ['MedianPaceSeconds'], null))
      const meanPaceSeconds = Number(readField(f, ['AvgSolveSeconds', 'MeanPaceSeconds'], null))

      // leaderboard
      const countryLeaderboard = (countryRows || [])
        .map((r) => {
          const rf = r.fields || {}

          const code = normalise(readField(rf, ['CountryCode', 'Country', 'Code'], ''))
          const users = Number(readField(rf, ['Players', 'Users', 'Count'], 0)) || 0

          // "AVG" column: prefer completion avg
          const value = Number(
            readField(rf, ['AvgCompletion', 'AvgCompletionPct', 'CompletionAvg'], 0),
          )

          // name: try table-provided name, else resolve
          const nameFromTable = readField(rf, ['CountryName', 'Name', 'Label'], null)

          return {
            country: code,
            name: resolveCountryName(code, nameFromTable),
            users,
            value: pct(value),
          }
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)

      let yourCountryRank = null
      let yourCountryAvgCompletion = null

      if (userCountry) {
        const idx = countryLeaderboard.findIndex((x) => normalise(x.country) === userCountry)
        if (idx !== -1) {
          yourCountryRank = idx + 1
          yourCountryAvgCompletion = countryLeaderboard[idx].value
        }
      }

      /**
       * Pace percentile for the user:
       * - ONLY compute if we have enough samples (>=5), else return null
       * - This avoids “top 0%” theatre on tiny days
       */
      const paceVals = derived.userSummaries
        .map((u) => u.paceSeconds)
        .filter((x) => typeof x === 'number' && x > 0)

      const paceSampleOK = paceVals.length >= 5
      const you = derived.userSummaries.find((u) => String(u.userId) === String(userId))

      const pacePercentileForUser =
        paceSampleOK && you && typeof you.paceSeconds === 'number'
          ? fasterThanPercentile(paceVals, you.paceSeconds)
          : null

      // Pace narrative: delta vs median (works even when percentile is null)
      const med = median(paceVals)
      let paceDeltaSecondsForUser = null
      let paceRelationForUser = null

      if (you && typeof you.paceSeconds === 'number' && typeof med === 'number') {
        paceDeltaSecondsForUser = you.paceSeconds - med
        paceRelationForUser =
          Math.abs(paceDeltaSecondsForUser) <= 30
            ? 'about-average'
            : paceDeltaSecondsForUser < 0
              ? 'faster'
              : 'slower'
      }

      return res.status(200).json(
        buildResponse({
          dateKey,

          totalPlayers,
          totalAttempts,

          avgCompletion,
          avgAccuracy,
          avgHints,

          medianPaceSeconds: typeof medianPaceSeconds === 'number' ? medianPaceSeconds : med,
          meanPaceSeconds,

          countryLeaderboard,
          yourCountryRank,
          yourCountryAvgCompletion,

          pacePercentileForUser,

          accuracyBuckets: null,
          completionBuckets: null,

          outcomeCounts: derived.outcomeCounts,

          commonGuesses,
          rareCorrect,
          exitEarlyShare,

          paceDeltaSecondsForUser,
          paceRelationForUser,
          paceSampleOK,
        }),
      )
    }

    /* ============================================================
       PATH B (fallback):
       - Use derived per-user summaries from UserAnswers
       - Still returns everything needed for your tiles
    ============================================================ */

    const totalPlayers = derived.totalPlayers
    const totalAttempts = derived.totalAttempts

    const compVals = derived.userSummaries.map((u) => u.completionPct)
    const accVals = derived.userSummaries.map((u) => u.accuracyPct)

    const paceVals = derived.userSummaries
      .map((u) => u.paceSeconds)
      .filter((x) => typeof x === 'number' && x > 0)

    const avgCompletion = mean(compVals)
    const avgAccuracy = mean(accVals)

    const medianPaceSeconds = median(paceVals)
    const meanPaceSeconds = mean(paceVals)

    // fallback leaderboard: average completion by country
    const countryMap = new Map()
    for (const u of derived.userSummaries) {
      const c = u.country || 'unknown'
      if (!countryMap.has(c)) countryMap.set(c, { users: 0, sum: 0 })
      const obj = countryMap.get(c)
      obj.users += 1
      obj.sum += u.completionPct
    }

    const allCountries = [...countryMap.entries()]
      .map(([code, v]) => ({
        country: code,
        name: resolveCountryName(code, null),
        users: v.users,
        value: pct(v.sum / v.users),
      }))
      .sort((a, b) => b.value - a.value)

    const countryLeaderboard = allCountries.slice(0, 10)

    let yourCountryRank = null
    let yourCountryAvgCompletion = null

    if (userCountry) {
      const idx = allCountries.findIndex((x) => normalise(x.country) === userCountry)
      if (idx !== -1) {
        yourCountryRank = idx + 1
        yourCountryAvgCompletion = allCountries[idx].value
      }
    }

    // pace percentile: only if enough samples
    const paceSampleOK = paceVals.length >= 5
    const you = derived.userSummaries.find((u) => String(u.userId) === String(userId))

    const pacePercentileForUser =
      paceSampleOK && you && typeof you.paceSeconds === 'number'
        ? fasterThanPercentile(paceVals, you.paceSeconds)
        : null

    // pace narrative: delta vs median
    let paceDeltaSecondsForUser = null
    let paceRelationForUser = null
    if (you && typeof you.paceSeconds === 'number' && typeof medianPaceSeconds === 'number') {
      paceDeltaSecondsForUser = you.paceSeconds - medianPaceSeconds
      paceRelationForUser =
        Math.abs(paceDeltaSecondsForUser) <= 30
          ? 'about-average'
          : paceDeltaSecondsForUser < 0
            ? 'faster'
            : 'slower'
    }

    const accuracyBuckets = bucketise(accVals, [20, 40, 60, 80])
    const completionBuckets = bucketise(compVals, [20, 40, 60, 80])

    // avgHints from derived
    const avgHints =
      totalPlayers > 0 ? Math.round((derived.hintsSum / totalPlayers) * 10) / 10 : null

    return res.status(200).json(
      buildResponse({
        dateKey,

        totalPlayers,
        totalAttempts,

        avgCompletion,
        avgAccuracy,
        avgHints,

        medianPaceSeconds,
        meanPaceSeconds,

        countryLeaderboard,
        yourCountryRank,
        yourCountryAvgCompletion,

        pacePercentileForUser,

        accuracyBuckets,
        completionBuckets,

        outcomeCounts: derived.outcomeCounts,

        commonGuesses,
        rareCorrect,
        exitEarlyShare,

        paceDeltaSecondsForUser,
        paceRelationForUser,
        paceSampleOK,
      }),
    )
  } catch (err) {
    console.error('load-global-analytics error:', err)
    return res.status(500).json({ error: 'Failed to load global analytics' })
  }
}
