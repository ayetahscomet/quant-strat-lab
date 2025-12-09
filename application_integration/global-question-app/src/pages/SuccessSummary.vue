<template>
  <div class="success-wrapper">
    <img src="/logo-800-full.svg" class="success-logo" />

    <h1 class="success-title">Great Work — You Cracked It.</h1>
    <h2 class="success-sub">
      You solved all {{ summary.correctAnswers.length }} answers correctly today.
    </h2>

    <!-- Show the user’s corrected, final answers -->
    <div class="result-block">
      <h3>Your Answers</h3>
      <div class="attempt-list">
        <div v-for="(ans, i) in summary.answers" :key="i" class="attempt-item correct">
          {{ ans }}
        </div>
      </div>
    </div>

    <!-- Show all acceptable answers -->
    <div class="result-block">
      <h3>All Accepted Answers</h3>
      <div class="attempt-list">
        <div v-for="(c, i) in summary.correctAnswers" :key="i" class="correct-item">
          {{ c }}
        </div>
      </div>
    </div>

    <button class="analytics-btn" @click="goAnalytics">View Today’s Analytics</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const summary = ref({})

onMounted(() => {
  const key = Object.keys(localStorage).find((k) => k.endsWith('_summary'))
  if (key) summary.value = JSON.parse(localStorage.getItem(key))
})

function goAnalytics() {
  router.replace({ name: 'DailyAnalytics' })
}
</script>

<style scoped>
.success-wrapper {
  width: 100vw;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1.5rem;
  text-align: center;
}
.success-logo {
  width: 110px;
  margin-bottom: 20px;
}
.success-title {
  font-size: 28px;
  font-weight: 800;
  max-width: 26rem;
}
.success-sub {
  opacity: 0.8;
  font-size: 18px;
  margin-top: 6px;
  max-width: 26rem;
}

.result-block {
  width: 100%;
  max-width: 400px;
  background: #f0f4ff;
  padding: 16px 20px;
  border-radius: 12px;
  margin-top: 28px;
}
.attempt-list {
  margin-top: 10px;
}
.attempt-item,
.correct-item {
  padding: 10px;
  background: white;
  border-radius: 10px;
  border: 2px solid #111;
  margin-bottom: 6px;
}
.attempt-item.correct {
  background: black;
  color: white;
}
.analytics-btn {
  margin-top: 32px;
  padding: 12px 26px;
  background: #111;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  border: 2px solid #111;
  cursor: pointer;
}
</style>
