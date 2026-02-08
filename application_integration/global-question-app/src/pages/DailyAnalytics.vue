<template>
  <div class="analytics-wrapper" :class="{ loading: isLoading }">
    <!-- ===================================================
         LEFT — PERSONAL
    =================================================== -->
    <section class="left-pane">
      <header class="left-header">
        <img src="/logo-800-full.svg" class="brand-logo" @click="goHome" />
        <div class="title-stack">
          <h1 class="title">Daily Analytics</h1>
          <p class="sub">{{ personalSubline }}</p>
        </div>
      </header>

      <!-- HERO -->
      <div class="hero-box" v-if="personalReady">
        <h2 class="hero-line">{{ heroHeadline }}</h2>
        <p class="hero-sub">{{ heroDescription }}</p>

        <div class="hero-pill-row">
          <span class="pill" v-if="personal.countryName">🌍 {{ personal.countryName }}</span>
          <span class="pill">🎯 {{ personal.attemptsTotal }} attempts</span>
          <span class="pill">💡 {{ personal.hintsUsed }} hints</span>
          <span class="pill">✅ {{ personal.uniqueCorrect }}/{{ personal.totalSlots }} found</span>
        </div>
      </div>

      <!-- RINGS -->
      <div class="primary-stats-grid" v-if="personalReady">
        <!-- COMPLETION -->
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

        <!-- ACCURACY -->
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

        <!-- PACE -->
        <div class="stat-card pace-card">
          <p class="stat-label">Pace</p>

          <div class="stat-row">
            <div class="ring-stack">
              <canvas ref="speedRing"></canvas>
              <span class="ring-center">
                {{
                  typeof personal.pacePercentile === 'number'
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

      <!-- PERSONAL CARDS -->
      <div class="personal-dynamics" v-if="personalReady">
        <div class="personal-card" v-for="card in personalCards" :key="card.id">
          <p class="card-kicker">{{ card.kicker }}</p>
          <h3 class="card-title">{{ card.title }}</h3>
          <p class="card-body">{{ card.body }}</p>
        </div>

        <div class="chart-dynamic">
          <div class="chart-head">
            <span class="chart-tag">{{ personalChartBlock.tag }}</span>
            <span class="chart-title">{{ personalChartBlock.title }}</span>
          </div>

          <canvas ref="personalChartCanvas"></canvas>
          <p class="chart-caption">{{ personalChartBlock.caption }}</p>
        </div>
      </div>

      <div class="left-footer">
        <button class="cta" @click="goHome">Back to Akinto</button>
        <p class="micro-note">This page locks for the day. Tomorrow tells a new story.</p>
      </div>
    </section>

    <!-- ===================================================
         RIGHT — GLOBAL
    =================================================== -->
    <section class="right-pane">
      <header class="right-header">
        <div>
          <h2 class="g-title">The Global Mind.</h2>
          <p class="g-sub">{{ globalSubline }}</p>
        </div>

        <button class="share-btn" @click="copyShareText">{{ shareBtnLabel }}</button>
      </header>

      <div class="global-grid" v-if="personalReady">
        <article
          v-for="block in globalBlocks"
          :key="block.id"
          class="g-block"
          :class="['tier-' + block.tier]"
          :style="blockStyle(block)"
        >
          <p class="g-kicker">{{ block.kicker }}</p>
          <h3 class="g-head">{{ block.title }}</h3>
          <p class="g-body" v-if="block.body">{{ block.body }}</p>

          <div v-if="block.mini" class="g-mini">
            <div class="g-mini-big">{{ block.mini.big }}</div>
            <div class="g-mini-sub">{{ block.mini.sub }}</div>
          </div>

          <div v-if="block.table" class="g-table">
            <div class="g-table-row g-table-head">
              <span>Country</span>
              <span>Avg</span>
            </div>

            <div class="g-table-row" v-for="(r, i) in block.table" :key="i">
              <span>{{ r[0] }}</span>
              <span>{{ r[1] }}</span>
            </div>
          </div>

          <div v-if="block.chart" class="g-chart">
            <canvas :ref="(el) => registerGlobalChartRef(el, block.id)"></canvas>
          </div>

          <p class="g-caption" v-if="block.caption">{{ block.caption }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Chart from 'chart.js/auto'
import { countries } from '@/data/countries.js'

/* -------------------------------------------------------
   ROUTING
------------------------------------------------------- */
const router = useRouter()
function goHome() {
  router.push('/')
}

/* -------------------------------------------------------
   COUNTRY MAP
------------------------------------------------------- */
const COUNTRY_MAP = Object.fromEntries(countries.map((c) => [c.code.toLowerCase(), c.name]))

function countryName(code) {
  return COUNTRY_MAP[String(code || '').toLowerCase()] || code
}

/* -------------------------------------------------------
   STATE
------------------------------------------------------- */
const isLoading = ref(true)
const personalReady = ref(false)

const personal = ref({})
const global = ref({})

const personalSubline = ref('')
const globalSubline = ref('')
const heroHeadline = ref('')
const heroDescription = ref('')
const completionFoot = ref('')
const accuracyFoot = ref('')
const speedFoot = ref('')

const personalCards = ref([])
const personalChartBlock = ref({})

const globalBlocks = ref([])

/* -------------------------------------------------------
   FETCH
------------------------------------------------------- */
async function fetchPersonalAnalytics() {
  const r = await fetch('/api/load-personal-analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: localStorage.akinto_user_id }),
  })
  return r.json()
}

async function fetchGlobalAnalytics() {
  const r = await fetch('/api/load-global-analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  return r.json()
}

/* -------------------------------------------------------
   RINGS
------------------------------------------------------- */
const completionRing = ref(null)
const accuracyRing = ref(null)
const speedRing = ref(null)
const personalChartCanvas = ref(null)

let chartInstances = []

function destroyCharts() {
  chartInstances.forEach((c) => c.destroy())
  chartInstances = []
}

/* -------------------------------------------------------
   COMPUTED
------------------------------------------------------- */
const displayCompletion = computed(() => Math.round(personal.value.completion || 0))
const displayAccuracy = computed(() => Math.round(personal.value.accuracy || 0))
const displaySpeed = computed(() =>
  typeof personal.value.pacePercentile === 'number' ? Math.round(personal.value.pacePercentile) : 0,
)

/* -------------------------------------------------------
   SHARE
------------------------------------------------------- */
const shareBtnLabel = ref('Copy Share Text')

async function copyShareText() {
  const p = personal.value

  const txt = [
    `Akinto — ${p.dateKey}`,
    `Completion: ${p.completion}%`,
    `Accuracy: ${p.accuracy}%`,
    p.pacePercentile
      ? `Pace: faster than ${p.pacePercentile}%`
      : `Solve time: ${Math.round(p.paceSeconds / 60)}m`,
    'akinto.io',
  ].join('\n')

  await navigator.clipboard.writeText(txt)
  shareBtnLabel.value = 'Copied ✓'
}

/* -------------------------------------------------------
   MAIN LOAD
------------------------------------------------------- */
onMounted(async () => {
  const p = await fetchPersonalAnalytics()
  const g = await fetchGlobalAnalytics()

  personal.value = {
    ...p.profile,
    ...p.derived,
    dateKey: p.dateKey,
    totalSlots: p.question.answerCount,
    countryName: countryName(p.profile.Country),
  }

  global.value = g

  heroHeadline.value =
    personal.value.completion === 100
      ? 'Perfect day.'
      : personal.value.completion > 70
        ? 'Strong showing.'
        : 'Tomorrow resets the board.'

  heroDescription.value =
    typeof personal.value.pacePercentile === 'number'
      ? `You solved faster than ${personal.value.pacePercentile}% of players today.`
      : `You took ${Math.round(personal.value.paceSeconds / 60)} minutes to work through the puzzle.`

  completionFoot.value = `You found ${personal.value.uniqueCorrect}/${personal.value.totalSlots}.`

  accuracyFoot.value = `Whilst this is a game of learning not accuracy, it's good to know — ${personal.value.accuracy}%.`

  speedFoot.value =
    typeof personal.value.pacePercentile === 'number'
      ? `You were quicker than ${personal.value.pacePercentile}% of today’s players.`
      : `You took your time understanding today’s question — that’s something this game rewards.`

  personalCards.value = [
    {
      id: 'a',
      kicker: 'Micro-flex',
      title: personal.value.hintsUsed === 0 ? 'No training wheels.' : 'Hints deployed.',
      body:
        personal.value.hintsUsed === 0
          ? 'Raw recall. Dangerous behaviour.'
          : `Hints used: ${personal.value.hintsUsed}.`,
    },
    {
      id: 'b',
      kicker: 'Accuracy check',
      title: personal.value.accuracy > 85 ? 'Sniper energy.' : 'Learning mode.',
      body: `${personal.value.uniqueCorrect} correct from ${personal.value.submittedUnique} unique attempts.`,
    },
  ]

  globalBlocks.value =
    g.countryLeaderboard?.map((c, i) => ({
      id: `g${i}`,
      kicker: 'Leaderboard',
      title: `${i + 1}. ${countryName(c.country)}`,
      body: '',
      tier: 'major',
      table: [[countryName(c.country), `${c.value}%`]],
      caption: 'Global completion averages.',
    })) || []

  personalReady.value = true
  isLoading.value = false
})
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
