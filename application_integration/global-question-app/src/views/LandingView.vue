<!-- src/views/LandingView.vue -->
<template>
  <div class="landing-page">
    <div class="landing">
      <div class="landing-inner">
        <div class="brand-row">
          <img class="logo" src="/logo-800-full.svg" alt="Akinto logo" />
          <div class="text-block">
            <h1 class="app-name">Akinto</h1>
            <p class="motto">A Global Knowledge Game</p>
          </div>
        </div>

        <p class="hero-kicker">One question. Many countries.</p>

        <p class="hero-copy">
          Play today’s board and see how your country compares with the world.
        </p>

        <div v-if="hasAttributionContext" class="context-pill">
          <span v-if="landingContext.ref">
            Invited via <strong>{{ landingContext.ref }}</strong>
          </span>
          <span v-else-if="landingContext.creator">
            Shared by <strong>{{ landingContext.creator }}</strong>
          </span>
          <span v-else-if="landingContext.seedCountry">
            Seeded for <strong>{{ getName(landingContext.seedCountry) }}</strong>
          </span>
          <span v-else-if="landingContext.seedRegion">
            Opened from <strong>{{ landingContext.seedRegion }}</strong>
          </span>
          <span v-else-if="landingContext.campus">
            Opened from <strong>{{ landingContext.campus }}</strong>
          </span>
          <span v-else-if="landingContext.campaign">
            Campaign <strong>{{ landingContext.campaign }}</strong>
          </span>
        </div>

        <div class="live-board-card">
          <div class="live-board-top">
            <div>
              <p class="live-board-label">You’re joining a global board</p>
              <h2 class="live-board-title">This week’s board</h2>
            </div>
            <span class="live-badge" v-if="landingBoard.updatedLive">Updated live</span>
          </div>

          <p class="live-board-sub">
            <template v-if="landingBoardLoading"> Loading countries joined this week… </template>
            <template v-else-if="landingBoard.weeklyCountryCount > 0">
              Players have joined from {{ landingBoard.weeklyCountryCount }}
              {{ landingBoard.weeklyCountryCount === 1 ? 'country' : 'countries' }}.
            </template>
            <template v-else> Be one of the first countries on this week’s board. </template>
          </p>

          <div v-if="landingBoard.weeklyCountries.length" class="live-country-list">
            <div v-for="code in visibleWeeklyCountries" :key="code" class="live-country-pill">
              <img :src="getFlag(code)" :alt="`${getName(code)} flag`" />
              <span>{{ getName(code) }}</span>
            </div>
          </div>

          <p class="live-country-empty" v-else-if="!landingBoardLoading">
            No countries showing yet.
          </p>
        </div>

        <button class="play-btn" :disabled="!country" @click="goToGame">Play</button>
        <p class="gate-note" v-if="!country">Select your country to join the global board.</p>

        <p class="date">{{ today }}</p>

        <div class="country-row" @click="toggleDropdown">
          <div class="flag-circle" :class="{ empty: !country }">
            <img v-if="country" :src="getFlag(country)" :alt="`${getName(country)} flag`" />
          </div>

          <span class="country-text">
            {{ country ? getName(country) : 'Select your country' }}
          </span>
          <span class="chevron">▼</span>
        </div>

        <div v-if="showDropdown" class="dropdown-wrapper" @click="closeDropdown">
          <div class="country-select-container" @click.stop>
            <input
              class="dropdown-search"
              v-model="search"
              type="text"
              placeholder="Search country…"
              autocomplete="off"
            />

            <div class="dropdown-list">
              <div
                v-for="c in filteredCountries"
                :key="c.code"
                class="dropdown-item"
                @click="selectCountry(c.code)"
              >
                <img class="drop-flag" :src="getFlag(c.code)" :alt="`${c.name} flag`" />
                <span>{{ c.name }}</span>
              </div>

              <div v-if="filteredCountries.length === 0" class="no-results">No matches.</div>
            </div>
          </div>
        </div>

        <p class="micro" v-if="country">
          Your country is used to place you on today’s board and compare your answers with the
          world.
        </p>
      </div>
    </div>

    <section class="seo-hero" ref="seoHero">
      <div class="seo-inner">
        <header class="seo-head">
          <h2>Akinto - The Global Daily Knowledge Game</h2>
          <p class="seo-sub">See how your country compares.</p>
        </header>

        <p class="seo-lead">
          Akinto is not just a solo trivia game. Each day, players across different countries face
          the same carefully designed question, allowing you to compare your thinking with your
          country and with the wider world.
        </p>

        <p class="seo-lead">
          What some call facts, we call globally common knowledge. The aim is not only to answer,
          but to reflect, return, and understand how different places approached the same prompt.
        </p>

        <div class="seo-cols">
          <div class="seo-col">
            <h3>How it works</h3>
            <ul>
              <li><strong>One question daily:</strong> a single curated challenge for everyone</li>
              <li><strong>Country-based comparison:</strong> see how your country performed</li>
              <li>
                <strong>Global perspective:</strong> compare your answers with players worldwide
              </li>
            </ul>
          </div>

          <div class="seo-col">
            <h3>Why it feels different</h3>
            <p>Akinto is built around a different kind of daily puzzle:</p>
            <ul>
              <li><strong>Discovery</strong> over memorisation</li>
              <li><strong>Reflection</strong> over speed</li>
              <li><strong>Global comparison</strong> over isolated play</li>
              <li><strong>Curiosity</strong> over empty competition</li>
            </ul>
          </div>

          <div class="seo-col seo-cta">
            <h3>Join today</h3>
            <p>
              Choose your country, play today’s board, and see how your perspective compares with
              players around the world.
            </p>
            <button class="seo-play" @click="goToGame">Play today’s puzzle</button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { countries } from '../data/countries.js'
