// /api/cron/daily-push.js

import { base } from '../../lib/airtable.js'
import { pickDateKey } from '../../lib/dateKey.js'

async function createInBatches(table, rows, size = 10) {
  for (let i = 0; i < rows.length; i += size) {
    await base(table).create(rows.slice(i, i + size))
  }
}

function isAuthorised(req) {
  const isVercelCron = req.headers['x-vercel-cron'] === '1'

  const headerSecret = req.headers.authorization
  const querySecret = req.query?.secret ? `Bearer ${req.query.secret}` : null
  const expected = `Bearer ${process.env.CRON_SECRET || 'akinto-to-the-moon'}`

  return isVercelCron || headerSecret === expected || querySecret === expected
}

// simple YYYY-MM-DD diff
function diffDays(a, b) {
  const d1 = new Date(a + 'T00:00:00Z')
  const d2 = new Date(b + 'T00:00:00Z')
  return Math.floor((d1 - d2) / 86400000)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' })
  }

  if (!isAuthorised(req)) {
    return res.status(401).json({ error: 'unauthorised' })
  }

  const { dateKey } = pickDateKey(req, { defaultOffsetDays: 0 })

  console.log('🔔 Push generation:', dateKey)

  const users = await base('Users').select({ maxRecords: 5000 }).all()

  const pushes = []

  for (const r of users) {
    const u = r.fields

    const lastKey = u.LastPlayedDateKey || u.LastPlayedDate

    if (!lastKey) {
      console.log('[PUSH] skip user', u.UserID, 'no LastPlayedDateKey')
      continue
    }

    const inactiveDays = diffDays(dateKey, lastKey)

    let type = null

    if ((u.CurrentStreak || 0) >= 10) type = 'high-streak'
    else if ((u.CurrentStreak || 0) >= 3 && inactiveDays >= 1) type = 'streak-risk'
    else if ((u.TotalDaysPlayed || 0) === 1) type = 'new-user'
    else if (inactiveDays >= 5) type = 're-engage'
    else if (inactiveDays === 0 && (u.CurrentStreak || 0) >= 2) type = 'returning-today'

    if (!type) continue

    pushes.push({
      fields: {
        UserID: u.UserID,
        DateKey: dateKey,
        Type: type,

        Country: u.CountryCode || 'xx',
        Region: u.Region || 'Unknown',

        Delivered: false,
        DeliveredAt: null,
        Channel: 'web-push',
        CopyVariant: 'v1',
        DebugReason: 'queued',
      },
    })
  }

  // =============================
  // DE-DUPE
  // =============================

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

  console.log('[PUSH]', pushes.length, 'candidates', finalPushes.length, 'queued')

  return res.status(200).json({
    ok: true,
    dateKey,
    queued: finalPushes.length,
  })
}
