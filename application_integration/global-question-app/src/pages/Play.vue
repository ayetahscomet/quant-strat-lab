<template>
  <transition name="screen-fade" mode="out-in">
    <!-- ===========================
         GAMEPLAY VIEW
    ============================ -->
    <div
      v-if="gameState === 'playing'"
      :class="[
        'play-wrapper',
        timeClass,
        { 'split-lockout-active': screenState === 'split-lockout' },
      ]"
    >
      <!-- =======================================================
           HEADER (HIDDEN IN LOCKOUT)
      ======================================================= -->
      <transition name="header-shift">
        <header v-if="screenState !== 'split-lockout'" class="header gameplay-header">
          <img src="/logo-800-full.svg" class="logo" />
          <span class="counter">
            <span class="num-light">1</span> /
            <span class="num-bold">1</span>
          </span>
          <span class="divider">|</span>
          <span class="stage">{{ stageLabel }}</span>
        </header>
      </transition>

      <!-- =======================================================
           ATTEMPT DOTS (HIDDEN IN LOCKOUT)
      ======================================================= -->
      <div v-if="screenState !== 'split-lockout'" class="attempts-row">
        <span class="attempts-label">Attempts this check-in:</span>
        <div class="dots">
          <span
            v-for="n in MAX_ATTEMPTS"
            :key="n"
            :class="['dot', { active: n <= attemptsRemaining }]"
          />
        </div>
      </div>

      <!-- =======================================================
           SPLIT LOCKOUT MODE
      ======================================================= -->
      <template v-if="screenState === 'split-lockout'">
        <transition name="split-lock" mode="out-in">
          <div class="lockout-split ready">
            <!-- ============ LEFT PANE: LATEST ATTEMPT ============ -->
            <div class="left-pane">
              <h2 class="attempt-title">Latest Attempt</h2>

              <div
                v-for="(ans, i) in answers"
                :key="i"
                class="locked-result"
                :class="fieldStatus[i]"
              >
                {{ ans || '—' }}
              </div>
            </div>

            <!-- ============ RIGHT PANE: LOCKOUT CARD ============ -->
            <div class="right-pane lockout-card">
              <img src="/logo-800-full.svg" class="lockout-logo" />

              <h2 class="lockout-headline-strong">{{ lockoutHeadlineStrong }}</h2>
              <h2 class="lockout-headline-sub">{{ lockoutHeadlineSub }}</h2>

              <p class="midday-sub">Next window:</p>
              <p class="midday-time">{{ nextSlotShort }}</p>
              <p class="midday-countdown">Come back in {{ timeRemaining }}</p>

              <button class="notif-btn" @click="enableNotifications">Enable Notifications</button>

              <button class="exit-btn" @click="showExitConfirm = true">
                <i>I’ve Had Enough for Today</i>
              </button>
            </div>
          </div>
        </transition>
      </template>

      <!-- =======================================================
           LOADING SCREEN
      ======================================================= -->
      <template v-else-if="loading">
        <div class="loading-screen">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <p class="loading-text">Loading today’s question…</p>
          </div>
        </div>
      </template>

      <!-- =======================================================
           NORMAL GAMEPLAY MODE
      ======================================================= -->
      <template v-else>
        <h1 v-if="!question" class="question-title muted">No question found.</h1>
        <h1 v-else class="question-title">{{ question }}</h1>

        <div
          class="input-group"
          v-if="answers.length"
          :class="{ visible: inputsVisible, 'final-attempt-replay': isReplaySequence }"
        >
          <input
            v-for="(ans, i) in answers"
            :key="i"
            v-model="answers[i]"
            :placeholder="i + 1 + '.'"
            :class="[
              'answer-input',
              fieldStatus[i],
              `stagger-${i}`,
              { 'hero-flash': heroFlashIndex === i },
            ]"
            :disabled="fieldStatus[i] === 'correct'"
            :ref="(el) => registerInputRef(el, i)"
            @keydown="onKey($event, i)"
          />
        </div>

        <div class="button-row">
          <button class="lock" @click="onLockIn" :disabled="attemptsRemaining <= 0">Lock In</button>
        </div>
      </template>

      <!-- =======================================================
           MODAL SYSTEM (SUCCESS + HINT + EXIT CONFIRMATION)
      ======================================================= -->
      <transition name="modal-fade">
        <!-- ********** SUCCESS SUMMARY MODAL ********** -->
        <div v-if="modalMode === 'success'" class="overlay">
          <div class="modal modal-lower-card">
            <h2 class="modal-title">Nicely done!</h2>
            <p class="modal-text">You’ve locked in all {{ answerCount }} answers correctly.</p>

            <div v-if="missingAnswers.length" class="reveal-block">
              <p class="reveal-title">You could also have answered:</p>
              <ul class="reveal-list">
                <li v-for="(alt, i) in missingAnswers" :key="i">
                  {{ alt }}
                </li>
              </ul>
            </div>

            <button class="modal-btn primary" @click="goToSuccessSummary" style="margin-top: 18px">
              Continue
            </button>
          </div>
        </div>

        <!-- ********** HINT REQUEST MODAL ********** -->
        <div v-else-if="modalMode === 'askHint'" class="overlay">
          <div class="modal modal-lower-card">
            <h2 class="modal-title">Not quite.</h2>
            <p class="modal-text modal-spaced">Some answers aren’t quite there. Want a hint?</p>

            <div class="modal-actions">
              <button class="modal-btn secondary" @click="closeModal">No, retry</button>
              <button class="modal-btn primary" @click="showHint">Yes, show hint</button>
            </div>
          </div>
        </div>

        <!-- ********** HINT MODAL ********** -->
        <div v-else-if="modalMode === 'hint'" class="overlay">
          <div class="modal modal-card">
            <h2 class="modal-title">Hint</h2>
            <p class="modal-text modal-spaced">
              {{ hintText || 'Hint coming soon.' }}
            </p>
            <button class="modal-btn primary" @click="closeHint">Back</button>
          </div>
        </div>

        <!-- ********** EXIT CONFIRMATION MODAL ********** -->
        <div v-else-if="showExitConfirm" class="overlay">
          <div class="modal modal-card">
            <h2 class="modal-title">Finish for Today?</h2>
            <p class="modal-text modal-spaced">
              You’ll end today’s session early and see the correct answers.<br />
              You can’t return to the puzzle until the next window.
            </p>

            <div class="modal-actions">
              <button class="modal-btn secondary" @click="showExitConfirm = false">
                No, return
              </button>

              <button class="modal-btn primary" @click="confirmExitEarly">Yes, I’m Done</button>
            </div>
          </div>
        </div>
      </transition>
    </div>
    <!-- ===========================
         SUCCESS SUMMARY (NO ROUTE)
    ============================ -->
    <SuccessSummary
      v-else-if="currentView === 'success'"
      :answers="answers"
      :correctAnswers="correctAnswers"
      @continue="currentView = 'play'"
    />

    <!-- ===========================
         FAILURE SUMMARY (NO ROUTE)
    ============================ -->
    <FailureSummary
      v-else-if="currentView === 'failure'"
      :answers="answers"
      :correctAnswers="correctAnswers"
      @continue="currentView = 'play'"
    />
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import SuccessSummary from './SuccessSummary.vue' // Import your summary components
import FailureSummary from './FailureSummary.vue'

