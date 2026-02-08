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
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`

  // Allow Vercel Cron without secrets; allow manual runs with header OR query secret
  return isVercelCron || headerSecret === expected || querySecret === expected
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
    if (!u.LastPlayedDate) continue

    const inactiveDays = Math.floor((new Date(dateKey) - new Date(u.LastPlayedDate)) / 86400000)

    let type = null

    if (u.CurrentStreak >= 10) type = 'high-streak'
    else if (u.CurrentStreak >= 3 && inactiveDays >= 1) type = 'streak-risk'
    else if (u.TotalDaysPlayed === 1) type = 'new-user'
    else if (inactiveDays >= 5) type = 're-engage'
    else if (inactiveDays === 0 && u.CurrentStreak >= 2) type = 'returning-today'

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

  // De-dupe for the day (UserID + Type)
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
    dateKey,
    queued: finalPushes.length,
  })
}
