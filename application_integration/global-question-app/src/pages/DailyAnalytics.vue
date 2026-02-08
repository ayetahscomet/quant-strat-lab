<template>
  <div class="analytics-wrapper" :class="{ loading: isLoading }">
    <!-- ==========================
         🖤 LEFT — PERSONAL (42%)
    =========================== -->
    <section class="left-pane">
      <header class="left-header">
        <img src="/logo-800-full.svg" class="brand-logo" @click="goHome" />
        <div class="title-stack">
          <h1 class="title">Daily Analytics</h1>
          <p class="sub">{{ personalSubline }}</p>
        </div>
      </header>

      <!-- Hero -->
      <div class="hero-box" v-if="personalReady">
        <h2 class="hero-line">{{ heroHeadline }}</h2>
        <p class="hero-sub">{{ heroDescription }}</p>

        <div class="hero-pill-row">
          <span class="pill" v-if="personal.countryName">🌍 {{ personal.countryName }}</span>
          <span class="pill" v-if="typeof personal.attemptsTotal === 'number'">
            🎯 {{ personal.attemptsTotal }} attempt{{ personal.attemptsTotal === 1 ? '' : 's' }}
          </span>
          <span class="pill" v-if="typeof personal.hintsUsed === 'number'">
            💡 {{ personal.hintsUsed }} hint{{ personal.hintsUsed === 1 ? '' : 's' }}
          </span>
          <span class="pill" v-if="typeof personal.uniqueCorrect === 'number'">
            ✅ {{ Math.min(personal.uniqueCorrect, personal.totalSlots) }}/{{ personal.totalSlots }}
            found
          </span>
        </div>
      </div>

      <!-- Primary visuals (always 3) -->
      <div class="primary-stats-grid" v-if="personalReady">
        <div class="stat-card completion-card">
          <p class="stat-label">Completion</p>

          <div class="stat-row">
            <div class="ring-stack">
              <canvas ref="completionRing"></canvas>
              <span class="ring-center">{{ displayCompletion }}%</span>
            </div>

            <div class="stat-copy">
              <p class="stat-foot">{{ completionFoot }}</p>
            </div>
          </div>
        </div>

        <div class="stat-card accuracy-card">
          <p class="stat-label">Accuracy</p>

          <div class="stat-row">
            <div class="ring-stack">
              <canvas ref="accuracyRing"></canvas>
              <span class="ring-center">{{ displayAccuracy }}%</span>
            </div>

            <div class="stat-copy">
              <p class="stat-foot">{{ accuracyFoot }}</p>
            </div>
          </div>
        </div>

        <div class="stat-card pace-card">
          <p class="stat-label">Pace</p>

          <div class="stat-row">
            <div class="ring-stack">
              <canvas ref="speedRing"></canvas>
              <span class="ring-center">
                {{
                  typeof personal.pacePercentile === 'number' && personal.pacePercentile > 5
                    ? displaySpeed + '%'
                    : personal.paceSeconds
                      ? Math.max(1, Math.round(personal.paceSeconds / 60)) + 'm'
                      : '—'
                }}
              </span>
            </div>

            <div class="stat-copy">
              <p class="stat-foot">{{ speedFoot }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- PERSONAL DYNAMIC AREA (2 cards + 1 chart) -->
      <div class="personal-dynamics" v-if="personalReady">
        <div class="personal-card" v-for="card in personalCards" :key="card.id">
          <p class="card-kicker">{{ card.kicker }}</p>
          <h3 class="card-title">{{ card.title }}</h3>
          <p class="card-body">{{ card.body }}</p>
          <div class="card-mini" v-if="card.mini">
            <span class="mini-big">{{ card.mini.big }}</span>
            <span class="mini-sub">{{ card.mini.sub }}</span>
          </div>
        </div>

        <div class="chart-dynamic personal-chart">
          <div class="chart-head">
            <span class="chart-tag">{{ personalChartBlock.tag }}</span>
            <span class="chart-title">{{ personalChartBlock.title }}</span>
          </div>
          <canvas ref="personalChartCanvas"></canvas>
          <p class="chart-caption">{{ personalChartBlock.caption }}</p>
        </div>
      </div>

      <div class="left-footer" v-if="personalReady">
        <button class="cta" @click="goHome">Back to Akinto</button>
        <p class="micro-note">This page locks for the day. Tomorrow tells a new story.</p>
      </div>

      <div class="left-skeleton" v-else>
        <div class="sk-line w60" />
        <div class="sk-line w40" />
        <div class="sk-box" />
        <div class="sk-grid">
          <div class="sk-card" />
          <div class="sk-card" />
          <div class="sk-card" />
        </div>
        <div class="sk-box tall" />
      </div>
    </section>

    <!-- ==========================
         🤍 RIGHT — GLOBAL (58%)
    =========================== -->
    <section class="right-pane">
      <header class="right-header">
        <div class="global-title-wrap">
          <h2 class="g-title">The Global Mind.</h2>
          <p class="g-sub">{{ globalSubline }}</p>
        </div>
        <button class="share-btn" @click="copyShareText" :disabled="!personalReady">
          {{ shareBtnLabel }}
        </button>
      </header>

      <!-- Procedural “front page” -->
      <div class="global-grid" v-if="personalReady">
        <article
          v-for="block in globalBlocks"
          :key="block.id"
          class="g-block"
          :class="['tier-' + block.tier, 'shape-' + block.shape]"
          :style="blockStyle(block)"
        >
          <div class="g-inner">
            <p class="g-kicker">{{ block.kicker }}</p>
            <h3 class="g-head">{{ block.title }}</h3>
            <p class="g-body" v-if="block.body">{{ block.body }}</p>

            <!-- Mini numeric -->
            <div v-if="block.mini" class="g-mini">
              <div class="g-mini-big">{{ block.mini.big }}</div>
              <div class="g-mini-sub">{{ block.mini.sub }}</div>
            </div>

            <!-- Table (leaderboard / comparisons) -->
            <div v-if="block.table" class="g-table">
              <div class="g-table-row g-table-head">
                <span>{{ block.table.head[0] }}</span>
                <span>{{ block.table.head[1] }}</span>
              </div>
              <div class="g-table-row" v-for="(r, i) in block.table.rows" :key="i">
                <span class="g-table-left">{{ r[0] }}</span>
                <span class="g-table-right">{{ r[1] }}</span>
              </div>
            </div>

            <!-- Mini chart -->
            <div v-if="block.chart" class="g-chart" :class="block.chart.size || 'sm'">
              <canvas :ref="(el) => registerGlobalChartRef(el, block.id)"></canvas>
            </div>

            <p v-if="block.caption" class="g-caption">{{ block.caption }}</p>
          </div>
        </article>
      </div>

      <div class="right-footer" v-if="personalReady">
        <p class="rotation-note">Views refresh daily. Tomorrow tells a new story.</p>
        <div class="brand-tag">A game of Common Knowledge.</div>
      </div>

      <div class="right-skeleton" v-else>
        <div class="sk-right-title" />
        <div class="sk-right-sub" />
        <div class="sk-right-grid">
          <div class="sk-right-block" v-for="i in 10" :key="i" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
/* ======================================================
   DailyAnalytics.vue — Akinto “Front Page” Analytics
   - Uses server endpoints (no Airtable tokens in client)
   - Deterministic daily randomness (seeded) for layout + copy
   - Personal: 2 cards + 3 rings + 1 rotating chart
   - Global: ~10 mixed blocks (text, mini stats, leaderboards, mini charts)
====================================================== */

import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Chart from 'chart.js/auto'
import { countries } from '@/data/countries.js'
import { getTimezone, todayKey } from '../utils/windows.js'

const COUNTRY_MAP = Object.fromEntries(countries.map((c) => [c.code.toLowerCase(), c.name]))

function countryNameFromCode(code) {
  if (!code) return null
  return COUNTRY_MAP[String(code).toLowerCase()] || code
}

const countryMap = Object.fromEntries(countries.map((c) => [c.code.toLowerCase(), c.name]))

function countryName(code) {
  return countryMap[code?.toLowerCase()] || code
}

/* =========================
   ROUTING
========================= */
const router = useRouter()
function goHome() {
  router.push('/')
}

/* =========================
   BRAND / COLOURS
========================= */
const COLORS = {
  blue: '#4B7BFF',
  gold: '#FFCC4D',
  green: '#21D59B',
  orange: '#FF884D',
  royal: '#2431A3',
  lilac: '#A89BFF',
  pink: '#F76CBC',
  cream: '#FFF9E5',
  dark: '#0D0F11',
  ink: '#1A1D22',
  slate: '#14181D',
}

/* =========================
   HELPERS: stable RNG per day
========================= */
function hashStringToInt(str) {
  // simple, fast, deterministic
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}
function shuffleInPlace(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}
function pct(n) {
  if (!isFinite(n)) return 0
  return clamp(Math.round(n), 0, 100)
}
function normalise(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function normaliseAirtablePercent(x) {
  // Airtable "Percent" fields are often stored as:
  // - 0.33 (shown as 33%)
  // - OR accidentally stored as 3.33 (shown as 333%)
  // - OR 9 (shown as 900%)
  // We normalise to 0–100 scale for the UI.
  if (x === null || x === undefined) return null
  let n = Number(x)
  if (!isFinite(n)) return null

  // if it's a fraction (0–1), convert to 0–100
  if (n > 0 && n <= 1) n = n * 100

  // if it's "too big", scale down by 10 until it fits
  while (n > 100) n = n / 10

  return n
}

function countryDisplay(codeOrName) {
  const raw = String(codeOrName || '').trim()
  if (!raw) return '—'

  const lower = raw.toLowerCase()

  // If it's a 2-letter code (gb, af, etc), map to full name
  if (/^[a-z]{2}$/.test(lower)) {
    return countries.find((c) => String(c.code || '').toLowerCase() === lower)?.name || raw
  }

  // Already a name
  return raw
}

/* =========================
   USER + DATE CONTEXT
========================= */
function getOrCreateUUID() {
  // ✅ single source of truth across the whole app
  let id = localStorage.getItem('akinto_user_id')

  // Backwards-compat: if an old key exists, migrate it once
  if (!id) {
    const legacy = localStorage.getItem('akinto_uuid')
    if (legacy) {
      id = legacy
      localStorage.setItem('akinto_user_id', legacy)
    }
  }

  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('akinto_user_id', id)
  }

  return id
}

const tz = ref(getTimezone())
const dateKeyRef = ref(todayKey('Europe/London'))

const userId = getOrCreateUUID()
const userCountryCode = (localStorage.getItem('akinto_country') || 'XX').toLowerCase()

/* =========================
   STATE
========================= */
const isLoading = ref(true)
const personalReady = ref(false)

const personal = ref({
  // from UserDailyProfile (+ Questions for answerCount / correct answers if you want)
  dateKey: dateKeyRef.value,
  userId,
  countryCode: userCountryCode,
  countryName,

  // question meta (optional but used by your UI pills)
  totalSlots: 0, // answer count needed for the day
  correctAnswers: [], // canonical answer list (optional)

  // personal metrics (UserDailyProfile)
  attemptsTotal: 0, // AttemptsUsed
  hintsUsed: 0, // HintCount
  uniqueCorrect: 0, // DistinctAnswers (or correct count if you store it)
  rareAnswers: 0, // RareAnswers
  completion: 0, // Completion (0–100)
  accuracy: 0, // Accuracy (0–100)
  paceSeconds: null, // SolveSeconds
  pacePercentile: null, // PercentileSpeed
  accuracyPercentile: null, // PercentileAccuracy

  // optional classifications
  archetype: null,
  streakContinues: null,
  firstSolveToday: null,

  // outcome (you can map if you store it; else keep "unknown")
  dayResult: 'unknown',
})

const global = ref({
  // from /api/load-global-analytics (if you implement)
  totalPlayers: null,
  totalAttempts: null,
  avgCompletion: null,
  avgAccuracy: null,
  countryLeaderboard: [], // [ { name, value } ]
  speedPercentiles: null,
  yourCountryRank: null,
  yourCountryAvgCompletion: null,
  globalStreak: null, // optional
})

/* =========================
   COPY: sublines + dynamic text
   (seeded so refresh doesn't change)
========================= */
const personalSubline = ref('')
const globalSubline = ref('')

const PERSONAL_SUBLINES = [
  'How today felt, backed by data.',
  'Your performance — but visualised.',
  'A data-shaped memory of today.',
  'How you moved through the puzzle.',
  'Today, translated into patterns.',
  'Where you accelerated — where you paused.',
  'Your thinking style, made measurable.',
  'A trace of today’s decisions.',
  'Your daily brainprint.',
  'The receipts for today’s guesses.',
]

const GLOBAL_SUBLINES = [
  'Where you sat in the worldwide landscape.',
  'You + the world = today’s outcome.',
  'How today’s question unfolded across borders.',
  'A global snapshot of common knowledge.',
  'The world answered. You answered. Here’s the contrast.',
  'Today in context — not isolation.',
  'A world map of decision-making.',
  'The global pulse of the puzzle.',
  'Across time zones, one question.',
  'Today’s collective brain.',
]

/* =========================
   HERO COPY (personal)
========================= */
const heroHeadline = ref('')
const heroDescription = ref('')
const completionFoot = ref('')
const accuracyFoot = ref('')
const speedFoot = ref('')

function buildHeroCopy(rng) {
  const p = personal.value

  // headline by outcome + completion
  const c = p.completion
  const a = p.accuracy
  const result = p.dayResult || 'unknown'

  const headlinePools = {
    perfect: ['Perfect day.', 'Clean sweep.', 'No notes.', 'Flawless run.'],
    strong: ['High-precision session.', 'Sharp work.', 'Confident run.', 'Solid execution.'],
    mid: ['Curious exploration.', 'Close enough to taste it.', 'Nearly there.', 'Good chaos.'],
    low: [
      'Chaos gremlin energy.',
      'Bold guesses, loud brain.',
      'Wild ride.',
      'Experimental science.',
    ],
  }

  const tier = c === 100 ? 'perfect' : c >= 80 ? 'strong' : c >= 55 ? 'mid' : 'low'
  heroHeadline.value = pick(rng, headlinePools[tier])

  const paceLine =
    typeof p.pacePercentile === 'number'
      ? `Pace: top ${pct(p.pacePercentile)}%.`
      : p.paceSeconds
        ? `${Math.max(1, Math.round(p.paceSeconds / 60))} min to solve today.`
        : 'Pace: still calibrating.'

  const outcomeLine =
    result === 'success'
      ? 'You finished the day.'
      : result === 'exit-early'
        ? 'You tapped out early — self-care is strategy.'
        : result === 'lockout'
          ? 'You ran out of attempts in at least one window.'
          : 'Today’s session is logged.'

  heroDescription.value = `${outcomeLine} ${paceLine}`

  // feet for the three big cards
  const required = p.totalSlots || 0
  const possible = p._totalPossible || required
  const foundTowardCompletion = Math.min(p.uniqueCorrect, required)

  completionFoot.value =
    required > 0 && foundTowardCompletion >= required
      ? `All required answers found. (${Math.min(p.uniqueCorrect, required)}/${required} today.)`
      : required > 0
        ? `${Math.min(p.uniqueCorrect, required)}/${required} found today.`
        : `Completion is still calibrating for this question.`

  accuracyFoot.value =
    p.submittedUnique > 0
      ? `${p.uniqueCorrect} correct out of ${p.submittedUnique} unique submissions.`
      : 'Submission breakdown is still syncing — check back in a moment.'

  speedFoot.value =
    typeof p.pacePercentile === 'number' && p.pacePercentile > 5
      ? `Faster than ${pct(p.pacePercentile)}% of players today.`
      : p.paceSeconds
        ? `Solve time: ${Math.max(1, Math.round(p.paceSeconds / 60))} minute(s). Percentile appears once enough players exist.`
        : 'Pace is still syncing — check back shortly.'

  if (p.archetype) {
    heroDescription.value += ` Archetype: ${p.archetype}.`
  }

  if (p.firstSolveToday) {
    heroDescription.value += ` New personal streak record.`
  }
}

/* =========================
   PERSONAL “cards” generator (2 cards / day)
   - 50 template variations (with logic)
========================= */
function buildPersonalCards(rng) {
  const p = personal.value

  const countryWelcome =
    p.countryName && global.value.totalPlayers && global.value.totalPlayers <= 50
      ? `Welcome to the early club.`
      : null

  const templates = [
    // 1–10: completion/accuracy mood
    () => ({
      kicker: 'Your style today',
      title:
        p.completion === 100
          ? 'Completion merchant.'
          : p.completion >= 80
            ? 'You don’t leave much behind.'
            : p.completion >= 55
              ? 'Selective, but with intent.'
              : 'Maximum chaos, minimal regrets.',
      body:
        p.completion === 100
          ? 'Full grid solved. That’s rare behaviour.'
          : `You found ${p.uniqueCorrect}/${p.totalSlots}. Tomorrow, we tighten the screws.`,
      mini: { big: `${pct(p.completion)}%`, sub: 'Completion' },
    }),
    () => ({
      kicker: 'Accuracy check',
      title:
        p.accuracy >= 85
          ? 'Sniper energy.'
          : p.accuracy >= 70
            ? 'Steady hands.'
            : p.accuracy >= 55
              ? 'Risk-on guesses.'
              : 'You were auditioning answers.',
      body:
        p.submittedUnique > 0
          ? `${p.uniqueCorrect} correct from ${p.submittedUnique} unique submissions. Duplicates removed.`
          : 'No submissions recorded — we’ll call this a silent day.',
      mini: { big: `${pct(p.accuracy)}%`, sub: 'Accuracy' },
    }),

    // 11–20: hints + attempts
    () => ({
      kicker: 'Hint economy',
      title:
        p.hintsUsed === 0
          ? 'No hints needed.'
          : p.hintsUsed === 1
            ? 'One hint. Surgical.'
            : p.hintsUsed <= 3
              ? 'Hints used tastefully.'
              : 'You squeezed the hint lemon.',
      body:
        p.hintsUsed === 0
          ? 'Raw knowledge, no scaffolding.'
          : `Hints used: ${p.hintsUsed}. Still counts. Still valid.`,
      mini: { big: `${p.hintsUsed}`, sub: 'Hints today' },
    }),
    () => ({
      kicker: 'Attempts',
      title:
        p.attemptsTotal <= 2
          ? 'Low attempt, high conviction.'
          : p.attemptsTotal <= 5
            ? 'You iterated like a scientist.'
            : 'You stress-tested every window.',
      body: `Attempts logged today: ${p.attemptsTotal}. Windows played: ${p.windowsPlayed}.`,
      mini: { big: `${p.attemptsTotal}`, sub: 'Attempts' },
    }),

    // 21–30: country + vibe
    () => ({
      kicker: 'Passport check',
      title: p.countryName ? `Hello, ${p.countryName}.` : 'Hello, traveller.',
      body: p.countryName
        ? countryWelcome
          ? `Your country’s on the board. ${countryWelcome}`
          : `Your stats will start shaping ${p.countryName}’s fingerprint over time.`
        : 'Set your country to unlock extra global comparisons.',
      mini: p.countryName ? { big: p.countryName, sub: 'Country' } : null,
    }),
    () => ({
      kicker: 'Duplicates',
      title:
        p.duplicatePenalty === 0
          ? 'No duplicates.'
          : p.duplicatePenalty <= 2
            ? 'Minor repeats.'
            : 'You kept circling the same idea.',
      body:
        p.duplicatePenalty === 0
          ? 'Every submission was distinct. Good discipline.'
          : `Duplicates removed: ${p.duplicatePenalty}. (Still counts as effort.)`,
      mini: { big: `${p.duplicatePenalty}`, sub: 'Duplicates' },
    }),

    // 31–40: pace / percentile
    () => ({
      kicker: 'Pace',
      title:
        typeof p.pacePercentile === 'number'
          ? p.pacePercentile >= 90
            ? 'Blink-and-you-miss-it speed.'
            : p.pacePercentile >= 70
              ? 'Quick thinker.'
              : p.pacePercentile >= 50
                ? 'Comfortable pace.'
                : 'Slow-cooked answers.'
          : p.paceSeconds
            ? 'Time signature.'
            : 'Timing calibrating…',
      body:
        typeof p.pacePercentile === 'number'
          ? `You were faster than ${pct(p.pacePercentile)}% of players today.`
          : p.paceSeconds
            ? `You moved from first to last action in ~${Math.max(
                1,
                Math.round(p.paceSeconds / 60),
              )} minutes.`
            : 'We’ll show a percentile once enough players exist today.',
      mini: {
        big:
          typeof p.pacePercentile === 'number'
            ? `${pct(p.pacePercentile)}%`
            : p.paceSeconds
              ? `${Math.max(1, Math.round(p.paceSeconds / 60))}m`
              : '—',
        sub: 'Pace',
      },
    }),
    () => ({
      kicker: 'Outcome',
      title:
        p.dayResult === 'success'
          ? 'You cleared the day.'
          : p.dayResult === 'exit-early'
            ? 'You chose peace.'
            : p.dayResult === 'lockout'
              ? 'Window locked.'
              : 'Logged.',
      body:
        p.dayResult === 'success'
          ? 'Daily finish secured. Come back tomorrow for a new question.'
          : p.dayResult === 'exit-early'
            ? 'Ending early still stamps the day. Tomorrow is a reset.'
            : p.dayResult === 'lockout'
              ? 'You hit a window cap. The timer is the boss now.'
              : 'We’ve recorded your session.',
      mini: null,
    }),

    // 41–50: playful “thinking like X” without hard stereotypes
    () => ({
      kicker: 'Vibe check',
      title: 'Ah — thinking like a strategist.',
      body:
        p.accuracy >= 80 && p.completion < 80
          ? 'High precision, selective coverage. You prioritise hits over volume.'
          : p.completion >= 80 && p.accuracy < 70
            ? 'High coverage, risk-on. You like to fill the board and refine later.'
            : 'Balanced chaos. Which is… a valid lifestyle choice.',
      mini: null,
    }),
    () => ({
      kicker: 'Micro-flex',
      title: p.hintsUsed === 0 ? 'No training wheels.' : 'Training wheels used responsibly.',
      body:
        p.hintsUsed === 0
          ? 'You went raw. That’s either genius or stubbornness. Often both.'
          : 'Hints are information, not weakness. You’re just… optimising.',
      mini: null,
    }),
    () => ({
      kicker: 'Signal',
      title: 'Your answers had a signature.',
      body:
        p.duplicatePenalty === 0
          ? 'Distinct submissions suggest strong recall rather than guess loops.'
          : 'Repeats suggest a strong anchor. Tomorrow: diversify earlier.',
      mini: null,
    }),
    () => ({
      kicker: 'Daily note',
      title: 'Tomorrow’s you will be dangerous.',
      body:
        p.completion < 80
          ? 'You’ve already seen the question pattern. Next run should be sharper.'
          : 'You’re building momentum. Keep the streak alive.',
      mini: null,
    }),
  ]

  // pick 2 unique templates
  const pool = templates.map((fn, idx) => ({ idx, fn }))
  shuffleInPlace(rng, pool)

  const out = []
  for (const t of pool) {
    const card = t.fn()
    // drop null minis cleanly
    out.push({
      id: `pc_${t.idx}`,
      kicker: card.kicker,
      title: card.title,
      body: card.body,
      mini: card.mini || null,
    })
    if (out.length === 2) break
  }

  return out
}

const personalCards = ref([])

/* =========================
   CHARTS: refs + instances
========================= */
const completionRing = ref(null)
const accuracyRing = ref(null)
const speedRing = ref(null)
const personalChartCanvas = ref(null)

const globalChartRefs = ref(new Map()) // blockId -> canvas element
function registerGlobalChartRef(el, blockId) {
  if (!el) return
  globalChartRefs.value.set(blockId, el)
}

let chartInstances = []
function destroyCharts() {
  chartInstances.forEach((c) => {
    try {
      c.destroy()
    } catch {}
  })
  chartInstances = []
}

function makeDoughnut(ctx, valuePct, fg, bg) {
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [
        {
          data: [clamp(valuePct, 0, 100), 100 - clamp(valuePct, 0, 100)],
          backgroundColor: [fg, bg || 'rgba(0,0,0,0.18)'],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%', // <-- THICKER ring
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
    },
  })
}

