<template>
  <transition name="screen-fade" mode="out-in">
    <!-- ===========================
         GAMEPLAY VIEW
    ============================ -->
    <div
      v-if="currentView === 'play'"
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
          <img src="/logo-800-full.svg" class="logo" @click="goHome" />
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
              <p class="midday-countdown">Come back in {{ countdown }}</p>

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
          class="input-group stagger-on"
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
     MODAL SYSTEM (SINGLE OVERLAY, CLEAN TRANSITIONS)
======================================================= -->

      <transition name="modal-fade">
        <div v-if="modalMode || showExitConfirm || showFillWarning" class="overlay modal-lower">
          <!-- FILL WARNING -->
          <div v-if="showFillWarning" class="modal">
            <h2 class="modal-title">Almost there!</h2>
            <p class="modal-text">Fill all boxes first.</p>
            <button class="modal-btn primary" @click="showFillWarning = false">OK</button>
          </div>

          <!-- ASK HINT -->
          <div v-else-if="modalMode === 'askHint'" class="modal">
            <h2 class="modal-title">Not quite.</h2>
            <p class="modal-text modal-spaced">Some answers aren’t quite there. Want a hint?</p>

            <div class="modal-actions">
              <button class="modal-btn secondary" @click="closeModal">No, retry</button>
              <button class="modal-btn primary" @click="showHint">Yes, show hint</button>
            </div>
          </div>

          <!-- HINT -->
          <div v-else-if="modalMode === 'hint'" class="modal">
            <h2 class="modal-title">Hint</h2>
            <p class="modal-text modal-spaced">
              {{ hintText || 'Hint coming soon.' }}
            </p>
            <button class="modal-btn primary" @click="closeHint">Back</button>
          </div>

          <!-- EXIT -->
          <div v-else-if="showExitConfirm" class="modal">
            <h2 class="modal-title">Finished for Today?</h2>
            <p class="modal-text modal-spaced">
              You’ll end today’s session early and see the correct answers.<br />
              You can’t return until tomorrow.
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
      @continue="goHome"
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
import { useRouter } from 'vue-router'
import {
  getTimezone,
  getCurrentWindow,
  getNextWindow,
  getTimeRemainingToNextWindow,
  todayKey,
} from '../utils/windows.js'
import { onUnmounted } from 'vue'

/* ======================================================
   CORE GAME STATE
====================================================== */
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

const userId = getOrCreateUUID()
const userCountry = localStorage.getItem('akinto_country') || 'XX' // XX = Unknown

const tz = ref(getTimezone())
const currentWindow = ref(getCurrentWindow(tz.value))
const nextWindow = ref(getNextWindow(tz.value))
const t0 = getTimeRemainingToNextWindow(tz.value)
const countdown = ref(t0.formatted)

const dateKey = ref(todayKey(tz.value))
const curWin = computed(() => getCurrentWindow(tz.value))
const currentHistory = ref(null)

let countdownTimer = null

onUnmounted(() => {
  clearInterval(countdownTimer)
})

/* ======================================================
   UI + FX FLAGS (these were missing / duplicated)
====================================================== */
const inputsVisible = ref(false)
const isReplaySequence = ref(false)
const heroFlashIndex = ref(null)
const showFillWarning = ref(false)

const modalMode = ref(null) // null | 'askHint' | 'hint' | 'success'
const showExitConfirm = ref(false)
const router = useRouter()

/* ======================================================
   INPUT REFERENCES (arrow navigation)
====================================================== */
const inputRefs = ref([])

function registerInputRef(el, i) {
  if (el) inputRefs.value[i] = el
}

