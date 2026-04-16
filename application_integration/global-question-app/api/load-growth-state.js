// /api/load-growth-state.js

import { base } from '../lib/airtable.js'
import { dateKeyToday } from '../lib/dateKey.js'
import { countries } from '../src/data/countries.js'

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function normaliseCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function resolveCountryName(code) {
  const c = normaliseCode(code)
  if (!c || c === 'xx' || c === 'unknown') return null
  return countries.find((x) => normaliseCode(x.code) === c)?.name || c.toUpperCase()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    const { userId } = req.body || {}

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' })
    }

    const baseUrl = process.env.PUBLIC_BASE_URL || process.env.BASE_URL || 'https://akinto.io'
    const today = dateKeyToday()

    // =====================================================
    // 1️⃣ Load user record
    // =====================================================
    const users = await base('Users')
      .select({
        filterByFormula: `{UserID} = '${userId}'`,
        maxRecords: 1,
      })
      .firstPage()

    if (!users.length) {
      return res.status(200).json({
        referralCode: null,
        referralUrl: null,
        invitedUsersCount: 0,
        crossBorderInvitesCount: 0,
        unlockedCountries: [],
        unlockedCountryNames: [],
        unlockedCountryCount: 0,
        latestUnlockedCountryCode: null,
        latestUnlockedCountryName: null,
        todaysBoardCountries: [],
        todaysBoardCountryCount: 0,
        referredByUserID: null,
      })
    }

    const userRecord = users[0]
    const userFields = userRecord.fields || {}

    const referralCode = userFields.ReferralCode || null
    const referredByUserID = userFields.ReferredByUserID || null

    // =====================================================
    // 2️⃣ Compute referral analytics + unlocked countries
    // =====================================================
    let invitedUsersCount = 0
    let crossBorderInvitesCount = 0
    let unlockedCountries = safeJsonParse(userFields.UnlockedCountriesJSON, [])
      .map(normaliseCode)
      .filter(Boolean)

    let latestUnlockedCountryCode = null

    const referrals = await base('Referrals')
      .select({
        filterByFormula: `{ReferrerUserID} = '${userId}'`,
        maxRecords: 500,
        sort: [{ field: 'CreatedAt', direction: 'asc' }],
      })
      .firstPage()

    if (referrals.length) {
      invitedUsersCount = referrals.length
      crossBorderInvitesCount = referrals.filter((r) => !!r.fields?.IsCrossBorder).length

      const seen = new Set()
      const orderedUnlocks = []

      for (const r of referrals) {
        const inviteeCountry = normaliseCode(r.fields?.InviteeCountry || '')
        const referrerCountry = normaliseCode(r.fields?.ReferrerCountry || '')
        const isCrossBorder =
          !!inviteeCountry && !!referrerCountry && inviteeCountry !== referrerCountry

        if (!isCrossBorder) continue
        if (seen.has(inviteeCountry)) continue

        seen.add(inviteeCountry)
        orderedUnlocks.push(inviteeCountry)
      }

      unlockedCountries = orderedUnlocks
      latestUnlockedCountryCode = orderedUnlocks.length
        ? orderedUnlocks[orderedUnlocks.length - 1]
        : null
    }

    const unlockedCountryNames = unlockedCountries.map(resolveCountryName).filter(Boolean)

    // =====================================================
    // 3️⃣ Compute today’s board country count
    // =====================================================
    const todayRows = await base('UserAnswers')
      .select({
        maxRecords: 5000,
        filterByFormula: `{DateKey} = '${today}'`,
      })
      .firstPage()

    const todayCountrySet = new Set(
      todayRows
        .map((r) => normaliseCode(r.fields?.Country || ''))
        .filter((c) => c && c !== 'xx' && c !== 'unknown'),
    )

    const todaysBoardCountries = Array.from(todayCountrySet)
    const todaysBoardCountryCount = todaysBoardCountries.length

    const referralUrl = referralCode ? `${baseUrl}/?ref=${referralCode}` : null

    return res.status(200).json({
      referralCode,
      referralUrl,
      invitedUsersCount,
      crossBorderInvitesCount,

      unlockedCountries,
      unlockedCountryNames,
      unlockedCountryCount: unlockedCountries.length,
      latestUnlockedCountryCode,
      latestUnlockedCountryName: resolveCountryName(latestUnlockedCountryCode),

      todaysBoardCountries,
      todaysBoardCountryCount,

      referredByUserID,
    })
  } catch (err) {
    console.error('load-growth-state error:', err)
    return res.status(500).json({ error: 'Failed to load growth state' })
  }
}