function makeMiniBar(ctx, labels, data, color) {
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: color,
          borderRadius: 10,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false, grid: { display: false } },
        y: { display: false, grid: { display: false }, beginAtZero: true },
      },
    },
  })
}

function makeMiniLine(ctx, labels, data, color) {
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          data,
          borderColor: color,
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false, grid: { display: false } },
        y: { display: false, grid: { display: false } },
      },
    },
  })
}

function makeMiniDoughnut(ctx, data, colors) {
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  })
}

/* =========================
   PERSONAL DYNAMIC CHART (10 types)
========================= */
const personalChartBlock = ref({ tag: '', title: '', caption: '', type: 'line' })

function buildPersonalChart(rng) {
  const p = personal.value

  const options = [
    {
      tag: 'Pattern',
      title: 'Coverage vs Precision',
      caption: 'Completion and accuracy aren’t the same thing. Today shows your mix.',
      render(ctx) {
        return new Chart(ctx, {
          type: 'radar',
          data: {
            labels: ['Completion', 'Accuracy', 'Pace', 'Discipline'],
            datasets: [
              {
                data: [
                  pct(p.completion),
                  pct(p.accuracy),
                  typeof p.pacePercentile === 'number' ? pct(p.pacePercentile) : 55,
                  p.duplicatePenalty === 0 ? 85 : clamp(85 - p.duplicatePenalty * 10, 20, 85),
                ],
                backgroundColor: 'rgba(75,123,255,0.18)',
                borderColor: COLORS.blue,
                borderWidth: 2,
                pointRadius: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: true } },
            scales: { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.08)' } } },
          },
        })
      },
    },
    {
      tag: 'Attempts',
      title: 'Attempts by Window (shape)',
      caption: 'Windows you played today. (Calibrates as data grows.)',
      render(ctx) {
        const perWindow = personal.value._attemptsByWindow || {}
        const labels = Object.keys(perWindow).length
          ? Object.keys(perWindow)
          : ['mid', 'midday', 'last']
        const data = labels.map((k) => perWindow[k] || 0)
        return new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                data,
                backgroundColor: COLORS.lilac,
                borderRadius: 10,
                borderSkipped: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.75)' } },
              y: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { precision: 0 } },
            },
          },
        })
      },
    },
    {
      tag: 'Accuracy',
      title: 'Correct vs Incorrect (unique)',
      caption: 'Duplicates removed so this reflects distinct knowledge attempts.',
      render(ctx) {
        const correct = p.uniqueCorrect
        const incorrect = Math.max(0, p.submittedUnique - correct)
        return new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Correct', 'Incorrect'],
            datasets: [
              {
                data: [correct, incorrect],
                backgroundColor: [COLORS.green, COLORS.pink],
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: { legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.7)' } } },
          },
        })
      },
    },
    {
      tag: 'Tempo',
      title: 'Move rhythm (synthetic)',
      caption: 'Until we store per-input timestamps, this is a stylised trace.',
      render(ctx) {
        const base = typeof p.pacePercentile === 'number' ? pct(p.pacePercentile) : 55
        const curve = [base - 20, base - 10, base, base + 6, base + 2].map((x) => clamp(x, 5, 98))
        return makeMiniLine(ctx, ['A', 'B', 'C', 'D', 'E'], curve, COLORS.orange)
      },
    },
    {
      tag: 'Discipline',
      title: 'Duplicate drift',
      caption: 'Repeats are normal — but fewer repeats usually means stronger recall.',
      render(ctx) {
        const d = p.duplicatePenalty
        const score = d === 0 ? 90 : clamp(90 - d * 14, 10, 90)
        return makeMiniBar(ctx, ['Score'], [score], COLORS.gold)
      },
    },
  ]

  const chosen = pick(rng, options)
  personalChartBlock.value = { tag: chosen.tag, title: chosen.title, caption: chosen.caption }
  return chosen
}