function onKey(e, i) {
  const inputs = inputRefs.value

  if (e.key === 'ArrowDown') {
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

  if (e.key === 'Enter') {
    e.preventDefault()
    onLockIn()
  }
}

/* ======================================================
  CREATING PERSISTENCE VIA LOCAL STORAGE
  =================================================== */

function saveLocalSession(state) {
  const key = `akinto_session_${dateKey.value}_${curWin.value.id}`
  localStorage.setItem(key, JSON.stringify(state))
}

function loadLocalSession() {
  const key = `akinto_session_${dateKey.value}_${curWin.value.id}`
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function clearLocalSession() {
  const key = `akinto_session_${dateKey.value}_${curWin.value.id}`
  localStorage.removeItem(key)
}

/* ======================================================
   TIME WINDOW / STAGE LABEL
====================================================== */

const windowLabels = {
  nightowl: 'Night Owl',
  early: 'Early Bird',
  midmorning: 'Mid-Morning',
  midday: 'Midday',
  evening: 'Evening',
  late: 'Late Evening',
  last: 'Last Chance',
}

const stageLabel = computed(() => {
  const w = curWin.value
  return windowLabels[w.id] || 'Check-In'
})

const lockoutHeadlineStrong = computed(() => {
  const w = curWin.value
  if (!w) return 'Check-In Locked'
  if (w.id === 'last') return 'That’s All For Today'
  return 'Check-In Locked For Now'
})

const lockoutHeadlineSub = computed(() => {
  const w = curWin.value
  if (!w) return 'You’ve used all your attempts for this check-in.'
  return `You’ve used all attempts in the ${w.label} window.`
})

const nextSlotShort = computed(() => {
  const w = nextWindow.value
  if (!w) return 'Next window soon'
  return `${w.start} – ${w.end}`
})

function enableNotifications() {
  alert('Notifications are coming soon. For now, add Akinto to your bookmarks!')
}

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer)

  countdownTimer = setInterval(() => {
    const t = getTimeRemainingToNextWindow(tz.value)
    countdown.value = t.formatted

    if (t.total <= 0) {
      currentWindow.value = getCurrentWindow(tz.value)
      nextWindow.value = getNextWindow(tz.value)
    }
  }, 1000)
}

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

onMounted(async () => {
  await loadTodayQuestion() // pulls question + correctAnswers
  await Promise.all([
    loadSessionState(), // per-window attempts
    LoadHistory(), // cross-window correct answers
  ])
  applyHydratedState() // merge both into answers + fieldStatus
  startCountdown()
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

async function loadTodayQuestion() {
  loading.value = true

  try {
    const res = await fetch('/api/get-today-question')
    const data = await res.json()

    // ===============================
    // NORMALISE QUESTION TEXT
    // ===============================
    question.value = data.text || ''

    // ===============================
    // NORMALISE CORRECT ANSWERS
    // ===============================
    let CA = data.correctAnswers
    if (typeof CA === 'string') {
      CA = CA.split(',').map((s) => s.trim())
    }
    correctAnswers.value = Array.isArray(CA) ? CA : []

    // ===============================
    // NORMALISE ANSWER COUNT
    // ===============================
    answerCount.value = data.answerCount || correctAnswers.value.length || 0

    // ===============================
    // SET EMPTY INPUTS + STATUS
    // ===============================
    answers.value = Array(answerCount.value).fill('')
    fieldStatus.value = Array(answerCount.value).fill('')

    // ===============================
    // NORMALISE HINT
    // ===============================
    hintText.value = Array.isArray(data.hint) ? data.hint[0] || '' : data.hint || ''

    // ===============================
    // DEFAULT STATE
    // ===============================
    attemptsRemaining.value = MAX_ATTEMPTS
    hardLocked.value = false
    isReplaySequence.value = false
    screenState.value = 'normal'

    // ===============================
    // HYDRATE FROM LOCALSTORAGE (if any)
    // ===============================
    loadSessionState()

    await nextTick()
    inputsVisible.value = true
  } catch (err) {
    console.error('Failed to load question', err)
  } finally {
    loading.value = false
  }
}

async function loadSessionState() {
  const res = await fetch('/api/load-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      dateKey: dateKey.value,
      windowId: curWin.value.id,
    }),
  })

  const data = await res.json()
  if (!data.attempts?.length) return

  const attempts = data.attempts
  const latest = attempts[attempts.length - 1]

  // Restore answers
  answers.value = latest.answers

  // Restore attempts remaining
  attemptsRemaining.value = MAX_ATTEMPTS - attempts.length

  // Restore success
  if (latest.result === 'success') {
    hardLocked.value = true
    currentView.value = 'success'
    return
  }

  // Restore lockout
  if (attemptsRemaining.value <= 0 || latest.result === 'lockout') {
    hardLocked.value = true
    screenState.value = 'split-lockout'
  }
}

async function LoadHistory() {
  const res = await fetch('/api/load-history', { method: 'POST' })
  if (!res.ok) return
  const data = await res.json()

  currentHistory.value = data // <-- store it

  if (data.answers?.length) {
    answers.value = [...data.answers]
    attemptsRemaining.value = data.remainingAttempts
    modalMode.value = data.modal
    hardLocked.value = data.hardLocked
    currentWindow.value = data.windowId

    recomputeFieldStatusFromAnswers()
  }
}

