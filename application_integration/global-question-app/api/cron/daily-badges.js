// /api/cron/daily-badges.js

import { base } from '../../lib/airtable.js'
import { pickDateKey } from '../../lib/dateKey.js'

/* =====================================================
   Helpers
===================================================== */

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

function pct(n) {
  if (!isFinite(n)) return 0
  return clamp(Math.round(n), 0, 100)
}

// percentile rank from bottom (ascending array)
function pctRank(sortedAsc, value) {
  if (!sortedAsc.length) return null
  const idx = sortedAsc.findIndex((x) => x >= value)
  if (idx === -1) return 100
  return Math.round((idx / sortedAsc.length) * 100)
}

async function fetchAll(table, formula) {
  return base(table)
    .select({
      ...(typeof formula === 'string' && formula.length ? { filterByFormula: formula } : {}),
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

function tierForBadge(badge, { accuracyTop, completionTop, speedTop, u }) {
  // IMPORTANT: must match your Airtable single-select options exactly
  // (Bronze / Silver / Gold / Platinum)
  if (badge === 'Lightning Fast' && speedTop !== null && speedTop >= 90) return 'Platinum'
  if (
    badge === 'Top 10% Accuracy' ||
    badge === 'Top 10% Completion' ||
    (badge === 'Sniper Accuracy' && (u.Accuracy || 0) >= 0.95)
  )
    return 'Gold'
  if (
    badge === 'Perfect Completion' ||
    badge === 'Sniper Accuracy' ||
    badge === 'Rare Finder' ||
    badge === 'Low Attempts, High Impact' ||
    badge === 'No Hints Used'
  )
    return 'Silver'
  return 'Bronze'
}

function metricValueForBadge(badge, { u }) {
  const accuracyPct = pct((u.Accuracy || 0) * 100)
  const completionPct = pct((u.Completion || 0) * 100)
  const solveSeconds = Number.isFinite(u.SolveSeconds) ? u.SolveSeconds : null

  switch (badge) {
    case 'Perfect Completion':
      return completionPct
    case 'Sniper Accuracy':
    case 'Top 10% Accuracy':
      return accuracyPct
    case 'Top 10% Completion':
      return completionPct
    case 'Lightning Fast':
      return solveSeconds ?? 0
    case 'No Hints Used':
      return Number(u.HintCount || 0)
    case 'Rare Finder':
      return Number(u.RareAnswers || 0)
    case 'Low Attempts, High Impact':
      return Number(u.AttemptsUsed || 0)
    case 'Played Today':
      return 1
    default:
      return null
  }
}

function descriptionForBadge(badge, { u, accuracyTop, completionTop, speedTop }) {
  const accuracyPct = pct((u.Accuracy || 0) * 100)
  const completionPct = pct((u.Completion || 0) * 100)
  const seconds = Number.isFinite(u.SolveSeconds) ? u.SolveSeconds : null
  const rare = Number(u.RareAnswers || 0)
  const hints = Number(u.HintCount || 0)
  const attempts = Number(u.AttemptsUsed || 0)

  // Tone: short, cheeky, DailyAnalytics-esque (no filler)
  switch (badge) {
    case 'Perfect Completion':
      return `Clean sweep — ${completionPct}% completion. No notes.`
    case 'Sniper Accuracy':
      return `Sharpshooter mode: ${accuracyPct}% accuracy today.`
    case 'Lightning Fast':
      return `Blink-and-it’s-done — faster than ${speedTop ?? '…'}% of players${seconds !== null ? ` (${seconds}s)` : ''}.`
    case 'Top 10% Accuracy':
      return `Top 10% for accuracy — tidy work (${accuracyPct}%).`
    case 'Top 10% Completion':
      return `Top 10% for completion — you filled more than most (${completionPct}%).`
    case 'No Hints Used':
      return `No hints, no mercy — you did it the hard way (${hints} hints).`
    case 'Rare Finder':
      return `You pulled ${rare} rare answers — niche knowledge unlocked.`
    case 'Low Attempts, High Impact':
      return `Efficient: ${attempts} attempts with strong coverage (${completionPct}% completion).`
    case 'Played Today':
      return `You showed up today. That’s the habit.`
    default:
      return ''
  }
}

/* =====================================================
   Handler
===================================================== */

export default async function handler(req, res) {
  const isVercelCron = req.headers['x-vercel-cron'] === '1'

  // Still allow manual triggering via Bearer header or ?secret=
  const headerSecret = req.headers.authorization
  const querySecret = req.query?.secret ? `Bearer ${req.query.secret}` : null
  const expected = `Bearer ${process.env.CRON_SECRET || 'akinto-to-the-moon'}`

  if (!isVercelCron && headerSecret !== expected && querySecret !== expected) {
    return res.status(401).json({ error: 'unauthorised' })
  }

  const { dateKey } = pickDateKey(req, { defaultOffsetDays: 0 })
  console.log('🏅 Awarding daily badges:', dateKey)

  // Load daily profiles
  const profiles = await fetchAll('UserDailyProfile', `{DateKey}='${dateKey}'`)
  if (!profiles.length) return res.status(200).json({ ok: true, message: 'no profiles', dateKey })

  const users = profiles.map((r) => r.fields || {})

  // Resolve Users table → Airtable record IDs (for linked UserID field)
  const userRecords = await fetchAll('Users')
  const userUuidToUserRecordId = new Map(userRecords.map((r) => [String(r.fields.UserID), r.id]))
  const userRecordIdToUserUuid = new Map(userRecords.map((r) => [r.id, String(r.fields.UserID)]))

  // Prep percentiles (ascending arrays)
  const accuracyVals = users.map((u) => u.Accuracy || 0).sort((a, b) => a - b)
  const completionVals = users.map((u) => u.Completion || 0).sort((a, b) => a - b)
  const speedVals = users
    .map((u) => (Number.isFinite(u.SolveSeconds) ? u.SolveSeconds : Infinity))
    .sort((a, b) => a - b)

  const awards = []

  for (const u of users) {
    const accuracyRank = pctRank(accuracyVals, u.Accuracy || 0)
    const completionRank = pctRank(completionVals, u.Completion || 0)
    const speedRank = Number.isFinite(u.SolveSeconds) ? pctRank(speedVals, u.SolveSeconds) : null

    // convert bottom-rank → top-percent (higher is better)
    const accuracyTop = accuracyRank !== null ? 100 - accuracyRank : null
    const completionTop = completionRank !== null ? 100 - completionRank : null
    const speedTop = speedRank !== null ? 100 - speedRank : null

    const badgeList = []

    /* ---------------- CORE ---------------- */

    if ((u.Completion || 0) >= 1) badgeList.push('Perfect Completion')
    if ((u.Accuracy || 0) >= 0.9) badgeList.push('Sniper Accuracy')
    if (speedRank !== null && speedRank <= 10) badgeList.push('Lightning Fast')
    if (accuracyTop !== null && accuracyTop >= 90) badgeList.push('Top 10% Accuracy')
    if (completionTop !== null && completionTop >= 90) badgeList.push('Top 10% Completion')
    if ((u.HintCount || 0) === 0) badgeList.push('No Hints Used')
    if ((u.RareAnswers || 0) >= 3) badgeList.push('Rare Finder')
    if ((u.AttemptsUsed || 99) <= 2 && (u.Completion || 0) >= 0.8)
      badgeList.push('Low Attempts, High Impact')

    /* ---------------- PARTICIPATION ---------------- */

    badgeList.push('Played Today')

    for (const badge of badgeList) {
      const userRecordId = userUuidToUserRecordId.get(String(u.UserID))
      if (!userRecordId) continue

      const ctx = { u, accuracyTop, completionTop, speedTop }

      awards.push({
        fields: {
          UserID: [userRecordId], // linked record
          DateKey: dateKey,

          BadgeName: badge,
          Tier: tierForBadge(badge, ctx),
          Description: descriptionForBadge(badge, ctx),
          MetricValue: metricValueForBadge(badge, ctx),

          // Keep both: CreatedAt for “badge row timestamp”, GeneratedAt for cron metadata
          CreatedAt: new Date().toISOString(),
          GeneratedAt: new Date().toISOString(),

          Accuracy: u.Accuracy ?? null,
          Completion: u.Completion ?? null,
          SolveSeconds: u.SolveSeconds ?? null,

          AccuracyPct: accuracyTop,
          CompletionPct: completionTop,
          SpeedPct: speedTop,
        },
      })
    }
  }

  /* =====================================================
     De-dupe (idempotent) by UserRecordId + BadgeName + DateKey
  ===================================================== */

  const existing = await fetchAll('UserDailyBadges', `{DateKey}='${dateKey}'`)
  const existingKeys = new Set(
    existing.map((r) => `${r.fields.UserID?.[0] || ''}::${r.fields.BadgeName || ''}::${dateKey}`),
  )

  const toInsert = awards.filter((r) => {
    const k = `${r.fields.UserID?.[0] || ''}::${r.fields.BadgeName || ''}::${dateKey}`
    return !existingKeys.has(k)
  })

  if (toInsert.length) await createInBatches('UserDailyBadges', toInsert)

  /* =====================================================
   🔗 Link badges back to UserDailyProfile.UserDailyBadges
===================================================== */

  const refreshedProfiles = await fetchAll('UserDailyProfile', `{DateKey}='${dateKey}'`)
  const profileByUserUuid = new Map(refreshedProfiles.map((p) => [String(p.fields.UserID), p]))

  const badgeRows = await fetchAll('UserDailyBadges', `{DateKey}='${dateKey}'`)

  const profileIdToBadges = new Map()

  for (const b of badgeRows) {
    const badgeId = b.id
    if (!badgeId || typeof badgeId !== 'string') continue

    const userRecordId = b.fields.UserID?.[0]
    if (!userRecordId) continue

    const userUuid = userRecordIdToUserUuid.get(userRecordId)
    if (!userUuid) continue

    const profileRec = profileByUserUuid.get(userUuid)
    if (!profileRec) continue

    if (!profileIdToBadges.has(profileRec.id)) {
      const existing = Array.isArray(profileRec.fields.UserDailyBadges)
        ? profileRec.fields.UserDailyBadges.filter((x) => typeof x === 'string')
        : []

      profileIdToBadges.set(profileRec.id, new Set(existing))
    }

    profileIdToBadges.get(profileRec.id).add(badgeId)
  }

  const profileUpdates = []

  for (const [profileId, badgeSet] of profileIdToBadges.entries()) {
    const arr = [...badgeSet].filter((x) => typeof x === 'string')

    if (!arr.length) continue

    profileUpdates.push({
      id: profileId,
      fields: {
        UserDailyBadges: arr,
      },
    })
  }

  if (profileUpdates.length) {
    await updateInBatches('UserDailyProfile', profileUpdates)
  }

  return res.status(200).json({
    ok: true,
    dateKey,
    profiles: users.length,
    awarded: toInsert.length,
    linkedProfiles: profileUpdates.length,
  })
}