import { useHead } from '@vueuse/head'

useHead({
  title: 'Akinto – The Global Daily Knowledge Game',
  meta: [
    {
      name: 'description',
      content:
        'Akinto is a daily global knowledge puzzle where players worldwide explore geography, culture and global thinking together.',
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: 'https://akinto.io/',
    },
  ],
})

const router = useRouter()
const seoHero = ref(null)
let seoObserver = null

const country = ref('')
const showDropdown = ref(false)
const search = ref('')

const landingBoardLoading = ref(true)
const landingBoard = ref({
  updatedLive: true,
  weeklyCountries: [],
  weeklyCountryCount: 0,
  todayCountries: [],
  todayCountryCount: 0,
  todayPlayerCount: 0,
})

const landingContext = ref({
  ref: '',
  campaign: '',
  seedCountry: '',
  creator: '',
  seedRegion: '',
  campus: '',
})

const hasAttributionContext = computed(() => {
  const ctx = landingContext.value
  return !!(
    ctx.ref ||
    ctx.campaign ||
    ctx.seedCountry ||
    ctx.creator ||
    ctx.seedRegion ||
    ctx.campus
  )
})

const visibleWeeklyCountries = computed(() => landingBoard.value.weeklyCountries.slice(0, 8))

const today = computed(() =>
  new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
)

function normaliseCode(code) {
  return String(code || '')
    .trim()
    .toLowerCase()
}

function getFlag(code) {
  const c = normaliseCode(code)
  return c ? `https://flagcdn.com/${c}.svg` : ''
}

function getName(code) {
  const c = normaliseCode(code)
  return countries.find((x) => normaliseCode(x.code) === c)?.name || 'Unknown'
}

const filteredCountries = computed(() => {
  const q = String(search.value || '')
    .trim()
    .toLowerCase()

  if (!q) return countries

  return countries.filter((c) =>
    String(c.name || '')
      .toLowerCase()
      .includes(q),
  )
})

function persistCountry(code) {
  const c = normaliseCode(code)
  if (!c) return

  localStorage.setItem('akinto_country', c)
  document.cookie = `akinto_country=${c}; path=/; max-age=31536000`
}

