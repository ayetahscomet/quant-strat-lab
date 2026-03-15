// /api/save-email-sub.js

import { base } from '../lib/airtable.js'
import crypto from 'crypto'

function generateToken() {
  return crypto.randomBytes(24).toString('hex')
}

function escapeAirtableString(value) {
  return String(value).replace(/'/g, "\\'")
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    const { email, timezone, userId, country } = req.body || {}

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email required' })
    }

    const cleanedEmail = email.trim().toLowerCase()
    const tz = timezone || 'Europe/London'

    const existing = await base('EmailSubscriptions')
      .select({
        filterByFormula: `{Email} = '${escapeAirtableString(cleanedEmail)}'`,
      })
      .firstPage()

    if (existing.length) {
      await base('EmailSubscriptions').update(existing[0].id, {
        Timezone: tz,
        UserID: userId || null,
        Country: country || null,
        Status: 'active',
      })

      return res.status(200).json({ ok: true, reused: true })
    }

    const unsubToken = generateToken()

    await base('EmailSubscriptions').create([
      {
        fields: {
          Email: cleanedEmail,
          UserID: userId || null,
          Country: country || null,
          Timezone: tz,
          Status: 'active',
          OptInAt: new Date().toISOString(),
          VerifiedAt: null,
          UnsubToken: unsubToken,
          LastSentDateKey: null,
          LastSentWindowId: null,
          LastSentAt: null,
          LastFailedWindowId: null,
          LastFailedDateKey: null,
        },
      },
    ])

    return res.status(200).json({ ok: true, created: true })
  } catch (err) {
    console.error('[SAVE EMAIL] error:', err)
    return res.status(500).json({ error: 'Failed to save email subscription' })
  }
}
