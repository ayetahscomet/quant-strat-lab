// /api/cron/daily-push.js

import { base } from '../../lib/airtable.js'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
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

  const dateKey = req.query.dateKey || todayKey()

  console.log('🔔 Push generation:', dateKey)

  const users = await base('Users').select({ maxRecords: 5000 }).all()

  const pushes = []

  for (const r of users) {
    const u = r.fields

    if (!u.LastPlayedDate) continue

    const inactiveDays = Math.floor((new Date(dateKey) - new Date(u.LastPlayedDate)) / 86400000)

    let type = null

    if (u.CurrentStreak >= 10) {
      type = 'high-streak'
    } else if (u.CurrentStreak >= 3 && inactiveDays >= 1) {
      type = 'streak-risk'
    } else if (u.TotalDaysPlayed === 1) {
      type = 'new-user'
    } else if (inactiveDays >= 5) {
      type = 're-engage'
    } else if (inactiveDays === 0 && u.CurrentStreak >= 2) {
      type = 'returning-today'
    }

    if (!type) continue

    pushes.push({
      fields: {
        UserID: u.UserID,
        DateKey: dateKey,

        Type: type,

        Country: u.CountryCode || 'xx',
        Region: u.Region || 'Unknown',

        GeneratedAt: new Date().toISOString(),
      },
    })
  }

  /* =====================================================
     De-dupe for the day
  ===================================================== */

  const existing = await base('PushQueue')
    .select({
      maxRecords: 5000,
      filterByFormula: `{DateKey}='${dateKey}'`,
    })
    .all()

  const keys = new Set(existing.map((r) => `${r.fields.UserID}::${r.fields.Type}`))

  const finalPushes = pushes.filter((p) => !keys.has(`${p.fields.UserID}::${p.fields.Type}`))

  if (finalPushes.length) {
    await createInBatches('PushQueue', finalPushes)
  }

  return res.status(200).json({
    ok: true,
    queued: finalPushes.length,
  })
}
