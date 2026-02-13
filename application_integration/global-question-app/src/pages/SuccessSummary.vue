<!--SuccessSummary.vue -->
<template>
  <div class="success-shell">
    <!-- ===================== HERO STRIP ===================== -->
    <header class="hero">
      <div class="hero-logo">
        <img src="/logo-800-full.svg" alt="Akinto logo" @click="goHome" />
      </div>

      <div class="hero-copy">
        <p class="hero-kicker" v-if="dateLabel">{{ dateLabel }} • {{ windowLabel }}</p>
        <h1 class="hero-title">
          {{ heroTitle }}
        </h1>
        <p class="hero-sub">You solved all {{ totalAnswers }} answers correctly today.</p>

        <div class="hero-chips">
          <span class="chip chip-strong" v-if="summary.completed"> Perfect solve </span>
          <span class="chip" v-if="summary.attemptsUsed">
            {{ summary.attemptsUsed }} attempt{{ summary.attemptsUsed === 1 ? '' : 's' }}
          </span>
          <span class="chip" v-if="summary.hintCount > 0">
            {{ summary.hintCount }} hint{{ summary.hintCount === 1 ? '' : 's' }}
          </span>
          <span class="chip chip-soft"> Session ID • {{ shortId }} </span>
        </div>
      </div>
    </header>

    <!-- ===================== MAIN GRID ===================== -->
    <main class="grid">
      <!-- ============ LEFT: ANSWERS ============ -->
      <section class="column answers-column">
        <div class="card card-main">
          <h2 class="card-title">Your answers</h2>
          <p class="card-sub">
            Locked in at
            <span class="card-sub-strong">{{ timeLabel }}</span>
          </p>

          <div v-if="userAnswers.length" class="pill-stack pill-stack-dark">
            <div v-for="(ans, i) in userAnswers" :key="i" class="pill pill-dark">
              <span class="pill-index">{{ i + 1 }}</span>
              <span class="pill-text">{{ ans || '—' }}</span>
            </div>
          </div>

          <p v-else class="empty-copy">
            We couldn’t find a recent session. Hop back to the game and try today’s question.
          </p>
        </div>

        <div v-if="otherAccepted.length" class="card card-secondary">
          <h3 class="card-title-sm">Other accepted answers you didn’t use</h3>
          <p class="card-sub">These would also have counted as correct today.</p>

          <div class="pill-stack pill-stack-light">
            <div v-for="(ans, i) in otherAccepted" :key="i" class="pill pill-light">
              {{ ans }}
            </div>
          </div>
        </div>
      </section>

      <!-- ============ RIGHT: PERSONAL METRICS ============ -->
      <section class="column metrics-column">
        <!-- Top stat block -->
        <div class="card metrics-hero">
          <h2 class="card-title">Today’s brainprint</h2>
          <p class="card-sub">A quick snapshot of how you moved through today’s puzzle.</p>

          <div class="metrics-row">
            <div class="metric metric-big">
              <p class="metric-label">Accuracy</p>
              <p class="metric-value-lg">
                {{ accuracy.toFixed(0) }}<span class="metric-unit">%</span>
              </p>
              <p class="metric-footnote">Correct out of all answers.</p>
            </div>

            <div class="metric metric-big">
              <p class="metric-label">Completion</p>
              <p class="metric-value-lg">
                {{ metrics?.completion ?? 0 }} <span class="metric-unit">%</span>
              </p>
              <p class="metric-footnote">You filled the full board.</p>
            </div>
          </div>
        </div>

        <!-- Mini metrics grid -->
        <div class="card metrics-grid-card">
          <div class="metrics-grid">
            <div class="metric">
              <p class="metric-label">Attempts used</p>
              <p class="metric-value">
                {{ summary.attemptsUsed || 1 }}
              </p>
              <p class="metric-footnote">These are summed throughout your daily windows.</p>
            </div>

            <div class="metric">
              <p class="metric-label">Solve style</p>
              <p class="metric-value">{{ solveStyle.label }}</p>
              <p class="metric-footnote">
                {{ solveStyle.copy }}
              </p>
            </div>

            <div class="metric">
              <p class="metric-label">Hint usage</p>
              <p class="metric-value">
                <template v-if="summary.hintCount > 0">
                  {{ summary.hintCount }} hint{{ summary.hintCount === 1 ? '' : 's' }} used
                </template>
                <template v-else> Unaided </template>
              </p>

              <p class="metric-footnote">
                <template v-if="summary.hintCount > 0"> You leaned on a hint. </template>
                <template v-else> You solved without hints. </template>
              </p>
            </div>

            <div class="metric">
              <p class="metric-label">Window</p>
              <p class="metric-value">
                {{ windowShort }}
              </p>
              <p class="metric-footnote">
                {{ windowMicroCopy }}
              </p>
            </div>
          </div>
        </div>

        <!-- Reflection / CTA card -->
        <div class="card reflection-card">
          <h3 class="card-title-sm">Tiny reflection for tomorrow</h3>
          <ul class="reflection-list">
            <li>{{ reflectionLines[0] }}</li>
            <li>{{ reflectionLines[1] }}</li>
            <li>{{ reflectionLines[2] }}</li>
          </ul>

          <div class="cta-row">
            <button class="btn btn-primary" @click="goAnalytics">Open daily analytics</button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { registerPush } from '@/push/registerPush'
