/* /api/load-global-analytics.js */

import { base } from '../lib/airtable.js'
import { pickDateKey } from '../lib/dateKey.js'

/* ======================================================
   Utils
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

function bucketise(values, cuts) {
  const buckets = new Array(cuts.length + 1).fill(0)
  for (const v of values) {
    const x = typeof v === 'number' && isFinite(v) ? v : 0
    let i = 0
    while (i < cuts.length && x >= cuts[i]) i++
    buckets[i]++
  }
  return buckets
}

/**
 * Pace percentile (higher = better).
 * Clamp away 0% / 100% when we have multiple players.
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
   Response Builder
====================================================== */

function buildResponse({
  dateKey,
  totalPlayers,
  totalAttempts,
  avgCompletion,
  avgAccuracy,
  avgHints,
  medianPaceSeconds,
  countryLeaderboard,
  yourCountryRank,
  yourCountryAvgCompletion,
  pacePercentileForUser,
  accuracyBuckets,
  completionBuckets,
  outcomeCounts,
  commonGuesses,
  rareCorrect,
  exitEarlyShare,
}) {
  const players = typeof totalPlayers === 'number' ? totalPlayers : 0

  return {
    dateKey,

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

    meta: {
      players,
      countries: Array.isArray(countryLeaderboard) ? countryLeaderboard.length : 0,
      hasGlobal: players > 0,
      hasCountryBoard: Array.isArray(countryLeaderboard) && countryLeaderboard.length > 0,
    },

    distributions: {
      accuracyBuckets,
      completionBuckets,
      outcomeCounts,
    },

    aggregates: {
      avgHints,
      medianPaceSeconds,
    },

    commonGuesses,
    rareCorrect,
    exitEarlyShare,
  }
}

/* ======================================================
   Handler
====================================================== */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    const { dateKey } = pickDateKey(req)
    const { userId, country } = req.body || {}

    const userCountry = normalise(country || '')

    /* ============================================================
       PATH A — DailyAggregates + Region/Country tables
    ============================================================ */

    const aggRows = await base('DailyAggregates')
      .select({
        maxRecords: 1,
        filterByFormula: `{DateKey} = '${dateKey}'`,
        sort: [{ field: 'GeneratedAt', direction: 'desc' }],
      })
      .all()

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
       COMMON / RARE / EXIT — computed from UserAnswers ALWAYS
    ============================================================ */

    const uaRows = await base('UserAnswers')
      .select({
        maxRecords: 5000,
        filterByFormula: `{DateKey}='${dateKey}'`,
      })
      .all()

    const playersSet = new Set()
    const perUserGuessSet = new Map()
    const outcomeCounts = {}

    let correctAnswersList = null

    for (const r of uaRows) {
      const f = r.fields || {}
      const uid = String(f.UserID || '')
      if (!uid) continue

      playersSet.add(uid)

      const resKey = String(f.Result || '').toLowerCase()
      outcomeCounts[resKey] = (outcomeCounts[resKey] || 0) + 1

      if (!perUserGuessSet.has(uid)) perUserGuessSet.set(uid, new Set())

      for (const a of safeJsonArray(f.AnswersJSON)) {
        const k = normalise(a)
        if (k) perUserGuessSet.get(uid).add(k)
      }

      const ca = safeJsonArray(f.CorrectAnswersJSON)
      if (ca.length && (!correctAnswersList || ca.length > correctAnswersList.length)) {
        correctAnswersList = ca
      }
    }

    const totalPlayersFromUA = playersSet.size

    const guessCounts = new Map()
    for (const [, set] of perUserGuessSet) {
      for (const g of set) guessCounts.set(g, (guessCounts.get(g) || 0) + 1)
    }

    const commonGuesses = [...guessCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([answer, n]) => ({
        answer,
        pct: totalPlayersFromUA ? pct((n / totalPlayersFromUA) * 100) : 0,
      }))

    const correctSet = new Set((correctAnswersList || []).map((x) => normalise(x)).filter(Boolean))

    const rareCorrect = [...correctSet]
      .map((ans) => {
        const n = guessCounts.get(ans) || 0
        return {
          answer: ans,
          pct: totalPlayersFromUA ? pct((n / totalPlayersFromUA) * 100) : 0,
        }
      })
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 8)

    const exitEarlyShare =
      totalPlayersFromUA && outcomeCounts['exit-early']
        ? pct((outcomeCounts['exit-early'] / totalPlayersFromUA) * 100)
        : null

    /* ============================================================
       PATH A RETURN
    ============================================================ */

    if (aggRows.length) {
      const f = aggRows[0].fields || {}

      const totalPlayers = Number(readField(f, ['TotalPlayers'], 0))
      const totalAttempts = Number(readField(f, ['TotalAttempts'], null))
      const avgCompletion = Number(readField(f, ['AvgCompletion'], null))
      const avgAccuracy = Number(readField(f, ['AvgAccuracy'], null))
      const avgHints = Number(readField(f, ['AvgHints'], null))
      const medianPaceSeconds = Number(readField(f, ['MedianPaceSeconds'], null))

      const countryLeaderboard = countryRows
        .map((r) => {
          const rf = r.fields || {}
          const code = normalise(readField(rf, ['Country', 'CountryCode'], ''))
          const users = Number(readField(rf, ['Players'], 0))
          const value = Number(readField(rf, ['AvgCompletion'], 0))

          return {
            country: code,
            name: code,
            users,
            value: pct(value),
          }
        })
        .slice(0, 10)

      let yourCountryRank = null
      let yourCountryAvgCompletion = null

      if (userCountry) {
        const idx = countryLeaderboard.findIndex((x) => x.country === userCountry)
        if (idx !== -1) {
          yourCountryRank = idx + 1
          yourCountryAvgCompletion = countryLeaderboard[idx].value
        }
      }

      return res.status(200).json(
        buildResponse({
          dateKey,
          totalPlayers,
          totalAttempts,
          avgCompletion,
          avgAccuracy,
          avgHints,
          medianPaceSeconds,
          countryLeaderboard,
          yourCountryRank,
          yourCountryAvgCompletion,
          pacePercentileForUser: null,
          accuracyBuckets: null,
          completionBuckets: null,
          outcomeCounts,
          commonGuesses,
          rareCorrect,
          exitEarlyShare,
        }),
      )
    }

    /* ============================================================
       PATH B — fallback still works
    ============================================================ */

    return res.status(200).json(
      buildResponse({
        dateKey,
        totalPlayers: totalPlayersFromUA,
        totalAttempts: uaRows.length,
        avgCompletion: null,
        avgAccuracy: null,
        avgHints: null,
        medianPaceSeconds: null,
        countryLeaderboard: [],
        yourCountryRank: null,
        yourCountryAvgCompletion: null,
        pacePercentileForUser: null,
        accuracyBuckets: null,
        completionBuckets: null,
        outcomeCounts,
        commonGuesses,
        rareCorrect,
        exitEarlyShare,
      }),
    )
  } catch (err) {
    console.error('load-global-analytics error:', err)
    return res.status(500).json({ error: 'Failed to load global analytics' })
  }
}