const gameState = ref('playing')

const fetchTimeout = (ms) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))

/* ---------- Game Logic & State ---------- */
const question = ref('')
const answerCount = ref(0)
const correctAnswers = ref([])
const loading = ref(true)
const answers = ref([])
const fieldStatus = ref([])
const attemptsRemaining = ref(3)
const MAX_ATTEMPTS = 3
const hardLocked = ref(false)
const showModal = ref(false)
const modalMode = ref(null)

// Theming based on time
const hour = new Date().getHours()
const timeClass = computed(() => {
  if (hour < 11) return 'theme-morning'
  if (hour < 15) return 'theme-day'
  if (hour < 20) return 'theme-evening'
  return 'theme-night'
})

/* ---------- API Fetch ---------- */
onMounted(loadTodayQuestion)

async function loadTodayQuestion() {
  loading.value = true

  try {
    const res = await fetch('/api/get-today-question')

    if (!res.ok) {
      throw new Error(`API error ${res.status}`)
    }

    const data = await res.json()

    question.value = data.text
    answerCount.value = data.count
    correctAnswers.value = data.correctAnswers

    answers.value = Array(data.count).fill('')
    fieldStatus.value = Array(data.count).fill('')
  } catch (err) {
    console.error('Failed to load question:', err)
    question.value = 'Unable to load today’s question.'
  } finally {
    loading.value = false
  }
}

