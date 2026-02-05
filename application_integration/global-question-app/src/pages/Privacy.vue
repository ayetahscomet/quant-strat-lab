<template>
  <div class="legal-page">
    <h1>Privacy Policy</h1>

    <p>
      Akinto stores only gameplay data needed to run the game - such as your country, timezone,
      anonymous session ID, attempts, and optional push notifications.
    </p>

    <p>We do not sell data, run ads, or track you across the web.</p>

    <p>For questions: hello@akinto.io</p>

    <button class="return-btn" @click="goBack">← Return to game</button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goBack() {
  router.push('/')
}
</script>

<style scoped>
.legal-page {
  max-width: 720px;
  margin: 60px auto;
  padding: 150px 70px;
  line-height: 1.7;
}

.return-btn {
  margin-top: 36px;
  padding: 10px 22px;

  background: transparent;
  border: 2px solid #000;
  border-radius: 999px;

  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.2px;

  cursor: pointer;
}

.return-btn:hover {
  background: #000;
  color: white;
}
</style>