/* =========================
   GLOBAL BLOCKS (front page)
========================= */
const globalBlocks = ref([])

/**
 * Block tier & shape control (CSS grid):
 * - tier: hero | major | minor | ticker | badge
 * - shape: wide | tall | square | slim
 */
function buildGlobalBlocks(rng) {
  const p = personal.value
  const g = global.value

  const usedTopics = new Set()
  const usedTitles = new Set()

  // Helpers for friendly fallback strings
  const totalPlayers = typeof g.totalPlayers === 'number' ? g.totalPlayers : null
  const countryRank =
    typeof g.yourCountryRank === 'number' ? `#${g.yourCountryRank}` : totalPlayers ? '—' : '—'

  const countryLabel = p.countryName || 'your country'

  // “50-ish” templated headlines — we generate more via patterns
  const baseTemplates = [
    () => ({
      kicker: 'Global',
      title: 'Today’s completion climate',
      body:
        typeof g.avgCompletion === 'number'
          ? `Average completion worldwide: ${pct(g.avgCompletion)}%.`
          : `Processing today’s global totals…`,
      tier: 'hero',
      shape: 'wide',
      mini:
        typeof g.avgCompletion === 'number'
          ? { big: `${pct(g.avgCompletion)}%`, sub: 'Avg completion' }
          : null,
      chart: {
        type: 'line',
        color: COLORS.blue,
        data: [
          pct(g.avgCompletion ?? 62),
          pct(g.avgCompletion ?? 62) + 6,
          pct(g.avgCompletion ?? 62) - 4,
        ],
        caption: 'World trend (stylised)',
      },
      caption: 'A daily headline — not a spreadsheet.',
    }),

    () => ({
      kicker: 'Today',
      title: personal.value.firstSolveToday
        ? 'You broke new ground.'
        : personal.value.streakContinues
          ? 'Streak maintained.'
          : 'Another data point logged.',
      body: personal.value.rareAnswers
        ? (() => {
            const list = Array.isArray(personal.value.rareAnswersList)
              ? personal.value.rareAnswersList
              : []
            return list.length
              ? `Rare finds: ${list.slice(0, 6).join(', ')}.`
              : `You found ${personal.value.rareAnswers} rare answer${
                  personal.value.rareAnswers === 1 ? '' : 's'
                }. That’s alpha.`
          })()
        : personal.value.duplicatePenalty === 0
          ? 'Every submission was unique — clean work.'
          : `Duplicates cropped up ${personal.value.duplicatePenalty} times.`,
      tier: 'minor',
      shape: 'square',
    }),

    () => ({
      kicker: 'Your Country',
      title: p.countryName ? `${p.countryName} on the board` : 'Set your country to unlock this',
      body:
        p.countryName && typeof g.yourCountryAvgCompletion === 'number'
          ? `Average completion in ${p.countryName}: ${pct(g.yourCountryAvgCompletion)}%.`
          : p.countryName
            ? `Processing today’s ${p.countryName} totals…`
            : 'Set your country to unlock this comparison.',

      tier: 'major',
      shape: 'tall',
      mini:
        p.countryName && typeof g.yourCountryAvgCompletion === 'number'
          ? { big: `${pct(g.yourCountryAvgCompletion)}%`, sub: `${p.countryName} avg` }
          : null,
      table:
        Array.isArray(g.countryLeaderboard) && g.countryLeaderboard.length
          ? {
              head: ['Country', 'Avg'],
              rows: g.countryLeaderboard
                .slice(0, 5)
                .map((x) => [countryDisplay(x.country ?? x.name), `${pct(x.value)}%`]),
            }
          : null,
      caption: p.countryName ? `Rank: ${countryRank}` : '',
    }),

    () => ({
      topic: 'pace',
      kicker: 'Speed',
      title:
        typeof p.pacePercentile === 'number'
          ? `You outran ${pct(p.pacePercentile)}% today`
          : 'Speed percentile loading…',
      body:
        typeof p.pacePercentile === 'number'
          ? 'Quick thinking shows up as fewer “stall” loops.'
          : 'Once the daily player pool grows, you’ll get a percentile.',
      tier: 'minor',
      shape: 'square',
      mini: {
        big: typeof p.pacePercentile === 'number' ? `${pct(p.pacePercentile)}%` : '—',
        sub: 'Pace',
      },
      chart: {
        type: 'bar',
        color: COLORS.green,
        data: [pct(p.pacePercentile ?? 55), 100 - pct(p.pacePercentile ?? 55)],
        caption: 'You vs rest (stylised)',
      },
      caption: 'Speed isn’t everything. But it is funny.',
    }),

    () => ({
      kicker: 'Accuracy',
      title: p.accuracy >= 85 ? 'Global-grade precision' : 'Your accuracy footprint',
      body:
        typeof g.avgAccuracy === 'number' && g.totalPlayers > 5
          ? `World average accuracy: ${pct(g.avgAccuracy)}%. You: ${pct(p.accuracy)}%.`
          : `We’re still waiting on your peers to catch up — global accuracy will firm up soon.`,

      tier: 'major',
      shape: 'wide',
      mini: { big: `${pct(p.accuracy)}%`, sub: 'You' },
      chart: {
        type: 'line',
        color: COLORS.orange,
        data: [pct(g.avgAccuracy ?? 66), pct(p.accuracy), pct(g.avgAccuracy ?? 66)],
        caption: 'World → You → World',
      },
      caption: 'Accuracy compares cleanly across countries.',
    }),

    () => ({
      kicker: 'Cheeky',
      title: 'Thinking like a…',
      body:
        p.completion >= 80 && p.accuracy < 70
          ? 'Board-filler. High coverage, higher risk. Respect.'
          : p.accuracy >= 80 && p.completion < 80
            ? 'Selective sniper. Low volume, high hit rate.'
            : 'Balanced chaos. Which is… a valid strategy.',
      tier: 'minor',
      shape: 'square',
      mini: null,
      caption: 'Not a stereotype. A statistical mood.',
    }),

    () => ({
      kicker: 'Today',
      title: 'Most common behaviour',
      body: totalPlayers
        ? `Across ${totalPlayers} players, the modal outcome was “lockout”. (Just kidding… maybe.)`
        : 'Processing today’s global behaviours…',

      tier: 'ticker',
      shape: 'wide',
      mini: null,
      caption: null,
    }),

    () => ({
      kicker: 'Leaderboard',
      title: 'Top countries (completion)',
      body: 'A tiny league table. Big energy.',
      tier: 'major',
      shape: 'square',
      table:
        Array.isArray(g.countryLeaderboard) && g.countryLeaderboard.length
          ? {
              head: ['Country', 'Avg'],
              rows: g.countryLeaderboard
                .slice(0, 6)
                .map((x, i) => [
                  `${i + 1}. ${countryDisplay(x.country ?? x.name)}`,
                  `${pct(x.value)}%`,
                ]),
            }
          : {
              head: ['Country', 'Avg'],
              rows: [
                ['—', '—'],
                ['—', '—'],
                ['—', '—'],
              ],
            },
      caption: 'This will become addictive. Promise.',
    }),

    () => ({
      kicker: 'Mini',
      title: 'Your day in one number',
      body: 'A shamelessly simplified score.',
      tier: 'badge',
      shape: 'square',
      mini: {
        big: `${pct(p.completion * 0.5 + p.accuracy * 0.3 + (p.pacePercentile || 50) * 0.2)}%`,
        sub: 'Daily Score',
      },
      caption: 'Not scientific. Extremely shareable.',
    }),
  ]

  // Extend to “50” feeling via pattern expansion (headline factories)
  const extraFactories = []

  // 5) mini chart strips (12) — always visual
  for (let i = 0; i < 12; i++) {
    extraFactories.push(() => {
      const roll = rng()

      // synthetic-but-consistent series so the UI always looks alive
      const base = clamp((pct(g.avgCompletion ?? 62) + pct(p.completion)) / 2, 10, 95)
      const series = [
        clamp(base - 10 + rng() * 8, 5, 98),
        clamp(base - 4 + rng() * 8, 5, 98),
        clamp(base + rng() * 8, 5, 98),
        clamp(base + 6 + rng() * 6, 5, 98),
        clamp(base + 2 + rng() * 6, 5, 98),
      ].map((x) => Math.round(x))

      // quick league-ish rows from leaderboard if present, else placeholders
      const leagueRows =
        Array.isArray(g.countryLeaderboard) && g.countryLeaderboard.length
          ? g.countryLeaderboard
              .slice(0, 6)
              .map((x, idx) => [`${idx + 1}. ${x.name}`, `${pct(x.value)}%`])
          : [
              ['1. —', '—'],
              ['2. —', '—'],
              ['3. —', '—'],
              ['4. —', '—'],
              ['5. —', '—'],
              ['6. —', '—'],
            ]

      // pick a visual motif
      if (roll < 0.33) {
        return {
          topic: 'sparkline',
          kicker: 'Pulse',
          title: pick(rng, ['Global difficulty curve', 'Today’s solve rhythm', 'Completion tide']),
          body: '',
          tier: 'minor',
          shape: pick(rng, ['wide', 'square']),
          chart: {
            type: 'line',
            size: pick(rng, ['md', 'lg']),
            color: pick(rng, [COLORS.orange, COLORS.blue, COLORS.royal]),
            labels: ['a', 'b', 'c', 'd', 'e'],
            data: series,
          },
          caption: pick(rng, [
            'Stylised trend — daily fresh.',
            'Not finance. Still a chart.',
            'The world had a tempo.',
          ]),
        }
      }

      if (roll < 0.66) {
        const you = pct(p.completion)
        const world = pct(g.avgCompletion ?? 62)
        const gap = clamp(Math.abs(you - world), 0, 100)

        return {
          topic: 'gap',
          kicker: 'Gap',
          title: pick(rng, ['You vs World (spread)', 'Distance from average', 'The differential']),
          body: '',
          tier: 'minor',
          shape: 'square',
          chart: {
            type: 'doughnut',
            size: 'md',
            colors: [COLORS.green, 'rgba(0,0,0,0.08)'],
            data: [gap, 100 - gap],
          },
          mini: { big: `${gap}%`, sub: 'Spread' },
          caption: 'A clean “difference” widget.',
        }
      }

      return {
        topic: 'league',
        kicker: 'League table',
        title: pick(rng, ['Top countries (today)', 'Global leaderboard', 'Completion league']),
        body: 'Small table, big ego.',
        tier: 'major',
        shape: pick(rng, ['tall', 'square']),
        table: { head: ['Country', 'Avg'], rows: leagueRows },
        chart: {
          type: 'bar',
          size: 'md',
          color: COLORS.lilac,
          labels: leagueRows.slice(0, 5).map((r) => r[0].split('. ')[1] || r[0]),
          data: leagueRows.slice(0, 5).map((r) => {
            const n = Number(String(r[1]).replace('%', ''))
            return isFinite(n) ? n : 0
          }),
        },
        caption: 'Table + chart = front page energy.',
      }
    })
  }

  // 1) completion comparisons (10)
  for (let i = 0; i < 10; i++) {
    extraFactories.push(() => ({
      topic: 'completion',
      kicker: 'Comparison',
      title: pick(rng, [
        'You vs the world',
        'Personal vs global',
        'Your place in the pile',
        'Where you sit today',
        'The honest comparison',
      ]),
      body:
        typeof g.avgCompletion === 'number'
          ? `You completed ${pct(p.completion)}%. World average: ${pct(g.avgCompletion)}%.`
          : `You completed ${pct(p.completion)}%. Processing global totals…`,

      tier: pick(rng, ['minor', 'ticker']),
      shape: pick(rng, ['wide', 'square']),
      mini: { big: `${pct(p.completion)}%`, sub: 'You' },
      caption: pick(rng, [
        'Context makes it sting (or sparkle).',
        'We love a percentile era.',
        'Data, but make it drama.',
      ]),
    }))
  }

  // 2) pace commentary (10)
  for (let i = 0; i < 10; i++) {
    extraFactories.push(() => ({
      topic: 'pace',
      kicker: 'Tempo',
      title: pick(rng, [
        'Fast lane.',
        'Slow burn.',
        'Comfortably quick.',
        'Measured pace.',
        'Speed with seasoning.',
      ]),
      body:
        typeof p.pacePercentile === 'number'
          ? `Faster than ${pct(p.pacePercentile)}% today.`
          : p.paceSeconds
            ? `~${Math.max(1, Math.round(p.paceSeconds / 60))} minutes from first to last move.`
            : 'Processing today’s pace distribution…',

      tier: pick(rng, ['minor', 'badge']),
      shape: pick(rng, ['square', 'slim']),
      mini: {
        big:
          typeof p.pacePercentile === 'number'
            ? `${pct(p.pacePercentile)}%`
            : p.paceSeconds
              ? `${Math.max(1, Math.round(p.paceSeconds / 60))}m`
              : '—',
        sub: 'Pace',
      },
      caption: pick(rng, [
        'Speed ≠ intelligence. But it *is* funny.',
        'Quick guesses still count as culture.',
        'Pace is a vibe.',
      ]),
    }))
  }

  // 3) country spice (10)
  for (let i = 0; i < 10; i++) {
    extraFactories.push(() => ({
      topic: 'country',
      kicker: 'Across borders',

      title: pick(rng, [
        `${countryLabel}, you’re up.`,
        'Country fingerprints',
        'National knowledge aura',
        'Global culture check',
        'The borders are answering',
      ]),
      body: p.countryName
        ? typeof g.yourCountryAvgCompletion === 'number'
          ? `${p.countryName} avg completion: ${pct(g.yourCountryAvgCompletion)}%.`
          : `Processing today’s ${p.countryName} totals…`
        : 'Set your country to unlock comparisons.',
      tier: pick(rng, ['minor', 'ticker']),
      shape: pick(rng, ['wide', 'square']),
      mini:
        p.countryName && typeof g.yourCountryRank === 'number'
          ? { big: `#${g.yourCountryRank}`, sub: 'Rank' }
          : null,
      caption: pick(rng, [
        'Culture shows up in the strangest places.',
        'One question. Many worlds.',
        'Knowledge travels.',
      ]),
    }))
  }

  // 4) playful micro-headlines (12)
  for (let i = 0; i < 12; i++) {
    extraFactories.push(() => ({
      topic: 'editorial',
      kicker: pick(rng, ['Hot take', 'Editorial', 'Breaking', 'Tiny headline', 'Rumour']),
      title: pick(rng, [
        'The world is… surprisingly consistent.',
        'Common knowledge isn’t that common.',
        'Everyone guessed the same thing (apparently).',
        'Today was harder than it looked.',
        'The question caused international discourse.',
        'This one split the planet.',
      ]),
      body: pick(rng, [
        'Tomorrow we do it again.',
        'Screenshot this. Make it your personality.',
        'Ask your group chat. Start drama.',
        'Respectfully… we’re all wrong sometimes.',
        'This is why Akinto exists.',
      ]),
      tier: 'ticker',
      shape: 'wide',
      mini: null,
      caption: null,
    }))
  }

  // Build pool, shuffle, then select ~10 blocks with tier structure
  const pool = [...baseTemplates, ...extraFactories]
  shuffleInPlace(rng, pool)

  // editorial structure: 1 hero, 2 majors, 4 minors, 2 tickers, 1 badge
  const want = { hero: 1, major: 3, minor: 7, ticker: 2, badge: 1 }
  const blocks = []
  const counts = { hero: 0, major: 0, minor: 0, ticker: 0, badge: 0 }

  for (const fn of pool) {
    const b = fn()
    const tier = b.tier || 'minor'

    const topic = b.topic || 'misc'

    if (usedTopics.has(topic)) continue
    if (usedTitles.has(b.title)) continue
    if (counts[tier] >= want[tier]) continue

    usedTopics.add(topic)
    usedTitles.add(b.title)

    blocks.push({
      id: `gb_${blocks.length}_${tier}`,
      topic,
      kicker: b.kicker || 'Global',
      title: b.title || '—',
      body: b.body || '',
      tier,
      shape: b.shape || 'square',
      mini: b.mini || null,
      table: b.table || null,
      chart: b.chart || null,
      caption: b.caption || null,
      rot: Math.round((rng() * 2 - 1) * 0.35 * 10) / 10, // tiny editorial tilt
    })

    counts[tier]++
    const done = Object.keys(want).every((k) => counts[k] >= want[k])
    if (done) break
  }

  // If global endpoint missing, still ensure we have blocks
  if (!totalPlayers || totalPlayers === 0) {
    while (blocks.length < 10) {
      blocks.push({
        id: `gb_fallback_${blocks.length}`,
        kicker: 'Global',
        title: 'Today’s global totals are processing',
        body: 'We’re aggregating worldwide play right now — refresh in a moment.',
        tier: 'minor',
        shape: 'square',
        mini: null,
        table: null,
        chart: null,
        caption: null,
        rot: 0,
      })
    }
  }

  // Choose varied shapes for visual rhythm
  const shapeOverrides = [
    { tier: 'hero', shape: 'wide' },
    { tier: 'major', shape: pick(rng, ['tall', 'wide', 'square']) },
    { tier: 'major', shape: pick(rng, ['tall', 'square']) },
    { tier: 'minor', shape: pick(rng, ['square', 'wide', 'slim']) },
    { tier: 'minor', shape: pick(rng, ['square', 'tall']) },
    { tier: 'minor', shape: pick(rng, ['square', 'wide']) },
    { tier: 'minor', shape: pick(rng, ['square', 'slim']) },
    { tier: 'ticker', shape: 'wide' },
    { tier: 'ticker', shape: 'wide' },
    { tier: 'badge', shape: 'square' },
  ]

  for (let i = 0; i < blocks.length && i < shapeOverrides.length; i++) {
    if (blocks[i].tier === shapeOverrides[i].tier) blocks[i].shape = shapeOverrides[i].shape
  }

  return blocks
}

