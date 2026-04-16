// /api/log-play.js
import { base } from '../lib/airtable.js'
import { pickDateKey } from '../lib/dateKey.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    const { dateKey } = pickDateKey(req)
    const { userId, country, source, windowId, answers, correctAnswers, result } = req.body

    if (!userId || !dateKey || !windowId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const allowedResults = new Set(['success', 'lockout', 'exit-early'])

    if (!allowedResults.has(result)) {
      return res.status(400).json({ error: 'Invalid result state' })
    }

    const finalResult = result

    // =====================================================
    // Log final play marker to UserAnswers
    // =====================================================

    await base('UserAnswers').create([
      {
        fields: {
          UserID: userId,
          Country: country || 'xx',
          Source: source || '',
          DateKey: dateKey,
          WindowID: windowId,
          Result: finalResult,
          AnswersJSON: JSON.stringify(answers || []),
          CorrectAnswersJSON: JSON.stringify(correctAnswers || []),
          CreatedAt: new Date().toISOString(),
          AttemptIndex: 999,
        },
      },
    ])

    // =====================================================
    // Update EmailSubscriptions (if exists)
    // =====================================================

    const subs = await base('EmailSubscriptions')
      .select({
        filterByFormula: `{UserID} = '${userId}'`,
      })
      .firstPage()

    if (subs.length) {
      const subRecord = subs[0]

      if (finalResult === 'lockout') {
        // User failed this window but did not end the day
        await base('EmailSubscriptions').update(subRecord.id, {
          LastFailedWindowId: windowId,
          LastFailedDateKey: dateKey,
        })
      } else {
        // success OR exit-early both end the day for reminder purposes
        await base('EmailSubscriptions').update(subRecord.id, {
          LastFailedWindowId: null,
          LastFailedDateKey: null,
        })
      }
    }

    // =====================================================
    // CLAIM REFERRAL (FIRST PLAY ONLY)
    // =====================================================

    try {
      const pendingReferral = req.headers['x-akinto-ref'] || req.body?.pendingReferral || null

      if (pendingReferral) {
        await fetch(`${process.env.BASE_URL || ''}/api/claim-referral`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            referralCode: pendingReferral,
            country,
            source,
          }),
        }).catch(() => null)
      }
    } catch (e) {
      console.warn('Referral claim skipped:', e)
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('log-play error:', err)
    return res.status(500).json({ error: 'Failed to log play' })
  }
}
