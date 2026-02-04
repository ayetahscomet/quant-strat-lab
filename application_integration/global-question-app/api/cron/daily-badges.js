// /api/cron/daily-badges.js

import { base } from '../../lib/airtable.js'
import { pickDateKey } from '../../lib/dateKey.js'

/* =====================================================
   Helpers
===================================================== */

// percentile rank from bottom (ascending array)
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

async function updateInBatches(table, rows, size = 10) {
  for (let i = 0; i < rows.length; i += size) {
    await base(table).update(rows.slice(i, i + size))
  }
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
       Resolve Users → Airtable record IDs
    ===================================================== */

    const userRecords = await base('Users')
      .select({
        fields: ['UserID'],
        maxRecords: 5000,
      })
      .all()

    const userIdToRecord = Object.fromEntries(
      userRecords.map((r) => [String(r.fields.UserID), r.id]),
    )

    /* =====================================================
       Prep percentiles
    ===================================================== */

    const accuracyVals = users.map((u) => u.Accuracy || 0).sort((a, b) => a - b)

    const completionVals = users.map((u) => u.Completion || 0).sort((a, b) => a - b)

    const speedVals = users
      .map((u) => (Number.isFinite(u.SolveSeconds) ? u.SolveSeconds : Infinity))
      .sort((a, b) => a - b)

    /* =====================================================
       Award rules
    ===================================================== */

    const awards = []

    for (const u of users) {
      const accuracyRank = pctRank(accuracyVals, u.Accuracy || 0)
      const completionRank = pctRank(completionVals, u.Completion || 0)
      const speedRank = Number.isFinite(u.SolveSeconds) ? pctRank(speedVals, u.SolveSeconds) : null

      const accuracyTop = accuracyRank !== null ? 100 - accuracyRank : null
      const completionTop = completionRank !== null ? 100 - completionRank : null
      const speedTop = speedRank !== null ? 100 - speedRank : null

      const badgeList = []

      /* ---------------- CORE ---------------- */

      if (u.Completion >= 1) badgeList.push('Perfect Completion')

      if (u.Accuracy >= 0.9) badgeList.push('Sniper Accuracy')

      if (speedRank !== null && speedRank <= 10) badgeList.push('Lightning Fast')

      if (accuracyTop !== null && accuracyTop >= 90) badgeList.push('Top 10% Accuracy')

      if (completionTop !== null && completionTop >= 90) badgeList.push('Top 10% Completion')

      if (u.HintCount === 0) badgeList.push('No Hints Used')

      if (u.RareAnswers >= 3) badgeList.push('Rare Finder')

      if (u.AttemptsUsed <= 2 && u.Completion >= 0.8) {
        badgeList.push('Low Attempts, High Impact')
      }

      /* ---------------- PARTICIPATION ---------------- */

      badgeList.push('Played Today')

      for (const badge of badgeList) {
        const userRecordId = userIdToRecord[String(u.UserID)]
        if (!userRecordId) continue

        awards.push({
          fields: {
            UserID: [userRecordId],
            DateKey: dateKey,

            BadgeName: badge,

            Accuracy: u.Accuracy,
            Completion: u.Completion,
            SolveSeconds: u.SolveSeconds ?? null,

            AccuracyPct: accuracyTop,
            CompletionPct: completionTop,
            SpeedPct: speedTop,

            GeneratedAt: new Date().toISOString(),
          },
        })
      }
    }

    /* =====================================================
       De-dupe
    ===================================================== */

    const existing = await base('UserDailyBadges')
      .select({
        maxRecords: 5000,
        filterByFormula: `{DateKey}='${dateKey}'`,
      })
      .all()

    const existingKeys = new Set(
      existing.map((r) => `${r.fields.UserID?.[0] || ''}::${r.fields.BadgeName}`),
    )

    const toInsert = awards.filter((r) => {
      const uid = r.fields.UserID?.[0]
      return !existingKeys.has(`${uid}::${r.fields.BadgeName}`)
    })

    if (toInsert.length) {
      await createInBatches('UserDailyBadges', toInsert)
    }

    /* =====================================================
       🔗 LINK BADGES → UserDailyProfile
    ===================================================== */

    const refreshedProfiles = await base('UserDailyProfile')
      .select({ filterByFormula: `{DateKey}='${dateKey}'` })
      .all()

    const profileByUser = new Map(refreshedProfiles.map((p) => [p.fields.UserID, p.id]))

    const badgeRows = await base('UserDailyBadges')
      .select({ filterByFormula: `{DateKey}='${dateKey}'` })
      .all()

    const profileUpdates = []
    const seenProfiles = new Set()

    for (const b of badgeRows) {
      const uid = b.fields.UserID?.[0]
      if (!uid) continue

      const profileId = profileByUser.get(uid)
      if (!profileId) continue

      if (seenProfiles.has(profileId)) continue
      seenProfiles.add(profileId)

      const profile = refreshedProfiles.find((p) => p.id === profileId)

      profileUpdates.push({
        id: profileId,
        fields: {
          UserDailyBadges: [
            ...(profile.fields.UserDailyBadges || []),
            ...badgeRows.filter((x) => x.fields.UserID?.[0] === uid).map((x) => x.id),
          ],
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
  } catch (err) {
    console.error('❌ daily-badges failed:', err)
    return res.status(500).json({ error: 'daily-badges failed' })
  }
}