import { computeDailyMetrics } from '../../lib/metricsEngine.js'

onMounted(() => {
  setTimeout(() => {
    registerPush()
  }, 1500)
})

const router = useRouter()

const maxAttempts = 3

const summary = ref({
  answers: [],
  correctAnswers: [],
  fieldStatus: [],
  correctCount: 0,
  incorrectCount: 0,
  attemptsUsed: 0,
  completed: false,
  hintUsed: false,
  hintCount: 0,
  date: '',
  timestamp: '',
  windowIndex: 0,
  userId: '',
})

const metrics = ref(null)

/**
 * Helper: lightweight normaliser for answer comparison.
 */
function normalise(str = '') {
  return str.toString().trim().toLowerCase().replace(/\s+/g, '')
}

function getUserId() {
  return localStorage.getItem('akinto_uuid') || ''
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
}

function computeFieldStatus(answers = [], correctAnswers = []) {
  const canon = correctAnswers.map(normalise)
  const used = new Set()

  return answers.map((a) => {
    const v = normalise(a)
    const ok = canon.includes(v) && !used.has(v)
    if (ok) used.add(v)
    return ok ? 'correct' : 'incorrect'
  })
}

async function loadSuccessSummaryFromAirtable() {
  const userId = getUserId()
  const dateKey = todayKey()
  if (!userId || !dateKey) return

  const res = await fetch('/api/load-day-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, dateKey }),
  })

  if (!res.ok) return
  const data = await res.json()

  const attempts = Array.isArray(data.attempts) ? data.attempts : []
  const correctAnswers = Array.isArray(data.correctAnswers) ? data.correctAnswers : []

  if (!attempts.length) return

  // Prefer AttemptIndex = 999 (final snapshot), else the latest "success" record, else latest record
  const finalAttempt =
    attempts.find((a) => Number(a.attemptIndex) === 999) ||
    [...attempts].reverse().find((a) => a.result === 'success') ||
    attempts[attempts.length - 1]

  const answers = Array.isArray(finalAttempt.answers) ? finalAttempt.answers : []

  // attemptsUsed: count attempts in the same window excluding the 999 marker
  const windowId = finalAttempt.windowId
  const attemptsUsed = attempts.filter(
    (a) => a.windowId === windowId && Number(a.attemptIndex) !== 999,
  ).length

  const fieldStatus = computeFieldStatus(answers, correctAnswers)
  const correctCount = fieldStatus.filter((s) => s === 'correct').length
  const incorrectCount = fieldStatus.filter((s) => s === 'incorrect').length

  let windowIndex = Number(finalAttempt.windowIndex ?? finalAttempt.windowId)

  if (!Number.isFinite(windowIndex)) {
    const d = new Date(finalAttempt.createdAt)
    const h = d.getHours()
    windowIndex = Math.floor(h / 2)
  }

  metrics.value = computeDailyMetrics({
    attempts,
    question: {
      answerCount: correctAnswers.length,
    },
    profile: {},
  })

  summary.value = {
    ...summary.value,
    userId,
    date: dateKey,
    timestamp: finalAttempt.createdAt || new Date().toISOString(),
    windowIndex,
    answers,
    correctAnswers,
    fieldStatus,
    correctCount,
    incorrectCount,
    attemptsUsed: attemptsUsed || 1,
    completed: true,
    hintUsed: !!data.hintsUsed || data.hintCount > 0,
    hintCount: Number(data.hintCount || 0),
  }
}

