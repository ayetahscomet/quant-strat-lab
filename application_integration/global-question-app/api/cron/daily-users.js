// /api/cron/daily-users.js

import { base } from '../../lib/airtable.js'

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

async function fetchAll(table, formula) {
  return base(table).select({ filterByFormula: formula, maxRecords: 5000 }).all()
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

  const usersTable = base('Users')

  const existingUsers = await fetchAll('Users', '')
  const usersById = new Map(existingUsers.map((r) => [r.fields.UserID, r]))

  const badgeRows = []

  /* =====================================================
     UPSERT USERS
  ===================================================== */

  for (const rec of todayProfiles) {
    const f = rec.fields
    const userId = f.UserID

    if (!userId) continue

    const country = f.Country || 'xx'
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
        const prevDate = new Date(lastDate)
        const y = new Date(today)
        y.setUTCDate(y.getUTCDate() - 1)

        if (prevDate.toISOString().slice(0, 10) === y.toISOString().slice(0, 10)) {
          currentStreak = (prev.CurrentStreak || 0) + 1
        }
      }

      longestStreak = Math.max(prev.LongestStreak || 0, currentStreak)

      await usersTable.update(existing.id, {
        LastSeenDate: today,
        LastPlayedDate: today,
        CountryCode: country,
        TotalDaysPlayed: totalDays,
        CurrentStreak: currentStreak,
        LongestStreak: longestStreak,
      })
    } else {
      await usersTable.create({
        UserID: userId,
        FirstSeenDate: today,
        LastSeenDate: today,
        LastPlayedDate: today,
        CountryCode: country,
        TotalDaysPlayed: 1,
        CurrentStreak: 1,
        LongestStreak: 1,
      })
    }

    /* =====================================================
       ARCHETYPE
    ===================================================== */

    let archetype = 'Explorer'

    if (f.Accuracy > 85 && f.Completion < 70) archetype = 'Sniper'
    else if (f.Completion > 90 && f.Accuracy < 75) archetype = 'Sprayer'
    else if (f.PercentileSpeed > 80) archetype = 'Grinder'
    else if (f.AttemptsUsed <= 2) archetype = 'Ghost'

    if (existing) {
      await usersTable.update(existing.id, { Archetype: archetype })
    }

    /* =====================================================
       BADGES
    ===================================================== */

    const maybeBadge = (code, name, tier, desc, metric) => {
      badgeRows.push({
        fields: {
          UserID: [existing?.id].filter(Boolean),
          DateKey: today,
          BadgeCode: code,
          BadgeName: name,
          Tier: tier,
          Description: desc,
          MetricValue: metric,
        },
      })
    }

    if (f.Completion === 100)
      maybeBadge('PERFECT_DAY', 'Perfect Day', 'Gold', 'Completed everything.', 100)

    if (f.Accuracy >= 90) maybeBadge('SNIPER', 'Sniper', 'Gold', 'Ultra high accuracy.', f.Accuracy)

    if (currentStreak === 3)
      maybeBadge('STREAK_3', '3-Day Streak', 'Bronze', 'Three days in a row.', 3)

    if (currentStreak === 7) maybeBadge('STREAK_7', '7-Day Streak', 'Gold', 'One-week heater.', 7)
  }

  if (badgeRows.length) {
    await base('UserDailyBadges').create(badgeRows.slice(0, 50))
  }

  /* =====================================================
     COHORT BUILDER (D1/D3/D7)
  ===================================================== */

  const users = await fetchAll('Users', '')

  const cohorts = {}

  for (const u of users) {
    const first = u.fields.FirstSeenDate
    const last = u.fields.LastPlayedDate

    if (!first || !last) continue

    const diff = (new Date(last).getTime() - new Date(first).getTime()) / 86400000

    const cohortDate = first

    if (!cohorts[cohortDate]) {
      cohorts[cohortDate] = { players: 0, d1: 0, d3: 0, d7: 0 }
    }

    cohorts[cohortDate].players++

    if (diff >= 1) cohorts[cohortDate].d1++
    if (diff >= 3) cohorts[cohortDate].d3++
    if (diff >= 7) cohorts[cohortDate].d7++
  }

  for (const [date, c] of Object.entries(cohorts)) {
    await base('DailyCohorts').create({
      CohortDate: date,
      Players: c.players,
      ReturnedD1: c.d1,
      ReturnedD3: c.d3,
      ReturnedD7: c.d7,
      RetentionD1: c.players ? c.d1 / c.players : 0,
      RetentionD3: c.players ? c.d3 / c.players : 0,
      RetentionD7: c.players ? c.d7 / c.players : 0,
      GeneratedAt: new Date(),
    })
  }

  return res.json({ ok: true })
}
