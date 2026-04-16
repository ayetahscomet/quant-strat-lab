// /api/claim-referral.js

import { base } from '../lib/airtable.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    const { userId, referralCode, country, source } = req.body || {}

    if (!userId || !referralCode) {
      return res.status(400).json({ error: 'Missing fields' })
    }

    // =====================================================
    // Get invitee (current user)
    // =====================================================
    const users = await base('Users')
      .select({
        filterByFormula: `{UserID} = '${userId}'`,
        maxRecords: 1,
      })
      .firstPage()

    if (!users.length) {
      return res.status(404).json({ error: 'User not found' })
    }

    const userRecord = users[0]
    const userFields = userRecord.fields || {}

    // Already referred → exit (idempotent)
    if (userFields.ReferredByUserID) {
      return res.status(200).json({ ok: true, skipped: 'already_referred' })
    }

    // =====================================================
    // Find referrer via ReferralCode
    // =====================================================
    const referrers = await base('Users')
      .select({
        filterByFormula: `{ReferralCode} = '${referralCode}'`,
        maxRecords: 1,
      })
      .firstPage()

    if (!referrers.length) {
      return res.status(200).json({ ok: true, skipped: 'invalid_code' })
    }

    const referrer = referrers[0]
    const referrerFields = referrer.fields || {}

    const referrerUserID = referrerFields.UserID

    // ❗ Prevent self-referral
    if (referrerUserID === userId) {
      return res.status(200).json({ ok: true, skipped: 'self_referral' })
    }

    // =====================================================
    // Determine cross-border
    // =====================================================
    const referrerCountry = referrerFields.CountryCode || 'xx'
    const inviteeCountry = country || userFields.CountryCode || 'xx'

    const isCrossBorder =
      referrerCountry &&
      inviteeCountry &&
      referrerCountry.toLowerCase() !== inviteeCountry.toLowerCase()

    // =====================================================
    // Write referral record
    // =====================================================
    await base('Referrals').create([
      {
        fields: {
          ReferralCode: referralCode,
          ReferrerUserID: referrerUserID,
          InviteeUserID: userId,
          ReferrerCountry: referrerCountry,
          InviteeCountry: inviteeCountry,
          IsCrossBorder: !!isCrossBorder,
          Source: source || '',
          CreatedAt: new Date().toISOString(),
        },
      },
    ])

    // =====================================================
    // Update invitee user
    // =====================================================
    await base('Users').update(userRecord.id, {
      ReferredByUserID: referrerUserID,
    })

    // =====================================================
    // Update referrer stats
    // =====================================================
    const invited = Number(referrerFields.InvitedUsersCount || 0)
    const cross = Number(referrerFields.CrossBorderInvitesCount || 0)

    await base('Users').update(referrer.id, {
      InvitedUsersCount: invited + 1,
      CrossBorderInvitesCount: cross + (isCrossBorder ? 1 : 0),
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('claim-referral error:', err)
    return res.status(500).json({ error: 'Failed to claim referral' })
  }
}