/* =========================
   GLOBAL charts per block
========================= */
function renderGlobalBlockCharts(rng) {
  for (const b of globalBlocks.value) {
    if (!b.chart) continue

    const el = globalChartRefs.value.get(b.id)
    if (!el) continue

    const ctx = el.getContext('2d')
    if (!ctx) continue

    // normalise defaults
    const data = Array.isArray(b.chart.data) ? b.chart.data : [40, 60, 55]
    const labels = Array.isArray(b.chart.labels) ? b.chart.labels : data.map((_, i) => `p${i}`)

    let instance = null

    if (b.chart.type === 'doughnut') {
      const colors = Array.isArray(b.chart.colors)
        ? b.chart.colors
        : [b.chart.color || COLORS.blue, 'rgba(0,0,0,0.08)']
      instance = makeMiniDoughnut(ctx, data, colors)
    } else if (b.chart.type === 'bar') {
      instance = makeMiniBar(ctx, labels, data, b.chart.color || COLORS.blue)
    } else {
      instance = makeMiniLine(ctx, labels, data, b.chart.color || COLORS.blue)
    }

    chartInstances.push(instance)
  }
}

/* =========================
   MAIN CHART RENDER
========================= */
function renderPersonalCharts(rng) {
  destroyCharts()

  const p = personal.value
  if (!completionRing.value || !accuracyRing.value || !speedRing.value) return

  const completionCtx = completionRing.value.getContext('2d')
  const accuracyCtx = accuracyRing.value.getContext('2d')
  const speedCtx = speedRing.value.getContext('2d')

  chartInstances.push(makeDoughnut(completionCtx, pct(p.completion), '#18E2A4', 'rgba(0,0,0,0.22)'))
  chartInstances.push(makeDoughnut(accuracyCtx, pct(p.accuracy), '#5C82FF', 'rgba(0,0,0,0.22)'))

  const speedVal = typeof p.pacePercentile === 'number' ? pct(p.pacePercentile) : 0
  chartInstances.push(makeDoughnut(speedCtx, speedVal, '#FFB938', 'rgba(0,0,0,0.22)'))

  // Personal dynamic chart
  if (personalChartCanvas.value) {
    const ctx = personalChartCanvas.value.getContext('2d')
    const chosen = buildPersonalChart(rng)
    const inst = chosen.render(ctx)
    chartInstances.push(inst)
  }
}

