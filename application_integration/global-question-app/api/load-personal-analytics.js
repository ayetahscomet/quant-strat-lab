/* /api/load-personal-analytics.js */

import { base } from '../lib/airtable.js'
import { pickDateKey } from '../lib/dateKey.js'

/* ======================================================
   Utils
====================================================== */

function normalise(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function safeJsonArray(v) {
  try {
    const arr = v ? JSON.parse(v) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

function pct(n) {
  if (!isFinite(n)) return 0
  return clamp(Math.round(n), 0, 100)
}

/* ======================================================
   Core derivations from UserAnswers
====================================================== */

function deriveFromAttempts(attemptRows) {
  const attempts = []
  const submittedSet = new Set()
  const correctSet = new Set()
  const incorrectSet = new Set()

  let firstAt = null
  let lastAt = null
  let hintsUsed = 0

  let requiredSlotsGuess = 0

  for (const r of attemptRows) {
    const f = r.fields || {}

    const createdAt = f.CreatedAt ? new Date(f.CreatedAt) : null

    const answers = safeJsonArray(f.AnswersJSON)
    const correctAnswers = safeJsonArray(f.CorrectAnswersJSON)
    const incorrectAnswers = safeJsonArray(f.IncorrectAnswersJSON)

    if (correctAnswers.length > requiredSlotsGuess) {
      requiredSlotsGuess = correctAnswers.length
    }

    for (const a of answers) submittedSet.add(normalise(a))
    for (const c of correctAnswers) correctSet.add(normalise(c))
    for (const i of incorrectAnswers) incorrectSet.add(normalise(i))

    if (createdAt && !isNaN(createdAt)) {
      if (!firstAt || createdAt < firstAt) firstAt = createdAt
      if (!lastAt || createdAt > lastAt) lastAt = createdAt
    }

    if (f.HintUsed === true) hintsUsed++

    attempts.push({
      windowId: f.WindowID || null,
      result: f.Result || null,
      createdAt: f.CreatedAt || null,
      attemptIndex: f.AttemptIndex ?? null,
      answers,
      correctAnswers,
      incorrectAnswers,
      hintUsed: f.HintUsed === true,
    })
  }

  if (!requiredSlotsGuess) requiredSlotsGuess = 1

  const uniqueSubmitted = submittedSet.size
  const uniqueCorrect = Math.min(correctSet.size, requiredSlotsGuess)

  // sane accuracy
  const denom = Math.max(uniqueSubmitted, requiredSlotsGuess)
  const accuracyPct = denom > 0 ? pct((uniqueCorrect / denom) * 100) : 0

  // completion
  const completionPct = pct((uniqueCorrect / requiredSlotsGuess) * 100)

  // pace
  const paceSeconds =
    firstAt && lastAt
      ? Math.max(0, Math.round((lastAt.getTime() - firstAt.getTime()) / 1000))
      : null

  return {
    attempts,
    uniqueSubmitted,
    uniqueCorrect,
    completionPct,
    accuracyPct,
    paceSeconds,
    hintsUsed,
    incorrectCount: incorrectSet.size,
    requiredSlotsGuess,
    submittedList: [...submittedSet],
    correctList: [...correctSet],
  }
}

/* ======================================================
   Archetype classifier
====================================================== */

function classifyArchetype({ completionPct, accuracyPct, paceSeconds }) {
  if (completionPct === 100 && accuracyPct >= 90 && paceSeconds && paceSeconds < 180)
    return 'Speedrunner'

  if (completionPct === 100 && accuracyPct >= 90) return 'Sniper'

  if (completionPct === 100 && accuracyPct < 60) return 'Explorer'

  if (completionPct >= 70 && paceSeconds && paceSeconds > 600) return 'Scholar'

  return 'Learner'
}

/* ======================================================
   Header narrative builder
====================================================== */

function buildHeaderSentence({ completionPct, accuracyPct, paceSeconds, paceRelation }) {
  if (completionPct === 100 && paceRelation === 'faster') {
    return 'Perfect day. You cleared the board and beat the global pace.'
  }

  if (completionPct === 100) {
    return 'All answers found. Calm, deliberate work.'
  }

  if (completionPct >= 60) {
    return 'Strong showing. You stayed in the hunt.'
  }

  return 'One of those days — tomorrow tells a new story.'
}

/* ======================================================
   Handler
====================================================== */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    const { dateKey } = pickDateKey(req)
    const { userId } = req.body || {}

    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    /* ====================================================
       Question meta
    ==================================================== */

    const questionRows = await base('Questions')
      .select({
        maxRecords: 1,
        filterByFormula: `{DateKey}='${dateKey}'`,
      })
      .all()

    const question = questionRows[0]?.fields || {}
    const answerCount = question.AnswerCount || null

    /* ====================================================
       User attempts
    ==================================================== */

    const attemptRows = await base('UserAnswers')
      .select({
        maxRecords: 500,
        filterByFormula: `AND({UserID}='${userId}',{DateKey}='${dateKey}')`,
        sort: [{ field: 'CreatedAt', direction: 'asc' }],
      })
      .all()

    const derived = deriveFromAttempts(attemptRows)

    /* ====================================================
       Profile row (optional override layer)
    ==================================================== */

    const profileRows = await base('UserDailyProfile')
      .select({
        maxRecords: 1,
        filterByFormula: `AND({UserID}='${userId}',{DateKey}='${dateKey}')`,
      })
      .all()

    const profile = profileRows[0]?.fields || {}

    /* ====================================================
       Archetype + header copy
    ==================================================== */

    const archetype =
      profile.Archetype ||
      classifyArchetype({
        completionPct: derived.completionPct,
        accuracyPct: derived.accuracyPct,
        paceSeconds: derived.paceSeconds,
      })

    const headerSentence = buildHeaderSentence({
      completionPct: derived.completionPct,
      accuracyPct: derived.accuracyPct,
      paceSeconds: derived.paceSeconds,
      paceRelation: profile.PaceRelation || null,
    })

    /* ====================================================
       Rare answers list (local fallback)
    ==================================================== */

    const rareAnswersList = derived.correctList.slice(0, 6)

    /* ====================================================
       Response
    ==================================================== */

    return res.status(200).json({
      dateKey,

      headerSentence,

      profile: {
        AttemptsUsed: profile.AttemptsUsed ?? derived.attempts.length,
        HintCount: profile.HintCount ?? derived.hintsUsed,

        Accuracy: derived.accuracyPct,
        Completion: derived.completionPct,

        SolveSeconds: profile.SolveSeconds ?? derived.paceSeconds,

        DistinctAnswers: derived.uniqueCorrect,
        RareAnswers: profile.RareAnswers ?? rareAnswersList.length,

        PercentileSpeed: profile.PercentileSpeed ?? null,
        PercentileAccuracy: profile.PercentileAccuracy ?? null,

        Archetype: archetype,

        StreakContinues: profile.StreakContinues ?? null,
        FirstSolveToday: profile.FirstSolveToday ?? null,

        Country: profile.Country || null,
        Region: profile.Region || null,
      },

      question: {
        answerCount,
        correctAnswers: safeJsonArray(question.CorrectAnswersJSON),
      },

      attempts: derived.attempts,

      derived: {
        submittedUniqueCount: derived.uniqueSubmitted,
        correctUniqueCount: derived.uniqueCorrect,
        requiredSlots: derived.requiredSlotsGuess,
        paceSeconds: derived.paceSeconds,
        rareAnswersList,
      },
    })
  } catch (err) {
    console.error('load-personal-analytics error:', err)
    return res.status(500).json({ error: 'Failed to load personal analytics' })
  }
}
