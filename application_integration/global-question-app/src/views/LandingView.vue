<template>
  <!-- LANDING SCREEN -->
  <div class="landing">
    <div class="landing-inner">
      <!-- Logo + Title -->
      <div class="brand-row">
        <img class="logo" src="/logo-800-full.svg" alt="Akinto logo" />
        <div class="text-block">
          <h1 class="app-name">AKINTO</h1>
          <p class="motto">A Global Knowledge Game</p>
        </div>
      </div>

      <!-- PLAY (gated by country) -->
      <button class="play-btn" :disabled="!country" @click="goToGame">Play</button>
      <p class="gate-note" v-if="!country">Select your country to begin.</p>

      <p class="date">{{ today }}</p>

      <!-- Country selector -->
      <div class="country-row" @click="toggleDropdown">
        <div class="flag-circle" :class="{ empty: !country }">
          <img v-if="country" :src="getFlag(country)" :alt="`${getName(country)} flag`" />
        </div>

        <span class="country-text">
          {{ country ? getName(country) : 'Select your country' }}
        </span>
        <span class="chevron">▼</span>
      </div>

      <!-- Dropdown -->
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

      <!-- Subtle hint if they open dropdown while already set -->
      <p class="micro" v-if="country">You can change this any time.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { countries } from '../data/countries.js'

const router = useRouter()

/**
 * Single source of truth:
 * - country is always a LOWERCASE ISO code, e.g. "gb"
 */
const country = ref('')
const showDropdown = ref(false)
const search = ref('')

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
  // FlagCDN expects lowercase ISO code.
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

  // Cookie mirror (formal consent banner later)
  document.cookie = `akinto_country=${c}; path=/; max-age=31536000`
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
    // If they try anyway, guide them by opening the selector.
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

onMounted(() => {
  // Load existing selection
  const existing = localStorage.getItem('akinto_country')
  if (existing) country.value = normaliseCode(existing)

  window.addEventListener('keydown', handleLandingKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleLandingKey)
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

.landing {
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
}

.landing-inner {
  text-align: center;
  transform: translateY(-40px);
}

/* BRAND */
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

/* PLAY BUTTON */
.play-btn {
  margin-top: 30px;
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

.gate-note {
  margin: 10px 0 0;
  font-size: 13px;
  opacity: 0.7;
}

/* DATE */
.date {
  margin-top: 18px;
  font-size: 14px;
  opacity: 0.65;
  color: #242227;
}

/* COUNTRY SELECTOR */
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

/* Dropdown container */
.country-select-container {
  width: 260px;
  background: white;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.14);
  animation: dropdownPop 0.35s cubic-bezier(0.17, 0.85, 0.44, 1);
}

/* Search input */
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

/* Dropdown list */
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
  text-align: centre;
  opacity: 0.6;
  font-size: 14px;
}

.micro {
  margin-top: 12px;
  font-size: 12px;
  opacity: 0.55;
}

/* Animation */
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
