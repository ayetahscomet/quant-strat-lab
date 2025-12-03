<template>
  <div class="landing">
    <div class="landing-inner">
      <!-- Logo + Title -->
      <div class="brand-row">
        <img class="logo" src="/logo-800-full.svg" alt="Logo" />
        <div class="text-block">
          <h1 class="app-name">AKINTO</h1>
          <p class="motto">A Global Knowledge Game</p>
        </div>
      </div>

      <!-- Play Button -->
      <button class="play-btn" @click="goToGame">Play</button>

      <!-- DATE -->
      <p class="date">{{ today }}</p>

      <!-- 🌍 COUNTRY SELECTOR -->
      <div class="country-row" @click="showDropdown = !showDropdown">
        <!-- shows blank white circle until country is chosen -->
        <div class="flag-circle" :class="{ empty: !country }">
          <img v-if="country" :src="getFlag(country)" />
        </div>

        <span class="country-text">
          {{ country ? getName(country) : 'Select your country' }}
        </span>

        <span class="chevron">▼</span>
      </div>

      <!-- Dropdown -->
      <div v-if="showDropdown" class="dropdown-list">
        <div
          v-for="c in countries"
          :key="c.code"
          class="dropdown-item"
          @click="selectCountry(c.code)"
        >
          <img class="drop-flag" :src="getFlag(c.code)" />
          <span>{{ c.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ref, computed } from 'vue'
import { countries } from '../data/countries.js' // ⬅ full global list here

/* Routing */
const router = useRouter()
const goToGame = () => router.push('/play')

/* Date shown under button */
const today = computed(() =>
  new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
)

/* Country state + persistence */
const country = ref(localStorage.getItem('akinto_country') || '')
const showDropdown = ref(false)
const getFlag = (code) => `https://flagcdn.com/${code}.svg`
const getName = (code) => countries.find((c) => c.code === code)?.name

/* ========== PATCH 15E — "Press Enter to Play" UX ========== */

import { onMounted, onBeforeUnmount } from 'vue'

function handleLandingKey(e) {
  // If dropdown is open → Enter selects first filtered result
  if (showDropdown.value) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredCountries.value.length > 0) {
        const first = filteredCountries.value[0]
        selectCountry(first.code)
        showDropdown.value = false
      } else {
        showDropdown.value = false
      }
      return
    }

    if (e.key === 'Escape') {
      showDropdown.value = false
      return
    }
    return
  }

  // If dropdown is NOT open → Enter triggers Play
  if (e.key === 'Enter') {
    e.preventDefault()
    goToGame()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleLandingKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleLandingKey)
})

function selectCountry(code) {
  country.value = code
  localStorage.setItem('akinto_country', code)
  showDropdown.value = false
}
</script>

<style scoped>
:global(body) {
  background: #fff;
  margin: 0;
}

:global(body) {
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

/* PLAY BUTTON — more breathing space */
.play-btn {
  margin-top: 30px; /* ⬅ increased distance from the logo */
  padding: 12px 68px;
  background: #000;
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  cursor: pointer;
}
.play-btn:hover {
  opacity: 0.92;
  transform: translateY(-2px);
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

.country-text {
  font-size: 15px;
  color: #242227;
}
.chevron {
  font-size: 14px;
  color: #242227;
}

/* DROPDOWN LIST */
.dropdown-list {
  margin-top: 10px;
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid #ccc;
  border-radius: 8px;
  width: 200px;
  background: white;
  margin-inline: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  cursor: pointer;
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

/* Blank white appearance until a country is selected */
.flag-circle.empty {
  background: #ffffff; /* white fill */
  border: 2px solid #242227;
}

.country-row:hover .flag-circle {
  transform: scale(1.05);
  transition: 0.15s;
}

/* Overlay behind dropdown */
.dropdown-wrapper {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(4px);
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
}

/* Country row */
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 8px;
}

.dropdown-item:hover {
  background: #f3f3f3;
}

.drop-flag {
  width: 20px;
  border-radius: 3px;
}

/* Empty search */
.no-results {
  padding: 12px;
  text-align: center;
  opacity: 0.6;
  font-size: 14px;
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
