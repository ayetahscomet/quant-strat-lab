// /api/cron/daily-cohorts.js

import { base } from '../../lib/airtable.js'
import { pickDateKey, dateKeyOffsetDays } from '../../lib/dateKey.js'

function daysAgoKey(n) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
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

  const { dateKey } = pickDateKey(req, { defaultOffsetDays: 0 })

  console.log('📊 Cohorts:', dateKey)

  /* =====================================================
     Load users
  ===================================================== */

  const users = await base('Users').select({ maxRecords: 5000 }).all()

  const userRows = users.map((r) => r.fields)

  const cohorts = new Map() // cohortDate -> users[]

  for (const u of userRows) {
    if (!u.FirstSeenDate) continue
    if (!cohorts.has(u.FirstSeenDate)) cohorts.set(u.FirstSeenDate, [])
    cohorts.get(u.FirstSeenDate).push(u)
  }

  const rows = []

  for (const [cohortDate, members] of cohorts.entries()) {
    const total = members.length

    const todayKey = dateKeyOffsetDays(0)

    const d1 = members.filter((u) => u.LastPlayedDate === todayKey).length

    const d3Key = dateKeyOffsetDays(-2)

    const d3 = members.filter((u) => u.LastPlayedDate && u.LastPlayedDate >= d3Key).length

    const d7Key = dateKeyOffsetDays(-6)

    const d7 = members.filter((u) => u.LastPlayedDate && u.LastPlayedDate >= d7Key).length

    rows.push({
      fields: {
        CohortDate: cohortDate,

        Size: total,

        D1: d1,
        D3: d3,
        D7: d7,
      },
    })
  }

  if (rows.length) await createInBatches('DailyCohorts', rows)

  return res.status(200).json({
    ok: true,
    cohorts: rows.length,
  })
}
