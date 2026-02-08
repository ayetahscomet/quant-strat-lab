// /api/cron/daily-cohorts.js

import { base } from '../../lib/airtable.js'
import { pickDateKey, dateKeyOffsetDays } from '../../lib/dateKey.js'

/* =====================================================
   Helpers
===================================================== */

async function createInBatches(table, rows, size = 10) {
  for (let i = 0; i < rows.length; i += size) {
    await base(table).create(rows.slice(i, i + size))
  }
}

/* =====================================================
   Handler
===================================================== */

export default async function handler(req, res) {
  try {
    const isVercelCron = req.headers['x-vercel-cron'] === '1'

    const headerSecret = req.headers.authorization
    const querySecret = req.query?.secret ? `Bearer ${req.query.secret}` : null
    const expected = `Bearer ${process.env.CRON_SECRET || ''}`

    if (!isVercelCron && headerSecret !== expected && querySecret !== expected) {
      return res.status(401).json({ error: 'unauthorised' })
    }

    const { dateKey } = pickDateKey(req, { defaultOffsetDays: 0 })

    console.log('📊 Cohorts:', dateKey)

    /* =====================================================
       Load Users
    ===================================================== */

    const users = await base('Users').select({ maxRecords: 5000 }).all()

    const userRows = users.map((r) => r.fields)

    /* =====================================================
       Build cohorts by FirstSeenDate
    ===================================================== */

    const cohorts = new Map() // date -> users[]

    for (const u of userRows) {
      if (!u.FirstSeenDate) continue

      if (!cohorts.has(u.FirstSeenDate)) {
        cohorts.set(u.FirstSeenDate, [])
      }

      cohorts.get(u.FirstSeenDate).push(u)
    }

    const rows = []

    const todayKey = dateKey

    const d3Key = dateKeyOffsetDays(-2)
    const d7Key = dateKeyOffsetDays(-6)

    /* =====================================================
       Compute metrics
    ===================================================== */

    for (const [cohortDate, members] of cohorts.entries()) {
      const size = members.length

      if (!size) continue

      const returnedD1 = members.filter((u) => u.LastPlayedDate === todayKey).length

      const returnedD3 = members.filter((u) => u.LastPlayedDate && u.LastPlayedDate >= d3Key).length

      const returnedD7 = members.filter((u) => u.LastPlayedDate && u.LastPlayedDate >= d7Key).length

      const retentionD1 = size ? returnedD1 / size : 0
      const retentionD3 = size ? returnedD3 / size : 0
      const retentionD7 = size ? returnedD7 / size : 0

      const countries = [...new Set(members.map((u) => u.CountryCode).filter(Boolean))].join(', ')

      rows.push({
        fields: {
          CohortDate: cohortDate,

          Size: size,

          ReturnedD1: returnedD1,
          ReturnedD3: returnedD3,
          ReturnedD7: returnedD7,

          RetentionD1: retentionD1,
          RetentionD3: retentionD3,
          RetentionD7: retentionD7,

          Countries: countries,

          GeneratedAt: new Date().toISOString(),
        },
      })
    }

    if (rows.length) {
      await createInBatches('DailyCohorts', rows)
    }

    return res.status(200).json({
      ok: true,
      cohorts: rows.length,
    })
  } catch (err) {
    console.error('❌ daily-cohorts failed:', err)
    return res.status(500).json({ error: 'daily-cohorts failed' })
  }
}