function applyHydratedState() {
  // 1) First, if we already have answers from this window (loadSessionState)
  if (answers.value && answers.value.length) {
    // Ensure we have correct length
    if (answers.value.length !== answerCount.value) {
      answers.value = [
        ...answers.value,
        ...Array(Math.max(0, answerCount.value - answers.value.length)).fill(''),
      ].slice(0, answerCount.value)
    }
    recomputeFieldStatusFromAnswers()
  } else {
    // No attempts in this window yet: pre-fill correct answers from history
    const canon = correctAnswers.value.map((c) => ({
      raw: c,
      norm: normalise(c),
    }))

    const seen = new Set(historicalCorrect.value.map(normalise))
    const used = new Set()

    answers.value = Array(answerCount.value).fill('')
    fieldStatus.value = Array(answerCount.value).fill('')

    // For each correct answer the user has ever given,
    // place it in the next available slot.
    for (let i = 0; i < answerCount.value; i++) {
      const slot = canon.find((c) => seen.has(c.norm) && !used.has(c.norm))
      if (slot) {
        used.add(slot.norm)
        answers.value[i] = slot.raw
        fieldStatus.value[i] = 'correct'
      }
    }

    // No attempts have been used yet in this window
    attemptsRemaining.value = MAX_ATTEMPTS
    hardLocked.value = false
    screenState.value = 'normal'
  }
}

function recomputeFieldStatusFromAnswers() {
  fieldStatus.value = answers.value.map((a) => {
    if (!a) return { locked: false, correct: false }

    const canonical = a.trim().toLowerCase()
    const isCorrect = correctAnswers.value.some((c) => c.trim().toLowerCase() === canonical)

    return {
      locked: isCorrect,
      correct: isCorrect,
    }
  })
}

/* ======================================================
   LOCK-IN LOGIC
====================================================== */
function normalise(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

// Correct answers the user has ever given today (all windows)
const historicalCorrect = ref([]) // array of strings

async function onLockIn() {
  if (hardLocked.value) return

  const filled = answers.value.filter((a) => a.trim()).length
  if (filled < answerCount.value) {
    showFillWarning.value = true
    return
  }

  const canon = correctAnswers.value.map(normalise)
  const used = new Set()

  fieldStatus.value = answers.value.map((a) => {
    const v = normalise(a)
    const ok = canon.includes(v) && !used.has(v)
    if (ok) used.add(v)
    return ok ? 'correct' : 'incorrect'
  })

  const isPerfect = fieldStatus.value.every((s) => s === 'correct')

  await fetch('/api/log-attempt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      country: userCountry,
      dateKey: dateKey.value,
      windowId: curWin.value.id,
      attemptIndex: MAX_ATTEMPTS - attemptsRemaining.value + 1,
      answers: answers.value,
      correctAnswers: correctAnswers.value,
      result: isPerfect ? 'success' : 'fail',
    }),
  })

  // Save snapshot locally (write-through cache)
  saveLocalSession({
    dateKey: dateKey.value,
    windowId: curWin.value.id,
    answers: answers.value,
    attemptIndex: MAX_ATTEMPTS - attemptsRemaining.value + 1,
    attemptsUsed: MAX_ATTEMPTS - attemptsRemaining.value,
    result: isPerfect ? 'success' : 'fail',
    timestamp: Date.now(),
  })

  if (isPerfect) {
    hardLocked.value = true
    await logPlay('success')

    // Clear local session — day finished
    clearLocalSession()

    currentView.value = 'success'
    return
  }

  attemptsRemaining.value--

  if (attemptsRemaining.value === 1) {
    isReplaySequence.value = true
  }

  if (attemptsRemaining.value <= 0) {
    hardLocked.value = true
    modalMode.value = null
    screenState.value = 'split-lockout'

    await logPlay('lockout')

    // Clear local state — no returning this window
    clearLocalSession()
  }
}

/* ======================================================
   PUSH WINDOW TIMING TO AIRTABLE (ANALYTICS)
====================================================== */

