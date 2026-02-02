// /api/cron/daily-cohorts.js

import { base } from '../../lib/airtable.js'

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

  const dateKey = req.query.dateKey || daysAgoKey(1)

  console.log('📊 Cohorts:', dateKey)

  /* =====================================================
     Load users
  ===================================================== */

  const users = await base('Users').select({ maxRecords: 5000 }).all()

  const userRows = users.map((r) => r.fields)

  const cohorts = new Map() // cohortDate -> users[]

  for (const u of userRows) {
    if (!u.FirstSeen) continue
    if (!cohorts.has(u.FirstSeen)) cohorts.set(u.FirstSeen, [])
    cohorts.get(u.FirstSeen).push(u)
  }

  const rows = []

  for (const [cohortDate, members] of cohorts.entries()) {
    const total = members.length

    const d1 = members.filter((u) => u.LastActiveDate === daysAgoKey(0)).length
    const d3 = members.filter((u) => u.LastActiveDate >= daysAgoKey(2)).length
    const d7 = members.filter((u) => u.LastActiveDate >= daysAgoKey(6)).length

    rows.push({
      fields: {
        CohortDate: cohortDate,
        SnapshotDate: dateKey,

        Size: total,

        D1: d1,
        D3: d3,
        D7: d7,

        GeneratedAt: new Date().toISOString(),
      },
    })
  }

  if (rows.length) await createInBatches('DailyCohorts', rows)

  return res.status(200).json({
    ok: true,
    cohorts: rows.length,
  })
}