function persistAttributionValue(key, value) {
  if (!value) return
  localStorage.setItem(key, value)
  sessionStorage.setItem(key, value)
}

function readStoredLandingContext() {
  landingContext.value = {
    ref: localStorage.getItem('akinto_pending_referral') || '',
    campaign: localStorage.getItem('akinto_campaign') || '',
    seedCountry: localStorage.getItem('akinto_seed_country') || '',
    creator: localStorage.getItem('akinto_creator') || '',
    seedRegion: localStorage.getItem('akinto_seed_region') || '',
    campus: localStorage.getItem('akinto_seed_campus') || '',
  }
}

async function loadLandingBoard() {
  try {
    landingBoardLoading.value = true

    const res = await fetch('/api/load-landing-board')
    if (!res.ok) return

    const data = await res.json()

    landingBoard.value = {
      updatedLive: !!data.updatedLive,
      weeklyCountries: Array.isArray(data.weeklyCountries) ? data.weeklyCountries : [],
      weeklyCountryCount: Number(data.weeklyCountryCount || 0),
      todayCountries: Array.isArray(data.todayCountries) ? data.todayCountries : [],
      todayCountryCount: Number(data.todayCountryCount || 0),
      todayPlayerCount: Number(data.todayPlayerCount || 0),
    }
  } catch (err) {
    console.error('Failed to load landing board', err)
  } finally {
    landingBoardLoading.value = false
  }
}

function cleanAttributionParamsFromUrl() {
  const url = new URL(window.location.href)

  const keysToRemove = ['src', 'ref', 'campaign', 'seedCountry', 'creator', 'seedRegion', 'campus']

  let changed = false

  for (const key of keysToRemove) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }

  if (!changed) return

  const nextUrl = `${url.pathname}${url.search ? `?${url.searchParams.toString()}` : ''}${url.hash || ''}`
  window.history.replaceState({}, document.title, nextUrl)
}

function selectCountry(code) {
  const c = normaliseCode(code)
  country.value = c
  persistCountry(c)
  search.value = ''
  showDropdown.value = false
}

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function closeDropdown() {
  showDropdown.value = false
  search.value = ''
}

function goToGame() {
  if (!country.value) {
    showDropdown.value = true
    return
  }

  router.push('/play')
}

function handleLandingKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    goToGame()
  }

  if (e.key === 'Escape') closeDropdown()
}

function captureLandingParams() {
  const params = new URLSearchParams(window.location.search)

  const srcRaw = params.get('src')
  const src = String(srcRaw || '').trim()

  if (src && /^[a-z0-9_]{1,64}$/i.test(src)) {
    persistAttributionValue('akinto_source', src)
  }

  const refRaw = params.get('ref')
  const referralCode = String(refRaw || '').trim()

  if (referralCode && /^[a-z0-9_-]{4,64}$/i.test(referralCode)) {
    localStorage.setItem('akinto_pending_referral', referralCode)
    sessionStorage.setItem('akinto_pending_referral', referralCode)
  }

  const campaignRaw = params.get('campaign')
  const campaign = String(campaignRaw || '').trim()

  if (campaign && /^[a-z0-9_-]{1,64}$/i.test(campaign)) {
    persistAttributionValue('akinto_campaign', campaign)
  }

  const seedCountryRaw = params.get('seedCountry')
  const seedCountry = normaliseCode(seedCountryRaw)

  if (seedCountry && countries.some((c) => normaliseCode(c.code) === seedCountry)) {
    persistAttributionValue('akinto_seed_country', seedCountry)
  }

  const creatorRaw = params.get('creator')
  const creator = String(creatorRaw || '').trim()

  if (creator && /^[a-z0-9 _-]{1,64}$/i.test(creator)) {
    persistAttributionValue('akinto_creator', creator)
  }

  const seedRegionRaw = params.get('seedRegion')
  const seedRegion = String(seedRegionRaw || '').trim()

  if (seedRegion && /^[a-z0-9 _-]{1,64}$/i.test(seedRegion)) {
    persistAttributionValue('akinto_seed_region', seedRegion)
  }

  const campusRaw = params.get('campus')
  const campus = String(campusRaw || '').trim()

  if (campus && /^[a-z0-9 _-]{1,64}$/i.test(campus)) {
    persistAttributionValue('akinto_seed_campus', campus)
  }

  readStoredLandingContext()
  cleanAttributionParamsFromUrl()
}