onMounted(() => {
  loadSuccessSummaryFromAirtable().catch((e) => console.error('SuccessSummary load error:', e))
})

/* ---------- Basic derived values ---------- */

const userAnswers = computed(() => summary.value.answers || [])
const correctAnswers = computed(() => summary.value.correctAnswers || [])

const totalAnswers = computed(
  () =>
    (summary.value.fieldStatus && summary.value.fieldStatus.length) ||
    correctAnswers.value.length ||
    0,
)

const accuracy = computed(() => {
  return Math.round(metrics.value?.accuracy ?? 0)
})

/* ---------- Other accepted answers ---------- */

const otherAccepted = computed(() => {
  if (!correctAnswers.value.length || !userAnswers.value.length) return []

  const userSet = new Set(userAnswers.value.map((a) => normalise(a)))

  return correctAnswers.value.filter((c) => !userSet.has(normalise(c)))
})

/* ---------- Labels & micro-copy ---------- */

const heroTitle = computed(() =>
  summary.value.completed ? 'Great Work — You Cracked It.' : 'Nice Run — You Got There.',
)

const shortId = computed(() => {
  const id = summary.value.userId || 'guest'
  return id.slice(0, 8)
})

const dateLabel = computed(() => {
  if (!summary.value.date) return ''
  const d = new Date(summary.value.date)
  if (Number.isNaN(d.getTime())) return summary.value.date
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
})

const timeLabel = computed(() => {
  const t = summary.value.timestamp
  if (!t) return 'today'
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return 'today'
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
})

/* Window / day-part labelling based on windowIndex (2-hour blocks) */
const windowLabel = computed(() => {
  const idx = Number(summary.value.windowIndex || 0)

  if (idx <= 4) return 'Morning check-in'
  if (idx <= 6) return 'Midday check-in'
  if (idx <= 8) return 'Afternoon check-in'
  if (idx <= 10) return 'Evening check-in'
  return 'Daily check-in'
})

const windowShort = computed(() => {
  const idx = Number(summary.value.windowIndex || 0)

  if (idx <= 4) return 'Morning'
  if (idx <= 6) return 'Midday'
  if (idx <= 8) return 'Afternoon'
  if (idx <= 10) return 'Evening'
  return 'Late'
})

const windowMicroCopy = computed(() => {
  switch (windowShort.value) {
    case 'Morning':
      return 'You like starting the day with a puzzle.'
    case 'Midday':
      return 'A solid lunchtime check-in.'
    case 'Afternoon':
      return 'You closed the loop before evening.'
    case 'Evening':
      return 'Last-hour focus still strong.'
    default:
      return 'You solved it towards the end of the cycle.'
  }
})

/* Solve style heuristic based on attempts + hint usage */
const solveStyle = computed(() => {
  const a = summary.value.attemptsUsed || 1
  const hint = !!summary.value.hintUsed

  if (a === 1 && !hint) {
    return {
      label: 'Clean snap',
      copy: 'You saw the pattern almost immediately.',
    }
  }
  if (a === 1 && hint) {
    return {
      label: 'Guided snap',
      copy: 'One attempt with a small nudge along the way.',
    }
  }
  if (a === 2 && !hint) {
    return {
      label: 'Patient adjuster',
      copy: 'You used your first attempt to feel out the space, then corrected cleanly.',
    }
  }
  if (a >= 3 && !hint) {
    return {
      label: 'Stubborn solver',
      copy: 'You kept iterating until everything clicked.',
    }
  }
  return {
    label: 'Exploratory',
    copy: 'You mixed intuition, trial and hints to land the final grid.',
  }
})

const reflectionLines = computed(() => {
  const lines = []

  if (!summary.value.hintUsed) {
    lines.push('Bank this hint-free day as part of your streak.')
  } else {
    lines.push('Notice which part of the hint unlocked the pattern for you.')
  }

  if (summary.value.attemptsUsed <= 1) {
    lines.push('Next time, deliberately think of at least one “unlikely” answer before locking in.')
  } else if (summary.value.attemptsUsed === 2) {
    lines.push('On your first attempt tomorrow, try to cover more “edges” of the concept.')
  } else {
    lines.push('Use the early attempts to map the space, not just re-enter similar guesses.')
  }

  lines.push('Check your Daily Analytics to see how today compares with previous runs.')

  return lines
})