/* =========================
   METRICS COMPUTATION from attempts
   Expected shape from /api/load-day-progress:
   {
     attempts: [{ answers, correctAnswers, incorrectAnswers, windowId, result, createdAt, attemptIndex }],
     correctAnswers: [...], // canonical for the day
     dayEnded: boolean,
     dayEndResult: 'success'|'failure'|...
     hintsUsed: number (optional)
   }
========================= */
function derivePersonalFromUserDailyProfile(payload) {
  const prof = payload?.profile || {}
  const q = payload?.question || {}
  const attempts = Array.isArray(payload?.attempts) ? payload.attempts : []

  // -------------------------
  // Percent fields (robust)
  // -------------------------
  const pSpeed = normaliseAirtablePercent(prof.PercentileSpeed)
  const pAcc = normaliseAirtablePercent(prof.PercentileAccuracy)

  // We'll compute completion + accuracy from attempts if we can.
  // (Airtable % fields are too easy to mis-formula.)
  let completion = normaliseAirtablePercent(prof.Completion)
  let accuracy = normaliseAirtablePercent(prof.Accuracy)

  // -------------------------
  // Attempts-derived stats
  // -------------------------
  const uniqueSubmitted = new Set()
  const attemptsByWindow = {}
  let duplicatePenalty = 0

  for (const a of attempts) {
    const rawAnswers = Array.isArray(a.answers) ? a.answers : a.answer ? [a.answer] : []

    for (const ans of rawAnswers) {
      if (!ans) continue
      const n = normalise(ans)
      if (uniqueSubmitted.has(n)) duplicatePenalty++
      uniqueSubmitted.add(n)
    }

    if (a.windowId) {
      attemptsByWindow[a.windowId] ??= 0
      attemptsByWindow[a.windowId]++
    }
  }

  const submittedUnique = uniqueSubmitted.size

  // -------------------------
  // Compute uniqueCorrect + accuracy from attempts
  // -------------------------
  const uniqueCorrectSet = new Set()

  for (const a of attempts) {
    const ca = Array.isArray(a.correctAnswers) ? a.correctAnswers : []
    for (const c of ca) {
      const n = normalise(c)
      if (n) uniqueCorrectSet.add(n)
    }
  }

  const computedUniqueCorrect = uniqueCorrectSet.size

  if (submittedUnique > 0) {
    accuracy = Math.round((computedUniqueCorrect / submittedUnique) * 100)
  } else {
    accuracy = 0
  }

  const windowsPlayed = Object.keys(attemptsByWindow).length

  // -------------------------
  // Country resolution
  // -------------------------
  const profileCountryCode =
    typeof prof.Country === 'string' && prof.Country.length ? prof.Country.toLowerCase() : null

  const resolvedCountryCode = profileCountryCode || personal.value.countryCode || userCountryCode

  const resolvedCountryName = countryNameFromCode(resolvedCountryCode)

  // -------------------------
  // Question meta
  // -------------------------
  const totalSlots = Number(q.answerCount) || 0
  const totalPossible = Array.isArray(q.correctAnswers) ? q.correctAnswers.length : totalSlots

  personal.value = {
    ...personal.value,

    totalSlots,
    _totalPossible: totalPossible,

    attemptsTotal: Number(prof.AttemptsUsed) || attempts.length,
    hintsUsed: Number(prof.HintCount) || 0,

    uniqueCorrect: computedUniqueCorrect || Number(prof.DistinctAnswers) || 0,
    rareAnswers: Number(prof.RareAnswers) || 0,

    submittedUnique,
    duplicatePenalty,
    windowsPlayed,
    _attemptsByWindow: attemptsByWindow,

    completion:
      Number(q.answerCount) > 0
        ? Math.round(
            (Math.min(computedUniqueCorrect, Number(q.answerCount)) / Number(q.answerCount)) * 100,
          )
        : (completion ?? 0),
    accuracy: accuracy ?? 0,

    paceSeconds: prof.SolveSeconds ?? null,
    pacePercentile: pSpeed ?? null,
    accuracyPercentile: pAcc ?? null,

    archetype: prof.Archetype ?? null,

    streakContinues: prof.StreakContinues ?? null,
    firstSolveToday: prof.FirstSolveToday ?? null,

    countryCode: resolvedCountryCode,
    countryName: resolvedCountryName,
    rareAnswersList: payload?.derived?.rareAnswersList || [],
  }
}

