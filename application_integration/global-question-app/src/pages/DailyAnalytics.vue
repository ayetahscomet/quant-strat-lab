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
            ✅ {{ personal.uniqueCorrect }}/{{ personal.totalSlots }} found
          </span>
        </div>
      </div>

      <!-- Primary visuals (always 3) -->
      <div class="primary-stats-grid" v-if="personalReady">
        <div class="stat-card large">
          <p class="stat-label">Completion</p>
          <div class="canvas-wrap">
            <canvas ref="completionRing"></canvas>
          </div>
          <span class="stat-value">{{ displayCompletion }}%</span>
          <span class="stat-foot">{{ completionFoot }}</span>
        </div>

        <div class="stat-card medium">
          <p class="stat-label">Accuracy</p>
          <div class="canvas-wrap">
            <canvas ref="accuracyRing"></canvas>
          </div>
          <span class="stat-value">{{ displayAccuracy }}%</span>
          <span class="stat-foot">{{ accuracyFoot }}</span>
        </div>

        <div class="stat-card medium">
          <p class="stat-label">Pace</p>
          <div class="canvas-wrap">
            <canvas ref="speedRing"></canvas>
          </div>
          <span class="stat-value small">{{ displaySpeed }}%</span>
          <span class="stat-foot">{{ speedFoot }}</span>
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
            <div v-if="block.chart" class="g-chart">
              <canvas :ref="(el) => registerGlobalChartRef(el, block.id)"></canvas>
            </div>

            <p v-if="block.caption" class="g-caption">{{ block.caption }}</p>
          </div>
        </article>
      </div>

      <div class="right-footer" v-if="personalReady">
        <p class="rotation-note">Views refresh daily. Tomorrow tells a new story.</p>
        <div class="brand-tag">Akinto. A game of Common Knowledge</div>
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
import { getTimezone, todayKey } from '@/utils/windows.js'

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

/* =========================
   USER + DATE CONTEXT
========================= */
function getOrCreateUUID() {
  let id = localStorage.getItem('akinto_uuid')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('akinto_uuid', id)
  }
  return id
}

const tz = ref(getTimezone())
const dateKeyRef = ref(todayKey(tz.value))
const userId = getOrCreateUUID()
const userCountryCode = (localStorage.getItem('akinto_country') || 'XX').toLowerCase()

const countryName =
  countries.find((c) => String(c.code || '').toLowerCase() === userCountryCode)?.name || null

/* =========================
   STATE
========================= */
const isLoading = ref(true)
const personalReady = ref(false)

