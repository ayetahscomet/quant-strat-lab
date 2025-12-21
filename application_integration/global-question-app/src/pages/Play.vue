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
import SuccessSummary from './SuccessSummary.vue'
import FailureSummary from './FailureSummary.vue'

/* ======================================================
   CORE GAME STATE
====================================================== */
const gameState = ref('playing')
const currentView = ref('play') // 'play' | 'success' | 'failure'
const screenState = ref('normal') // 'normal' | 'split-lockout'

const loading = ref(true)
const question = ref('')
const answerCount = ref(0)
const correctAnswers = ref([])
const hintText = ref('')

const answers = ref([])
const fieldStatus = ref([])

const MAX_ATTEMPTS = 3
const attemptsRemaining = ref(MAX_ATTEMPTS)
const hardLocked = ref(false)

/* ======================================================
   UI + FX FLAGS (these were missing / duplicated)
====================================================== */
const inputsVisible = ref(false)
const isReplaySequence = ref(false)
const heroFlashIndex = ref(null)

const modalMode = ref(null) // null | 'askHint' | 'hint' | 'success'
const showExitConfirm = ref(false)

/* ======================================================
   INPUT REFERENCES (arrow navigation)
====================================================== */
const inputRefs = ref([])

function registerInputRef(el, i) {
  if (el) inputRefs.value[i] = el
}

function onKey(e, i) {
  const inputs = inputRefs.value

  if (e.key === 'ArrowDown' || e.key === 'Enter') {
    e.preventDefault()
    inputs[i + 1]?.focus()
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    inputs[i - 1]?.focus()
  }

  if (e.key === 'Backspace' && !answers.value[i]) {
    inputs[i - 1]?.focus()
  }
}

/* ======================================================
   TIME WINDOW / STAGE LABEL
====================================================== */
function minutesSinceMidnight(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes()
}

const stageLabel = computed(() => {
  const mins = minutesSinceMidnight()

  if (mins < 270) return 'Night Owl' // 00:00–04:30
  if (mins < 600) return 'Early Bird' // 04:30–10:00
  if (mins < 720) return 'Mid-Morning Check-In' // 10:00–12:00
  if (mins < 900) return 'Midday Check-In' // 12:00–15:00
  if (mins < 1200) return 'Evening Check-In' // 15:00–20:00
  if (mins < 1260) return 'Late Evening' // 20:00–21:00
  return 'Last Chance' // 21:00–00:00
})

/* ======================================================
   BACKGROUND THEME
====================================================== */
const hour = new Date().getHours()
const timeClass = computed(() => {
  if (hour < 11) return 'theme-morning'
  if (hour < 15) return 'theme-day'
  if (hour < 20) return 'theme-evening'
  return 'theme-night'
})

/* ======================================================
   FETCH TODAY’S QUESTION (Airtable)
====================================================== */
onMounted(loadTodayQuestion)

async function loadTodayQuestion() {
  loading.value = true

  try {
    const res = await fetch('/api/get-today-question')
    const data = await res.json()

    question.value = data.text
    answerCount.value = data.answerCount
    correctAnswers.value = data.correctAnswers
    hintText.value = data.hint || ''

    answers.value = Array(answerCount.value).fill('')
    fieldStatus.value = Array(answerCount.value).fill('')

    attemptsRemaining.value = MAX_ATTEMPTS
    hardLocked.value = false
    isReplaySequence.value = false

    await nextTick()
    inputsVisible.value = true
  } catch (err) {
    console.error('Failed to load question', err)
  } finally {
    loading.value = false
  }
}

/* ======================================================
   LOCK-IN LOGIC
====================================================== */
async function onLockIn() {
  if (hardLocked.value) return

  const filled = answers.value.filter((a) => a.trim()).length
  if (filled < answerCount.value) return alert('Fill all boxes first.')

  fieldStatus.value = answers.value.map((a, i) =>
    a.trim().toLowerCase() === correctAnswers.value[i]?.toLowerCase() ? 'correct' : 'incorrect',
  )

  const isPerfect = fieldStatus.value.every((s) => s === 'correct')

  if (isPerfect) {
    modalMode.value = 'success'
    return
  }

  attemptsRemaining.value--

  if (attemptsRemaining.value === 1) {
    isReplaySequence.value = true
  }

  if (attemptsRemaining.value <= 0) {
    hardLocked.value = true
    currentView.value = 'failure'
  } else {
    modalMode.value = 'askHint'
  }
}

/* ======================================================
   MODALS
====================================================== */
function closeModal() {
  modalMode.value = null
}

function showHint() {
  modalMode.value = 'hint'
}

function closeHint() {
  modalMode.value = null
}

/* ======================================================
   EXIT EARLY
====================================================== */
function confirmExitEarly() {
  hardLocked.value = true
  currentView.value = 'failure'
}