/* ---------- The Seamless Transition Logic ---------- */
async function onLockIn() {
  // 1. Validate inputs
  const filled = answers.value.filter((a) => a.trim()).length
  if (filled < answerCount.value) return alert('Fill all boxes first.')

  // 2. Check correctness
  fieldStatus.value = answers.value.map((a, i) =>
    a.trim().toLowerCase() === correctAnswers.value[i].toLowerCase() ? 'correct' : 'incorrect',
  )

  const isPerfect = fieldStatus.value.every((s) => s === 'correct')

  if (isPerfect) {
    // Instead of router.push('/success'), we just switch the internal view
    currentView.value = 'success'
  } else {
    attemptsRemaining.value--
    if (attemptsRemaining.value <= 0) {
      hardLocked.value = true
      currentView.value = 'failure'
    } else {
      modalMode.value = 'askHint'
      showModal.value = true
    }
  }
}

// Helpers for Template
function registerInputRef(el, i) {
  /* ref logic */
}
function onKey(e, i) {
  if (e.key === 'Enter') onLockIn()
}
</script>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
}
</style>

<style scoped>
/* MAIN LAYOUT */
.play-wrapper {
  width: 100vw;
  height: 100vh;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: var(--space-lg);
}

.play-wrapper.split-lockout-active {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

/* BACKGROUNDS */
.theme-morning {
  background: #9fd5ff;
}
.theme-day {
  background: #9fd5ff;
}
.theme-evening {
  background: #6ec04d;
}
.theme-night {
  background: #0e0c24;
  color: white;
}

.theme-morning {
  --bg-color: #9fd5ff;
  background: #9fd5ff;
}
.theme-day {
  --bg-color: #9fd5ff;
  background: #9fd5ff;
}
.theme-evening {
  --bg-color: #6ec04d;
  background: #6ec04d;
}
.theme-night {
  --bg-color: #0e0c24;
  background: #0e0c24;
  color: white;
}

/* HEADER */
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: var(--fs-md);
  font-weight: 600;
  margin-bottom: var(--space-sm);
}
.logo {
  width: 60px;
  height: 60px;
  outline: 1.5px solid #000000;
}

.divider {
  opacity: 0.5;
}

/* COUNTER */
.counter {
  font-size: var(--fs-lg);
  display: flex;
  align-items: center;
}

.num-light {
  font-weight: 400;
  opacity: 0.85;
}
.num-bold {
  font-weight: 800;
}

/* ATTEMPTS INDICATOR */
.attempts-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.attempts-label {
  font-size: var(--fs-sm);
  color: #242227;
  font-weight: 500;
  opacity: 0.85;
}

.dots {
  display: flex;
  gap: 6px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #242227;
  opacity: 0.1; /* base faint */
}
.dot.active {
  opacity: 0.8; /* remaining attempts are bold */
}

/* ===========================
   🌙 NIGHT MODE — DOT SYSTEM (Option B)
   Remaining attempts bright / Used attempts dim
   =========================== */

.theme-night .dot {
  background: rgba(255, 255, 255, 0.18) !important; /* used */
  opacity: 1 !important;
}

.theme-night .dot.active {
  background: #ffffff !important; /* remaining */
  opacity: 1 !important;
}

/* label also brightens for clarity */
.theme-night .attempts-label {
  color: white !important;
}
.theme-night .dots {
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.45));
}

/* QUESTION */
.question-title {
  font-size: var(--fs-lg);
  font-weight: 550;
  max-width: 36rem;
  text-align: center;
  color: #242227;
  margin-bottom: var(--space-md);
}

.muted {
  opacity: 0.45;
}

