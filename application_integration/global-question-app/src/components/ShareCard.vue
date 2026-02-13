<template>
  <div class="share-card" :class="{ compact: isCompact }">
    <!-- Top row -->
    <div class="top">
      <div class="brand">
        <!-- Square logo with white outline -->
        <img src="/logo-800-full.svg" class="logo" alt="Akinto" />
        <div class="brand-text">
          <div class="akinto">AKINTO</div>
          <div class="tag">A game of Common Knowledge.</div>
        </div>
      </div>

      <div class="meta">
        <div class="date">{{ date }}</div>
        <div class="sample" :class="{ warn: sampleTier !== 'strong' }">
          {{ sampleLabel }}
        </div>
      </div>
    </div>

    <!-- Primary stats -->
    <div class="stats">
      <div class="stat completion">
        <div class="label">Completion</div>
        <div class="value">{{ completion }}%</div>
      </div>

      <div class="stat accuracy">
        <div class="label">Accuracy</div>
        <div class="value">{{ accuracy }}%</div>
      </div>

      <div class="stat pace">
        <div class="label">Pace</div>
        <div class="value pace-val">{{ paceText }}</div>
      </div>
    </div>

    <div class="completion-copy">
      <div class="headline">{{ completionHeadline }}</div>
      <div class="sub">{{ completionSubline }}</div>
    </div>

    <!-- Brag strip -->
    <div class="brag">
      <div class="brag-left">
        <div class="kicker">Daily Score</div>
        <div class="score">{{ dailyScore }}</div>
        <div class="micro">{{ scoreLine }}</div>
      </div>

      <div class="brag-right">
        <div class="kicker">Global Snapshot</div>
        <div class="lines">
          <div class="line">
            <span class="dim">Players today</span>
            <span class="strong">{{ totalPlayersLabel }}</span>
          </div>

          <div class="line" v-if="hasWorldAverages">
            <span class="dim">World avg</span>
            <span class="strong">
              {{ avgCompletionLabel }} completion · {{ avgAccuracyLabel }} accuracy
            </span>
          </div>

          <div class="line" v-else>
            <span class="dim">World avg</span>
            <span class="strong">Calibrating…</span>
          </div>

          <div class="line">
            <span class="dim">{{ countryComparisonTitle }}</span>
            <span class="strong">{{ countryComparisonLine }}</span>
          </div>

          <div class="line" v-if="yourCountryRank !== null">
            <span class="dim">Country rank</span>
            <span class="strong">{{ rankLine }}</span>
          </div>

          <div class="line" v-else>
            <span class="dim">Country rank</span>
            <span class="strong">Not enough data yet</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Top countries -->
    <div class="leaders">
      <div class="leaders-head">
        <div class="leaders-title">Top countries today</div>
        <div class="leaders-sub">by average completion</div>
      </div>

      <div class="leaders-grid" v-if="topCountries.length">
        <div class="row" v-for="(c, i) in topCountries" :key="c.country + '_' + i">
          <div class="left">
            <span class="rank">{{ i + 1 }}</span>
            <span class="name">{{ c.name }}</span>
          </div>
          <div class="right">{{ c.value }}%</div>
        </div>
      </div>

      <div class="leaders-empty" v-else>Leaderboard is still warming up — check back shortly.</div>
    </div>

    <div class="footer">akinto.io</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  date: String,
  completion: Number,
  accuracy: Number,
  pace: String,
  completionReason: String,
  dailyScore: Number,
  countryName: String,
  global: Object,
  pacePercentile: Number,
})

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

function pct(n) {
  const x = Number(n)
  if (!isFinite(x)) return null
  return clamp(Math.round(x), 0, 100)
}

/**
 * Daily Score (same spirit as your global tile):
 * 0.50 * completion + 0.30 * accuracy + 0.20 * pacePercentile (or 50 if null)
 */
const dailyScore = computed(() => {
  return typeof props.dailyScore === 'number' ? props.dailyScore : 0
})

const scoreLine = computed(() => {
  const c = pct(props.completion) ?? 0
  const a = pct(props.accuracy) ?? 0
  const p =
    typeof props.pacePercentile === 'number'
      ? clamp(Math.round(props.pacePercentile), 0, 100)
      : null

  if (p === null) return `Built from completion + accuracy (pace calibrating).`
  if (p >= 80) return `High score energy — pace carried.`
  if (p >= 60) return `Strong balance across the board.`
  return `Solid score — pace has room to run.`
})

/** Sample-size / credibility badge */
const sampleTier = computed(() => {
  const n = props.global?.totalPlayers
  if (typeof n !== 'number') return 'none'
  if (n >= 50) return 'strong'
  if (n >= 15) return 'ok'
  if (n >= 5) return 'light'
  return 'tiny'
})

const sampleLabel = computed(() => {
  const n = props.global?.totalPlayers
  if (typeof n !== 'number') return `Sample: —`
  if (n < 5) return `Sample: early (${n})`
  if (n < 15) return `Sample: building (${n})`
  return `Sample: ${n} players`
})

const isCompact = computed(() => {
  const n = props.global?.totalPlayers
  // compact when we have very little global data (keeps it tidy)
  return typeof n === 'number' && n < 5
})