onMounted(async () => {
  captureLandingParams()
  await loadLandingBoard()

  const existing = localStorage.getItem('akinto_country')
  if (existing) {
    country.value = normaliseCode(existing)
  }

  window.addEventListener('keydown', handleLandingKey)

  seoObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        document.body.classList.add('dark-bg')
      } else {
        document.body.classList.remove('dark-bg')
      }
    },
    { threshold: 0.2 },
  )

  if (seoHero.value) {
    seoObserver.observe(seoHero.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleLandingKey)

  if (seoObserver && seoHero.value) {
    seoObserver.unobserve(seoHero.value)
  }

  document.body.classList.remove('dark-bg')
})
</script>

<style scoped>
:global(body) {
  background: #fff;
  margin: 0;
  color: #242227;
  font-family:
    system-ui,
    -apple-system,
    Arial,
    sans-serif;
}

.landing-page {
  width: 100%;
}

.landing {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 36px 0;
}

.landing-inner {
  text-align: center;
  width: min(92vw, 760px);
}

.brand-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 32px;
}

.logo {
  width: 110px;
  height: 110px;
  outline: 1.5px solid #242227;
}

.text-block {
  text-align: left;
}

.app-name {
  font-size: 46px;
  font-weight: 600;
  margin: 0;
  line-height: 1;
  color: #242227;
}

.motto {
  margin-top: 15px;
  font-size: 17px;
  opacity: 0.65;
  color: #242227;
}

.hero-kicker {
  margin: 26px 0 0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #242227;
}

.hero-copy {
  margin: 12px auto 0;
  max-width: 560px;
  font-size: 18px;
  line-height: 1.5;
  color: #242227;
  opacity: 0.82;
}

.context-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 18px;
  padding: 10px 14px;
  border-radius: 999px;
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  font-size: 13px;
  color: #242227;
  max-width: 90%;
  line-height: 1.35;
}

.context-pill strong {
  font-weight: 700;
}

.live-board-card {
  margin: 24px auto 0;
  width: min(100%, 640px);
  padding: 20px 20px 18px;
  border-radius: 20px;
  border: 1px solid #d9d9d9;
  background: radial-gradient(circle at top left, rgba(0, 0, 0, 0.035), transparent 45%), #fafafa;
  text-align: left;
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.06);
}

.live-board-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.live-board-label {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.6;
}

.live-board-title {
  margin: 6px 0 0;
  font-size: 26px;
  line-height: 1.1;
  color: #242227;
}

.live-badge {
  flex-shrink: 0;
  padding: 8px 10px;
  border-radius: 999px;
  background: #111;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.live-board-sub {
  margin: 14px 0 0;
  font-size: 15px;
  line-height: 1.5;
  color: #242227;
  opacity: 0.82;
}

.live-country-list {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.live-country-pill {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #dddddd;
  font-size: 14px;
  color: #242227;
}

.live-country-pill img {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
}

.live-country-empty {
  margin-top: 16px;
  font-size: 14px;
  opacity: 0.6;
}

.play-btn {
  margin-top: 28px;
  padding: 12px 68px;
  background: #000;
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition:
    transform 0.12s ease,
    opacity 0.12s ease;
}

.play-btn:hover {
  opacity: 0.92;
  transform: translateY(-2px);
}

.play-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  transform: none;
}

.seo-col li strong {
  color: #f0e68c;
  font-weight: 700;
}

.gate-note {
  margin: 10px 0 0;
  font-size: 13px;
  opacity: 0.7;
}

