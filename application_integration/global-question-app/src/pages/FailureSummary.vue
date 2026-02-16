<template>
  <div class="failure-wrapper">
    <img src="/logo-800-full.svg" class="fail-logo" @click="goHome" />

    <h1 class="fail-title">{{ headline }}</h1>
    <h2 class="fail-sub">{{ subline }}</h2>

    <div class="result-block">
      <h3>Your Final Attempt</h3>
      <div class="attempt-list">
        <div
          v-for="(ans, i) in summary.answers"
          :key="i"
          class="attempt-item"
          :class="{ correct: summary.fieldStatus[i] === 'correct' }"
        >
          {{ ans || '—' }}
        </div>
      </div>
    </div>

    <div class="result-block">
      <h3>Correct Answers</h3>
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
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const summary = ref({
  answers: [],
  correctAnswers: [],
  fieldStatus: [],
  result: '',
  attemptIndex: null,
  windowId: '',
  createdAt: '',
})

const props = defineProps({
  answers: Array,
  correctAnswers: Array,
  mode: {
    type: String,
    default: 'standard',
  },
})

const headline = computed(() => {
  if (props.mode === 'persistence') {
    return 'You Went All In.'
  }

  return 'Today Didn’t Quite Land.'
})

const subline = computed(() => {
  if (props.mode === 'persistence') {
    return 'You played it through. That matters.'
  }

  return 'Review the gaps and reset for tomorrow.'
})

function normalise(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function getUserId() {
  return localStorage.getItem('akinto_uuid') || ''
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
}

function computeFieldStatus(answers = [], correctAnswers = []) {
  const canon = correctAnswers.map(normalise)
  const used = new Set()

  return answers.map((a) => {
    const v = normalise(a)
    const ok = canon.includes(v) && !used.has(v)
    if (ok) used.add(v)
    return ok ? 'correct' : 'incorrect'
  })
}

async function loadFailureSummaryFromAirtable() {
  const userId = getUserId()
  const dateKey = todayKey()

  if (!userId || !dateKey) return

  const res = await fetch('/api/load-day-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, dateKey }),
  })

  if (!res.ok) return
  const data = await res.json()

  const attempts = Array.isArray(data.attempts) ? data.attempts : []
  const correctAnswers = Array.isArray(data.correctAnswers) ? data.correctAnswers : []

  if (!attempts.length) {
    // nothing recorded today; keep defaults
    summary.value.correctAnswers = correctAnswers
    return
  }
  if (!attempts.some((a) => Number(a.attemptIndex) >= 1 && Number(a.attemptIndex) <= 3)) {
    summary.value.correctAnswers = correctAnswers
    return
  }

  // Prefer the final marker AttemptIndex = 999, else latest record
  // ===============================
  // Pick LAST REAL attempt (ignore markers)
  // ===============================

  // ===============================
  // Pick LAST REAL attempt (ignore markers)
  // ===============================

  const realAttempts = attempts
    .filter((a) => {
      const idx = Number(a.attemptIndex)
      return idx >= 1 && idx <= 3
    })
    .sort((a, b) => Number(b.attemptIndex) - Number(a.attemptIndex))

  const finalAttempt = realAttempts.length ? realAttempts[0] : null

  const finalAnswers =
    finalAttempt && Array.isArray(finalAttempt.answers) ? finalAttempt.answers : []

  summary.value = {
    answers: finalAnswers,
    correctAnswers,
    fieldStatus: computeFieldStatus(finalAnswers, correctAnswers),
    result: finalAttempt.result || '',
    attemptIndex: finalAttempt.attemptIndex ?? null,
    windowId: finalAttempt.windowId || '',
    createdAt: finalAttempt.createdAt || '',
  }
}

onMounted(() => {
  loadFailureSummaryFromAirtable().catch((e) => console.error('FailureSummary load error:', e))
})

function goAnalytics() {
  // router name in src/router/index.js is "Analytics"
  try {
    router.replace({ name: 'Analytics' })
  } catch {
    router.replace('/analytics')
  }
}
</script>

<style scoped>
.failure-wrapper {
  width: 100vw;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1.5rem;
  text-align: center;
}
.fail-logo {
  width: 110px;
  margin-bottom: 20px;
  outline: 1.5px solid #000;
}
.fail-title {
  font-size: 28px;
  font-weight: 800;
  max-width: 26rem;
}
.fail-sub {
  opacity: 0.8;
  font-size: 18px;
  margin-top: 6px;
  max-width: 26rem;
}
.result-block {
  width: 100%;
  max-width: 400px;
  background: #f8f8f8;
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
  background: #000;
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