/** Global labels */
const totalPlayersLabel = computed(() => {
  const n = props.global?.totalPlayers
  return typeof n === 'number' ? `${n}` : '—'
})

const hasWorldAverages = computed(() => {
  return (
    typeof props.global?.avgCompletion === 'number' || typeof props.global?.avgAccuracy === 'number'
  )
})

const avgCompletionLabel = computed(() => {
  const v = pct(props.global?.avgCompletion)
  return v === null ? '—' : `${v}%`
})

const avgAccuracyLabel = computed(() => {
  const v = pct(props.global?.avgAccuracy)
  return v === null ? '—' : `${v}%`
})

/** Country comparison + narrative */
const countryComparisonTitle = computed(() => {
  return props.countryName ? `${props.countryName} vs world` : `Your country vs world`
})

const countryComparisonLine = computed(() => {
  const you = pct(props.yourCountryAvgCompletion)
  const world = pct(props.global?.avgCompletion)

  if (you === null && world === null) return 'Calibrating…'
  if (you !== null && world === null) return `${you}% completion (world loading)`
  if (you === null && world !== null) return `World ${world}% (set country for comparison)`
  return `${you}% vs ${world}% completion`
})

const rankLine = computed(() => {
  const r = props.global?.yourCountryRank
  if (typeof r !== 'number') return ''
  return `#${r} today`
})

/** Top 3 countries */
const topCountries = computed(() => {
  const arr = Array.isArray(props.global?.countryLeaderboard)
    ? props.global?.countryLeaderboard
    : []
  return arr
    .filter((x) => x && (x.name || x.country))
    .slice(0, 3)
    .map((x) => ({
      country: String(x.country || ''),
      name: String(x.name || x.country || '—'),
      value: pct(x.value) ?? 0,
    }))
})
</script>

<style scoped>
/* Card container */
.share-card {
  width: 1200px;
  height: 630px;
  background:
    radial-gradient(1200px 630px at 20% 15%, rgba(255, 255, 255, 0.08), transparent 55%),
    linear-gradient(135deg, #0d0f11 0%, #14181d 100%);
  color: #fff;
  padding: 56px 56px 44px;
  border-radius: 32px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
}

.share-card.compact {
  gap: 18px;
}

/* Top */
.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  width: 74px;
  height: 74px;
  border-radius: 8px; /* square-ish */
  outline: 2px solid rgba(255, 255, 255, 0.9); /* white outline */
  outline-offset: 0px;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.akinto {
  font-size: 40px;
  font-weight: 900;
  letter-spacing: -1px;
  line-height: 1;
}

.tag {
  font-size: 15px;
  opacity: 0.72;
}

.meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.date {
  font-size: 16px;
  opacity: 0.7;
}

.sample {
  font-size: 12px;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  opacity: 0.95;
}

.sample.warn {
  background: rgba(255, 255, 255, 0.06);
  opacity: 0.85;
}

/* Primary stats */
.stats {
  display: flex;
  justify-content: space-between;
  gap: 26px;
  margin-top: 6px;
}

.stat {
  flex: 1;
  padding: 26px 28px;
  border-radius: 22px;
  text-align: left;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.45);
}

.completion {
  background: linear-gradient(180deg, #34e3a0, #1fbf85);
}
.accuracy {
  background: linear-gradient(180deg, #6d8cff, #4b63ff);
}
.pace {
  background: linear-gradient(180deg, #ffd36a, #ffb547);
  color: #111;
}

.label {
  font-size: 14px;
  font-weight: 800;
  opacity: 0.9;
  letter-spacing: 0.2px;
}

.value {
  font-size: 40px;
  font-weight: 950;
  margin-top: 10px;
  letter-spacing: -0.8px;
  line-height: 1;
}

.pace-val {
  font-size: 44px; /* pace reads better */
}

/* Brag strip */
.brag {
  display: grid;
  grid-template-columns: 0.55fr 1.45fr;
  gap: 18px;
}

.brag-left,
.brag-right {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 18px 18px;
}

.kicker {
  font-size: 12px;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  opacity: 0.7;
  font-weight: 800;
}

.score {
  margin-top: 8px;
  font-size: 44px; /* reduced */
  font-weight: 950;
  letter-spacing: -0.6px;
  line-height: 1.05;
}

.micro {
  margin-top: 8px;
  font-size: 13px;
  opacity: 0.78;
  line-height: 1.35;
}

.lines {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.line {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 13px;
}

.dim {
  opacity: 0.68;
}

.strong {
  font-weight: 800;
  opacity: 0.95;
}

/* Leaders */
.leaders {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 16px 18px;
}

.leaders-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.leaders-title {
  font-weight: 900;
  font-size: 16px;
  letter-spacing: -0.2px;
}

.leaders-sub {
  font-size: 12px;
  opacity: 0.65;
}

.leaders-grid {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 10px 12px;
}

.left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.rank {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 900;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.name {
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 520px;
}

.right {
  font-size: 13px;
  font-weight: 900;
  opacity: 0.95;
}

.leaders-empty {
  margin-top: 10px;
  font-size: 13px;
  opacity: 0.72;
}

/* Footer */
.footer {
  text-align: right;
  font-size: 16px;
  font-weight: 800;
  opacity: 0.85;
  margin-top: auto;
}
</style>
