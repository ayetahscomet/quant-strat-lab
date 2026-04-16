// api/load-landing-board.js
import { base } from '../lib/airtable.js'
import { dateKeyToday, dateKeyOffsetDays } from '../lib/dateKey.js'

function normalise(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function escapeFormulaValue(value) {
  return String(value || '').replace(/'/g, "\\'")
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' })
  }

  try {
    const today = dateKeyToday()
    const weekStart = dateKeyOffsetDays(-6)

    const records = await base('UserAnswers')
      .select({
        maxRecords: 5000,
        filterByFormula: `AND({DateKey} >= '${escapeFormulaValue(weekStart)}', {DateKey} <= '${escapeFormulaValue(today)}')`,
        sort: [{ field: 'CreatedAt', direction: 'desc' }],
      })
      .all()

    const weeklyCountrySeen = new Set()
    const todayCountrySeen = new Set()
    const todayUserSeen = new Set()

    for (const record of records) {
      const f = record.fields || {}

      const country = normalise(f.Country)
      const userId = String(f.UserID || '').trim()
      const dateKey = String(f.DateKey || '').trim()

      if (country && country !== 'xx' && country !== 'unknown') {
        weeklyCountrySeen.add(country)

        if (dateKey === today) {
          todayCountrySeen.add(country)
        }
      }

      if (dateKey === today && userId) {
        todayUserSeen.add(userId)
      }
    }

    const weeklyCountries = Array.from(weeklyCountrySeen).sort((a, b) => a.localeCompare(b))
    const todayCountries = Array.from(todayCountrySeen).sort((a, b) => a.localeCompare(b))

    return res.status(200).json({
      today,
      weekStart,
      updatedLive: true,
      weeklyCountries,
      weeklyCountryCount: weeklyCountries.length,
      todayCountries,
      todayCountryCount: todayCountries.length,
      todayPlayerCount: todayUserSeen.size,
    })
  } catch (err) {
    console.error('load-landing-board error:', err)
    return res.status(500).json({ error: 'Failed to load landing board' })
  }
}
