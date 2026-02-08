import { base } from '../lib/airtable.js'
import { pickDateKey } from '../lib/dateKey.js'

function normalisePercent(x) {
  if (x === null || x === undefined) return null
  let n = Number(x)
  if (!isFinite(n)) return null

  // 0–1 -> %
  if (n > 0 && n <= 1) n = n * 100

  while (n > 100) n = n / 10
  return Math.round(n)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    const { dateKey } = pickDateKey(req)
    const { userId } = req.body || {}

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId or dateKey' })
    }

    /* ======================================================
       LOAD: UserDailyProfile (1 row per user per day)
    ====================================================== */

    const profileRows = await base('UserDailyProfile')
      .select({
        maxRecords: 1,
        filterByFormula: `AND({UserID}='${userId}',{DateKey}='${dateKey}')`,
      })
      .all()

    const profile = profileRows[0]?.fields || null

    /* ======================================================
       LOAD: Question meta for the day
    ====================================================== */

    const questionRows = await base('Questions')
      .select({
        maxRecords: 1,
        filterByFormula: `{DateKey}='${dateKey}'`,
      })
      .all()

    const question = questionRows[0]?.fields || {}

    const payload = {
      profile: profile
        ? {
            AttemptsUsed: profile.AttemptsUsed ?? 0,
            HintCount: profile.HintCount ?? 0,
            Accuracy: normalisePercent(profile.Accuracy),
            Completion: normalisePercent(profile.Completion),
            SolveSeconds: profile.SolveSeconds ?? null,
            DistinctAnswers: profile.DistinctAnswers ?? 0,
            RareAnswers: profile.RareAnswers ?? 0,

            PercentileSpeed: normalisePercent(profile.PercentileSpeed),
            PercentileAccuracy: normalisePercent(profile.PercentileAccuracy),

            Archetype: profile.Archetype || null,
            StreakContinues: profile.StreakContinues ?? null,
            FirstSolveToday: profile.FirstSolveToday ?? null,

            Country: profile.Country || null,
            Region: profile.Region || null,
          }
        : null,

      question: {
        answerCount: question.AnswerCount ?? null,
        correctAnswers: question.CorrectAnswersJSON ? JSON.parse(question.CorrectAnswersJSON) : [],
      },
    }

    return res.status(200).json(payload)
  } catch (err) {
    console.error('load-personal-analytics error:', err)
    return res.status(500).json({ error: 'Failed to load personal analytics' })
  }
}