/* ---------- Navigation ---------- */

function goAnalytics() {
  try {
    router.replace({ name: 'Analytics' })
  } catch {
    router.replace('/analytics')
  }
}

function goHome() {
  try {
    router.replace({ name: 'Home' })
  } catch {
    router.replace('/')
  }
}

function goBackToGame() {
  try {
    router.replace({ name: 'Play' })
  } catch {
    router.replace('/')
  }
}
</script>

<style scoped>
.success-shell {
  min-height: 100vh;
  width: 100vw !important;
  max-width: none !important;
  padding-bottom: 96px !important;
  overflow-x: hidden;

  background: radial-gradient(
    circle at top left,
    #f3f5ff 0,
    #eef1ff 32%,
    #f9fbff 60%,
    #ffffff 100%
  );

  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Inter',
    sans-serif;

  color: #0b0c11;

  /* lighter gutters so content breathes */

  box-sizing: border-box;
}

/* HERO */
.hero {
  width: 100vw !important;
  max-width: none !important;

  margin: 0 auto 34px;

  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 34px;
}

.hero-logo img {
  width: 70px;
  height: 70px;
  outline: 1.5px solid #000000;
  cursor: pointer;
}

.hero-kicker {
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.65;
  margin: 0 0 4px;
}

.hero-title {
  font-size: 30px;
  font-weight: 730;
  letter-spacing: -0.02em;
  margin: 0 0 4px;
}

.hero-sub {
  margin: 0 0 12px;
  font-size: 15px;
  opacity: 0.8;
}

.hero-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(12, 15, 28, 0.16);
  background: rgba(255, 255, 255, 0.8);
}

.chip-strong {
  background: #0b0c11;
  color: #fff;
  border-color: #0b0c11;
}

.chip-soft {
  background: rgba(11, 12, 17, 0.06);
}

/* GRID LAYOUT */
.grid {
  width: 100vw !important;
  max-width: none !important;

  margin: 0 auto;

  display: grid;

  /* balanced desktop layout */
  grid-template-columns: minmax(0, 0.58fr) minmax(0, 0.42fr);

  gap: 46px;
}

.column {
  min-width: 0;
}

.answers-column {
  width: 100% !important;
}

.metrics-column {
  width: 80% !important;
}

/* CARDS */
.card {
  background: #ffffff;
  border-radius: 20px;
  padding: 22px 22px 22px;
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.18),
    0 0 0 1px rgba(15, 23, 42, 0.02);
  box-sizing: border-box;
}

.card-main {
  padding: 22px 22px 20px;
}

.card-secondary {
  margin-top: 16px;
  padding-top: 18px;
}

.metrics-hero {
  background: linear-gradient(135deg, #0d0f11, #20232f);
  color: #ffffff;
  padding: 28px 28px 26px;
}

.metrics-grid-card {
  margin-top: 18px;
}

.reflection-card {
  margin-top: 14px;
}

.card-title {
  margin: 0 0 2px;
  font-size: 18px;
  font-weight: 650;
}

.card-title-sm {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 620;
}

.card-sub {
  margin: 0 0 14px;
  font-size: 13px;
  opacity: 0.76;
}

.card-sub-strong {
  font-weight: 600;
  opacity: 0.9;
}

.empty-copy {
  margin: 12px 0 0;
  font-size: 14px;
  opacity: 0.8;
}

/* PILLS */
.pill-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pill {
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 14px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.pill-dark {
  background: #0b0c11;
  color: #ffffff;
  justify-content: space-between;
}

.pill-light {
  background: #ffffff;
  border: 1.5px solid #111318;
  color: #111318;
  justify-content: center;
}

.pill-index {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.7;
  margin-right: 10px;
}

.pill-text {
  flex: 1;
  text-align: center;
}

.pill-stack-dark {
  background: #f4f5ff;
  padding: 12px 10px;
  border-radius: 16px;
}

.pill-stack-light {
  margin-top: 8px;
}

/* METRICS */
.metrics-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 6px;
}

.metric {
  background: rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  padding: 14px 16px 13px;
  box-sizing: border-box;
}

.metrics-hero .metric {
  background: rgba(15, 23, 42, 0.58);
}

.metric-big {
  text-align: left;
}

.metric-label {
  font-size: 11px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  opacity: 0.7;
  margin: 0 0 4px;
}

.metric-value-lg {
  margin: 0;
  font-size: 26px;
  font-weight: 720;
}

.metric-unit {
  font-size: 16px;
  margin-left: 2px;
  opacity: 0.8;
}

.metric-footnote {
  margin: 3px 0 0;
  font-size: 11px;
  opacity: 0.78;
}

.metric-value {
  margin: 2px 0 0;
  font-size: 17px;
  font-weight: 620;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

/* REFLECTION */
.reflection-list {
  margin: 4px 0 14px 18px;
  padding: 0;
  font-size: 13px;
  opacity: 0.9;
}

.reflection-list li + li {
  margin-top: 4px;
}

/* BUTTONS */
.cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
}

.btn {
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  border: 1.5px solid #0b0c11;
  cursor: pointer;
}

.btn-primary {
  background: #0b0c11;
  color: #ffffff;
}

/* RESPONSIVE */
@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    row-gap: 16px;
  }

  .hero-logo {
    justify-self: flex-start;
  }

  .grid {
    grid-template-columns: 1fr 0.9fr;
  }
}

