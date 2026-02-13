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
  const WINDOWS_PER_DAY = 7
  const ATTEMPTS_PER_WINDOW = 3

  const uniqueSubmitted = new Set()
  const uniqueCorrect = new Set()
  const attemptsByWindow = {}

  const clean = cleanAttempts(attempts)

  for (const a of clean) {
    const rawAnswers = Array.isArray(a.answers) ? a.answers : a.answer ? [a.answer] : []

    for (const ans of rawAnswers) {
      if (!ans) continue
      uniqueSubmitted.add(normalise(ans))
    }

    const correctAnswers = Array.isArray(a.correctAnswers) ? a.correctAnswers : []

    for (const c of correctAnswers) {
      if (!c) continue
      uniqueCorrect.add(normalise(c))
    }

    if (a.windowId) {
      attemptsByWindow[a.windowId] ??= 0
      attemptsByWindow[a.windowId]++
    }
  }

  const windowsPlayed = Object.keys(attemptsByWindow).length
  const totalSlots = Number(question.answerCount) || 0

  const correctCount = uniqueCorrect.size

  // ---------------- Completion ----------------
  const solved = totalSlots > 0 && correctCount >= totalSlots

  const reachedFinalWindow =
    attemptsByWindow['7'] > 0 || attemptsByWindow['last'] > 0 || windowsPlayed === WINDOWS_PER_DAY

  const meaningfulPlay = windowsPlayed >= 3

  let completion = 0
  let completionReason = 'minimal'

  if (solved) {
    completion = 100
    completionReason = 'solved'
  } else if (meaningfulPlay && reachedFinalWindow) {
    completion = 100
    completionReason = 'persistence'
  } else {
    completion = totalSlots > 0 ? Math.round((correctCount / totalSlots) * 100) : 0
    completionReason = meaningfulPlay ? 'engaged' : 'minimal'
  }

  completion = clamp(completion, 0, 100)

  // ---------------- Accuracy ----------------
  const totalAvailableAttempts = clean.length

  const accuracy =
    totalAvailableAttempts > 0 ? Math.round((correctCount / totalAvailableAttempts) * 100) : 0

  // ---------------- Pace ----------------
  const paceSeconds = solved ? (profile?.SolveSeconds ?? null) : null
  const pacePercentile = solved ? normalisePercent(profile?.PercentileSpeed) : null

  // ---------------- Daily Score ----------------
  const dailyScore = clamp(
    Math.round(completion * 0.5 + accuracy * 0.3 + (pacePercentile ? pacePercentile * 0.2 : 0)),
    0,
    100,
  )

  return {
    completion,
    completionReason,
    accuracy,
    paceSeconds,
    pacePercentile,
    dailyScore,
    windowsPlayed,
    correctCount,
    totalSlots,
    attemptsTotal: clean.length,
    submittedUnique: uniqueSubmitted.size,
    duplicatePenalty: uniqueSubmitted.size - uniqueCorrect.size,
    attemptsByWindow,
  }
}
