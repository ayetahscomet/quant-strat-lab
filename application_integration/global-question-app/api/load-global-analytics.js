/* /api/load-global-analytics.js */

import { base } from '../lib/airtable.js'
import { pickDateKey } from '../lib/dateKey.js'

/* ======================================================
   Utils
====================================================== */

const COUNTRY_NAMES = {
  gb: 'United Kingdom',
  us: 'United States',
  fr: 'France',
  de: 'Germany',
  it: 'Italy',
  es: 'Spain',
  cn: 'China',
  in: 'India',
  jp: 'Japan',
  ca: 'Canada',
  au: 'Australia',
}

function countryName(code) {
  const k = normalise(code)
  return COUNTRY_NAMES[k] || code?.toUpperCase() || '—'
}

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

/**
 * Pace percentile: only meaningful if >=2 values.
 */
function fasterThanPercentile(values, yourValue) {
  const vals = values.filter((x) => typeof x === 'number' && isFinite(x))
  if (vals.length < 2 || typeof yourValue !== 'number') return null

  const slower = vals.filter((x) => x > yourValue).length
  const equal = vals.filter((x) => x === yourValue).length

  const score = (slower + 0.5 * Math.max(0, equal - 1)) / vals.length
  return pct(score * 100)
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

function buildResponse(payload) {
  return {
    ...payload,

    commonGuesses: payload.commonGuesses || [],
    rareCorrect: payload.rareCorrect || [],

    meta: {
      players: payload.totalPlayers || 0,
      hasGlobal: (payload.totalPlayers || 0) > 0,
      hasCountryBoard: (payload.countryLeaderboard || []).length > 0,
    },
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
       Load UserAnswers for culture / rare / exit logic
    ============================================================ */

    const uaRows = await base('UserAnswers')
      .select({
        maxRecords: 5000,
        filterByFormula: `{DateKey}='${dateKey}'`,
      })
      .all()

    const perUserGuesses = new Map()
    const perUserCorrect = new Map()
    const perUserSuccess = new Map()
    const perUserTimes = new Map()

    for (const r of uaRows) {
      const f = r.fields || {}
      const uid = String(f.UserID || '')
      if (!uid) continue

      if (!perUserGuesses.has(uid)) {
        perUserGuesses.set(uid, new Set())
        perUserCorrect.set(uid, new Set())
        perUserSuccess.set(uid, false)
        perUserTimes.set(uid, [])
      }

      for (const a of safeJsonArray(f.AnswersJSON)) {
        const n = normalise(a)
        if (n) perUserGuesses.get(uid).add(n)
      }

      for (const c of safeJsonArray(f.CorrectAnswersJSON)) {
        const n = normalise(c)
        if (n) perUserCorrect.get(uid).add(n)
      }

      if (f.Result === 'success') perUserSuccess.set(uid, true)

      if (f.CreatedAt) perUserTimes.get(uid).push(new Date(f.CreatedAt))
    }

    const totalPlayersFromUA = perUserGuesses.size

    /* -------- Exit Early -------- */

    let exitEarlyCount = 0
    for (const [uid, success] of perUserSuccess.entries()) {
      if (!success) exitEarlyCount++
    }

    const exitEarlyShare =
      totalPlayersFromUA > 0 ? pct((exitEarlyCount / totalPlayersFromUA) * 100) : null

    /* -------- Common / Rare -------- */

    const guessCounts = new Map()

    for (const set of perUserGuesses.values()) {
      for (const g of set) {
        guessCounts.set(g, (guessCounts.get(g) || 0) + 1)
      }
    }

    const commonGuesses = [...guessCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([answer, n]) => ({
        answer,
        pct: totalPlayersFromUA ? pct((n / totalPlayersFromUA) * 100) : 0,
      }))

    const correctUnion = new Set()
    for (const set of perUserCorrect.values()) {
      for (const v of set) correctUnion.add(v)
    }

    const rareCorrect = [...correctUnion]
      .map((ans) => ({
        answer: ans,
        pct: totalPlayersFromUA ? pct(((guessCounts.get(ans) || 0) / totalPlayersFromUA) * 100) : 0,
      }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 8)

    /* ============================================================
       PATH A — Aggregates tables
    ============================================================ */

    const aggRows = await base('DailyAggregates')
      .select({
        maxRecords: 1,
        filterByFormula: `{DateKey}='${dateKey}'`,
        sort: [{ field: 'GeneratedAt', direction: 'desc' }],
      })
      .all()

    const countryRows =
      (await trySelectAll('DailyCountryStats', {
        maxRecords: 200,
        filterByFormula: `{DateKey}='${dateKey}'`,
      })) || []

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
            name: countryName(code),
            users,
            value: pct(value),
          }
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)

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
          yourCountryRank: null,
          yourCountryAvgCompletion: null,
          pacePercentileForUser: null,
          accuracyBuckets: null,
          completionBuckets: null,
          commonGuesses,
          rareCorrect,
          exitEarlyShare,
        }),
      )
    }

    /* ============================================================
       PATH B — fallback
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
