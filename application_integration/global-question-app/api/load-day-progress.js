import { base } from '../lib/airtable.js'

function normalise(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    const { userId, dateKey } = req.body || {}

    if (!userId || !dateKey) {
      return res.status(400).json({ error: 'Missing userId or dateKey' })
    }

    const records = await base('UserAnswers')
      .select({
        maxRecords: 400,
        filterByFormula: `AND({UserID} = '${userId}', {DateKey} = '${dateKey}')`,
        sort: [{ field: 'CreatedAt', direction: 'asc' }],
      })
      .firstPage()

    const attempts = records.map((r) => {
      const f = r.fields || {}

      let answers = []
      let correctAnswers = []
      let incorrectAnswers = []

      try {
        answers = f.AnswersJSON ? JSON.parse(f.AnswersJSON) : []
      } catch {}

      try {
        correctAnswers = f.CorrectAnswersJSON ? JSON.parse(f.CorrectAnswersJSON) : []
      } catch {}

      try {
        incorrectAnswers = f.IncorrectAnswersJSON ? JSON.parse(f.IncorrectAnswersJSON) : []
      } catch {}

      return {
        windowId: f.WindowID || null,
        attemptIndex: Number(f.AttemptIndex ?? null),
        result: f.Result || null,
        answers,
        correctAnswers,
        incorrectAnswers,
        createdAt: f.CreatedAt || null,
        country: f.Country || null,
      }
    })

    // ---------- DAILY DERIVED METRICS ----------

    const finalMarkers = attempts.filter(
      (a) => a.result === 'success' || a.result === 'lockout' || a.result === 'exit-early',
    )

    const finalResult = finalMarkers[finalMarkers.length - 1] || null

    const validAttempts = attempts.filter((a) => a.attemptIndex >= 1 && a.attemptIndex <= 3)

    const allAnswers = validAttempts.flatMap((a) => a.answers || [])
    const uniqueCorrect = new Set()

    for (const a of validAttempts) {
      for (const c of a.correctAnswers || []) {
        uniqueCorrect.add(normalise(c))
      }
    }

    const totalSlots = finalResult?.correctAnswers?.length || 0

    const completion = totalSlots > 0 ? Math.round((uniqueCorrect.size / totalSlots) * 100) : 0

    const accuracy =
      allAnswers.length > 0 ? Math.round((uniqueCorrect.size / allAnswers.length) * 100) : 0

    const first = attempts[0]?.createdAt
    const last = attempts[attempts.length - 1]?.createdAt

    let solveSeconds = null
    if (first && last) {
      solveSeconds = (new Date(last).getTime() - new Date(first).getTime()) / 1000
    }

    const hintCount = attempts.filter((a) => a.result === 'hint-used').length

    const windowsUsed = new Set(attempts.map((a) => a.windowId).filter(Boolean)).size

    const country = attempts.find((a) => a.country)?.country || null

    // latest correct list
    const latestWithCorrect = [...attempts].reverse().find((a) => a.correctAnswers?.length)

    // ---------- HARD DAY END DETECTION ----------

    // Prefer explicit exit / success markers
    const dayEndAttempt = [...attempts]
      .reverse()
      .find((a) => ['success', 'exit-early', 'lockout'].includes(a.result))

    const dayEnded = !!dayEndAttempt
    const dayEndResult = dayEndAttempt?.result || null

    return res.status(200).json({
      attempts,
      correctAnswers: latestWithCorrect?.correctAnswers || [],

      // ===== GATING FLAGS FOR PLAY.VUE =====
      dayEnded,
      dayEndResult,

      metrics: {
        completion,
        accuracy,
        solveSeconds,
        hintCount,
        windowsUsed,
        attemptsUsed: validAttempts.length,
        country,
        finalResult: finalResult?.result || null,
      },
    })
  } catch (err) {
    console.error('load-day-progress error:', err)
    return res.status(500).json({ error: 'Failed to load day progress' })
  }
}
