// /api/log-attempt.js
import { base } from '../lib/airtable.js'
import { pickDateKey } from '../lib/dateKey.js'
import { getCountryCanonicalMatch } from '../src/data/countryAliases.js'

function normalise(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/\./g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function canonicaliseAnswer(answer, correctAnswers = []) {
  const countryMatch = getCountryCanonicalMatch(answer, correctAnswers)
  if (countryMatch) return countryMatch

  const n = normalise(answer)
  const exact = correctAnswers.find((c) => normalise(c) === n)
  return exact || answer
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  try {
    const { dateKey } = pickDateKey(req)
    const { userId, country, source, windowId, attemptIndex, answers, correctAnswers, result } =
      req.body || {}

    if (!userId || !dateKey || !windowId || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const canonList = Array.isArray(correctAnswers) ? correctAnswers : []

    const canonicalisedAnswers = answers.map((a) => canonicaliseAnswer(a, canonList))
    const correctSet = new Set(canonList.map(normalise))

    const incorrect = Array.from(
      new Set(canonicalisedAnswers.map(normalise).filter((a) => a && !correctSet.has(a))),
    )

    await base('UserAnswers').create([
      {
        fields: {
          UserID: userId,
          Country: country || 'xx',
          Source: source || '',
          DateKey: dateKey,
          WindowID: windowId,
          AttemptIndex: attemptIndex || 1,
          Result: result || 'attempt',
          AnswersJSON: JSON.stringify(canonicalisedAnswers),
          CorrectAnswersJSON: JSON.stringify(canonList),
          IncorrectAnswersJSON: JSON.stringify(incorrect),
          CreatedAt: new Date().toISOString(),
        },
      },
    ])

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('log-attempt error:', err)
    return res.status(500).json({ error: 'Failed to log attempt' })
  }
}
