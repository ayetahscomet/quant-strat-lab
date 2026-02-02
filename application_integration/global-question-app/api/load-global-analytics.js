/* /api/load-global-analytics.js */
import { base } from '../lib/airtable.js'

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

/**
 * Pace is "lower = faster".
 * We return: "faster than X% of players" -> higher is better.
 * For tiny N, this still behaves nicely (N=2 gives 0% or 50% or 100% depending on ties).
 */
function fasterThanPercentile(values, yourValue) {
  const vals = values.filter((x) => typeof x === 'number' && isFinite(x))
  if (!vals.length || typeof yourValue !== 'number' || !isFinite(yourValue)) return null

  // Count how many are strictly slower (higher seconds)
  const slower = vals.filter((x) => x > yourValue).length
  const equal = vals.filter((x) => x === yourValue).length

  // Give half-credit for ties (stable for small N)
  const score = (slower + 0.5 * Math.max(0, equal - 1)) / vals.length
  return pct(score * 100)
}

async function trySelectAll(tableName, selectParams) {
  try {
    const recs = await base(tableName).select(selectParams).all()
    return recs
  } catch (e) {
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

/**
 * Standard response shape for DailyAnalytics.vue (plus richer data so you can kill fillers).
 */
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

    // ✅ richer “no fillers” metadata for tone/blocks
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
    },

    distributions: {
      accuracyBuckets: Array.isArray(accuracyBuckets) ? accuracyBuckets : null,
      completionBuckets: Array.isArray(completionBuckets) ? completionBuckets : null,
      outcomeCounts: outcomeCounts || null,
    },

    aggregates: {
      avgHints: typeof avgHints === 'number' ? avgHints : null,
      medianPaceSeconds: typeof medianPaceSeconds === 'number' ? medianPaceSeconds : null,
    },
  }
}