/* INPUTS */
.input-group {
  width: min(90%, 450px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: var(--space-md);
}

.answer-input {
  font-size: var(--fs-md);
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 2px solid #111;
  outline: none;
  transition: 0.18s ease;
}

/* --- DEFAULT correct behaviour (morning/day/evening) --- */
.answer-input.correct {
  animation: fadeOutText 0.8s forwards;
  background: #000;
  border-color: #000;
  color: var(--bg-color); /* dynamic colour */
  font-weight: 600;
  transition: 0.25s;
}

/* --- NIGHT MODE / LAST CHANCE (white text instead of green fade) --- */
.theme-night .answer-input.correct {
  color: white;
}

/* --- PATCH 15A: Explicit shake animation binding --- */
.answer-input.incorrect {
  background: #ffffff;
  border-color: #242227;
  animation-name: shake !important;
  animation-duration: 0.35s !important;
  animation-timing-function: ease !important;
}

/* BUTTONS */
.button-row {
  display: flex;
  gap: 22px;
}

.lock {
  background: #83b54c;
  border: 2px solid #111;
  padding: 0.75rem 2.1rem;
  font-size: var(--fs-md);
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
}

.lock:disabled {
  opacity: 0.5;
  cursor: default;
}

/* MODAL */
.overlay {
  position: fixed;
  inset: 0;
  backdrop-filter: blur(8px);
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  max-width: 420px;
  width: 90%;
  background: #ffffff;
  border-radius: 16px;
  padding: 24px 22px;
  text-align: center;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
}
.modal-title {
  font-size: 26px !important;
  color: #000;
  line-height: 2;
}
.modal-text {
  font-size: 18px !important;
  color: #000;
  line-height: 1cm;
}
.modal-sub {
  font-size: 32px !important;
  color: #444;
}

.stage {
  font-size: var(--fs-xl) !important;
  font-weight: 1000;
} /* larger stage text */

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}
.modal-btn {
  padding: 9px 18px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  border: 2px solid #111;
  cursor: pointer;
}
.modal-btn.primary {
  background: #111;
  color: #fff;
}
.modal-btn.secondary {
  background: #f5f5f5;
  color: #111;
}

.lockout-screen {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: inherit; /* matches theme */
  animation: fadein 0.4s ease-out;
}

.lockout-card h1 {
  font-size: 30px;
  font-weight: 800;
  color: #111;
  margin-bottom: 10px;
}
.lockout-card .next {
  font-size: 20px;
  opacity: 0.8;
  margin-top: 2px;
}
.lockout-card .time {
  font-size: 26px;
  font-weight: 700;
  margin: 2px 0 2px;
}
.lockout-card .countdown {
  font-size: 18px;
  margin-top: 2px;
}

.attempt-title {
  font-size: 25px;
  font-weight: 800;
  margin-top: 85px;
  margin-bottom: 15px;
}

.recheck-btn {
  margin-top: 25px;
  padding: 12px 40px;
  background: #111;
  color: #fff;
  border-radius: 10px;
  border: none;
  font-size: 18px;
  cursor: pointer;
}
/* ================================
   PATCH 4 — Modal Slide + Spacing
================================ */

.modal-slide .modal {
  transform: translateY(40vh); /* start lower */
  opacity: 0;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: 0.45s cubic-bezier(0.18, 0.74, 0.32, 1);
}

.modal-fade-enter-from {
  opacity: 0;
  transform: translateY(45vh);
}

.modal-fade-enter-to {
  opacity: 1;
  transform: translateY(30vh); /* bottom third */
}

.modal-fade-leave-from {
  opacity: 1;
  transform: translateY(30vh);
}

.modal-fade-leave-to {
  opacity: 0;
  transform: translateY(47vh);
}

/* More breathing room under modal text */
.modal-spaced {
  margin-bottom: 22px !important; /* adds clean separation */
}

/* Modal positioned lower on screen */
.overlay.modal-slide {
  display: flex;
  align-items: flex-end; /* push modal downward */
  padding-bottom: 14vh; /* adjustable bottom offset */
}

/* 🌙 NIGHT MODE — TEXT MUST FLIP TO WHITE */
.theme-night {
  color: white !important;
}

/* Question + UI elements */
.theme-night .question-title,
.theme-night .attempts-label,
.theme-night .stage,
.theme-night .counter,
.theme-night .divider {
  color: white !important;
}

/* Input placeholder should flip too */
.theme-night input::placeholder {
  color: rgba(255, 255, 255, 0.75) !important;
}

/* Unanswered input boxes still white borders — flip for visibility */
.theme-night .answer-input {
  background: #fff;
  color: #000;
}

/* Correct answers already handled above, but reinforce */
.theme-night .answer-input.correct {
  background: #000;
  color: #fff !important;
  border-color: #fff;
}

/* ===========================
   🌗 GLOBAL THEME VARIABLE SYSTEM
   =========================== */
.play-wrapper {
  --text-color: #242227;
  --text-muted: rgba(36, 34, 39, 0.6);
  --input-bg: #ffffff;
  --input-text: #000000;
  --correct-text: var(--bg-color); /* keeps your fading behaviour */
}