const personal = ref({
  // derived from Airtable attempts via /api/load-day-progress
  dateKey: dateKeyRef.value,
  countryCode: userCountryCode,
  countryName,
  totalSlots: 0,
  correctAnswers: [],
  uniqueCorrect: 0,
  attemptsTotal: 0,
  windowsPlayed: 0,
  dayResult: '', // success | failure | lockout | exit-early | unknown
  hintsUsed: 0, // if you track it
  firstSeenAt: null,
  lastSeenAt: null,
  paceSeconds: null, // total seconds between first and last event
  pacePercentile: null, // from global endpoint if available
  accuracy: 0, // correct / submitted unique (or correct / totalSlots)
  completion: 0, // uniqueCorrect / totalSlots
  submittedUnique: 0, // unique answers submitted across day
  duplicatePenalty: 0, // duplicates count
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
        ? `Pace: ${Math.max(1, Math.round(p.paceSeconds / 60))} min from first to last move.`
        : 'Pace: still calibrating.'

  const outcomeLine =
    result === 'success'
      ? 'You finished the day.'
      : result === 'exit-early'
        ? 'You tapped out early — self-care is strategy.'
        : result === 'lockout'
          ? 'You ran out of attempts in at least one window.'
          : 'Today’s session is logged.'

  heroDescription.value = `${outcomeLine} Completion ${pct(p.completion)}%, accuracy ${pct(
    p.accuracy,
  )}%. ${paceLine}`

  // feet for the three big cards
  completionFoot.value =
    p.uniqueCorrect === p.totalSlots
      ? 'All slots found.'
      : `${p.uniqueCorrect} of ${p.totalSlots} correct answers discovered today.`

  accuracyFoot.value =
    p.submittedUnique > 0
      ? `${p.uniqueCorrect} correct out of ${p.submittedUnique} unique submissions.`
      : 'No submissions recorded.'

  speedFoot.value =
    typeof p.pacePercentile === 'number'
      ? `Faster than ${pct(p.pacePercentile)}% of players today.`
      : 'Global pace percentile will appear once enough players exist.'
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
      labels: ['Value', 'Rest'],
      datasets: [
        {
          data: [clamp(valuePct, 0, 100), 100 - clamp(valuePct, 0, 100)],
          backgroundColor: [fg, bg],
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

function blockStyle(block) {
  // optional slight “editorial” variation
  const rot = block.rot || 0
  return {
    transform: `rotate(${rot}deg)`,
  }
}

/**
 * Block tier & shape control (CSS grid):
 * - tier: hero | major | minor | ticker | badge
 * - shape: wide | tall | square | slim
 */
function buildGlobalBlocks(rng) {
  const p = personal.value
  const g = global.value

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
          : 'Global completion will appear once enough players exist today.',
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
      kicker: 'Your Country',
      title: p.countryName ? `${p.countryName} on the board` : 'Set your country to unlock this',
      body:
        p.countryName && typeof g.yourCountryAvgCompletion === 'number'
          ? `Average completion in ${p.countryName}: ${pct(g.yourCountryAvgCompletion)}%.`
          : p.countryName
            ? `We’re still building ${p.countryName}’s sample size today.`
            : 'You’ll get country leaderboards once a country is set.',
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
              rows: g.countryLeaderboard.slice(0, 5).map((x) => [x.name, `${pct(x.value)}%`]),
            }
          : null,
      caption: p.countryName ? `Rank: ${countryRank}` : '',
    }),

    () => ({
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
        typeof g.avgAccuracy === 'number'
          ? `World average accuracy: ${pct(g.avgAccuracy)}%. You: ${pct(p.accuracy)}%.`
          : `You: ${pct(p.accuracy)}%. World average appears once enough players exist.`,
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
        : 'Global behaviours appear once today has a player pool.',
      tier: 'ticker',
      shape: 'wide',
      mini: null,
      caption: null,
    }),

    () => ({
      kicker: 'Leaderboard',
      title: 'Top countries (completion)',
      body: 'A tiny league table. Big ego energy.',
      tier: 'major',
      shape: 'square',
      table:
        Array.isArray(g.countryLeaderboard) && g.countryLeaderboard.length
          ? {
              head: ['Country', 'Avg'],
              rows: g.countryLeaderboard
                .slice(0, 6)
                .map((x, i) => [`${i + 1}. ${x.name}`, `${pct(x.value)}%`]),
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
      mini: { big: `${pct(p.completion * 0.6 + p.accuracy * 0.4 || 0)}%`, sub: 'Akinto Index' },
      caption: 'Not scientific. Extremely shareable.',
    }),
  ]

  // Extend to “50” feeling via pattern expansion (headline factories)
  const extraFactories = []

  // 1) completion comparisons (10)
  for (let i = 0; i < 10; i++) {
    extraFactories.push(() => ({
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
          : `You completed ${pct(p.completion)}%. World average appears once enough players exist.`,
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
            : 'We’ll show percentiles once enough players exist today.',
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
          : `Still building today’s sample for ${p.countryName}.`
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
  const want = { hero: 1, major: 2, minor: 4, ticker: 2, badge: 1 }
  const blocks = []
  const counts = { hero: 0, major: 0, minor: 0, ticker: 0, badge: 0 }

  for (const fn of pool) {
    const b = fn()
    const tier = b.tier || 'minor'
    if (counts[tier] >= want[tier]) continue

    blocks.push({
      id: `gb_${blocks.length}_${tier}`,
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
  while (blocks.length < 10) {
    blocks.push({
      id: `gb_fallback_${blocks.length}`,
      kicker: 'Global',
      title: 'More data incoming…',
      body: 'As more players join today, this page gets louder.',
      tier: 'minor',
      shape: 'square',
      mini: null,
      table: null,
      chart: null,
      caption: null,
      rot: 0,
    })
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
  // For each block with chart: render mini chart in its canvas
  for (const b of globalBlocks.value) {
    if (!b.chart) continue
    const el = globalChartRefs.value.get(b.id)
    if (!el) continue

    const ctx = el.getContext('2d')
    if (!ctx) continue

    // Render based on declared type
    let instance = null
    if (b.chart.type === 'bar') {
      // bar expects 2 values
      instance = makeMiniBar(
        ctx,
        ['You', 'Rest'],
        Array.isArray(b.chart.data) ? b.chart.data : [60, 40],
        b.chart.color || COLORS.blue,
      )
    } else {
      instance = makeMiniLine(
        ctx,
        ['a', 'b', 'c', 'd', 'e'].slice(0, (b.chart.data || []).length || 3),
        Array.isArray(b.chart.data) ? b.chart.data : [40, 60, 55],
        b.chart.color || COLORS.blue,
      )
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

  chartInstances.push(
    makeDoughnut(completionCtx, pct(p.completion), COLORS.green, 'rgba(255,255,255,0.10)'),
  )
  chartInstances.push(
    makeDoughnut(accuracyCtx, pct(p.accuracy), COLORS.blue, 'rgba(255,255,255,0.10)'),
  )

  const speedVal = typeof p.pacePercentile === 'number' ? pct(p.pacePercentile) : 55
  chartInstances.push(makeDoughnut(speedCtx, speedVal, COLORS.gold, 'rgba(255,255,255,0.10)'))

  // Personal dynamic chart
  if (personalChartCanvas.value) {
    const ctx = personalChartCanvas.value.getContext('2d')
    const chosen = buildPersonalChart(rng)
    const inst = chosen.render(ctx)
    chartInstances.push(inst)
  }

  // Global block charts
  renderGlobalBlockCharts(rng)
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
function derivePersonalFromDayProgress(dayProgress) {
  const attempts = Array.isArray(dayProgress?.attempts) ? dayProgress.attempts : []
  const canonicalCorrect = Array.isArray(dayProgress?.correctAnswers)
    ? dayProgress.correctAnswers
    : []

  const totalSlots = canonicalCorrect.length
  const correctSet = new Set(canonicalCorrect.map(normalise))

  // union across day
  const uniqueSubmissions = new Set()
  const uniqueCorrectFound = new Set()
  let duplicates = 0

  const attemptsByWindow = {}

  let firstAt = null
  let lastAt = null

  for (const a of attempts) {
    const w = a.windowId || 'unknown'
    attemptsByWindow[w] = (attemptsByWindow[w] || 0) + 1

    const createdAt = a.createdAt ? new Date(a.createdAt) : null
    if (createdAt && !isNaN(createdAt.getTime())) {
      if (!firstAt || createdAt < firstAt) firstAt = createdAt
      if (!lastAt || createdAt > lastAt) lastAt = createdAt
    }

    const ans = Array.isArray(a.answers) ? a.answers : []
    for (const raw of ans) {
      const v = normalise(raw)
      if (!v) continue
      if (uniqueSubmissions.has(v)) duplicates++
      uniqueSubmissions.add(v)
      if (correctSet.has(v)) uniqueCorrectFound.add(v)
    }
  }

  const submittedUnique = uniqueSubmissions.size
  const uniqueCorrect = uniqueCorrectFound.size
  const completion = totalSlots > 0 ? (uniqueCorrect / totalSlots) * 100 : 0
  const accuracy = submittedUnique > 0 ? (uniqueCorrect / submittedUnique) * 100 : 0

  const attemptsTotal = attempts.length
  const windowsPlayed = Object.keys(attemptsByWindow).filter((k) => attemptsByWindow[k] > 0).length

  // Determine day result:
  // prefer explicit dayEnded marker if present
  const dayResult =
    (dayProgress?.dayEnded && dayProgress?.dayEndResult) ||
    // else: if any success attempt exists -> success
    (attempts.some((x) => x.result === 'success') ? 'success' : null) ||
    // else if any exit-early -> exit-early
    (attempts.some((x) => x.result === 'exit-early') ? 'exit-early' : null) ||
    // else if any lockout -> lockout
    (attempts.some((x) => x.result === 'lockout') ? 'lockout' : null) ||
    // else fail if any fail records
    (attempts.some((x) => x.result === 'fail') ? 'failure' : 'unknown')

  const paceSeconds =
    firstAt && lastAt
      ? Math.max(0, Math.round((lastAt.getTime() - firstAt.getTime()) / 1000))
      : null

  personal.value = {
    ...personal.value,
    totalSlots,
    correctAnswers: canonicalCorrect,
    uniqueCorrect,
    submittedUnique,
    duplicatePenalty: duplicates,
    attemptsTotal,
    windowsPlayed,
    dayResult,
    hintsUsed: typeof dayProgress?.hintsUsed === 'number' ? dayProgress.hintsUsed : 0,
    firstSeenAt: firstAt ? firstAt.toISOString() : null,
    lastSeenAt: lastAt ? lastAt.toISOString() : null,
    paceSeconds,
    completion,
    accuracy,
    _attemptsByWindow: attemptsByWindow,
  }
}

/* =========================
   FETCHERS
   IMPORTANT: keep Airtable keys on server.
========================= */
async function fetchDayProgress() {
  const res = await fetch('/api/load-day-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, dateKey: dateKeyRef.value }),
  })
  if (!res.ok) throw new Error('load-day-progress failed')
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
  const res = await fetch('/api/load-global-analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dateKey: dateKeyRef.value, userId, country: userCountryCode }),
  })

  if (!res.ok) return null
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
  const line1 = `Akinto — Daily Analytics (${p.dateKey})`
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
    // 1) Personal day progress
    const day = await fetchDayProgress()
    derivePersonalFromDayProgress(day)

    // 2) Optional global analytics
    const g = await fetchGlobalAnalytics()
    if (g) {
      global.value = {
        ...global.value,
        totalPlayers:
          typeof g.totalPlayers === 'number' ? g.totalPlayers : global.value.totalPlayers,
        totalAttempts:
          typeof g.totalAttempts === 'number' ? g.totalAttempts : global.value.totalAttempts,
        avgCompletion:
          typeof g.avgCompletion === 'number' ? g.avgCompletion : global.value.avgCompletion,
        avgAccuracy: typeof g.avgAccuracy === 'number' ? g.avgAccuracy : global.value.avgAccuracy,
        countryLeaderboard: Array.isArray(g.countryLeaderboard)
          ? g.countryLeaderboard
          : global.value.countryLeaderboard,
        yourCountryRank:
          typeof g.yourCountryRank === 'number' ? g.yourCountryRank : global.value.yourCountryRank,
        yourCountryAvgCompletion:
          typeof g.yourCountryAvgCompletion === 'number'
            ? g.yourCountryAvgCompletion
            : global.value.yourCountryAvgCompletion,
      }

      // Attach pace percentile to personal if provided
      if (typeof g.pacePercentileForUser === 'number') {
        personal.value.pacePercentile = g.pacePercentileForUser
      }
    }

    // 3) Build copy + blocks
    buildHeroCopy(rng)
    personalCards.value = buildPersonalCards(rng)
    globalBlocks.value = buildGlobalBlocks(rng)

    personalReady.value = true

    // 4) Charts
    await nextTick()
    renderPersonalCharts(rng)

    // 5) If global blocks have charts, they may need a second tick for refs
    await nextTick()
    renderPersonalCharts(rng)
  } catch (e) {
    console.error('DailyAnalytics load error:', e)
    // still show something minimal
    personalReady.value = true
    personalCards.value = buildPersonalCards(mulberry32(seed + 1))
    globalBlocks.value = buildGlobalBlocks(mulberry32(seed + 2))
    await nextTick()
    renderPersonalCharts(mulberry32(seed + 3))
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
  return { ...blockStyle(block), ...blockStyleComputed(block) }
}
function blockStyle(block) {
  // exposed to template (kept small)
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
  height: 100vh;
  overflow: hidden;
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
  width: 42%;
  background: #0d0f11;
  color: white;
  padding: 38px 44px 28px;
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
  width: 86px;
  height: 86px;
  outline: 1.5px solid #000;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.08);
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

.primary-stats-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1.35fr 1fr 1fr;
  gap: 12px;
}

.stat-card {
  background: #14181d;
  border-radius: 18px;
  padding: 14px 12px 12px;
  position: relative;
  overflow: hidden;
}
.stat-card.large {
  min-height: 190px;
}
.stat-card.medium {
  min-height: 170px;
}

.stat-label {
  margin: 0 0 10px;
  font-size: 12px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  opacity: 0.75;
}

.canvas-wrap {
  height: 108px;
  width: 100%;
  position: relative;
}

.stat-value {
  position: absolute;
  left: 50%;
  bottom: 34px;
  transform: translateX(-50%);
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.2px;
}
.stat-value.small {
  font-size: 16px;
}

.stat-foot {
  position: absolute;
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
  font-size: 12px;
  opacity: 0.7;
  text-align: center;
  width: 92%;
  line-height: 1.35;
}

.personal-dynamics {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 150px 260px;
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
  padding: 12px 12px 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  position: relative;
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
  height: 200px;
}
.chart-caption {
  margin: 8px 4px 0;
  font-size: 12px;
  opacity: 0.68;
  line-height: 1.45;
}

.left-footer {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}
.cta {
  background: #111;
  color: #fff;
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
  width: 58%;
  background: #fff;
  color: #111;
  padding: 30px 34px 26px;
  overflow-y: auto;
  position: relative;
}

.right-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 14px;
  margin-bottom: 14px;
}

.g-title {
  margin: 0;
  font-size: 46px;
  font-weight: 900;
  font-style: italic;
  letter-spacing: -0.6px;
}
.g-sub {
  margin: 8px 0 0;
  font-size: 14px;
  opacity: 0.72;
  line-height: 1.55;
  max-width: 44rem;
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
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  grid-auto-rows: 110px;
  gap: 12px;
  grid-auto-flow: dense;
}

.g-block {
  background: #f7f7fa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  padding: 14px 14px 12px;
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
  line-height: 1.55;
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
  padding: 9px 10px;
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
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
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
</style>
