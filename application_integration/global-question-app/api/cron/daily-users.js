// /api/cron/daily-users.js

import { base } from '../../lib/airtable.js'
import { pickDateKey } from '../../lib/dateKey.js'

/* =====================================================
   Helpers
===================================================== */

async function fetchAll(table, formula) {
  return base(table)
    .select({
      filterByFormula: typeof formula === 'string' ? formula : undefined,
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

/* ======================================
   Percentile helper
====================================== */

function percentile(arr, v) {
  if (!arr.length) return null
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = sorted.findIndex((x) => x >= v)
  if (idx === -1) return 100
  return Math.round((idx / sorted.length) * 100)
}

/* =====================================================
   Handler
===================================================== */

export default async function handler(req, res) {
  try {
    const secret = req.headers.authorization
    if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'unauthorised' })
    }

    const { dateKey } = pickDateKey(req, { defaultOffsetDays: 0 })
    console.log('👤 Daily Users cron:', dateKey)

    /* =====================================================
       LOAD TODAY'S PROFILES
    ===================================================== */

    const todayProfiles = await fetchAll('UserDailyProfile', `{DateKey}='${dateKey}'`)

    if (!todayProfiles.length) {
      return res.json({ ok: true, message: 'no users today' })
    }

    /* =====================================================
       COMPUTE DAILY PERCENTILES (ON PROFILES)
       ⚠️ PercentileCompletion REMOVED (schema mismatch)
    ===================================================== */

    const accVals = todayProfiles.map((r) => r.fields.Accuracy || 0)
    const paceVals = todayProfiles.map((r) =>
      Number.isFinite(r.fields.SolveSeconds) ? r.fields.SolveSeconds : 999999,
    )

    const percentileUpdates = []

    for (const rec of todayProfiles) {
      const f = rec.fields || {}

      percentileUpdates.push({
        id: rec.id,
        fields: {
          PercentileAccuracy: percentile(accVals, f.Accuracy || 0) / 100,
          PercentileSpeed: percentile(paceVals, f.SolveSeconds || 999999) / 100,
        },
      })
    }

    if (percentileUpdates.length) {
      await updateInBatches('UserDailyProfile', percentileUpdates)
    }

    /* =====================================================
       LOAD USERS TABLE
    ===================================================== */

    const existingUsers = await fetchAll('Users')
    const usersById = new Map(existingUsers.map((r) => [r.fields.UserID, r]))

    const creates = []
    const updates = []

    /* =====================================================
       UPSERT USERS + STREAK LOGIC
    ===================================================== */

    for (const rec of todayProfiles) {
      const f = rec.fields || {}
      const userId = f.UserID
      if (!userId) continue

      const today = dateKey
      const country = f.Country || 'xx'
      const region = f.Region || 'Unknown'

      const existing = usersById.get(userId)

      let currentStreak = 1
      let longestStreak = 1
      let totalDays = 1
      let streakBroken = false
      let newRecord = false

      if (existing) {
        const prev = existing.fields || {}

        totalDays = (prev.TotalDaysPlayed || 0) + 1

        const lastDate = prev.LastPlayedDate

        if (lastDate) {
          const prevISO = new Date(lastDate).toISOString().slice(0, 10)

          const y = new Date(today)
          y.setUTCDate(y.getUTCDate() - 1)
          const yesterdayISO = y.toISOString().slice(0, 10)

          if (prevISO === yesterdayISO) {
            currentStreak = (prev.CurrentStreak || 0) + 1
          } else {
            streakBroken = true
          }
        }

        longestStreak = Math.max(prev.LongestStreak || 0, currentStreak)
        if (currentStreak === longestStreak && currentStreak > (prev.LongestStreak || 0)) {
          newRecord = true
        }

        updates.push({
          id: existing.id,
          fields: {
            LastSeenDate: today,
            LastPlayedDate: today,

            CountryCode: country,
            Region: region,

            TotalDaysPlayed: totalDays,
            CurrentStreak: currentStreak,
            LongestStreak: longestStreak,

            StreakBrokenYesterday: streakBroken,
            NewLongestStreakToday: newRecord,

            LastAccuracy: f.Accuracy,
            LastCompletion: f.Completion,
            LastSolveSeconds: f.SolveSeconds,

            GeneratedAt: new Date().toISOString(),
          },
        })
      } else {
        creates.push({
          fields: {
            UserID: userId,

            FirstSeenDate: today,
            LastSeenDate: today,
            LastPlayedDate: today,

            CountryCode: country,
            Region: region,

            TotalDaysPlayed: 1,
            CurrentStreak: 1,
            LongestStreak: 1,

            GeneratedAt: new Date().toISOString(),
          },
        })
      }

      /* =====================================================
         ARCHETYPE (OPTIONAL — only update if column exists)
      ===================================================== */

      const acc = f.Accuracy || 0
      const comp = f.Completion || 0
      const pacePct = f.PercentileSpeed || 0
      const attempts = f.AttemptsUsed || 99

      let archetype = 'Explorer'

      if (acc > 0.85 && comp < 0.7) archetype = 'Sniper'
      else if (pacePct > 0.8) archetype = 'Speedrunner'
      else if (attempts <= 2) archetype = 'Ghost'

      if (existing) {
        updates.push({
          id: existing.id,
          fields: { Archetype: archetype },
        })
      }
    }

    if (creates.length) await createInBatches('Users', creates)
    if (updates.length) await updateInBatches('Users', updates)

    return res.json({
      ok: true,
      dateKey,
      usersProcessed: todayProfiles.length,
      created: creates.length,
      updated: updates.length,
    })
  } catch (err) {
    console.error('❌ daily-users failed:', err)
    return res.status(500).json({ error: 'daily-users failed' })
  }
}
