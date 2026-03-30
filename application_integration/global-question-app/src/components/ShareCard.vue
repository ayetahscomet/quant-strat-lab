<template>
  <div class="share-card" :class="{ compact: isCompact }">
    <!-- Top row -->
    <div class="top">
      <div class="brand">
        <!-- Square logo with white outline -->
        <img src="/logo-800-full.svg" class="logo" alt="Akinto" />
        <div class="brand-text">
          <div class="akinto">Akinto</div>
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
        <div class="value">{{ safeCompletion }}%</div>
      </div>

      <div class="stat accuracy">
        <div class="label">Accuracy</div>
        <div class="value">{{ safeAccuracy }}%</div>
      </div>

      <div class="stat pace">
        <div class="label">Pace</div>
        <div class="value pace-val">{{ paceText }}</div>
      </div>
    </div>

    <div class="completion-copy">
      <div class="headline">{{ completionHeadline }}</div>
      <div class="subline">{{ completionSubline }}</div>
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
          <div class="line" v-if="hasWorldAverages">
            <span class="dim">World average</span>
            <span class="strong">
              {{ avgCompletionLabel }} completion · {{ avgAccuracyLabel }} accuracy
            </span>
          </div>

          <div class="line" v-else>
            <span class="dim">World average</span>
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

  // canonical metrics from engine
  completion: Number,
  accuracy: Number,
  dailyScore: Number,
  pace: String,
  pacePercentile: Number,
  completionReason: String,

  // country
  countryName: String,

  // full global object
  global: {
    type: Object,
    default: () => ({}),
  },
})

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

function pct(n) {
  const x = Number(n)
  if (!isFinite(x)) return null
  return clamp(Math.round(x), 0, 100)
}

const safeCompletion = computed(() => clamp(Math.round(Number(props.completion) || 0), 0, 100))

const safeAccuracy = computed(() => clamp(Math.round(Number(props.accuracy) || 0), 0, 100))

const paceText = computed(() => {
  if (props.pace) return props.pace
  return '—'
})

const completionHeadline = computed(() => {
  if (props.completionReason === 'solved') return 'Fully solved.'
  if (props.completionReason === 'engaged') return 'Strong coverage.'
  return 'Session logged.'
})

const completionSubline = computed(() => {
  if (props.completionReason === 'solved') return 'All required answers found.'
  if (props.completionReason === 'engaged') return 'You meaningfully worked the board.'
  return 'More windows, more signal.'
})

/**
 * Daily Score (same spirit as your global tile):
 * 0.50 * completion + 0.30 * accuracy + 0.20 * pacePercentile (or 50 if null)
 */
const dailyScore = computed(() => {
  const score = Number(props.dailyScore)
  if (isFinite(score)) return clamp(Math.round(score), 0, 100)
  return 0
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
  const you = pct(props.global?.yourCountryAvgCompletion)
  const world = pct(props.global?.avgCompletion)

  // no country selected
  if (!props.countryName) {
    return world !== null ? `World ${world}% (set country for comparison)` : 'Calibrating…'
  }

  // country selected but no data yet
  if (you === null && world === null) return 'Calibrating…'
  if (you !== null && world === null) return `${you}% (world loading)`
  if (you === null && world !== null) return `World ${world}%`

  return `${you}% vs ${world}% completion`
})

const yourCountryRank = computed(() => {
  return typeof props.global?.yourCountryRank === 'number' ? props.global.yourCountryRank : null
})

const rankLine = computed(() => {
  return yourCountryRank.value !== null ? `#${yourCountryRank.value} today` : ''
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
  height: 700px;
  background:
    radial-gradient(1200px 630px at 20% 15%, rgba(255, 255, 255, 0.08), transparent 55%),
    linear-gradient(135deg, #0d0f11 0%, #14181d 100%);
  color: #fff;
  padding: 56px 56px 44px;
  border-radius: 32px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Arial,
    sans-serif;
  box-sizing: border-box;
  overflow: hidden;
}

.share-card * {
  box-sizing: border-box;
}

.share-card.compact {
  gap: 18px;
}

/* Top */
.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.logo {
  width: 74px;
  height: 74px;
  outline: 2px solid rgba(255, 255, 255, 0.9);
  outline-offset: 0px;
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
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
  line-height: 1.35;
}

.meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.date {
  font-size: 16px;
  opacity: 0.7;
  text-align: right;
  line-height: 1.3;
}

.sample {
  font-size: 12px;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  opacity: 0.95;
  white-space: nowrap;
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
  margin-top: 18px;
}

.stat {
  flex: 1;
  padding: 26px 28px;
  border-radius: 22px;
  text-align: left;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.45);
  min-width: 0;
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
  font-size: 44px;
}

/* Completion copy */
.completion-copy {
  margin: 24px 0 28px;
}

.headline {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
}

.subline {
  margin-top: 6px;
  font-size: 15px;
  opacity: 0.75;
  line-height: 1.6;
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
  min-width: 0;
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
  font-size: 44px;
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
  text-align: right;
}

/* Leaders */
.leaders {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 22px 22px;
  margin-top: 18px;
}

.leaders-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
}

.leaders-title {
  font-weight: 900;
  font-size: 16px;
  letter-spacing: -0.2px;
}

.leaders-sub {
  font-size: 12px;
  opacity: 0.65;
  text-align: right;
}

.leaders-grid {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 14px 16px;
  gap: 16px;
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
  flex-shrink: 0;
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
  flex-shrink: 0;
}

.leaders-empty {
  margin-top: 10px;
  font-size: 13px;
  opacity: 0.72;
  line-height: 1.45;
}

