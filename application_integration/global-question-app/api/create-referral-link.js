import { base } from '../lib/airtable.js'

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

async function generateUniqueCode() {
  let attempts = 0

  while (attempts < 5) {
    const code = generateCode()

    const existing = await base('Users')
      .select({
        filterByFormula: `{ReferralCode} = '${code}'`,
        maxRecords: 1,
      })
      .firstPage()

    if (!existing.length) return code

    attempts++
  }

  throw new Error('Failed to generate unique referral code')
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

    let users = await base('Users')
      .select({
        filterByFormula: `{UserID} = '${userId}'`,
        maxRecords: 1,
      })
      .firstPage()

    let user

    if (!users.length) {
      user = await base('Users').create({
        UserID: userId,
      })
    } else {
      user = users[0]
    }

    const fields = user.fields || {}
    let referralCode = fields.ReferralCode || null

    if (!referralCode) {
      referralCode = await generateUniqueCode()

      await base('Users').update(user.id, {
        ReferralCode: referralCode,
      })
    }

    const baseUrl = process.env.PUBLIC_BASE_URL || process.env.BASE_URL || 'https://akinto.io'
    const referralUrl = `${baseUrl}/?ref=${referralCode}`

    return res.status(200).json({
      referralCode,
      referralUrl,
    })
  } catch (err) {
    console.error('create-referral-link error:', err)
    return res.status(500).json({ error: 'Failed to create referral link' })
  }
}