/* =========================
   FETCHERS
   IMPORTANT: keep Airtable keys on server.
========================= */
async function fetchPersonalAnalytics() {
  const res = await fetch('/api/load-personal-analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      dateKey: dateKeyRef.value,
    }),
  })

  if (!res.ok) throw new Error('load-personal-analytics failed')
  return res.json()
}

/**
 * OPTIONAL: implement this endpoint server-side for real global stats.
 * Should return shape like:
 * {
 *   totalPlayers, totalAttempts, avgCompletion, avgAccuracy,
 *   countryLeaderboard: [{ name, value }],
 *   yourCountryRank, yourCountryAvgCompletion,
 *   pacePercentileForUser
 * }
 */
async function fetchGlobalAnalytics() {
  // Server should read:
  // - DailyAggregates for dateKey (TotalPlayers, TotalAttempts, AvgCompletion, AvgAccuracy, etc.)
  // - (optional) Country leaderboard you compute server-side
  // - (optional) yourCountryRank / yourCountryAvgCompletion server-side
  const res = await fetch('/api/load-global-analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dateKey: dateKeyRef.value, country: userCountryCode, userId }),
  })

  if (!res.ok) throw new Error('load-global-analytics failed')
  return res.json()
}

/* =========================
   DISPLAY COMPUTED
========================= */
const displayCompletion = computed(() => pct(personal.value.completion))
const displayAccuracy = computed(() => pct(personal.value.accuracy))
const displaySpeed = computed(() =>
  typeof personal.value.pacePercentile === 'number' ? pct(personal.value.pacePercentile) : 55,
)

