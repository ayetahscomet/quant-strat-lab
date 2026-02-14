// src/lib/metricsEngine.js

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

function normalise(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
}

function normalisePercent(x) {
  if (x === null || x === undefined) return null
  let n = Number(x)
  if (!isFinite(n)) return null
  if (n > 0 && n <= 1) n *= 100
  while (n > 100) n /= 10
  return n
}

function cleanAttempts(attempts = []) {
  return attempts.filter(
    (a) => Number(a?.attemptIndex) !== 999 && a?.result !== 'snapshot' && !a?.isSummary,
  )
}

export function computeDailyMetrics({ attempts = [], question = {}, profile = {} }) {
  const n =
    Number(question.answerCount) ||
    (Array.isArray(question.correctAnswers) ? question.correctAnswers.length : 0)

  // --------------------------------------------------
  // 1️⃣ Remove snapshot / summary rows once
  // --------------------------------------------------
  const realAttempts = Array.isArray(attempts)
    ? attempts.filter(
        (a) => Number(a?.attemptIndex) !== 999 && a?.result !== 'snapshot' && !a?.isSummary,
      )
    : []

  // --------------------------------------------------
  // 2️⃣ Track windows actually played
  // --------------------------------------------------
  const attemptsByWindow = {}
  for (const a of realAttempts) {
    if (!a.windowId) continue
    attemptsByWindow[a.windowId] ??= 0
    attemptsByWindow[a.windowId]++
  }

  const windowsPlayed = Object.keys(attemptsByWindow).length
  const totalAttemptsUsed = realAttempts.length

  // --------------------------------------------------
  // 3️⃣ Count correct entries across ALL attempts
  // numerator for accuracy
  // --------------------------------------------------
  let correctEntries = 0
  const uniqueCorrect = new Set()

  for (const a of realAttempts) {
    const correctAnswers = Array.isArray(a.correctAnswers) ? a.correctAnswers.map(normalise) : []

    const answers = Array.isArray(a.answers) ? a.answers : a.answer ? [a.answer] : []

    for (const ans of answers) {
      const norm = normalise(ans)
      if (!norm) continue

      if (correctAnswers.includes(norm)) {
        correctEntries++
        uniqueCorrect.add(norm)
      }
    }
  }

  const uniqueCorrectCount = uniqueCorrect.size

  // --------------------------------------------------
  // 4️⃣ COMPLETION (coverage of unique answers)
  // --------------------------------------------------
  let completion = 0
  let completionReason = 'minimal'

  if (n > 0) {
    completion = clamp(Math.round((uniqueCorrectCount / n) * 100), 0, 100)
  }

  const solved = n > 0 && uniqueCorrectCount >= n

  if (solved) {
    completion = 100
    completionReason = 'solved'
  } else if (windowsPlayed >= 3 && totalAttemptsUsed > 0) {
    completionReason = 'engaged'
  }

  // --------------------------------------------------
  // 5️⃣ ACCURACY (precision)
  //
  // denominator = attempts used × n inputs
  //
  // IMPORTANT:
  // If player only played 4 windows,
  // totalAttemptsUsed already reflects that.
  // --------------------------------------------------
  const totalSlotsUsed = n > 0 ? totalAttemptsUsed * n : 0

  const accuracy =
    totalSlotsUsed > 0 ? clamp(Math.round((correctEntries / totalSlotsUsed) * 100), 0, 100) : 0

  // --------------------------------------------------
  // 6️⃣ PACE (only meaningful if solved)
  // --------------------------------------------------
  const paceSeconds = solved && profile?.SolveSeconds ? Number(profile.SolveSeconds) : null

  const rawPercentile =
    solved && profile?.PercentileSpeed != null ? normalisePercent(profile.PercentileSpeed) : null

  const pacePercentile = rawPercentile != null ? clamp(Math.round(rawPercentile), 0, 100) : null

  // --------------------------------------------------
  // 7️⃣ DAILY SCORE
  // --------------------------------------------------
  const dailyScore = clamp(
    Math.round(
      completion * 0.5 + accuracy * 0.3 + (pacePercentile != null ? pacePercentile * 0.2 : 0),
    ),
    0,
    100,
  )

  return {
    completion,
    completionReason,
    accuracy,
    dailyScore,
    paceSeconds,
    pacePercentile,
    windowsPlayed,
    totalAttemptsUsed,
    correctEntries,
    uniqueCorrectCount,
    totalSlots: n,
  }
}