.date {
  margin-top: 18px;
  font-size: 14px;
  opacity: 0.65;
  color: #242227;
}

.country-row {
  margin-top: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  color: #242227;
  user-select: none;
}

.flag-circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #242227;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.flag-circle img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.flag-circle.empty {
  background: #ffffff;
  border: 2px solid #242227;
}

.country-text {
  font-size: 15px;
  color: #242227;
}

.chevron {
  font-size: 14px;
  color: #242227;
}

.country-row:hover .flag-circle {
  transform: scale(1.05);
  transition: 0.15s;
}

.dropdown-wrapper {
  position: fixed;
  inset: 0;
  background: transparent;
  backdrop-filter: none;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 28vh;
  z-index: 50;
}

.country-select-container {
  width: 260px;
  background: white;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.14);
  animation: dropdownPop 0.35s cubic-bezier(0.17, 0.85, 0.44, 1);
}

.dropdown-search {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #111;
  border-radius: 10px;
  font-size: 15px;
  margin-bottom: 8px;
  outline: none;
}

.dropdown-search:focus {
  border-color: #000;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.15);
}

.dropdown-list {
  max-height: 210px;
  overflow-y: auto;
  border: 1px solid #ccc;
  border-radius: 10px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 8px;
  font-size: 14px;
  color: #242227;
}

.dropdown-item:hover {
  background: #f3f3f3;
}

.drop-flag {
  width: 20px;
  border-radius: 3px;
}

.no-results {
  padding: 12px;
  text-align: center;
  opacity: 0.6;
  font-size: 14px;
}

.micro {
  margin-top: 12px;
  font-size: 12px;
  opacity: 0.55;
}

.seo-hero {
  width: 100%;
  background: #000;
  color: #fff;
  padding: 120px 24px 140px;
}

.seo-inner {
  max-width: 1180px;
  margin: 0 auto;
}

.seo-head h2 {
  font-size: 44px;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.02em;
}

.seo-sub {
  margin-top: 12px;
  font-size: 18px;
  opacity: 0.7;
}

.seo-lead {
  max-width: 760px;
  margin-top: 36px;
  font-size: 19px;
  line-height: 1.6;
  opacity: 0.85;
}

.seo-cols {
  margin-top: 70px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 42px;
}

.seo-col h3 {
  font-size: 20px;
  margin-bottom: 16px;
}

.seo-col p {
  font-size: 15px;
  line-height: 1.6;
  opacity: 0.8;
}

.seo-col ul {
  padding-left: 18px;
  padding-top: 0;
}

.seo-col li {
  margin-top: 5px;
  margin-bottom: 10px;
  font-size: 15px;
}

.seo-cta {
  background: rgba(255, 255, 255, 0.06);
  padding: 28px;
  border-radius: 18px;
}

.seo-play {
  margin-top: 20px;
  padding: 12px 30px;
  background: white;
  color: black;
  border-radius: 10px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.seo-play:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

@media (max-width: 900px) {
  .seo-cols {
    grid-template-columns: 1fr;
  }

  .seo-head h2 {
    font-size: 34px;
  }
}

@media (max-width: 640px) {
  .live-board-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .live-board-title {
    font-size: 22px;
  }
}

@media (max-width: 520px) {
  .landing-inner {
    width: min(94vw, 760px);
  }

  .brand-row {
    gap: 18px;
  }

  .logo {
    width: 85px;
    height: 85px;
  }

  .app-name {
    font-size: 36px;
  }

  .motto {
    margin-top: 10px;
    font-size: 15px;
  }

  .hero-kicker {
    margin-top: 22px;
    font-size: 13px;
  }

  .hero-copy {
    font-size: 15px;
    max-width: 92%;
  }

  .context-pill {
    font-size: 12px;
    padding: 9px 12px;
  }

  .live-board-card {
    padding: 16px;
    border-radius: 16px;
  }

  .live-country-pill {
    font-size: 13px;
  }
}

@keyframes dropdownPop {
  from {
    transform: translateY(-6px) scale(0.97);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
</style>