/* Footer */
.footer {
  text-align: right;
  font-size: 16px;
  font-weight: 800;
  opacity: 0.85;
  margin-top: 22px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

/* =========================
   TABLET
========================= */
@media (max-width: 1100px) {
  .share-card {
    width: 960px;
    height: auto;
    min-height: 700px;
    padding: 42px 40px 34px;
  }

  .akinto {
    font-size: 36px;
  }

  .stats {
    gap: 18px;
  }

  .value {
    font-size: 36px;
  }

  .pace-val {
    font-size: 38px;
  }

  .brag {
    grid-template-columns: 0.7fr 1.3fr;
  }
}

/* =========================
   MOBILE / PORTRAIT
========================= */
@media (max-width: 768px) {
  .share-card {
    width: 100%;
    max-width: 100%;
    height: auto;
    min-height: auto;
    padding: 18px 18px 16px;
    border-radius: 24px;
    justify-content: flex-start;
    gap: 12px;
    overflow: hidden;
  }

  .top {
    gap: 12px;
    align-items: flex-start;
  }

  .brand {
    align-items: flex-start;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  .logo {
    width: 44px;
    height: 44px;
  }

  .brand-text {
    gap: 4px;
    min-width: 0;
  }

  .akinto {
    font-size: 20px;
    letter-spacing: -0.4px;
  }

  .tag {
    font-size: 10px;
    line-height: 1.25;
    max-width: 132px;
  }

  .meta {
    gap: 6px;
    align-items: flex-end;
    flex-shrink: 0;
  }

  .date {
    font-size: 10px;
    line-height: 1.1;
  }

  .sample {
    font-size: 9px;
    padding: 4px 6px;
    line-height: 1.05;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 6px;
  }

  .pace {
    grid-column: auto;
  }

  .stat {
    padding: 12px 12px;
    border-radius: 14px;
    min-height: 74px;
  }

  .label {
    font-size: 10px;
    line-height: 1.15;
  }

  .value {
    font-size: 20px;
    margin-top: 5px;
    line-height: 1;
  }

  .pace-val {
    font-size: 20px;
    line-height: 1;
  }

  .completion-copy {
    margin: 0;
  }

  .headline {
    font-size: 13px;
    line-height: 1.22;
  }

  .subline {
    margin-top: 2px;
    font-size: 11px;
    line-height: 1.28;
  }

  .brag {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .brag-left,
  .brag-right {
    padding: 12px 12px;
    border-radius: 14px;
  }

  .kicker {
    font-size: 10px;
    letter-spacing: 0.6px;
  }

  .score {
    margin-top: 6px;
    font-size: 28px;
    line-height: 1;
  }

  .micro {
    margin-top: 6px;
    font-size: 11px;
    line-height: 1.3;
  }

  .lines {
    margin-top: 8px;
    gap: 8px;
  }

  .line {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
    font-size: 11px;
  }

  .dim {
    max-width: 42%;
    line-height: 1.25;
  }

  .strong {
    max-width: 56%;
    text-align: right;
    line-height: 1.25;
    font-size: 11px;
  }

  .leaders {
    padding: 13px 14px;
    border-radius: 16px;
    margin-top: 0;
  }

  .leaders-head {
    flex-direction: row;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
  }

  .leaders-title {
    font-size: 13px;
  }

  .leaders-sub {
    font-size: 10px;
    text-align: right;
  }

  .leaders-grid {
    margin-top: 10px;
    gap: 8px;
  }

  .row {
    padding: 10px 12px;
    border-radius: 10px;
    gap: 10px;
  }

  .rank {
    width: 18px;
    height: 18px;
    font-size: 10px;
  }

  .name {
    max-width: 140px;
    font-size: 11px;
  }

  .right {
    font-size: 11px;
  }

  .leaders-empty {
    font-size: 11px;
    line-height: 1.35;
  }

  .footer {
    margin-top: 0;
    padding-top: 10px;
    font-size: 12px;
  }
}

/* =========================
   VERY SMALL MOBILE
========================= */
@media (max-width: 420px) {
  .share-card {
    padding: 16px 16px 14px;
    border-radius: 22px;
    gap: 10px;
  }

  .top {
    gap: 10px;
  }

  .logo {
    width: 42px;
    height: 42px;
  }

  .akinto {
    font-size: 20px;
  }

  .tag {
    font-size: 10px;
    max-width: 128px;
  }

  .date {
    font-size: 10px;
  }

  .sample {
    font-size: 9px;
    padding: 4px 6px;
  }

  .label {
    font-size: 9px;
    line-height: 1.1;
  }

  .stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .pace {
    grid-column: auto;
  }

  .stat {
    padding: 10px 10px;
    min-height: 68px;
    border-radius: 12px;
  }

  .value {
    font-size: 18px;
    margin-top: 4px;
  }

  .pace-val {
    font-size: 18px;
  }

  .headline {
    font-size: 13px;
  }

  .subline {
    font-size: 11px;
  }

  .score {
    font-size: 24px;
  }

  .micro {
    font-size: 10px;
  }

  .line {
    font-size: 10px;
  }

  .dim {
    max-width: 40%;
  }

  .strong {
    max-width: 58%;
    font-size: 10px;
  }

  .leaders-title {
    font-size: 12px;
  }

  .leaders-sub {
    font-size: 9px;
  }

  .name {
    max-width: 118px;
    font-size: 10px;
  }

  .right {
    font-size: 10px;
  }

  .footer {
    font-size: 11px;
  }
}
</style>
