// /api/cron/daily-users.js

import { base } from '../../lib/airtable.js'
import { pickDateKey } from '../../lib/dateKey.js'
import { lookupCountry } from '../../src/data/countryMeta.js'
import { continentFromCountry } from '../../src/data/continents.js'

async function fetchAll(table, formula) {
  const opts = { maxRecords: 5000 }

  if (typeof formula === 'string' && formula.length) {
    opts.filterByFormula = formula
  }

  return base(table).select(opts).all()
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

function percentile(arr, v) {
  if (!arr.length) return null
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = sorted.findIndex((x) => x >= v)
  if (idx === -1) return 100
  return Math.round((idx / sorted.length) * 100)
}

function dateKeyMinusOne(dateKey) {
  const d = new Date(`${dateKey}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export default async function handler(req, res) {
  try {
    const isVercelCron = req.headers['x-vercel-cron'] === '1'
    const headerSecret = req.headers.authorization
    const querySecret = req.query?.secret ? `Bearer ${req.query.secret}` : null
    const expected = `Bearer ${process.env.CRON_SECRET || ''}`

    if (!isVercelCron && headerSecret !== expected && querySecret !== expected) {
      return res.status(401).json({ error: 'unauthorised' })
    }

    const { dateKey } = pickDateKey(req, { defaultOffsetDays: 0 })
    console.log('👤 Daily Users cron:', dateKey)

    const todayProfiles = await fetchAll('UserDailyProfile', `{DateKey}='${dateKey}'`)

    if (!todayProfiles.length) {
      return res.json({ ok: true, message: 'no users today' })
    }

    // -----------------------------
    // 1) Update daily percentiles
    // -----------------------------
    const accVals = todayProfiles.map((r) => Number(r.fields?.Accuracy) || 0)

    const compVals = todayProfiles.map((r) => Number(r.fields?.Completion) || 0)

    const paceVals = todayProfiles.map((r) =>
      Number.isFinite(Number(r.fields?.SolveSeconds)) ? Number(r.fields.SolveSeconds) : 999999,
    )

    const percentileUpdates = []

    for (const rec of todayProfiles) {
      const f = rec.fields || {}

      percentileUpdates.push({
        id: rec.id,
        fields: {
          PercentileAccuracy: (percentile(accVals, Number(f.Accuracy) || 0) ?? 0) / 100,
          PercentileCompletion: (percentile(compVals, Number(f.Completion) || 0) ?? 0) / 100,
          PercentileSpeed:
            (percentile(
              paceVals,
              Number.isFinite(Number(f.SolveSeconds)) ? Number(f.SolveSeconds) : 999999,
            ) ?? 0) / 100,
        },
      })
    }

    if (percentileUpdates.length) {
      await updateInBatches('UserDailyProfile', percentileUpdates)
    }

    // Reload profiles so we have the newest percentile fields
    const refreshedProfiles = await fetchAll('UserDailyProfile', `{DateKey}='${dateKey}'`)

    const existingUsers = await fetchAll('Users')
    const usersById = new Map(existingUsers.map((r) => [String(r.fields?.UserID || ''), r]))

    const creates = []
    const updates = []

    const yesterdayKey = dateKeyMinusOne(dateKey)

    for (const rec of refreshedProfiles) {
      const f = rec.fields || {}
      const userId = String(f.UserID || '')
      if (!userId) continue

      const rawCC = String(f.Country || f.CountryCode || 'xx').toLowerCase()
      const meta = lookupCountry(rawCC)

      const countryName = meta?.Country || (rawCC === 'xx' ? 'Unknown' : rawCC.toUpperCase())
      const region = continentFromCountry(rawCC) || 'Unknown'

      const existing = usersById.get(userId)
      const pushOptIn = existing?.fields?.PushOptIn ?? false

      const acc = Number(f.Accuracy) || 0
      const comp = Number(f.Completion) || 0
      const pacePct = Number(f.PercentileSpeed) || 0
      const attempts = Number(f.AttemptsUsed) || 99

      let archetype = 'Explorer'
      if (acc >= 85 && comp < 70) archetype = 'Sniper'
      else if (pacePct >= 0.8) archetype = 'Speedrunner'
      else if (attempts <= 2) archetype = 'Ghost'

      if (existing) {
        const prev = existing.fields || {}

        const prevLastPlayedDate = prev.LastPlayedDate
          ? new Date(prev.LastPlayedDate).toISOString().slice(0, 10)
          : null

        const alreadyProcessedToday = prevLastPlayedDate === dateKey

        let totalDays = Number(prev.TotalDaysPlayed) || 0
        let currentStreak = Number(prev.CurrentStreak) || 0
        let longestStreak = Number(prev.LongestStreak) || 0
        let streakBroken = false
        let newRecord = false

        if (!alreadyProcessedToday) {
          totalDays += 1

          if (prevLastPlayedDate === yesterdayKey) {
            currentStreak += 1
          } else {
            currentStreak = 1
            streakBroken = !!prevLastPlayedDate
          }

          if (currentStreak > longestStreak) {
            longestStreak = currentStreak
            newRecord = true
          }
        } else {
          // Idempotent rerun for same date:
          // do not re-increment totals or streaks
          streakBroken = prev.StreakBrokenYesterday ?? false
          newRecord = prev.NewLongestStreakToday ?? false
        }

        updates.push({
          id: existing.id,
          fields: {
            LastSeenDate: dateKey,
            LastPlayedDate: dateKey,

            CountryCode: rawCC,
            CountryName: countryName,
            Region: region,

            // Keep existing timezone if present; do not overwrite with fake UTC
            Timezone: prev.Timezone || null,

            TotalDaysPlayed: totalDays,
            CurrentStreak: currentStreak || 1,
            LongestStreak: Math.max(longestStreak || 1, currentStreak || 1),

            StreakBrokenYesterday: streakBroken,
            NewLongestStreakToday: newRecord,

            PushOptIn: pushOptIn,

            LastAccuracy: acc,
            LastCompletion: comp,
            LastSolveSeconds: Number.isFinite(Number(f.SolveSeconds))
              ? Number(f.SolveSeconds)
              : null,

            Archetype: archetype,

            GeneratedAt: new Date().toISOString(),
          },
        })
      } else {
        creates.push({
          fields: {
            UserID: userId,

            FirstSeenDate: dateKey,
            LastSeenDate: dateKey,
            LastPlayedDate: dateKey,

            CountryCode: rawCC,
            CountryName: countryName,
            Region: region,

            // No trusted timezone source in this cron
            Timezone: null,

            PushOptIn: false,

            TotalDaysPlayed: 1,
            CurrentStreak: 1,
            LongestStreak: 1,

            StreakBrokenYesterday: false,
            NewLongestStreakToday: true,

            LastAccuracy: acc,
            LastCompletion: comp,
            LastSolveSeconds: Number.isFinite(Number(f.SolveSeconds))
              ? Number(f.SolveSeconds)
              : null,

            Archetype: archetype,

            GeneratedAt: new Date().toISOString(),
          },
        })
      }
    }

    if (creates.length) await createInBatches('Users', creates)
    if (updates.length) await updateInBatches('Users', updates)

    return res.json({
      ok: true,
      dateKey,
      usersProcessed: refreshedProfiles.length,
      created: creates.length,
      updated: updates.length,
    })
  } catch (err) {
    console.error('❌ daily-users failed:', err)
    return res.status(500).json({ error: 'daily-users failed' })
  }
}
