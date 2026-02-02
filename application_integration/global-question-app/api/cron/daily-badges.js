// /api/cron/daily-badges.js

import { base } from '../../lib/airtable.js'

function yesterdayKey() {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function pctRank(sortedAsc, value) {
  if (!sortedAsc.length) return null
  const idx = sortedAsc.findIndex((x) => x >= value)
  if (idx === -1) return 100
  return Math.round((idx / sortedAsc.length) * 100)
}

async function createInBatches(table, rows, size = 10) {
  for (let i = 0; i < rows.length; i += size) {
    await base(table).create(rows.slice(i, i + size))
  }
}

export default async function handler(req, res) {
  const secret = req.headers.authorization
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorised' })
  }

  const dateKey = req.query.dateKey || yesterdayKey()

  console.log('🏅 Awarding daily badges:', dateKey)

  /* =====================================================
     Load daily profiles
  ===================================================== */

  const profiles = await base('UserDailyProfile')
    .select({
      maxRecords: 5000,
      filterByFormula: `{DateKey}='${dateKey}'`,
    })
    .all()

  if (!profiles.length) {
    return res.status(200).json({ ok: true, message: 'no profiles' })
  }

  const users = profiles.map((r) => r.fields)

  /* =====================================================
     Prep percentiles
  ===================================================== */

  const accuracyVals = users.map((u) => u.Accuracy || 0).sort((a, b) => a - b)
  const speedVals = users
    .map((u) => (Number.isFinite(u.SolveSeconds) ? u.SolveSeconds : Infinity))
    .sort((a, b) => a - b)

  const completionVals = users.map((u) => u.Completion || 0).sort((a, b) => a - b)

  /* =====================================================
     Award rules
  ===================================================== */

  const awards = []

  for (const u of users) {
    const accuracyPct = pctRank(accuracyVals, u.Accuracy || 0)
    const completionPct = pctRank(completionVals, u.Completion || 0)
    const speedPct = Number.isFinite(u.SolveSeconds) ? pctRank(speedVals, u.SolveSeconds) : null

    const badgeList = []

    // ---- CORE ----
    if (u.Completion >= 1) badgeList.push('Perfect Completion')
    if (u.Accuracy >= 0.9) badgeList.push('Sniper Accuracy')

    if (speedPct !== null && speedPct <= 10) badgeList.push('Lightning Fast')

    if (accuracyPct !== null && accuracyPct >= 90) badgeList.push('Top 10% Accuracy')

    if (completionPct !== null && completionPct >= 90) badgeList.push('Top 10% Completion')

    if (u.HintCount === 0) badgeList.push('No Hints Used')

    if (u.RareAnswers >= 3) badgeList.push('Rare Finder')

    if (u.AttemptsUsed <= 2 && u.Completion >= 0.8) {
      badgeList.push('Low Attempts, High Impact')
    }

    // ---- PARTICIPATION ----
    badgeList.push('Played Today')

    for (const badge of badgeList) {
      awards.push({
        fields: {
          UserID: u.UserID,
          DateKey: dateKey,

          // TEXT field in Airtable
          Badge: badge,

          Accuracy: u.Accuracy,
          Completion: u.Completion,
          SolveSeconds: u.SolveSeconds ?? null,

          GeneratedAt: new Date().toISOString(),
        },
      })
    }
  }

  /* =====================================================
     De-dupe (idempotent)
  ===================================================== */

  const existing = await base('UserDailyBadges')
    .select({
      maxRecords: 5000,
      filterByFormula: `{DateKey}='${dateKey}'`,
    })
    .all()

  const existingKeys = new Set(existing.map((r) => `${r.fields.UserID}::${r.fields.Badge}`))

  const toInsert = awards.filter((r) => !existingKeys.has(`${r.fields.UserID}::${r.fields.Badge}`))

  if (toInsert.length) {
    await createInBatches('UserDailyBadges', toInsert)
  }

  return res.status(200).json({
    ok: true,
    dateKey,
    profiles: users.length,
    awarded: toInsert.length,
  })
}
