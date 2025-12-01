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
          {{ country ? getName(country) : "Select your country" }}
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
import { countries } from '../data/countries.js'      // ⬅ full global list here

/* Routing */
const router = useRouter()
const goToGame = () => router.push('/play')

/* Date shown under button */
const today = computed(() =>
  new Date().toLocaleDateString('en-GB', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  })
)

/* Country state + persistence */
const country = ref(localStorage.getItem("akinto_country") || "")
const showDropdown = ref(false)
const getFlag = code => `https://flagcdn.com/${code}.svg`
const getName = code => countries.find(c => c.code === code)?.name

function selectCountry(code) {
  country.value = code
  localStorage.setItem("akinto_country", code)
  showDropdown.value = false
}
</script>


<style scoped>
:global(body) { background:#fff; margin:0; }

:global(body){
  color:#242227;
  font-family: system-ui,-apple-system,Arial,sans-serif;
}

.landing {
  height:100vh; width:100vw;
  display:flex; justify-content:center; align-items:center;
}

.landing-inner { text-align:center; transform:translateY(-40px); }

/* BRAND */
.brand-row { display:flex; justify-content:center; align-items:center; gap:32px; }
.logo { width:110px; height:110px; outline:1.5px solid #242227; }
.text-block { text-align:left; }
.app-name { font-size:46px;font-weight:600;margin:0;line-height:1;color:#242227; }
.motto { margin-top:15px;font-size:17px;opacity:.65;color:#242227; }

/* PLAY BUTTON — more breathing space */
.play-btn {
  margin-top:30px;          /* ⬅ increased distance from the logo */
  padding:12px 68px;
  background:#000; color:#fff;
  font-size:17px; font-weight:600;
  border-radius:10px; border:none; cursor:pointer;
}
.play-btn:hover { opacity:.92; transform:translateY(-2px); }

/* DATE */
.date { margin-top:18px;font-size:14px;opacity:.65;color:#242227; }

/* COUNTRY SELECTOR */
.country-row {
  margin-top:28px;
  display:flex;align-items:center;justify-content:center;
  gap:10px;cursor:pointer;color:#242227;
}

.flag-circle {
  width:22px;height:22px;border-radius:50%;
  border:2px solid #242227;
  display:flex;align-items:center;justify-content:center;
  overflow:hidden;
}
.flag-circle img { width:100%;height:100%;object-fit:cover; }

.country-text { font-size:15px;color:#242227; }
.chevron { font-size:14px;color:#242227; }

/* DROPDOWN LIST */
.dropdown-list {
  margin-top:10px;
  max-height:260px;overflow-y:auto;
  border:1px solid #ccc;border-radius:8px;
  width:200px;background:white;
  margin-inline:auto;
  box-shadow:0 4px 12px rgba(0,0,0,.08);
}

.dropdown-item {
  display:flex;align-items:center;gap:10px;
  padding:8px 10px;cursor:pointer;font-size:14px;color:#242227;
}
.dropdown-item:hover { background:#f3f3f3; }

.drop-flag { width:20px;border-radius:3px; }

/* Blank white appearance until a country is selected */
.flag-circle.empty {
  background:#ffffff;      /* white fill */
  border:2px solid #242227;
}

.country-row:hover .flag-circle {
  transform:scale(1.05);
  transition:0.15s;
}

</style>