/* NIGHT REVERSES EVERYTHING */
.theme-night.play-wrapper {
  --text-color: #ffffff;
  --text-muted: rgba(255, 255, 255, 0.75);
  --input-bg: #111;
  --input-text: #fff;
  --correct-text: #fff;
}

/* Base UI adopts variables */
.play-wrapper,
.play-wrapper * {
  color: var(--text-color);
}

/* Input default */
.answer-input {
  background: var(--input-bg);
  color: var(--input-text);
}

/* Correct-state universal */
.answer-input.correct {
  background: #000;
  color: var(--correct-text) !important;
}

.answer-input:focus {
  outline: none;
  border-color: #000;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.15);
  transition: 0.18s ease;
}

/* Placeholder obeys theme */
input::placeholder {
  color: var(--text-muted) !important;
}

.reveal-block {
  margin-top: 20px;
  background: rgba(0, 0, 0, 0.05);
  padding: 14px 18px;
  border-radius: 10px;
}

.reveal-list {
  list-style: none;
  padding: 0;
  margin: 10px 0;
  font-size: 16px;
}

.reveal-list li {
  margin-bottom: 6px;
}

.locked-result {
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 10px;
  background: #fff;
  font-size: 18px;
  border: 2px solid #111;
}

.locked-result.correct {
  background: #000;
  color: white;
  border-color: #000;
}
.locked-result.incorrect {
  opacity: 0.4;
}

.reopen-btn {
  margin-top: 20px;
  background: #000;
  color: #fff;
  padding: 12px 28px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 17px;
}

/* ===============================
   🔥 Split-Lockout Page Animation
=============================== */
.split-lock-enter-from {
  opacity: 0;
  transform: translateY(30px);
}
.split-lock-enter-active {
  transition: 0.55s cubic-bezier(0.21, 0.75, 0.29, 0.99);
}
.split-lock-enter-to {
  opacity: 1;
  transform: translateY(0);
}

/* When leaving input-mode → panels slide apart */
.split-lock-leave-from {
  opacity: 1;
  transform: scale(1);
}
.split-lock-leave-active {
  transition: 0.45s ease;
}
.split-lock-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

/* ===============================
   PATCH 8B — Enhanced modal motion
================================ */

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: translateY(14px);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s cubic-bezier(0.21, 0.75, 0.29, 0.99);
}

.modal-fade-enter-to,
.modal-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* Slight lift effect */
.modal-slide > .modal {
  animation: modalPop 0.45s cubic-bezier(0.17, 0.85, 0.39, 1);
}

/* 🔒 MODAL ALWAYS FORMATTED BLACK ON WHITE */
.modal,
.modal * {
  color: #000 !important;
  background: #fff !important;
}

.overlay {
  backdrop-filter: blur(10px);
  background: rgba(0, 0, 0, 0.55) !important; /* stronger dim */
}

/* ========= SPINNER WRAP PAGE ========= */
.analytics-loading {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #000;
}

.spinner {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 6px solid #000;
  border-top-color: transparent;
  animation: spin 0.85s linear infinite;
  margin-bottom: 14px;
}

.analytics-root {
  display: grid;
  grid-template-columns: 48% 52%;
  height: 100vh;
  overflow: hidden;
  font-family: -apple-system, Inter, sans-serif;
}

/* LEFT — Personal Visual Stats */
.personal-panel {
  background: #0d0f11;
  color: white;
  padding: 48px 50px;
  overflow-y: auto;
}

.section-title {
  font-size: 30px;
  font-weight: 700;
}
.section-sub {
  opacity: 0.7;
  margin-top: -4px;
}

.hero-container {
  margin: 28px 0;
  background: #161a1f;
  border-radius: 18px;
  padding: 22px 26px;
}
.hero-headline {
  font-size: 22px;
  margin: 0 0 6px;
}
.hero-sub {
  opacity: 0.8;
  font-size: 14px;
}