/* =========================
   SHARE
========================= */
const shareBtnLabel = ref('Copy Share Text')
async function copyShareText() {
  if (!personalReady.value) return

  const p = personal.value
  const line1 = `Akinto - Daily Analytics (${p.dateKey})`
  const line2 = `Completion: ${pct(p.completion)}% | Accuracy: ${pct(p.accuracy)}%`
  const line3 =
    typeof p.pacePercentile === 'number'
      ? `Pace: faster than ${pct(p.pacePercentile)}% today`
      : p.paceSeconds
        ? `Pace: ~${Math.max(1, Math.round(p.paceSeconds / 60))}m from first to last move`
        : `Pace: calibrating`
  const line4 = `akinto.io`

  const text = [line1, line2, line3, line4].join('\n')
  try {
    await navigator.clipboard.writeText(text)
    shareBtnLabel.value = 'Copied ✓'
    setTimeout(() => (shareBtnLabel.value = 'Copy Share Text'), 1400)
  } catch {
    shareBtnLabel.value = 'Copy failed'
    setTimeout(() => (shareBtnLabel.value = 'Copy Share Text'), 1400)
  }
}

/* =========================
   LIFECYCLE
========================= */
onMounted(async () => {
  isLoading.value = true

  const seed = hashStringToInt(`${userId}::${dateKeyRef.value}::analytics`)
  const rng = mulberry32(seed)

  personalSubline.value = pick(rng, PERSONAL_SUBLINES)
  globalSubline.value = pick(rng, GLOBAL_SUBLINES)

  try {
    /* ===========================================
     1) Personal analytics (UserDailyProfile)
  =========================================== */
    const personalPayload = await fetchPersonalAnalytics()
    derivePersonalFromUserDailyProfile(personalPayload)

    /* ===========================================
     2) Global analytics (DailyAggregates)
  =========================================== */
    const g = await fetchGlobalAnalytics()

    if (g) {
      // g is already UI-shaped by /api/load-global-analytics
      global.value = {
        totalPlayers: typeof g.totalPlayers === 'number' ? g.totalPlayers : 0,
        totalAttempts: typeof g.totalAttempts === 'number' ? g.totalAttempts : null,

        // These come back as 0–100 already (integers), but normalise defensively anyway
        avgCompletion:
          typeof g.avgCompletion === 'number' ? normaliseAirtablePercent(g.avgCompletion) : null,
        avgAccuracy:
          typeof g.avgAccuracy === 'number' ? normaliseAirtablePercent(g.avgAccuracy) : null,

        // Expecting [{ country, name, users, value }]
        countryLeaderboard: Array.isArray(g.countryLeaderboard) ? g.countryLeaderboard : [],

        yourCountryRank: typeof g.yourCountryRank === 'number' ? g.yourCountryRank : null,
        yourCountryAvgCompletion:
          typeof g.yourCountryAvgCompletion === 'number'
            ? normaliseAirtablePercent(g.yourCountryAvgCompletion)
            : null,

        // optional fields your endpoint may include
        speedPercentiles: g.distributions?.paceBuckets || null,
        globalStreak: null,
      }

      // If the endpoint computed pace percentile for THIS user, wire it into personal
      if (typeof g.pacePercentileForUser === 'number') {
        personal.value.pacePercentile = normaliseAirtablePercent(g.pacePercentileForUser)
      }
    }

    /* ===========================================
     3) Build editorial copy + layout
  =========================================== */
    buildHeroCopy(rng)
    personalCards.value = buildPersonalCards(rng)

    globalChartRefs.value = new Map()
    globalBlocks.value = buildGlobalBlocks(rng)

    personalReady.value = true

    /* ===========================================
     4) Render charts
  =========================================== */
    await nextTick()
    renderPersonalCharts(rng)

    // second tick ONLY for global block charts
    await nextTick()
    renderGlobalBlockCharts(rng)
  } catch (e) {
    console.error('DailyAnalytics load error:', e)
    // still show something minimal
    personalReady.value = true
    personalCards.value = buildPersonalCards(mulberry32(seed + 1))

    globalChartRefs.value = new Map()
    globalBlocks.value = buildGlobalBlocks(mulberry32(seed + 2))

    await nextTick()
    renderPersonalCharts(mulberry32(seed + 3))

    await nextTick()
    renderGlobalBlockCharts(mulberry32(seed + 4))
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  destroyCharts()
})

/* =========================
   GLOBAL BLOCK layout helpers
========================= */
function blockGridSpan(block) {
  // translate tier/shape to grid spans
  const spans = {
    hero: { wide: [2, 2], tall: [1, 3], square: [1, 2], slim: [1, 1] },
    major: { wide: [2, 2], tall: [1, 3], square: [1, 2], slim: [1, 1] },
    minor: { wide: [2, 1], tall: [1, 2], square: [1, 2], slim: [1, 1] },
    ticker: { wide: [2, 1], tall: [1, 1], square: [1, 1], slim: [1, 1] },
    badge: { wide: [1, 1], tall: [1, 1], square: [1, 1], slim: [1, 1] },
  }
  const t = spans[block.tier] || spans.minor
  const s = t[block.shape] || t.square
  return s // [colSpan, rowSpan]
}
function blockStyleComputed(block) {
  const [c, r] = blockGridSpan(block)
  return { gridColumnEnd: `span ${c}`, gridRowEnd: `span ${r}` }
}
function blockStyleMerged(block) {
  return {
    ...blockStyleComputed(block),
    transform: `rotate(${block.rot || 0}deg)`,
  }
}

function blockStyle(block) {
  return blockStyleMerged(block)
}
</script>

<style scoped>
/* =========================
   SHELL
========================= */
.analytics-wrapper {
  display: flex;
  width: 100vw;
  min-height: 100vh;

  overflow-x: hidden;

  margin: 0;
  padding: 0;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
}

/* =========================
   LEFT PANEL (PERSONAL)
========================= */
.left-pane {
  flex: 0 0 38%;
  max-width: 38%;
  min-width: 360px;

  background: #0d0f11;
  color: white;

  padding: 34px 30px 28px;

  overflow-y: auto;

  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.left-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.brand-logo {
  width: 70px;
  height: 70px;
  outline: 1.5px solid #fff;
}

.title-stack {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.title {
  font-size: 30px;
  font-weight: 800;
  margin: 0;
  letter-spacing: 0.2px;
}

.sub {
  margin: 0;
  opacity: 0.72;
  font-size: 14px;
  line-height: 1.45;
}

.hero-box {
  margin-top: 14px;
  background: #1a1d22;
  border-radius: 18px;
  padding: 18px 18px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.hero-line {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 700;
}

.hero-sub {
  margin: 0;
  opacity: 0.78;
  font-size: 14px;
  line-height: 1.55;

  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hero-pill-row {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pill {
  font-size: 12px;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.09);
  opacity: 0.95;
}

/* =========================
   HERO STAT BLOCKS (LEFT)
========================= */

.primary-stats-grid {
  margin-top: 18px;

  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

/* Big vertical plaque */

.stat-card {
  border-radius: 16px;
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);

  min-height: 90px;
  max-height: 100px;
}

/* Individual colour moods */
.completion-card {
  background: linear-gradient(180deg, #34e3a0, #1fbf85);
}

.accuracy-card {
  background: linear-gradient(180deg, #6d8cff, #4b63ff);
}

.pace-card {
  background: linear-gradient(180deg, #ffd36a, #ffb547);
}

.stat-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding-left: 12px;
}

/* RING HOLDER */
.ring-stack {
  position: relative;
  width: 65px;
  height: 65px;
  flex-shrink: 0;
}

/* % TEXT */
.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.2px;
  color: rgba(255, 255, 255, 0.95);
}

/* TEXT COLUMN */
.stat-copy {
  flex: 1;
  display: flex;
  align-items: center;
}

/* COMMENTARY */
.stat-foot {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  opacity: 0.9;
}

/* Label at top */
.stat-label {
  padding-left: 10px;
  margin: 0 0 0px;
  font-size: 11px;
  letter-spacing: 1px;
  font-weight: 900;
  text-transform: uppercase;
  opacity: 0.85;
}

.ring-stack canvas {
  width: 100% !important;
  height: 100% !important;
}

.pace-card .ring-center {
  color: rgba(0, 0, 0, 0.78);
}

.personal-dynamics {
  margin-top: 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 200px 300px;
  gap: 12px;
}

.personal-card {
  background: #13171c;
  border-radius: 18px;
  padding: 16px 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  position: relative;
}

.card-kicker {
  margin: 0 0 6px;
  opacity: 0.68;
  font-size: 11px;
  letter-spacing: 0.7px;
  text-transform: uppercase;
}
.card-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 750;
  letter-spacing: 0.15px;
}
.card-body {
  margin: 0;
  font-size: 13px;
  opacity: 0.82;
  line-height: 1.55;
}

.card-mini {
  position: absolute;
  right: 14px;
  bottom: 12px;
  text-align: right;
}
.mini-big {
  display: block;
  font-weight: 900;
  font-size: 18px;
  letter-spacing: 0.2px;
}
.mini-sub {
  display: block;
  font-size: 11px;
  opacity: 0.7;
}

.chart-dynamic {
  grid-column: 1 / 3;
  background: #13171c;
  border-radius: 18px;
  padding: 14px 14px 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);

  min-height: 300px;

  display: flex;
  flex-direction: column;
}

.chart-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}
.chart-tag {
  font-size: 11px;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  opacity: 0.65;
}
.chart-title {
  font-size: 13px;
  opacity: 0.85;
  font-weight: 650;
}
.personal-chart canvas {
  width: 100%;
  min-height: 180px;
  height: auto;
}
.chart-caption {
  margin: 8px 4px 0;
  font-size: 12px;
  opacity: 0.68;
  line-height: 1.45;
}

.left-footer {
  margin-top: 26px;
  padding-top: 16px;

  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;

  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.cta {
  background: #111;
  color: #ffff;
  border: 2px solid rgba(255, 255, 255, 0.16);
  padding: 10px 14px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
}
.cta:hover {
  transform: translateY(-2px);
  opacity: 0.96;
}
.micro-note {
  margin: 0;
  opacity: 0.6;
  font-size: 12px;
}

/* =========================
   RIGHT PANEL (GLOBAL)
========================= */
.right-pane {
  flex: 1;

  background: #fff;
  color: #111;

  padding: 32px 36px 30px;

  overflow-y: auto;

  position: relative;
}

.right-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 14px;
  margin-bottom: 26px;
}

.g-title {
  margin: 0;
  font-size: clamp(38px, 4vw, 60px);
  font-weight: 900;
  font-style: italic;
  letter-spacing: -1px;
  line-height: 0.95;
}

.g-sub {
  margin: 8px 0 0;
  font-size: 14px;
  opacity: 0.72;
  line-height: 1.55;
  max-width: 100rem;
}

.g-inner {
  gap: 6px;
}

.g-head {
  margin-bottom: 8px;
  overflow-wrap: break-word;
}

.g-body {
  margin-bottom: 6px;
  overflow-wrap: break-word;
}

.g-mini {
  margin-top: auto;
  padding-top: 14px;
}

.g-caption {
  margin-top: 12px;
}

.share-btn {
  border: 2px solid #111;
  background: #fff;
  color: #111;
  border-radius: 999px;
  padding: 10px 14px;
  font-weight: 750;
  cursor: pointer;
}
.share-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.global-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  grid-auto-rows: minmax(120px, auto);
  gap: 18px;
  grid-auto-flow: dense;
}

.g-block {
  background: #f7f7fa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 18px 18px 16px;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.06);
}

.g-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.g-kicker {
  margin: 0 0 6px;
  font-size: 10px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  opacity: 0.6;
}

.g-head {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 850;
  letter-spacing: -0.2px;
  line-height: 1.15;
}

.g-body {
  margin: 0;
  font-size: 13px;
  opacity: 0.82;
  line-height: 1.65;
}

.g-mini {
  margin-top: auto;
  padding-top: 10px;
}
.g-mini-big {
  font-size: 22px;
  font-weight: 900;
}
.g-mini-sub {
  font-size: 11px;
  opacity: 0.62;
  margin-top: 2px;
}

.g-table {
  margin-top: 10px;
  background: white;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
}
.g-table-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  padding: 12px 14px;
  font-size: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
.g-table-row:first-child {
  border-top: none;
}
.g-table-head {
  background: rgba(0, 0, 0, 0.04);
  font-weight: 800;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
.g-table-left {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.g-table-right {
  font-weight: 800;
}

.g-chart {
  margin-top: 10px;
  height: 64px;
}

.g-chart.md {
  height: 110px;
}

.g-chart.lg {
  height: 170px;
}

.g-chart canvas {
  width: 100%;
  height: 100%;
}

.g-caption {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.62;
  line-height: 1.4;
}

/* Tier vibes */
.tier-hero {
  background: #ffffff;
  border: 2px solid rgba(0, 0, 0, 0.08);
}
.tier-hero .g-head {
  font-size: 22px;
}
.tier-major {
  background: #f5f7ff;
}
.tier-minor {
  background: #f7f7fa;
}
.tier-ticker {
  background: #fff;
}
.tier-badge {
  background: #fff;
  border-style: dashed;
}

/* Shapes via grid spans (computed inline as style too) */
.shape-wide {
  display: block;
}
.shape-tall {
  display: block;
}
.shape-square {
  display: block;
}
.shape-slim {
  display: block;
}

/* Footer */
.right-footer {
  margin-top: 22px;
  padding-top: 14px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.rotation-note {
  margin: 0;
  font-size: 12px;
  opacity: 0.62;
}
.brand-tag {
  border: 2px solid #111;
  border-radius: 999px;
  padding: 10px 16px;
  font-weight: 850;
  background: #0d0f11;
  color: #fff;
}

/* =========================
   SKELETONS
========================= */
.left-skeleton .sk-line {
  height: 14px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  margin-bottom: 10px;
}
.left-skeleton .w60 {
  width: 60%;
}
.left-skeleton .w40 {
  width: 40%;
}
.left-skeleton .sk-box {
  height: 110px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  margin-top: 16px;
}
.left-skeleton .sk-box.tall {
  height: 260px;
}
.left-skeleton .sk-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.left-skeleton .sk-card {
  height: 170px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
}

.right-skeleton .sk-right-title {
  height: 46px;
  width: 55%;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.06);
}
.right-skeleton .sk-right-sub {
  height: 14px;
  width: 70%;
  margin-top: 10px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.06);
}
.right-skeleton .sk-right-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  grid-auto-rows: 110px;
  gap: 12px;
}
.right-skeleton .sk-right-block {
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.06);
}

/* =========================
   RESPONSIVE
========================= */
@media (max-width: 980px) {
  .analytics-wrapper {
    flex-direction: column;
    height: auto;
    max-height: 100px;
  }
  .left-pane,
  .right-pane {
    width: 100%;
    height: auto;
  }
  .global-grid {
    grid-template-columns: 1fr;
    grid-auto-rows: 120px;
  }
  .g-title {
    font-size: 40px;
  }
  .personal-dynamics {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
  .chart-dynamic {
    grid-column: auto;
    max-height: 150px;
  }
}

/* =========================
   SMALL polish
========================= */
.g-block,
.personal-card,
.stat-card,
.hero-box {
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}
.g-block:hover,
.personal-card:hover,
.stat-card:hover {
  transform: translateY(-2px);
}

/* ======================================================
   DAILY ANALYTICS — MOBILE REFLOW
   Personal first, Global second
====================================================== */

@media (max-width: 720px) {
  /* ---- SHELL ---- */
  .analytics-wrapper {
    flex-direction: column;
    height: auto;
  }

  /* ---- PANES STACK ---- */
  .left-pane,
  .right-pane {
    flex: none;
    max-width: 100%;
    width: 100%;
    min-width: 0;
    height: auto;
  }

  /* reduce padding for phone */
  .left-pane {
    padding: 22px 16px 26px;
  }

  .right-pane {
    padding: 24px 16px 28px;
  }

  /* ====================================================
     PERSONAL HEADER (INSPIRED BY SUCCESS SUMMARY)
  ==================================================== */

  .left-header {
    align-items: flex-start;
  }

  .brand-logo {
    width: 48px;
    height: 48px;
  }

  .title {
    font-size: 22px;
  }

  .sub {
    font-size: 13px;
  }

  /* ====================================================
     HERO COPY TIGHTEN
  ==================================================== */

  .hero-box {
    padding: 14px;
  }

  .hero-line {
    font-size: 17px;
  }

  .hero-sub {
    font-size: 13px;
  }

  /* ====================================================
     PRIMARY RINGS — FULL WIDTH STACK
  ==================================================== */

  .primary-stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .stat-card {
    min-height: 88px;
    padding: 12px 0 20px;
  }

  .canvas-wrap {
    width: 56px;
    height: 56px;
  }

  .stat-row {
    gap: 14px;
  }

  .ring-stack {
    width: 60px;
    height: 60px;
  }

  .ring-center {
    font-size: 13px;
  }

  .stat-foot {
    font-size: 12.5px;
  }

  /* ====================================================
     PERSONAL DYNAMICS → SINGLE COLUMN
  ==================================================== */

  .personal-dynamics {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }

  .chart-dynamic {
    grid-column: auto;
  }

  /* ====================================================
     FOOTER TIGHTEN
  ==================================================== */

  .left-footer {
    margin-top: 18px;
    padding-top: 12px;
  }

  /* ====================================================
     GLOBAL HEADER TREATMENT
  ==================================================== */

  .right-pane {
    padding-top: 18px;
  }

  .right-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 16px;
    max-height: 300px; /* IMPORTANT */
  }

  .g-title {
    margin-bottom: 4px;
  }

  .g-title {
    margin-bottom: 4px;
  }

  .share-btn {
    margin-top: 6px;
    padding: 4px 7px;
    font-size: 13px;
    align-self: flex-end;
  }

  /* ====================================================
     GLOBAL GRID → SINGLE COLUMN
  ==================================================== */

  .global-grid {
    display: flex !important;
    flex-direction: column;
    gap: auto;
  }

  .g-block {
    width: 100%;
    margin: 0;
    padding-left: 14px !important;
  }

  .g-head {
    margin-bottom: 4px;
  }

  .g-block > aside,
  .g-block > .side-rail,
  .g-block > .vertical-label,
  .g-block > .speed-rail {
    display: none;
  }

  .g-body {
    margin-bottom: 2px;
  }

  .g-caption {
    margin-top: 6px;
  }

  .brand-tag {
    border: 1px solid #111;
    border-radius: 100px;
    padding-left: 10px;
    font-weight: 500;
    font-size: 10px;
    background: #0d0f11;
    color: #fff;
  }
}
</style>
