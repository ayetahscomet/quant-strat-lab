<template>
  <div class="legal-page">
    <h1>Cookie Policy</h1>

    <p>
      Akinto uses essential cookies and local storage to run the game, remember your country and
      timezone, and log daily progress.
    </p>

    <p>With your permission, we also use analytics and notifications.</p>

    <p>You can reset consent at any time by clearing site data.</p>

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
