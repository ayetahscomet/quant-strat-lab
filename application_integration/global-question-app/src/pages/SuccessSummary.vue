<template>
  <div class="summary-wrapper">
    <!-- TOP LOGO -->
    <img src="/logo-800-full.svg" class="logo" />

    <!-- HEADLINE -->
    <h1 class="headline">Great Work — You Cracked It.</h1>
    <p class="subline">You solved all {{ summary.correctCount }} answers correctly today.</p>

    <!-- ===========================
         YOUR ANSWERS
    ============================ -->
    <div class="card">
      <h2 class="card-title">Your Answers</h2>

      <div class="answer-list">
        <div v-for="(a, i) in summary.answers" :key="i" class="answer user">
          {{ a }}
        </div>
      </div>
    </div>

    <!-- ===========================
         ALL ACCEPTED ANSWERS
    ============================ -->
    <div class="card">
      <h2 class="card-title">All Accepted Answers</h2>

      <div class="answer-list">
        <div v-for="(a, i) in summary.correctAnswers" :key="i" class="answer accepted">
          {{ a }}
        </div>
      </div>
    </div>

    <!-- ===========================
         FOOTER ACTIONS
    ============================ -->
    <div class="footer-buttons">
      <button class="primary" @click="goAnalytics">View Today’s Analytics</button>

      <button class="secondary" @click="finishDay">I’ve Had Enough for Today</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const summary = ref({
  answers: [],
  correctAnswers: [],
  correctCount: 0,
})

/* --------------------------
   LOAD SUMMARY FROM STORAGE
--------------------------- */
onMounted(() => {
  const allKeys = Object.keys(localStorage).filter((k) => k.endsWith('_summary'))

  if (!allKeys.length) return

  const latestKey = allKeys.sort().reverse()[0]
  const raw = JSON.parse(localStorage.getItem(latestKey))

  summary.value = {
    answers: raw.answers || [],
    correctAnswers: raw.correctAnswers || [],
    correctCount: raw.correctCount || 0,
  }
})

/* --------------------------
   ACTION BUTTONS
--------------------------- */
function goAnalytics() {
  router.replace({ name: 'DailyAnalytics' })
}

function finishDay() {
  localStorage.setItem('akinto_exitToday', 'true')
  router.replace({ name: 'FailureSummary' }) // re-using your existing screen
}
</script>

<style scoped>
.summary-wrapper {
  max-width: 620px;
  margin: auto;
  padding: 60px 22px 90px;
  text-align: center;
  font-family: -apple-system, Inter, sans-serif;
}

.logo {
  width: 80px;
  height: 80px;
  margin-bottom: 22px;
}

.headline {
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 6px;
}

.subline {
  font-size: 15px;
  opacity: 0.7;
  margin-bottom: 34px;
}

/* ================================
   Cards
================================ */
.card {
  background: #f6f8ff;
  padding: 22px 20px 26px;
  border-radius: 18px;
  margin-bottom: 32px;
}

.card-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 18px;
}

/* ================================
   Answers
================================ */
.answer-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.answer {
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 16px;
  border: 2px solid #111;
}

.answer.user {
  background: #000;
  color: white;
}

.answer.accepted {
  background: white;
  color: #000;
}

/* ================================
   Footer Buttons
================================ */
.footer-buttons {
  margin-top: 36px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.primary {
  background: #000;
  color: white;
  padding: 14px 20px;
  border-radius: 999px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.secondary {
  background: #f5f5f5;
  border: 2px solid #111;
  padding: 14px 20px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.primary:hover,
.secondary:hover {
  opacity: 0.92;
  transform: translateY(-2px);
  transition: 0.22s ease;
}

/* Mobile tightening */
@media (max-width: 450px) {
  .headline {
    font-size: 23px;
  }
  .answer {
    font-size: 15px;
  }
  .card {
    padding: 20px 16px 24px;
  }
}
</style>