async function logPlay(result) {
  await fetch('/api/log-play', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      country: userCountry,
      dateKey: dateKey.value,
      windowId: curWin.value.id,
      answers: answers.value,
      correctAnswers: correctAnswers.value,
      result,
    }),
  })
}

/*= ======================================================
Client Registration + Subscription
========================================================= */

async function registerPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Notifications not supported on this browser.')
    return
  }

  // 1. Register SW
  const sw = await navigator.serviceWorker.register('/sw.js')

  // 2. Request permission
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    alert('Notifications disabled.')
    return
  }

  // 3. Subscribe with VAPID
  const sub = await sw.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC),
  })

  // 4. Send to server
  await fetch('/api/save-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sub }),
  })

  alert('Notifications enabled!')
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
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
  screenState.value = 'split-lockout'
  logPlay('exit-early')
  currentView.value = 'failure'
}

/* ======================================================
   GO HOME WHEN LOGO IS CLICKED
====================================================== */

function goHome() {
  router.push('/')
}

/* ======================================================
   CAPTURING UUID + COUNTRY IN PLAY.VIEW
====================================================== */

function getOrCreateUUID() {
  let id = localStorage.getItem('akinto_uuid')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('akinto_uuid', id)
  }
  return id
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

.reopen-btn {
  margin-top: 20px;
  background: #000;
  color: #fff;
  padding: 12px 28px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 17px;
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
  cursor: pointer;
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

/*Button Formatting */

.button-row {
  display: flex;
  gap: 22px;
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

.reopen-btn {
  transition:
    transform 0.22s cubic-bezier(0.18, 0.74, 0.32, 1),
    opacity 0.22s ease;
}

.reopen-btn:hover {
  transform: translateY(-3px) scale(1.03);
  opacity: 0.92;
}

.exit-btn {
  margin-top: 32px;
  padding: 12px 26px;
  background: #bec0bf;
  color: #000000;
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
  background: #ffffff;
  color: #000000;
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.answer-input:focus {
  border-color: #000;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.15);
}

.answer-input.correct {
  animation: fadeOutText 0.8s forwards;
  background: #000;
  border-color: #000;
  color: var(--bg-color);
  font-weight: 600;
}

.answer-input.incorrect {
  background: #ffffff;
  border-color: #242227;
  animation: shake 0.35s ease;
}

/* Answer Input-Box Formatting continued, but dark mode */

.theme-night .answer-input {
  background: #ffffff;
  color: #000000;
}

.theme-night .answer-input.correct {
  background: #000000;
  color: #ffffff;
  border-color: #ffffff;
}

/* Staggering Input Boxes */

.stagger-on .answer-input {
  opacity: 0;
  transform: translateY(10px);
}

.stagger-on.visible .answer-input {
  opacity: 1;
  transform: translateY(0);
  transition: 0.45s cubic-bezier(0.18, 0.74, 0.32, 1);
}

/* Stagger timing helpers */
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

/* Locking in Answers */

.lock {
  background: #000000;
  border: 2px solid #ffffff;
  width: 100%;
  padding: 0.5rem 2.5rem;
  font-size: var(--fs-md);
  font-weight: 500;
  color: #ffffff;
  border-radius: 10px;
  cursor: pointer;
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

.lock:disabled {
  opacity: 0.5;
  cursor: default;
}

/* Overlays/Modal and Triggered Pop-Ups */

.overlay {
  position: fixed;
  inset: 0;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal {
  width: 30%;
  background: #ffffff;
  border-radius: 16px;
  padding: 22px 22px 18px;
  text-align: center;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  background: #fff;
  opacity: 1;
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

.overlay.modal-lower {
  align-items: flex-end;
  padding-bottom: 14vh;
}

.modal-text {
  margin-bottom: 26px !important;
  line-height: 1.45;
}

.modal-actions {
  margin-top: 12px !important;
  padding-bottom: 4px;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}

.modal-fade-enter-to,
.modal-fade-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
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

/* Overlay and Pop-Up Animations for Smoothness*/

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.35s cubic-bezier(0.18, 0.74, 0.32, 1);
  transition-delay: 0.1s;
}

.overlay.modal-slide {
  display: flex;
  align-items: flex-end;
  padding-bottom: 14vh;
}

.modal-slide > .modal {
  animation: modalPop 0.45s cubic-bezier(0.17, 0.85, 0.39, 1);
}

.modal-spaced {
  margin-bottom: 22px !important;
}

.modal-lower-card {
  transform-origin: center;
  animation: modalRise 0.48s cubic-bezier(0.16, 0.8, 0.32, 1) forwards;
  opacity: 0;
}

/* Playwrapper Adaptations and Input Changes in Accordance with Correctness */

.play-wrapper {
  --text-color: #ffffff;
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

/* Answer Input Adaptations */

.answer-input {
  background-color: #ffffff;
  color: #000000;
  color: var(--input-text);
}

.answer-input .theme-night {
  background-color: #ffffff;
  color: #000000;
}

.answer-input.correct {
  background: var(--input-bg);
  background: #000;
  color: var(--correct-text) !important;
}

.answer-input:focus {
  outline: none;
  border-color: #000;
  box-shadow: 0 0 0 2px #000000 15%;
  transition: 0.18s ease;
}

.final-attempt-replay .answer-input {
  cursor: default;
}

.hero-flash {
  position: relative;
  z-index: 2;
  animation: heroFlash 0.65s cubic-bezier(0.18, 0.74, 0.32, 1) forwards;
}

/* End of Game, Possible Answers Revelation */

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

/* Split-Lockout Page Formatting and Animations */

.split-lock-enter-from,
.split-lock-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.split-lock-enter-to,
.split-lock-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.split-lock-enter-active,
.split-lock-leave-active {
  transition:
    opacity 0.35s cubic-bezier(0.17, 0.85, 0.39, 1),
    transform 0.35s cubic-bezier(0.17, 0.85, 0.39, 1);
  will-change: opacity, transform;
}

.lockout-split {
  display: grid;
  grid-template-columns: 25% 75%;
  width: 100%;
  height: 100vh;
  padding: 0;
  margin: 0;
  will-change: transform, opacity;
}

.left-pane {
  width: 100%;
  height: 100%;
  padding: 3.5rem 2rem;
  background: rgba(0, 0, 0, 0.05);
  border-right: 2px solid rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.right-pane {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  text-align: center;
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

/* Page to Page Transitions via Spinners and Loading Displays */

.spinner {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 6px solid #000;
  border-top-color: transparent;
  animation: spin 0.85s linear infinite;
  margin-bottom: 14px;
}

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

/* Screen Transitions for Better Game Play */

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

/* --- Personal and Global Analytics Formatting --- */

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

.analytics-root {
  display: grid;
  grid-template-columns: 48% 52%;
  height: 100vh;
  overflow: hidden;
  font-family: -apple-system, Inter, sans-serif;
}

/* Personal Analytics Formatting */

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

/* Visual Statistics Formatting */

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

/* Circle Gauge */

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

/* Speed Bar */

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

/* Global Analytics Formatting */

html,
body {
  overflow-x: hidden;
  overflow-y: hidden;
  overscroll-behavior: hidden;
}

.lockout-subtext {
  margin-top: 12px !important; /* was too tight */
}

.reveal-block {
  margin-top: 22px; /* slightly increased to breathe */
  padding: 10px 16px; /* reduced from 14px 18px */
  border-radius: 12px;
}

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

/* ---Cleaning Game Play Features and Formatting --- */

/* Utilising Parallax effects to Improve Game Play */

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
  color: #242227;
}

.midday-time {
  font-size: 28px;
  font-weight: 700;
  margin-top: 6px;
  color: #242227;
}

.midday-countdown {
  font-size: 14px;
  margin-top: 4px;
  opacity: 0.6;
  color: #242227;
}

/* Ingame-Animations Using KeyFrames */

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

@keyframes heroFlash {
  0% {
    opacity: 0;
    transform: scale(1.1);
    filter: brightness(2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
    filter: brightness(1);
  }
}

@keyframes slideFromLeft {
  from {
    transform: translateX(-30px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideFromRight {
  from {
    transform: translateX(30px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.left-pane {
  animation: slideFromLeft cubic-bezier(0.18, 0.74, 0.32, 1) both;
  animation-duration: 0.5s; /* Standard speed */
  will-change: transform, opacity;
}

.right-pane {
  animation: slideFromRight cubic-bezier(0.18, 0.74, 0.32, 1) both;
  animation-duration: 0.6s; /* Slightly slower to create parallax */
  will-change: transform, opacity;
}

.theme-night .left-pane {
  animation-duration: 0.66s;
}
.theme-night .right-pane {
  animation-duration: 0.74s;
}
</style>
