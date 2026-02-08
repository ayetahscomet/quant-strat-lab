// /api/load-personal-analytics.js
import { base } from '../lib/airtable.js'
import { pickDateKey } from '../lib/dateKey.js'

function normalise(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function safeJson(x) {
  try {
    return x ? JSON.parse(x) : []
  } catch {
    return []
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    const { dateKey } = pickDateKey(req)
    const { userId } = req.body || {}

    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    // 1) UserDailyProfile
    const profileRows = await base('UserDailyProfile')
      .select({
        maxRecords: 1,
        filterByFormula: `AND({UserID}='${userId}',{DateKey}='${dateKey}')`,
      })
      .all()
    const profile = profileRows[0]?.fields || null

    // 2) Question meta
    const questionRows = await base('Questions')
      .select({
        maxRecords: 1,
        filterByFormula: `{DateKey}='${dateKey}'`,
      })
      .all()
    const question = questionRows[0]?.fields || {}

    // 3) Attempts for this user/day (UserAnswers)
    const attemptRows = await base('UserAnswers')
      .select({
        maxRecords: 500,
        filterByFormula: `AND({UserID}='${userId}',{DateKey}='${dateKey}')`,
        sort: [{ field: 'CreatedAt', direction: 'asc' }],
      })
      .all()

    const attempts = attemptRows.map((r) => {
      const f = r.fields || {}
      return {
        windowId: f.WindowID || null,
        result: f.Result || null,
        createdAt: f.CreatedAt || null,
        attemptIndex: f.AttemptIndex ?? null,
        answers: safeJson(f.AnswersJSON),
        correctAnswers: safeJson(f.CorrectAnswersJSON),
        incorrectAnswers: safeJson(f.IncorrectAnswersJSON),
        hintUsed: f.HintUsed === true,
      }
    })

    // 4) Compute robust accuracy + “rare answers list” (from what you actually got correct)
    const uniqueSubmitted = new Set()
    const uniqueCorrect = new Set()

    for (const a of attempts) {
      for (const ans of a.answers || []) uniqueSubmitted.add(normalise(ans))
      for (const c of a.correctAnswers || []) uniqueCorrect.add(normalise(c))
    }

    const submittedUnique = [...uniqueSubmitted].filter(Boolean)
    const correctUnique = [...uniqueCorrect].filter(Boolean)

    const computedAccuracy =
      submittedUnique.length > 0
        ? Math.round((correctUnique.length / submittedUnique.length) * 100)
        : 0

    // If you don’t yet store “rare list”, this is still a useful list for the tile.
    // (Later you can replace this with a true rarity-ranked list from your aggregations.)
    const rareAnswersList =
      profile?.RareAnswers && profile.RareAnswers > 0
        ? correctUnique.slice(0, Math.min(profile.RareAnswers, 6))
        : []

    return res.status(200).json({
      dateKey,
      profile: profile
        ? {
            AttemptsUsed: profile.AttemptsUsed ?? 0,
            HintCount: profile.HintCount ?? 0,

            // prefer computed accuracy (fixes the “2%” issue even if Airtable formula is wrong)
            Accuracy: computedAccuracy,

            Completion: profile.Completion ?? 0,
            SolveSeconds: profile.SolveSeconds ?? null,
            DistinctAnswers: profile.DistinctAnswers ?? correctUnique.length,
            RareAnswers: profile.RareAnswers ?? 0,

            PercentileSpeed: profile.PercentileSpeed ?? null,
            PercentileAccuracy: profile.PercentileAccuracy ?? null,

            Archetype: profile.Archetype || null,
            StreakContinues: profile.StreakContinues ?? null,
            FirstSolveToday: profile.FirstSolveToday ?? null,

            Country: profile.Country || null,
            Region: profile.Region || null,
          }
        : {
            AttemptsUsed: attempts.length,
            HintCount: attempts.filter((a) => a.hintUsed).length,
            Accuracy: computedAccuracy,
            Completion: 0,
            SolveSeconds: null,
            DistinctAnswers: correctUnique.length,
            RareAnswers: 0,
            PercentileSpeed: null,
            PercentileAccuracy: null,
            Archetype: null,
            StreakContinues: null,
            FirstSolveToday: null,
            Country: null,
            Region: null,
          },

      question: {
        answerCount: question.AnswerCount ?? null,
        correctAnswers: question.CorrectAnswersJSON ? JSON.parse(question.CorrectAnswersJSON) : [],
      },

      attempts,
      derived: {
        submittedUniqueCount: submittedUnique.length,
        correctUniqueCount: correctUnique.length,
        rareAnswersList,
      },
    })
  } catch (err) {
    console.error('load-personal-analytics error:', err)
    return res.status(500).json({ error: 'Failed to load personal analytics' })
  }
}