/* --- GRID VISUAL STATS --- */
.stats-grid {
  margin-top: 30px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.vis-card {
  background: #14181d;
  border-radius: 18px;
  padding: 18px;
  text-align: center;
}

.vis-title {
  font-size: 13px;
  opacity: 0.8;
  margin-bottom: 12px;
}

/* ---- CIRCLE GAUGE ---- */
.circle-meter svg {
  width: 90px;
  height: 90px;
}
.meter-bg {
  fill: none;
  stroke: #2a2f35;
  stroke-width: 3.5;
}
.meter-fg {
  fill: none;
  stroke: #1ee38c;
  stroke-width: 4.6;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: 0.4s;
}
.meter-fg-2 {
  fill: none;
  stroke: #4f8bff;
  stroke-width: 4.6;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: 0.4s;
}
.circle-value {
  position: relative;
  top: -66px;
  font-size: 17px;
  font-weight: bold;
}

/* ---- SPEED BAR ---- */
.bar-meter {
  background: #2d3237;
  height: 10px;
  border-radius: 14px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: #6cf088;
  border-radius: 14px 0 0 14px;
  transition: 0.3s;
}
.bar-label {
  margin-top: 6px;
  font-size: 14px;
}

/* --- RIGHT GLOBAL --- (COMING NEXT) */

html,
body {
  overflow-x: hidden;
  overflow-y: hidden;
  overscroll-behavior: hidden;
}

/* Increase space above modal secondary content */
.lockout-subtext {
  margin-top: 12px !important; /* was too tight */
}

/* Grey reveal box — reduce padding slightly & tighten vertical spacing */
.reveal-block {
  margin-top: 22px; /* slightly increased to breathe */
  padding: 10px 16px; /* reduced from 14px 18px */
  border-radius: 12px;
}

/* More compact spacing between items inside reveal list */
.reveal-list li {
  margin-bottom: 4px; /* cleaner rhythm */
}

.reveal-title {
  font-size: 17px;
  font-weight: 650; /* increased from 500-ish default */
  letter-spacing: 0.15px;
  color: #111; /* rich contrast */
  margin-bottom: 6px;
}

/* ================================
   PATCH 3 — Stagger input animation
================================ */

.input-group {
  opacity: 0;
  transform: translateY(8px);
  transition: 0.35s ease;
}

.input-group.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Each input fades + slides in sequence */
.answer-input {
  opacity: 0;
  transform: translateY(10px);
  transition: 0.45s cubic-bezier(0.18, 0.74, 0.32, 1);
}

/* Shorter, cleaner-sized boxes */
.answer-input {
  padding: 0.55rem 0.9rem; /* was 0.75rem 1rem */
  font-size: var(--fs-md);
}

/* stagger timing */
.stagger-0 {
  transition-delay: 0.05s;
}
.stagger-1 {
  transition-delay: 0.12s;
}
.stagger-2 {
  transition-delay: 0.19s;
}
.stagger-3 {
  transition-delay: 0.26s;
}
.stagger-4 {
  transition-delay: 0.33s;
}
.stagger-5 {
  transition-delay: 0.4s;
}

/* Once visible, inputs animate in */
.input-group.visible .answer-input {
  opacity: 1;
  transform: translateY(0);
}

/* ===============================
   PATCH 8C — Split lockout transition polish
================================ */

.split-lock-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.97);
}

.split-lock-enter-active {
  transition: 0.55s cubic-bezier(0.16, 0.8, 0.32, 1);
}

.split-lock-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.split-lock-leave-from {
  opacity: 1;
  transform: scale(1);
}

.split-lock-leave-active {
  transition: 0.45s cubic-bezier(0.16, 0.8, 0.32, 1);
}

.split-lock-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

/* ===========================================
   PATCH 15B — Lower-third modal slide + rise
=========================================== */

/* Position overlay at lower third */
.overlay.modal-lower {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 14vh; /* controls how high modal appears */
}

/* Smooth rise/pop animation */
.modal-lower-card {
  transform-origin: bottom center;
  animation: modalRise 0.48s cubic-bezier(0.16, 0.8, 0.32, 1) forwards;
  opacity: 0;
}

/* Ensure fade + slide transitions blend properly */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.35s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* ============================================
   PATCH 10C — Better modal internal spacing
=============================================== */

.modal-text {
  margin-bottom: 26px !important;
  line-height: 1.45;
}

.modal-actions {
  margin-top: 12px !important;
  padding-bottom: 4px;
}

/* Smoothen transition from shake → retry box */
.modal-fade-enter-active {
  transition-delay: 0.1s;
}

/* ======================================================
   PATCH 15C — Fullscreen Loading Overlay (Tinted)
====================================================== */

.loading-screen {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-spinner {
  width: 70px;
  height: 70px;
  border-radius: 999px;
  border: 6px solid rgba(255, 255, 255, 0.4);
  border-top-color: white;
  animation: spin 0.9s linear infinite;
  margin-bottom: 18px;
}

.loading-text {
  margin-top: 4px;
  font-size: 20px;
  font-weight: 600;
  color: white;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.45);
}

