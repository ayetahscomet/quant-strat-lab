// /api/load-session.js
import { base } from '../lib/airtable.js'

function normalise(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId, dateKey, windowId } = req.body || {}

  if (!userId || !dateKey || !windowId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // =====================================================
    // Load ENTIRE day once — canonical session snapshot
    // =====================================================
    const records = await base('UserAnswers')
      .select({
        maxRecords: 200,
        filterByFormula: `AND({UserID} = '${userId}', {DateKey} = '${dateKey}')`,
        sort: [{ field: 'CreatedAt', direction: 'asc' }],
      })
      .firstPage()

    const rows = records.map((r) => {
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
      }
    })

    // =====================================================
    // Day end markers (AttemptIndex = 999)
    // =====================================================
    const finalMarker = rows.find((r) => r.attemptIndex === 999)
    const dayEnded = finalMarker?.result === 'success' || finalMarker?.result === 'exit-early'

    // =====================================================
    // Attempts in THIS window
    // =====================================================
    const windowAttempts = rows.filter(
      (r) => r.windowId === windowId && r.attemptIndex >= 1 && r.attemptIndex <= 3,
    )

    const latestAttempt = windowAttempts.length ? windowAttempts[windowAttempts.length - 1] : null

    // =====================================================
    // Hint marker (AttemptIndex = 998)
    // =====================================================
    const hintUsed = rows.some(
      (r) => r.windowId === windowId && (r.attemptIndex === 998 || r.result === 'hint-used'),
    )

    // =====================================================
    // Incorrect answers tried today (ALL windows)
    // =====================================================
    const tried = new Set()

    for (const r of rows) {
      for (const a of r.incorrectAnswers || []) {
        tried.add(normalise(a))
      }
    }

    // =====================================================
    // Correct answers solved today (ALL windows)
    //   — folded in from load-history.js
    // =====================================================
    const correctAcrossDay = new Map()

    for (const r of rows) {
      for (const raw of r.correctAnswers || []) {
        const n = normalise(raw)
        if (n && !correctAcrossDay.has(n)) {
          correctAcrossDay.set(n, raw)
        }
      }
    }

    return res.status(200).json({
      // Per-window attempts
      attempts: windowAttempts.map((a, i) => ({
        answers: a.answers || [],
        result: a.result || 'attempt',
        attemptIndex: a.attemptIndex || i + 1,
        timestamp: a.createdAt || null,
      })),

      latestAnswers: latestAttempt?.answers || [],

      hintUsed,

      triedIncorrect: Array.from(tried),

      correctAcrossDay: Array.from(correctAcrossDay.values()),

      dayEnded,
      dayEndResult: finalMarker?.result || null,
    })
  } catch (err) {
    console.error('load-session error:', err)
    return res.status(500).json({ error: 'Failed to load session' })
  }
}