@media (max-width: 600px) {
  .success-shell {
    padding: 22px 16px 30px;
  }

  .hero-title {
    font-size: 24px;
  }

  .metrics-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .metrics-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
.success-shell > * {
  max-width: none !important;
}

/* ============================================================
   SUCCESS SUMMARY — MOBILE REFLOW
============================================================ */
@media (max-width: 600px) {
  /* ROOT */
  .success-shell {
    padding: 20px 0px 0px;
  }

  /* HERO */
  .hero {
    grid-template-columns: auto 1fr !important;
    align-items: flex-start !important;
    gap: 12px;
  }
  .hero-title {
    font-size: 22px;
  }

  .hero-logo {
    margin-top: 14px;
    outline: 0.1px;
  }

  .hero-logo img {
    width: 50px;
    height: 50px;
  }

  .hero-copy {
    display: flex;
    flex-direction: column;
  }

  .hero-kicker {
    font-size: 11px;
  }

  .hero-sub {
    font-size: 13px;
  }

  /* =====================================================
     MAIN GRID → SINGLE COLUMN
  ===================================================== */

  .grid {
    grid-template-columns: 1fr !important;
    max-width: 500px;
    gap: 12px;
  }

  .metrics-column {
    width: 82% !important;
  }

  .answers-column {
    max-width: 82%;
  }

  /* =====================================================
     ANSWERS + OTHER ACCEPTED → FULL WIDTH
  ===================================================== */

  .answers-column {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* =====================================================
     TODAY’S BRAINPRINT → FULL WIDTH
  ===================================================== */

  .metrics-hero {
    padding: 12px;
  }

  .metrics-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .metrics-hero {
    background: linear-gradient(270deg, #0d0f11, #20232f);
    color: #ffffff;
    padding: 0px 0px 0px;
  }

  /* =====================================================
     MINI METRICS → 2 x 2 GRID
  ===================================================== */

  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .metrics-grid-card {
    padding: 10px;
  }

  /* =====================================================
     REFLECTION → FULL WIDTH
  ===================================================== */

  .reflection-card {
    margin-top: 8px;
  }

  /* =====================================================
     CARDS → TIGHTER HEIGHT / BETTER TYPE
  ===================================================== */

  .card {
    padding: 12px;
  }

  .card-title {
    font-size: 16px;
  }

  .card-title-sm {
    font-size: 14px;
  }

  .card-sub {
    font-size: 13px;
  }

  /* =====================================================
     PILLS / ANSWERS
  ===================================================== */

  .pill {
    font-size: 14px;
    padding: 14px 14px;
  }

  .pill-stack-dark {
    padding: 12px;
  }

  /* =====================================================
     METRIC VALUES SCALE DOWN SLIGHTLY
  ===================================================== */

  .metric-value-lg {
    font-size: 22px;
  }

  .metric-value {
    font-size: 16px;
  }

  /* =====================================================
     SAFE BOTTOM SCROLL SPACE
  ===================================================== */

  .success-shell::after {
    content: '';
    display: block;
  }
}

@supports (-webkit-touch-callout: none) {
  .hero-logo {
    margin-top: 16px;
  }
}
</style>