/* ============================
   PATCH 15H — Screen Transitions
   ============================ */

.screen-fade-enter-from,
.screen-fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.screen-fade-enter-active,
.screen-fade-leave-active {
  transition:
    opacity 0.42s cubic-bezier(0.17, 0.85, 0.39, 1),
    transform 0.42s cubic-bezier(0.17, 0.85, 0.39, 1);
}

.screen-fade-enter-to,
.screen-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* ------------------------------------------------
   MICRO-HOVER button polish (premium touch)
------------------------------------------------- */

.reopen-btn {
  transition:
    transform 0.22s cubic-bezier(0.18, 0.74, 0.32, 1),
    opacity 0.22s ease;
}

.reopen-btn:hover {
  transform: translateY(-3px) scale(1.03);
  opacity: 0.92;
}

/* -----------------------------------------
   THEME-AWARE parallax effect (subtle)
------------------------------------------ */

/* Night mode = slightly deeper drift */
.theme-night .left-pane {
  animation-duration: 0.66s;
  transform-origin: left center;
}

.theme-night .right-pane {
  animation-duration: 0.74s;
  transform-origin: right center;
  filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.08));
}

.midday-pane {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 40px;
}

.midday-title {
  font-size: 32px;
  font-weight: 600;
  margin-top: 16px;
  color: #242227;
}

.midday-sub {
  margin-top: 24px;
  font-size: 14px;
  opacity: 0.6;
}

.midday-time {
  font-size: 28px;
  font-weight: 700;
  margin-top: 6px;
}

.midday-countdown {
  font-size: 14px;
  margin-top: 4px;
  opacity: 0.6;
}

/* HEADER SHIFT ANIMATION */
.header-shift-enter-from,
.header-shift-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.94);
}

.header-shift-enter-active,
.header-shift-leave-active {
  transition: 0.35s cubic-bezier(0.18, 0.74, 0.32, 1);
}

.header-shift-enter-to,
.header-shift-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* Header styling when inside the card */
.lockout-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 18px;
}

.play-wrapper.split-lockout-active {
  padding-top: 0 !important;
}

.exit-btn {
  margin-top: 32px;
  padding: 12px 26px;
  background: #bec0bf;
  color: #bec0bf;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  border: 1.5px solid #bec0bf;
  cursor: pointer;
  text-decoration: underline #bec0bf;
}

.exit-btn:hover {
  transform: translateY(-3px);
  opacity: 0.88;
}

.notif-btn {
  margin-top: 32px;
  padding: 12px 26px;
  background: #f2c33d;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 200;
  border: 1.5px solid #ffa300;
  cursor: pointer;
}

.notif-btn:hover {
  transform: translateY(-3px);
  opacity: 0.88;
}

/* ============================================================
   Keyframes
   ============================================================ */

@keyframes sweepAttempt {
  0% {
    width: 0%;
    opacity: 0.35;
  }
  40% {
    width: 40%;
    opacity: 0.55;
  }
  70% {
    width: 100%;
    opacity: 0.65;
  }
  100% {
    width: 100%;
    opacity: 0;
  }
}

@keyframes replayDim {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0.35;
  }
}

@keyframes replayLock {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0px rgba(0, 0, 0, 0.25);
  }
  50% {
    transform: scale(1.04);
    box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.35);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0px rgba(0, 0, 0, 0);
  }
}

@keyframes heroFlash {
  0% {
    box-shadow: 0 0 0px 0 rgba(0, 0, 0, 0);
    transform: scale(1);
  }
  35% {
    box-shadow: 0 0 22px 6px rgba(0, 0, 0, 0.65);
    transform: scale(1.04);
  }
  65% {
    box-shadow: 0 0 16px 4px rgba(0, 0, 0, 0.35);
    transform: scale(1.02);
  }
  100% {
    box-shadow: 0 0 0px 0 rgba(0, 0, 0, 0);
    transform: scale(1);
  }
}

