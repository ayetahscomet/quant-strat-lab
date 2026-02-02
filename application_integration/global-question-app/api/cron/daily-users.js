// /api/cron/daily-users.js

import { base } from '../../lib/airtable.js'

function yesterdayKey() {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

async function fetchAll(table, formula = '') {
  return base(table)
    .select({
      filterByFormula: formula || undefined,
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

export default async function handler(req, res) {
  const secret = req.headers.authorization
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorised' })
  }

  const dateKey = req.query.dateKey || yesterdayKey()

  console.log('👤 Daily Users cron:', dateKey)

  /* =====================================================
     LOAD TODAY'S PROFILES
  ===================================================== */

  const todayProfiles = await fetchAll('UserDailyProfile', `{DateKey}='${dateKey}'`)

  if (!todayProfiles.length) {
    return res.json({ ok: true, message: 'no users today' })
  }

  const existingUsers = await fetchAll('Users')
  const usersById = new Map(existingUsers.map((r) => [r.fields.UserID, r]))

  const creates = []
  const updates = []

  /* =====================================================
     UPSERT USERS
  ===================================================== */

  for (const rec of todayProfiles) {
    const f = rec.fields
    const userId = f.UserID

    if (!userId) continue

    const country = f.Country || 'xx'
    const region = f.Region || 'Unknown'
    const today = dateKey

    const existing = usersById.get(userId)

    let currentStreak = 1
    let longestStreak = 1
    let totalDays = 1

    if (existing) {
      const prev = existing.fields

      totalDays = (prev.TotalDaysPlayed || 0) + 1

      const lastDate = prev.LastPlayedDate

      if (lastDate) {
        const prevISO = new Date(lastDate).toISOString().slice(0, 10)
        const y = new Date(today)
        y.setUTCDate(y.getUTCDate() - 1)
        const yesterdayISO = y.toISOString().slice(0, 10)

        if (prevISO === yesterdayISO) {
          currentStreak = (prev.CurrentStreak || 0) + 1
        }
      }

      longestStreak = Math.max(prev.LongestStreak || 0, currentStreak)

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
       ARCHETYPE
    ===================================================== */

    let archetype = 'Explorer'

    if (f.Accuracy > 0.85 && f.Completion < 0.7) archetype = 'Sniper'
    else if (f.Completion > 0.9 && f.Accuracy < 0.75) archetype = 'Sprayer'
    else if (f.PacePercentile > 0.8) archetype = 'Grinder'
    else if (f.AttemptsUsed <= 2) archetype = 'Ghost'

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
    created: creates.length,
    updated: updates.length,
  })
}