function median(nums) {
  const arr = nums.filter((x) => typeof x === 'number' && isFinite(x)).sort((a, b) => a - b)
  if (!arr.length) return null
  const mid = Math.floor(arr.length / 2)
  return arr.length % 2 ? arr[mid] : Math.round((arr[mid - 1] + arr[mid]) / 2)
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    const { dateKey, userId, country } = req.body || {}
    if (!dateKey) return res.status(400).json({ error: 'Missing dateKey' })

    const userCountry = normalise(country || '')

    /* ============================================================
       PATH A (preferred): DailyGlobalStats + DailyCountryStats + DailyUserStats
       - This is what scales to millions.
    ============================================================ */

    // 1) DailyGlobalStats (1 record per date)
    const globalRecs = await trySelectAll('DailyGlobalStats', {
      maxRecords: 5,
      filterByFormula: `{DateKey} = '${dateKey}'`,
    })

    // 2) DailyCountryStats (many records per date)
    const countryRecs = await trySelectAll('DailyCountryStats', {
      maxRecords: 1000,
      filterByFormula: `{DateKey} = '${dateKey}'`,
      sort: [{ field: 'AvgCompletion', direction: 'desc' }],
    })

    // 3) DailyUserStats (many records per date) — used for percentiles + “you”
    // IMPORTANT: If you want to avoid loading all users at scale, you can later replace
    // this with a percentile lookup table (histogram / quantiles). For now it works for small–mid.
    const userRecs = await trySelectAll('DailyUserStats', {
      maxRecords: 5000,
      filterByFormula: `{DateKey} = '${dateKey}'`,
    })

    if (globalRecs && globalRecs.length) {
      const f = globalRecs[0].fields || {}

      const totalPlayers =
        Number(readField(f, ['TotalPlayers', 'Players', 'Users', 'TotalUsers'], 0)) || 0
      const totalAttempts = Number(readField(f, ['TotalAttempts', 'Attempts'], null))
      const avgCompletion = Number(readField(f, ['AvgCompletion', 'AverageCompletion'], null))
      const avgAccuracy = Number(readField(f, ['AvgAccuracy', 'AverageAccuracy'], null))
      const avgHints = Number(readField(f, ['AvgHints', 'AverageHints'], null))
      const medianPaceSeconds = Number(readField(f, ['MedianPaceSeconds', 'MedianPace'], null))

      // Build country leaderboard
      const countryLeaderboard = (countryRecs || [])
        .map((r) => {
          const cf = r.fields || {}
          const code = normalise(readField(cf, ['Country', 'CountryCode', 'Code'], 'unknown'))
          const name = readField(cf, ['CountryName', 'Name'], code)
          const users = Number(readField(cf, ['Users', 'Players'], 0)) || 0
          const value = Number(readField(cf, ['AvgCompletion', 'AverageCompletion'], null))
          return { country: code, name, users, value: typeof value === 'number' ? pct(value) : 0 }
        })
        .filter((x) => x.country && x.country !== 'xx' && x.country !== 'unknown')
        .slice(0, 10)

      // Your country rank + avg
      let yourCountryRank = null
      let yourCountryAvgCompletion = null
      if (userCountry) {
        const idx = countryLeaderboard.findIndex((x) => normalise(x.country) === userCountry)
        if (idx !== -1) {
          yourCountryRank = idx + 1
          yourCountryAvgCompletion = countryLeaderboard[idx].value
        } else if (countryRecs && countryRecs.length) {
          // If you’re not top-10, compute rank from all countryRecs (still cheap)
          const allCountries = (countryRecs || []).map((r) => {
            const cf = r.fields || {}
            return {
              country: normalise(readField(cf, ['Country', 'CountryCode', 'Code'], 'unknown')),
              value: Number(readField(cf, ['AvgCompletion', 'AverageCompletion'], 0)) || 0,
            }
          })
          const sorted = allCountries.sort((a, b) => b.value - a.value)
          const idx2 = sorted.findIndex((x) => x.country === userCountry)
          if (idx2 !== -1) {
            yourCountryRank = idx2 + 1
            yourCountryAvgCompletion = pct(sorted[idx2].value)
          }
        }
      }

      // Pace percentile for user (from DailyUserStats if present; else null)
      let pacePercentileForUser = null
      let accuracyBuckets = null
      let completionBuckets = null
      let outcomeCounts = null

      if (userRecs && userRecs.length) {
        const userRows = userRecs.map((r) => r.fields || {})

        const paceVals = userRows
          .map((x) => Number(readField(x, ['PaceSeconds', 'Pace', 'PaceSec'], null)))
          .filter((n) => typeof n === 'number' && isFinite(n) && n > 0)

        const accVals = userRows
          .map((x) => Number(readField(x, ['Accuracy', 'AccuracyPct'], 0)) || 0)
          .map((x) => pct(x))

        const compVals = userRows
          .map((x) => Number(readField(x, ['Completion', 'CompletionPct'], 0)) || 0)
          .map((x) => pct(x))

        // Distribution buckets (always available even when N=2)
        accuracyBuckets = bucketise(accVals, [20, 40, 60, 80])
        completionBuckets = bucketise(compVals, [20, 40, 60, 80])

        // Outcome counts
        const counts = {}
        for (const row of userRows) {
          const r = normalise(readField(row, ['Result', 'DayResult', 'Outcome'], 'unknown'))
          counts[r] = (counts[r] || 0) + 1
        }
        outcomeCounts = counts

        // You
        const youRow = userRows.find(
          (x) => String(readField(x, ['UserID', 'UUID', 'User'], '')) === String(userId),
        )
        if (youRow) {
          const yourPace = Number(readField(youRow, ['PaceSeconds', 'Pace', 'PaceSec'], null))
          pacePercentileForUser = fasterThanPercentile(paceVals, yourPace)
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
          pacePercentileForUser,
          accuracyBuckets,
          completionBuckets,
          outcomeCounts,
        }),
      )
    }

    /* ============================================================
       PATH B (fallback): compute from UserAnswers (your current method)
       - Works for early stage only. Not for 2M.
    ============================================================ */

    const records = await base('UserAnswers')
      .select({
        maxRecords: 5000,
        filterByFormula: `{DateKey} = '${dateKey}'`,
      })
      .all()

    const byUser = new Map()

    for (const r of records) {
      const f = r.fields || {}
      const uid = f.UserID
      if (!uid) continue

      if (!byUser.has(uid)) byUser.set(uid, [])
      byUser.get(uid).push({
        result: f.Result,
        windowId: f.WindowID,
        createdAt: f.CreatedAt,
        country: normalise(f.Country || 'unknown'),
        correct: f.CorrectAnswersJSON ? JSON.parse(f.CorrectAnswersJSON) : [],
        answers: f.AnswersJSON ? JSON.parse(f.AnswersJSON) : [],
        hintsUsed: typeof f.HintsUsed === 'number' ? f.HintsUsed : null,
      })
    }

    // derive "required slots" as max correct list length seen today (best we can do from this table)
    let requiredSlotsGuess = 0
    for (const rows of byUser.values()) {
      for (const row of rows) {
        const len = Array.isArray(row.correct) ? row.correct.length : 0
        if (len > requiredSlotsGuess) requiredSlotsGuess = len
      }
    }
    if (!requiredSlotsGuess) requiredSlotsGuess = 5 // last resort; shouldn’t happen

    const userSummaries = []
    let totalAttempts = 0
    let hintsSum = 0
    let hintsCount = 0

    for (const [uid, rows] of byUser.entries()) {
      totalAttempts += rows.length

      const correctSet = new Set()
      const uniqueSubmissions = new Set()
      let firstAt = null
      let lastAt = null

      const countryCode = rows[0]?.country || 'unknown'

      for (const row of rows) {
        // correct union (normalised)
        for (const c of row.correct || []) correctSet.add(normalise(c))

        // unique submissions union (normalised)
        for (const a of row.answers || []) {
          const v = normalise(a)
          if (v) uniqueSubmissions.add(v)
        }

        const t = row.createdAt ? new Date(row.createdAt) : null
        if (t && !isNaN(t.getTime())) {
          if (!firstAt || t < firstAt) firstAt = t
          if (!lastAt || t > lastAt) lastAt = t
        }

        if (typeof row.hintsUsed === 'number') {
          hintsSum += row.hintsUsed
          hintsCount += 1
        }
      }

      const uniqueCorrect = correctSet.size
      const submittedUnique = uniqueSubmissions.size

      const completionPct =
        requiredSlotsGuess > 0
          ? (Math.min(uniqueCorrect, requiredSlotsGuess) / requiredSlotsGuess) * 100
          : 0
      const accuracyPct = submittedUnique > 0 ? (uniqueCorrect / submittedUnique) * 100 : 0

      const paceSeconds =
        firstAt && lastAt
          ? Math.max(0, Math.round((lastAt.getTime() - firstAt.getTime()) / 1000))
          : null

      userSummaries.push({
        userId: uid,
        completionPct: pct(completionPct),
        accuracyPct: pct(accuracyPct),
        paceSeconds: typeof paceSeconds === 'number' ? paceSeconds : null,
        country: countryCode,
      })
    }

    const totalPlayers = userSummaries.length

    const compVals = userSummaries.map((u) => u.completionPct)
    const accVals = userSummaries.map((u) => u.accuracyPct)
    const paceVals = userSummaries
      .map((u) => u.paceSeconds)
      .filter((x) => typeof x === 'number' && x > 0)

    const avgCompletion = compVals.reduce((a, b) => a + b, 0) / (compVals.length || 1)
    const avgAccuracy = accVals.reduce((a, b) => a + b, 0) / (accVals.length || 1)

    const medianPaceSeconds = median(paceVals)

    // country leaderboard (avgCompletion%)
    const countryMap = new Map()
    for (const u of userSummaries) {
      const c = u.country || 'unknown'
      if (!countryMap.has(c)) countryMap.set(c, { users: 0, sum: 0 })
      const obj = countryMap.get(c)
      obj.users += 1
      obj.sum += u.completionPct
    }

    const allCountries = [...countryMap.entries()].map(([cc, v]) => ({
      country: cc,
      name: cc, // client can map code->name if needed
      users: v.users,
      value: pct(v.sum / v.users),
    }))
    allCountries.sort((a, b) => b.value - a.value)

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

    const you = userSummaries.find((u) => String(u.userId) === String(userId))
    const pacePercentileForUser = you ? fasterThanPercentile(paceVals, you.paceSeconds) : null

    const accuracyBuckets = bucketise(accVals, [20, 40, 60, 80])
    const completionBuckets = bucketise(compVals, [20, 40, 60, 80])

    return res.status(200).json(
      buildResponse({
        dateKey,
        totalPlayers,
        totalAttempts,
        avgCompletion,
        avgAccuracy,
        avgHints: hintsCount ? Math.round((hintsSum / hintsCount) * 10) / 10 : null,
        medianPaceSeconds,
        countryLeaderboard,
        yourCountryRank,
        yourCountryAvgCompletion,
        pacePercentileForUser,
        accuracyBuckets,
        completionBuckets,
        outcomeCounts: null,
      }),
    )
  } catch (err) {
    console.error('load-global-analytics error:', err)
    return res.status(500).json({ error: 'Failed to load global analytics' })
  }
}