@keyframes modalPop {
  0% {
    transform: scale(0.94) translateY(12px);
    opacity: 0.7;
  }
  60% {
    transform: scale(1.02) translateY(0);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes fadein {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
@keyframes fadeOutText {
  0% {
    color: #fff;
  }
  100% {
    color: var(--bg-color);
  }
}
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  50% {
    transform: translateX(4px);
  }
  75% {
    transform: translateX(-3px);
  }
}
@keyframes pop {
  0% {
    transform: scale(0.98);
  }
  60% {
    transform: scale(1.03);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes modalRise {
  0% {
    opacity: 0;
    transform: translateY(42px) scale(0.95);
  }
  55% {
    opacity: 1;
    transform: translateY(0) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* -------------------------------------
   Freeze inputs after replay completes
-------------------------------------- */
.final-attempt-replay .answer-input {
  cursor: default;
}

/* -----------------------------------------
   PATCH 15K — BLACK HERO FLASH (first correct)
------------------------------------------ */
.hero-flash {
  position: relative;
  z-index: 2;
  animation: heroFlash 0.65s cubic-bezier(0.18, 0.74, 0.32, 1) forwards;
}

/* ==========================================================
   ✔ FIXED SPLIT-LOCKOUT LAYOUT
   - No transforms
   - No drift animations
   - Right card stays perfectly centred
========================================================== */

.lockout-split {
  display: grid;
  grid-template-columns: 25% 75%;
  width: 100%;
  height: 100vh; /* full height */
  padding: 0;
  margin: 0; /* remove top spacing */
}

/* LEFT COLUMN */
.left-pane {
  width: 100%;
  height: 100%;
  padding: 3.5rem 2rem;
  background: rgba(0, 0, 0, 0.05);
  border-right: 2px solid rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.lockout-logo {
  width: 120px;
  height: 120px;
  outline: 1.5px solid #000;
  margin-top: 100px;
  margin-bottom: 25px;
}

.lockout-headline-strong {
  font-size: 32px;
  font-weight: 800;
  margin: 0;
}

.lockout-headline-sub {
  font-size: 24px;
  font-weight: 400;
  margin: 4px 0 2px;
}

/* RIGHT COLUMN — STABLE AND CENTERED */
.right-pane {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  text-align: center;
}

/* WHITE CARD */
.lockout-card {
  width: 100%;
  height: 100%;
  background: white; /* no white card */
  box-shadow: none;
  padding: 4rem 3rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start; /* left align text */
  align-items: center;
  text-align: center;
}

/* Typography inside the card */
.lockout-card .midday-title {
  font-size: 32px;
  font-weight: 700;
  margin-top: 16px;
  color: #111;
}
.lockout-card .midday-sub {
  font-size: 14px;
  opacity: 0.6;
  margin-top: 20px;
}
.lockout-card .midday-time {
  font-size: 28px;
  margin-top: 6px;
  font-weight: 700;
}
.lockout-card .midday-countdown {
  margin-top: 4px;
  font-size: 14px;
  opacity: 0.6;
}

/* ============================================================
   UNBREAKABLE SANDBOX FOR REVEAL LIST (fix for black bars)
   ============================================================ */

.reveal-sandbox * {
  all: unset !important; /* wipe ALL inherited gameplay styles */
  display: block;
  font-size: 17px;
  line-height: 1.45;
  color: #242227 !important;
  font-family: -apple-system, Inter, sans-serif;
}

.reveal-sandbox {
  all: unset !important;
  display: block;
  background: rgba(0, 0, 0, 0.05);
  padding: 16px 20px;
  border-radius: 12px;
  margin-top: 16px;
  width: 100%;
}

.reveal-sandbox .reveal-item {
  padding: 6px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.reveal-sandbox .reveal-item:last-child {
  border-bottom: none;
}

/* -----------------------------------
   Responsive Layout Adjustments
-----------------------------------*/

@media (max-width: 900px) {
  .play-wrapper {
    padding-top: var(--space-md);
  }
  .question-title {
    font-size: var(--fs-md);
  }
}

@media (max-width: 600px) {
  .question-title {
    font-size: var(--fs-sm);
    max-width: 90%;
  }
  .stage {
    font-size: var(--fs-lg) !important;
  }
}

@media (max-width: 400px) {
  .answer-input {
    font-size: var(--fs-sm);
  }
  .lock {
    font-size: var(--fs-sm);
    padding: 0.6rem 1.6rem;
  }
}

@media (max-width: 500px) {
  .modal.smart-lower {
    width: 94%;
    padding: 18px 16px;
    border-radius: 14px;
  }

  .modal-title {
    font-size: 22px !important;
  }

  .modal-text {
    font-size: 15px !important;
    margin-bottom: 18px !important;
  }
}
</style>