/* ======================================================
   SUCCESS CONTINUE
====================================================== */
function goToSuccessSummary() {
  currentView.value = 'success'
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
/** Main Layout **/

.play-wrapper {
  width: 100vw;
  height: 100vh;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: var(--space-lg);
  padding-bottom: var(--space-lg);
}

/*n/a (for things we are not sure about)*/

.play-wrapper.split-lockout-active {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.lock:disabled {
  opacity: 0.5;
  cursor: default;
}

/* Changing Themes */

.theme-morning {
  --bg-color: #9fd5ff;
  background: var(--bg-color);
}

.theme-day {
  --bg-color: #9fd5ff;
  background: var(--bg-color);
}

.theme-evening {
  --bg-color: #6ec04d;
  background: var(--bg-color);
}

.theme-night {
  --bg-color: #0e0c24;
  background: var(--bg-color);
  color: white;
}

/** Playscreen Layouts **/

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

.counter {
  font-size: var(--fs-lg);
  display: flex;
  align-items: center;
}

.num-light {
  font-weight: 400;
  opacity: 1;
}

.num-bold {
  font-weight: 600;
}

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
  opacity: 0.8; /* remaining attempts */
}

/* Playscreen Layouts continued, but catering for dark mode*/

.theme-night .dot {
  background: rgba(255, 255, 255, 0.18) !important;
  opacity: 1 !important;
}

.theme-night .dot.active {
  background: #ffffff !important;
  opacity: 1 !important;
}

.theme-night .dots {
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.45));
}

.theme-night .attempts-label {
  color: white !important;
}

.theme-night {
  color: white !important;
}

.theme-night .question-title,
.theme-night .attempts-label,
.theme-night .stage,
.theme-night .counter,
.theme-night .divider {
  color: white !important;
}

.theme-night input::placeholder {
  color: #ffffff 75% !important;
}

.theme-night .answer-input {
  background: #ffffff;
  color: #0000;
}

.theme-night .answer-input.correct {
  background: #000000;
  color: #ffffff !important;
  border-color: #ffffff;
}

/* Question Title */

.question-title {
  font-size: var(--fs-lg);
  font-weight: 550;
  max-width: 90%;
  text-align: center;
  color: #242227;
  margin-bottom: var(--space-md);
}

.muted {
  opacity: 0.45;
}

/* Answer Input-Box Formatting */

.input-group {
  width: 30%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: var(--space-md);
}

.answer-input {
  font-size: var(--fs-md);
  display: flex;
  padding: 0.5rem 1rem;
  border-radius: 10px;
  border: 2px solid #111;
  outline: 0.5px;
  transition: 0.18s ease;
}

.answer-input.correct {
  animation: fadeOutText 0.8s forwards;
  background: #000;
  border-color: #000;
  color: var(--bg-color);
  font-weight: 600;
  transition: 0.25s;
}

/* Answer Input-Box Formatting continued, but dark mode */

.theme-night .answer-input.correct {
  color: black;
}

.answer-input.incorrect {
  background: #ffffff;
  border-color: #242227;
  animation-name: shake !important;
  animation-duration: 0.35s !important;
  animation-timing-function: ease !important;
}

.button-row {
  display: flex;
  gap: 22px;
}

.lock {
  background: #000000;
  border: 2px solid #ffffff;
  width: 100%;
  padding: 0.5rem 2.5rem;
  font-size: var(--fs-md);
  font-weight: 500;
  color: #fff;
  border-radius: 10px;
  cursor: pointer;
}

/* Overlays and Triggered Pop-Ups */

.overlay {
  position: fixed;
  inset: 0;
  backdrop-filter: blur(8px);
  background: #000000;
  opacity: 0.3;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  width: 30%;
  background: #ffffff;
  opacity: 1 !important;
  border-radius: 16px;
  padding-top: 22px;
  padding-bottom: 10px;
  text-align: center;
  box-shadow: 0 16px 40px #000000;
}

.modal-title {
  font-size: 26px !important;
  color: #000;
  line-height: 1;
  padding-top: 0.5px;
  padding-bottom: 0.5px;
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
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.modal-btn {
  padding: 9px 18px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid #111;
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

/* Lockout Screen Formatting */

.lockout-screen {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: inherit;
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
  font-weight: 600;
  margin: 2px 0 2px;
}

.lockout-card .countdown {
  font-size: 18px;
  margin-top: 2px;
}

.attempt-title {
  font-size: 25px;
  font-weight: 700;
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

/* Overlay and Pop-Up Animations for Smoothness*/

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: 0.45s cubic-bezier(0.18, 0.74, 0.32, 1);
}

.modal-slide .modal,
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: translateY(45vh);
}

.modal-fade-enter-to,
.modal-fade-leave-from {
  opacity: 1;
  transform: translateY(30vh);
}

.overlay.modal-slide {
  display: flex;
  align-items: flex-end;
  padding-bottom: 14vh;
}

.modal-spaced {
  margin-bottom: 22px !important;
}

/* Playwrapper Adaptations and Input Changes in Accordance with Correctness */

.play-wrapper {
  --text-color: #242227;
  --text-muted: #24222799;
  --input-bg: #ffffff;
  --input-text: #000000;
  --correct-text: var(--bg-color);
}

.theme-night.play-wrapper {
  --text-color: #ffffff;
  --text-muted: #ffffff 0.6;
  --input-bg: #111;
  --input-text: #fffff;
  --correct-text: #fff;
}

.play-wrapper,
.play-wrapper * {
  color: var(--text-color);
}

/* Answer Input Adaptations */

.answer-input {
  background-color: #ffffff;
  color: #000000;
  color: var(--input-text);
}
</style>
