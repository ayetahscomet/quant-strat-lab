<template>
  <div class="landing">

    <div class="landing-inner">
      <!-- Logo + Title row -->
      <div class="brand-row">
        <img class="logo" src="/logo-main.svg" alt="Logo" />

        <div class="text-block">
          <h1 class="app-name">AGREED</h1>
          <p class="motto">AKINTO • A Global Knowledge Game</p>
        </div>
      </div>

      <!-- Play Button -->
      <button class="play-btn" @click="goToGame">Play</button>

      <!-- Date -->
      <p class="date">{{ today }}</p>
    </div>

  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { computed } from 'vue'

const router = useRouter()

function goToGame() {
  router.push('/play')
}

const today = computed(() => {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})
</script>

<style scoped>

:global(body) {
  background:#ffffff !important;
  margin:0;
}

.landing {
  height:100vh;
  width:100vw;
  display:flex;
  justify-content:center;
  align-items:center;
  background:white;
  color:#111;
  overflow:hidden;
}

.landing-inner {
  text-align:center;
  transform:translateY(-40px);    /* raises UI into visual center */
}

.brand-row {
  display:flex;
  align-items:center;
  justify-content:center;
  gap:32px;                        /* tighter & more intentional spacing */
  margin-bottom:18px;
}

.logo {
  width:110px;                     /* desktop-appropriate, not oversized */
  height:110px;
}

.text-block {
  text-align:left;
}

.app-name {
  font-size:46px;                  /* reduced from 54 → matches your reference */
  font-weight:600;
  margin:0;
  line-height:1;
}

.motto {
  margin-top:15px;
  font-size:17px;
  opacity:0.65;
}

.play-btn {
  margin-top: 5px;          /* was 28px → pull closer to logo */
  padding: 10px 64px;        /* wider button shape (was 12px 40px) */
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  background:#111;
  color:white;
  border:none;
  cursor:pointer;
  transition:0.18s ease;
}


.play-btn:hover {
  transform:translateY(-2px);
  opacity:0.9;
}

.date {
  margin-top: 40px;          /* keep spacing under button light */
  font-size: 14px;
  opacity: 0.70;
}

</style>
