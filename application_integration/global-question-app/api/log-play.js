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

    const finalResult = result === 'success' ? 'success' : 'lockout'

    // =====================================================
    // 1️⃣ Log final attempt to UserAnswers
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
    // 2️⃣ Update EmailSubscriptions (if exists)
    // =====================================================

    const subs = await base('EmailSubscriptions')
      .select({
        filterByFormula: `{UserID} = '${userId}'`,
      })
      .firstPage()

    if (subs.length) {
      const subRecord = subs[0]

      if (finalResult === 'lockout') {
        // User failed → mark them for next-window reminder
        await base('EmailSubscriptions').update(subRecord.id, {
          LastFailedWindowId: windowId,
          LastFailedDateKey: dateKey,
        })
      } else {
        // User succeeded → clear reminder flags
        await base('EmailSubscriptions').update(subRecord.id, {
          LastFailedWindowId: null,
          LastFailedDateKey: null,
        })
      }
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('log-play error:', err)
    return res.status(500).json({ error: 'Failed to log play' })
  }
}
