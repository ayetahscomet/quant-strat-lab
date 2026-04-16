<!-- src/pages/Play.vue -->
<template>
  <div class="play-route">
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
          <span class="attempts-label">Attempts remaining:</span>
          <div class="dots">
            <span
              v-for="n in MAX_ATTEMPTS"
              :key="n"
              :class="['dot', { active: n <= attemptsRemaining }]"
            />
          </div>
        </div>

        <div v-if="screenState !== 'split-lockout'" class="global-live-bar">
          <template v-if="landingBoardLoading">
            <span class="global-live-bar-line">Today’s board is loading…</span>
          </template>

          <template v-else-if="landingBoard.todayCountryCount > 0">
            <span class="global-live-bar-line">
              Live today · {{ landingBoard.todayCountryCount }}
              {{ landingBoard.todayCountryCount === 1 ? 'country has' : 'countries have' }}
              already joined today’s board.
            </span>
            <span class="global-live-bar-sub">Your answers will be compared globally.</span>
          </template>

          <template v-else>
            <span class="global-live-bar-line">
              Live today · You could be one of the first countries on today’s board.
            </span>
            <span class="global-live-bar-sub">Your answers will be compared globally.</span>
          </template>
        </div>

        <div class="attempt-metric">
          {{ fieldStatus.filter((s) => s === 'correct').length }} / {{ answers.length }} correct
        </div>

        <!-- =======================================================
           SPLIT LOCKOUT MODE
      ======================================================= -->
        <template v-if="screenState === 'split-lockout'">
          <transition name="split-lock" mode="out-in">
            <div
              class="lockout-split ready"
              :class="{
                'lockout-return': lockoutMode === 'return',
                'lockout-return-scrollable': lockoutMode === 'return',
              }"
            >
              <!-- ============ LEFT PANE: LATEST ATTEMPT ============ -->
              <div class="left-pane">
                <h2 class="attempt-title">Latest Attempt</h2>
                <p class="attempt-sub">Your final answers in this window</p>
                <div
                  v-for="(ans, i) in answers"
                  :key="i"
                  class="locked-result"
                  :class="fieldStatus[i]"
                >
                  {{ ans || '-' }}
                </div>
              </div>

              <!-- ============ RIGHT PANE: LOCKOUT CARD ============ -->
              <div class="right-pane lockout-card">
                <div class="lockout-top">
                  <img src="/logo-800-full.svg" class="lockout-logo" @click="goHome" />

                  <h2 class="lockout-headline-strong">{{ lockoutHeadlineStrong }}</h2>
                  <h2 class="lockout-headline-sub">{{ lockoutHeadlineSub }}</h2>

                  <p class="midday-sub">Next window:</p>
                  <p class="midday-time">{{ nextSlotShort }}</p>
                  <p class="midday-countdown">Come back in {{ countdown }}</p>
                  <p class="lockout-live-copy">{{ lockoutLiveCopy }}</p>

                  <button
                    class="notif-btn"
                    :disabled="notificationsEnabled"
                    @click="enableNotifications"
                  >
                    {{
                      notificationsEnabled ? 'Email reminders enabled' : 'Enable email reminders'
                    }}
                  </button>

                  <button class="exit-lockout-btn" @click="showExitConfirm = true">
                    I’ve Had Enough for Today
                  </button>

                  <div v-if="lockoutMode === 'return'" class="lockout-scroll-cue">
                    <span class="lockout-scroll-cue-text">Let the question marinate for a sec</span>
                    <span class="lockout-scroll-cue-arrow">↓</span>
                  </div>
                </div>

                <div v-if="lockoutMode === 'return'" class="lockout-marinate">
                  <div class="lockout-marinate-inner">
                    <p class="lockout-marinate-kicker">Still locked out</p>

                    <h3 class="lockout-marinate-title">Let the question marinate for a sec</h3>

                    <div class="lockout-question-card">
                      <p class="lockout-question-label">Question</p>
                      <p class="lockout-question-text">
                        {{ question || 'Today’s question is still loading.' }}
                      </p>
                    </div>

                    <div class="lockout-attempt-card">
                      <p class="lockout-question-label">Your latest attempt</p>

                      <div class="lockout-attempt-stack">
                        <div
                          v-for="(ans, i) in answers"
                          :key="`return-${i}`"
                          class="lockout-attempt-pill"
                          :class="fieldStatus[i]"
                        >
                          <span class="lockout-attempt-index">{{ i + 1 }}</span>
                          <span class="lockout-attempt-text">{{ ans || '-' }}</span>
                          <span class="lockout-attempt-state">
                            {{ fieldStatus[i] === 'correct' ? 'Correct' : 'Missed' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
              :key="`${i}-${shakeNonce}`"
              v-model="answers[i]"
              :placeholder="i + 1 + '.'"
              :class="[
                'answer-input',
                fieldStatus[i],
                'shake',
                `stagger-${i}`,
                { 'hero-flash': heroFlashIndex === i },
              ]"
              :disabled="fieldStatus[i] === 'correct'"
              :ref="(el) => registerInputRef(el, i)"
              @keydown="onKey($event, i)"
            />
          </div>

          <div class="button-row">
            <button class="lock" @click="onLockIn" :disabled="attemptsRemaining <= 0">
              Lock In
            </button>
          </div>

          <div class="button-row" style="margin-top: 15px">
            <button class="share-btn" @click="openShareModal" :disabled="referralLoading">
              {{ referralLoading ? 'Loading link...' : 'Share' }}
            </button>
          </div>

          <div class="growth-box" style="margin-top: 5px">
            <p v-if="growthLoading" class="growth-meta">Loading growth stats...</p>

            <div v-else class="growth-stats" style="margin-top: 5px">
              <p class="growth-meta">
                <strong>{{ invitedUsersCount }}</strong> invited ·
                <strong>{{ crossBorderInvitesCount }}</strong> reached abroad
              </p>

              <p class="growth-meta" v-if="unlockedCountries.length">
                Countries reached: {{ unlockedCountries.join(', ').toUpperCase() }}
              </p>
            </div>
          </div>
        </template>

        <!-- =======================================================
     MODAL SYSTEM (SINGLE OVERLAY, CLEAN TRANSITIONS)
======================================================= -->

        <transition name="modal-fade">
          <div
            v-if="
              modalMode || showExitConfirm || showFillWarning || showEmailModal || showShareModal
            "
            :class="['overlay', { 'modal-lower': modalMode && modalMode !== 'exit' }]"
          >
            <!-- FILL WARNING -->
            <div v-if="showFillWarning" class="modal">
              <h2 class="modal-title">Almost there!</h2>
              <p class="modal-text">Fill all boxes first.</p>
              <button class="modal-btn primary" @click="showFillWarning = false">OK</button>
            </div>

            <!-- ASK HINT -->
            <div v-else-if="modalMode === 'askHint' && !hintUsedThisWindow" class="modal">
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
              <h2 class="modal-title">Are you sure?</h2>
              <p class="modal-text modal-spaced">
                If you end today’s session now, you’ll see the correct answers and won’t be able to
                return to the game until tomorrow.
              </p>

              <div class="modal-actions">
                <button class="modal-btn secondary" @click="showExitConfirm = false">
                  No, go back
                </button>
                <button class="modal-btn primary" @click="confirmExitEarly">Yes, I’m done</button>
              </div>
            </div>

            <!-- EMAIL NOTIFICATIONS -->
            <div v-else-if="showEmailModal" class="modal">
              <h2 class="modal-title">Get a reminder?</h2>
              <p class="modal-text modal-spaced">We’ll email you when your next window opens.</p>

              <input
                v-model="email"
                type="email"
                placeholder="you@domain.com"
                class="answer-input"
                style="width: 100%; margin: 10px 0 16px"
                @keydown.enter.prevent="submitEmailNotifications"
              />

              <p v-if="emailStatus === 'success'" style="margin: 0 0 12px; font-weight: 600">
                You’re subscribed ✅
              </p>
              <p v-else-if="emailStatus === 'error'" style="margin: 0 0 12px; color: #b00020">
                Please enter a valid email (or try again).
              </p>

              <div class="modal-actions">
                <button class="modal-btn secondary" @click="closeEmailModal">Not now</button>
                <button class="modal-btn primary" @click="submitEmailNotifications">
                  Enable email reminders
                </button>
              </div>

              <p style="margin-top: 12px; font-size: 12px; opacity: 0.7">
                You can unsubscribe any time from the email footer.
              </p>
            </div>

            <!-- SHARE MODAL -->
            <!-- SHARE MODAL -->
            <div v-else-if="showShareModal" class="modal share-modal">
              <div class="share-card-lite">
                <button class="share-close" @click="closeShareModal" aria-label="Close share modal">
                  ×
                </button>

                <div class="share-head">
                  <div class="share-brand">
                    <img src="/logo-800-full.svg" class="share-brand-logo" alt="Akinto" />
                    <div class="share-brand-text">
                      <div class="share-brand-name">Akinto</div>
                      <div class="share-brand-tag">A game of Common Knowledge.</div>
                    </div>
                  </div>
                </div>

                <div class="share-copy-block">
                  <h2 class="share-title">Share with your furthest friend</h2>
                  <p class="share-subtitle">
                    Send today’s puzzle across borders and help Akinto spread.
                  </p>
                </div>

                <div class="share-stats-row">
                  <div class="share-stat share-stat-invited">
                    <div class="share-stat-label">Invited</div>
                    <div class="share-stat-value">{{ invitedUsersCount }}</div>
                  </div>

                  <div class="share-stat share-stat-abroad">
                    <div class="share-stat-label">Reached abroad</div>
                    <div class="share-stat-value">{{ crossBorderInvitesCount }}</div>
                  </div>

                  <div class="share-stat share-stat-countries">
                    <div class="share-stat-label">Countries reached</div>
                    <div class="share-stat-value">{{ unlockedCountries.length }}</div>
                  </div>
                </div>

                <div class="share-note">
                  <span v-if="unlockedCountries.length">
                    {{ unlockedCountries.join(', ').toUpperCase() }}
                  </span>
                  <span v-else> Your next share could open a new country. </span>
                </div>

                <div class="share-actions">
                  <button class="share-action primary" @click="handleNativeShare">Share</button>

                  <button class="share-action secondary" @click="copyLink">
                    {{ referralCopied ? 'Copied ✓' : 'Copy link' }}
                  </button>

                  <button class="share-action ghost" @click="closeShareModal">Close</button>
                </div>

                <div class="share-footer">akinto.io</div>
              </div>
            </div>
          </div>
        </transition>
      </div>
      <!-- ===========================
      SUCCESS SUMMARY (FULL SCREEN)
============================ -->
      <div v-else-if="currentView === 'success'" class="full-screen-summary">
        <SuccessSummary :answers="answers" :correctAnswers="correctAnswers" @continue="goHome" />
      </div>

      <!-- ===========================
      FAILURE SUMMARY (FULL SCREEN)
============================ -->
      <div v-else-if="currentView === 'failure'" class="full-screen-summary">
        <FailureSummary
          mode="persistence"
          :answers="answers"
          :correctAnswers="correctAnswers"
          @continue="goHome"
        />
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import SuccessSummary from './SuccessSummary.vue'
import FailureSummary from './FailureSummary.vue'
import { useRouter } from 'vue-router'
import {
  getTimezone,
  getCurrentWindow,
  getNextWindow,
  getTimeRemainingToNextWindow,
  todayKey,
} from '../../lib/windows.js'
import { onUnmounted } from 'vue'
import { countryAliases } from '@/data/countryAliases'
import { registerPush } from '@/push/registerPush'
import { useHead } from '@vueuse/head'

useHead({
  title: 'Akinto Play – Today’s Global Knowledge Puzzle',
  meta: [
    {
      name: 'description',
      content:
        'Play today’s Akinto puzzle and test your global knowledge. One daily question. Compare your thinking with players worldwide.',
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: 'https://akinto.io/play',
    },
  ],
})

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
const source =
  localStorage.getItem('akinto_source') || sessionStorage.getItem('akinto_source') || null

const tz = ref(getTimezone())
const currentWindow = ref(getCurrentWindow(tz.value))
const t0 = getTimeRemainingToNextWindow(tz.value)

const dateKey = ref(todayKey(tz.value))
const curWin = computed(() => getCurrentWindow(tz.value))
const currentHistory = ref(null)

/* ======================================================
   UI + FX FLAGS (these were missing / duplicated)
====================================================== */
const inputsVisible = ref(false)
const isReplaySequence = ref(false)
const heroFlashIndex = ref(null)
const shakeNonce = ref(0)
const showFillWarning = ref(false)

const modalMode = ref(null) // null | 'askHint' | 'hint' | 'success'
const showExitConfirm = ref(false)
const router = useRouter()

const referralLink = ref(null)
const referralLoading = ref(false)
const referralCopied = ref(false)

const growthLoading = ref(false)
const invitedUsersCount = ref(0)
const crossBorderInvitesCount = ref(0)
const unlockedCountries = ref([])

const landingBoardLoading = ref(true)
const landingBoard = ref({
  todayCountryCount: 0,
  todayPlayerCount: 0,
  todayCountries: [],
})

const hintUsedThisWindow = ref(false)
const triedIncorrectToday = ref(new Set())
const lockoutMode = ref(null)
const notificationsEnabled = ref(false)

const showEmailModal = ref(false)
const email = ref('')
const emailStatus = ref(null)

const canPromptPush = computed(() => {
  return (
    localStorage.getItem('akinto_consent') === 'true' &&
    !localStorage.getItem('akinto_push_enabled')
  )
})

const showShareModal = ref(false)
const inputRefs = ref([])

/* ======================================================
   INPUT REFERENCES (arrow navigation)
====================================================== */

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

const countdown = ref('00:00:00')
let countdownTimer = null

function formatHHMMSS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${h}:${m}:${sec}`
}

function getLondonNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz.value,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]))

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  }
}

function updateCountdown() {
  const now = getLondonNow()

  const next = getNextWindow(tz.value)
  if (!next) {
    countdown.value = '00:00:00'
    return
  }

  const [hh, mm] = next.start.split(':').map(Number)

  const nowDate = new Date(now.year, now.month - 1, now.day, now.hour, now.minute, now.second, 0)

  let target = new Date(now.year, now.month - 1, now.day, hh, mm, 0, 0)

  if (target <= nowDate) {
    target.setDate(target.getDate() + 1)
  }

  const diffSeconds = (target.getTime() - nowDate.getTime()) / 1000

  countdown.value = formatHHMMSS(diffSeconds)

  // keep theme live
  hour.value = now.hour
}

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer)

  updateCountdown()
  countdownTimer = setInterval(updateCountdown, 1000)
}

function openShareModal() {
  showShareModal.value = true
}

function closeShareModal() {
  showShareModal.value = false
}

onMounted(() => {
  startCountdown()
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

async function resolveDailyStateBeforePlay() {
  const res = await fetch('/api/load-day-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, dateKey: dateKey.value }),
  })

  if (!res.ok) return false
  const data = await res.json()

  // Only "true day end" states should block re-entry
  if (data.dayEnded) {
    if (data.dayEndResult === 'success') {
      currentView.value = 'success'
      return true
    }

    if (data.dayEndResult === 'exit-early') {
      currentView.value = 'failure'
      return true
    }

    // 🚫 CRITICAL: do NOT treat "lockout" as a day-ending state
    // lockout is per-window, and loadSessionState() will handle it properly
    if (data.dayEndResult === 'lockout') {
      return false
    }
  }

  return false
}

async function loadReferralLink() {
  try {
    referralLoading.value = true

    const res = await fetch('/api/create-referral-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      console.error('create-referral-link failed:', res.status, data)
      return
    }

    referralLink.value = data.referralUrl || null

    if (!referralLink.value) {
      console.error('No referralUrl returned from create-referral-link')
    }
  } catch (e) {
    console.error('Referral link load failed', e)
  } finally {
    referralLoading.value = false
  }
}

async function handleNativeShare() {
  if (!referralLink.value) {
    await loadReferralLink()
  }

  if (!referralLink.value) {
    referralLink.value = 'https://akinto.io/?ref=TEST123'
  }

  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Akinto',
        text: 'Play today’s global knowledge puzzle with me on Akinto.',
        url: referralLink.value,
      })
      return
    }

    await copyLink()
  } catch (e) {
    console.error('Native share failed', e)
  }
}

async function copyLink() {
  if (!referralLink.value) {
    await loadReferralLink()
  }

  if (!referralLink.value) {
    referralLink.value = 'https://akinto.io/?ref=TEST123'
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(referralLink.value)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = referralLink.value
      textArea.setAttribute('readonly', '')
      textArea.style.position = 'absolute'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }

    referralCopied.value = true

    setTimeout(() => {
      referralCopied.value = false
    }, 2000)
  } catch (e) {
    console.error('Copy failed', e)
  }
}

async function loadGrowthState() {
  try {
    growthLoading.value = true

    const res = await fetch('/api/load-growth-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    if (!res.ok) return

    const data = await res.json()

    invitedUsersCount.value = Number(data.invitedUsersCount || 0)
    crossBorderInvitesCount.value = Number(data.crossBorderInvitesCount || 0)
    unlockedCountries.value = Array.isArray(data.unlockedCountries) ? data.unlockedCountries : []

    if (!referralLink.value && data.referralUrl) {
      referralLink.value = data.referralUrl
    }
  } catch (e) {
    console.error('Growth state load failed', e)
  } finally {
    growthLoading.value = false
  }
}

async function loadLandingBoardState() {
  try {
    landingBoardLoading.value = true

    const res = await fetch('/api/load-landing-board')
    if (!res.ok) return

    const data = await res.json()

    landingBoard.value = {
      todayCountryCount: Number(data.todayCountryCount || 0),
      todayPlayerCount: Number(data.todayPlayerCount || 0),
      todayCountries: Array.isArray(data.todayCountries) ? data.todayCountries : [],
    }
  } catch (e) {
    console.error('Landing board load failed', e)
  } finally {
    landingBoardLoading.value = false
  }
}
/* ======================================================
   TIME WINDOW / STAGE LABEL
====================================================== */

const stageLabel = computed(() => {
  const w = curWin.value
  return w?.label || 'Check-In'
})

const lockoutHeadlineStrong = computed(() => {
  const w = curWin.value
  if (!w) return 'Check-In Locked'
  if (w.id === 'last') return 'That’s All For Today'
  return 'That’s All For Now'
})

const lockoutHeadlineSub = computed(() => {
  const w = curWin.value
  if (!w) return 'You’ve used all your attempts for this check-in.'
  return `You’ve used all attempts in the ${w.label} window.`
})

const nextSlotShort = computed(() => {
  const w = getNextWindow(tz.value)
  if (!w) return 'Next window soon.  '
  return `${w.start} – ${w.end}`
})

const lockoutLiveCopy = computed(() => {
  if (landingBoardLoading.value) {
    return 'The board is still moving.'
  }

  if (landingBoard.value.todayCountryCount > 1) {
    return `The world is still answering across ${landingBoard.value.todayCountryCount} countries.`
  }

  if (landingBoard.value.todayCountryCount === 1) {
    return 'The world is still answering today.'
  }

  return 'The board is still moving without you.'
})

const hasReturnLockoutContent = computed(() => {
  return lockoutMode.value === 'return' && (!!question.value || answers.value.length > 0)
})

async function enableNotifications() {
  const consent = localStorage.getItem('akinto_consent')

  // still respect your consent gate if you want
  if (consent !== 'true') {
    window.dispatchEvent(new Event('akinto:open-cookie-consent'))
    return
  }

  // already enabled (email)
  if (localStorage.getItem('akinto_email_enabled') === 'true') {
    notificationsEnabled.value = true
    return
  }

  // open modal
  emailStatus.value = null
  showEmailModal.value = true
}

/* ======================================================
   BACKGROUND THEME
====================================================== */
const hour = ref(new Date().getHours())

const timeClass = computed(() => {
  if (hour.value < 11) return 'theme-morning'
  if (hour.value < 15) return 'theme-day'
  if (hour.value < 20) return 'theme-evening'
  return 'theme-night'
})

/* ======================================================
   FETCH TODAY’S QUESTION (Airtable)
====================================================== */

onMounted(async () => {
  // check day-end FIRST
  const blocked = await resolveDailyStateBeforePlay()

  if (blocked) {
    await loadLandingBoardState()
    return
  }

  // always load the question first so lockout re-entry has context
  await loadTodayQuestion()

  const lockRes = await fetch('/api/load-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      dateKey: dateKey.value,
      windowId: curWin.value.id,
    }),
  })

  if (lockRes.ok) {
    const data = await lockRes.json()

    if (!data.dayEnded && data.attempts?.length >= MAX_ATTEMPTS) {
      // hydrate the saved latest attempt + statuses before showing return lockout
      if (Array.isArray(data.latestAnswers) && data.latestAnswers.length) {
        answers.value = data.latestAnswers
      }

      hintUsedThisWindow.value = !!data.hintUsed
      attemptsRemaining.value = 0
      hardLocked.value = true
      screenState.value = 'split-lockout'
      lockoutMode.value = 'return'

      // ensure answer array matches question size
      if (answers.value.length !== answerCount.value) {
        answers.value = [
          ...answers.value,
          ...Array(Math.max(0, answerCount.value - answers.value.length)).fill(''),
        ].slice(0, answerCount.value)
      }

      recomputeFieldStatusFromAnswers()

      loading.value = false
      await loadLandingBoardState()
      return
    }
  }

  await loadSessionState()
  applyHydratedState()
  loadReferralLink()
  await loadGrowthState()
  await loadLandingBoardState()
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

    await nextTick()
    inputsVisible.value = true
  } catch (err) {
    console.error('Failed to load question', err)
  } finally {
    loading.value = false
  }
}
// ===============================
// ENABLE NOTIFS
// ===============================
onMounted(() => {
  if (localStorage.getItem('akinto_push_enabled') === 'true') {
    notificationsEnabled.value = true
  }
})

async function loadSessionState() {
  if (hardLocked.value) return
  const res = await fetch('/api/load-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      dateKey: dateKey.value,
      windowId: curWin.value.id,
    }),
  })

  if (!res.ok) return

  const data = await res.json()

  // day ended (success/exit-early)
  if (data.dayEnded) {
    hardLocked.value = true
    currentView.value = data.dayEndResult === 'success' ? 'success' : 'failure'
    return
  }

  // tried incorrect across day
  triedIncorrectToday.value = new Set((data.triedIncorrect || []).map(normalise))

  // hint used in this window
  hintUsedThisWindow.value = !!data.hintUsed

  // restore latest answers (this window)
  if (Array.isArray(data.latestAnswers) && data.latestAnswers.length) {
    answers.value = data.latestAnswers
  }

  const attempts = Array.isArray(data.attempts) ? data.attempts : []
  attemptsRemaining.value = MAX_ATTEMPTS - attempts.length

  // lockout for this window
  if (attemptsRemaining.value <= 0) {
    hardLocked.value = true
    screenState.value = 'split-lockout'

    lockoutMode.value = 'return'
  } else {
    hardLocked.value = false
    screenState.value = 'normal'
    lockoutMode.value = null
  }

  recomputeFieldStatusFromAnswers()
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
    if (!a) return ''

    const canonical = normalise(a)
    const isCorrect = correctAnswers.value.some((c) => normalise(c) === canonical)

    return isCorrect ? 'correct' : 'incorrect'
  })
}

/* ======================================================
   LOCK-IN LOGIC
====================================================== */
function normalise(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a, b) {
  const m = a.length
  const n = b.length

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1

      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }

  return dp[m][n]
}

function fuzzyMatch(user, target) {
  const a = normalise(user)
  const b = normalise(target)

  if (a === b) return { ok: true, canonical: target }

  const dist = levenshtein(a, b)
  const maxLen = Math.max(a.length, b.length)

  const similarity = 1 - dist / maxLen

  // allow small typos only
  if (dist <= 2 || similarity >= 0.9) {
    return { ok: true, canonical: target }
  }

  return { ok: false }
}

// Correct answers the user has ever given today (all windows)
const historicalCorrect = ref([]) // array of strings

async function onLockIn() {
  if (hardLocked.value) return

  shakeNonce.value++

  const filled = answers.value.filter((a) => a.trim()).length
  if (filled < answerCount.value) {
    showFillWarning.value = true
    return
  }

  const canon = correctAnswers.value
  const used = new Set()

  fieldStatus.value = answers.value.map(() => '')
  await nextTick()

  const corrected = [...answers.value]

  fieldStatus.value = answers.value.map((a, i) => {
    const canonical = resolveCanonical(a, canon)

    if (canonical && !used.has(normalise(canonical))) {
      used.add(normalise(canonical))

      corrected[i] = canonical

      return 'correct'
    }

    return 'incorrect'
  })

  answers.value = corrected

  const isPerfect = fieldStatus.value.every((s) => s === 'correct')

  // record incorrect globally
  fieldStatus.value.forEach((status, i) => {
    if (status === 'incorrect') {
      triedIncorrectToday.value.add(normalise(answers.value[i]))
    }
  })

  const attemptIndex = MAX_ATTEMPTS - attemptsRemaining.value + 1

  await fetch('/api/log-attempt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      country: userCountry,
      source,
      dateKey: dateKey.value,
      windowId: curWin.value.id,
      attemptIndex,
      answers: answers.value,
      correctAnswers: correctAnswers.value,
      result: isPerfect ? 'success' : 'fail',
    }),
  })

  // ---------- PERFECT = END DAY ----------
  if (isPerfect) {
    hardLocked.value = true
    await logPlay('success')
    currentView.value = 'success'
    return
  }

  // ---------- HINT PROMPT ----------
  if (!hintUsedThisWindow.value && attemptsRemaining.value > 1) {
    modalMode.value = 'askHint'
  }

  // ---------- CONSUME ATTEMPT ----------
  const remaining = attemptsRemaining.value - 1
  attemptsRemaining.value = remaining

  if (remaining === 1) {
    isReplaySequence.value = true
  }

  // ---------- WINDOW LOCKOUT ----------
  if (remaining <= 0) {
    hardLocked.value = true
    modalMode.value = null

    const w = curWin.value

    if (w?.id === 'last') {
      await logPlay('exit-early')

      currentView.value = 'failure'
      return
    }

    lockoutMode.value = 'replay'
    screenState.value = 'split-lockout'

    await logPlay('lockout')
  }
}

/* ======================================================
   PUSH WINDOW TIMING TO AIRTABLE (ANALYTICS)
====================================================== */

async function logPlay(result) {
  const pendingReferral = localStorage.getItem('akinto_pending_referral')

  await fetch('/api/log-play', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(pendingReferral ? { 'x-akinto-ref': pendingReferral } : {}),
    },
    body: JSON.stringify({
      userId,
      country: userCountry,
      source,
      dateKey: dateKey.value,
      windowId: curWin.value.id,
      answers: answers.value,
      correctAnswers: correctAnswers.value,
      result,
      pendingReferral, // backup channel
    }),
  })

  if (pendingReferral) {
    localStorage.removeItem('akinto_pending_referral')
  }
}

/* ======================================================
    HELPER FUNCTION(S)
========================================================= */

function resolveCanonical(input, canon) {
  const n = normalise(input)

  for (const c of canon) {
    const key = normalise(c)

    // exact match
    if (key === n) return c

    const aliases = countryAliases[key] || []

    // alias match
    if (aliases.some((a) => normalise(a) === n)) {
      return c
    }

    const match = fuzzyMatch(input, c)
    if (match.ok) return c
  }

  return null
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim())
}

async function submitEmailNotifications() {
  if (!isValidEmail(email.value)) {
    emailStatus.value = 'error'
    return
  }

  try {
    emailStatus.value = null

    const res = await fetch('/api/save-email-sub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value.trim(),
        timezone: tz.value,
        userId,
        country: userCountry,
        source,
      }),
    })

    if (!res.ok) throw new Error('save-email-sub failed')

    localStorage.setItem('akinto_email_enabled', 'true')
    notificationsEnabled.value = true
    emailStatus.value = 'success'

    // optional: auto-close after a beat
    setTimeout(() => {
      showEmailModal.value = false
    }, 700)
  } catch (e) {
    console.error('[EMAIL] subscribe failed', e)
    emailStatus.value = 'error'
  }
}

function closeEmailModal() {
  showEmailModal.value = false
}

/*=======================================================
Client Registration + Subscription
========================================================= */

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

async function showHint() {
  modalMode.value = 'hint'

  if (hintUsedThisWindow.value) return
  hintUsedThisWindow.value = true

  // persist hint usage for re-entry
  await fetch('/api/log-hint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      country: userCountry,
      dateKey: dateKey.value,
      windowId: curWin.value.id,
    }),
  }).catch(() => null)
}

function closeHint() {
  modalMode.value = null
}

watch(
  () => curWin.value?.id,
  async (newId, oldId) => {
    if (!newId || newId === oldId) return

    // moving into a new time window:
    hardLocked.value = false
    screenState.value = 'normal'
    lockoutMode.value = null
    modalMode.value = null
    showFillWarning.value = false
    showExitConfirm.value = false

    // refresh keys (important if you ever cross midnight too)
    dateKey.value = todayKey(tz.value)

    // reload question + session state for the new window
    await loadTodayQuestion()
    await loadSessionState()
    applyHydratedState()
  },
)

/* ======================================================
   EXIT EARLY
====================================================== */
async function confirmExitEarly() {
  hardLocked.value = true
  screenState.value = 'split-lockout'

  // Mark the DAY as ended (blocking future entry)
  await fetch('/api/end-day', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      dateKey: dateKey.value,
      result: 'exit-early',
    }),
  }).catch(() => null)

  // analytics
  await logPlay('exit-early')

  currentView.value = 'failure'
}

/* ======================================================
   GO HOME WHEN LOGO IS CLICKED
====================================================== */

function goHome() {
  navigator.sendBeacon?.(
    '/api/log-exit',
    JSON.stringify({
      userId,
      dateKey: dateKey.value,
      windowId: curWin.value.id,
    }),
  )

  window.location.href = 'https://akinto.io'
}

/* ======================================================
   CAPTURING UUID + COUNTRY IN PLAY.VIEW
====================================================== */

function getOrCreateUUID() {
  let id = localStorage.getItem('akinto_user_id') || localStorage.getItem('akinto_uuid')

  if (!id) {
    id = crypto.randomUUID()
  }

  localStorage.setItem('akinto_user_id', id)
  localStorage.setItem('akinto_uuid', id)

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
  min-height: 100svh;
}
</style>

<style scoped>
/** Main Layout **/

:global(html),
:global(body),
:global(#app) {
  background: var(--bg-color) !important;
}

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

.play-wrapper.split-lockout-active {
  padding: 0 !important;
  overflow: hidden;
}

.lockout-split {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: inherit;
}

.lockout-return-scrollable {
  overflow-y: auto;
  overflow-x: hidden;
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
}

.theme-day {
  --bg-color: #9fd5ff;
}

.theme-evening {
  --bg-color: #6ec04d;
}

.theme-night {
  --bg-color: #0e0c24;
  color: white;
}

/* real background carrier */
.play-wrapper {
  background: var(--bg-color);
}

.play-wrapper {
  transition: background-color 0.25s ease;
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

.global-live-bar {
  margin-bottom: 14px;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(0, 0, 0, 0.12);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  color: #242227;
  text-align: center;
  max-width: min(92vw, 680px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.global-live-bar-line {
  display: block;
  font-weight: 800;
}

.global-live-bar-sub {
  display: block;
  font-weight: 500;
  opacity: 0.8;
  margin-top: 4px;
}

.theme-night .global-live-bar {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.theme-night .global-live-bar-sub {
  opacity: 0.9;
}

@media (max-width: 600px) {
  .global-live-bar {
    width: min(92vw, 520px);
    font-size: 12px;
    padding: 9px 12px;
    margin-bottom: 12px;
  }

  .global-live-bar-sub {
    margin-top: 4px;
  }
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
  font-weight: 500;
  border: 1.5px solid #ffa300;
  cursor: pointer;
  min-width: 220px;
}

.notif-btn:hover {
  transform: translateY(-3px);
  opacity: 0.88;
}

.exit-lockout-btn {
  margin-top: 18px;
  padding: 12px 26px;
  background: #bfbfbf;
  color: #111;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  font-style: italic;
  border: 1.5px solid #bfbfbf;
  cursor: pointer;
  min-width: 220px;
}

.exit-lockout-btn:hover {
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
  line-height: 2;
}

.modal-text {
  font-size: 18px !important;
  color: #000;
  line-height: 2;
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

.full-screen-summary {
  width: 100vw;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: #f6f8ff;
  padding: 32px 28px;
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

.lockout-split {
  transition:
    grid-template-columns 0.55s cubic-bezier(0.18, 0.74, 0.32, 1),
    background-color 0.35s ease;
}

.left-pane {
  transition:
    transform 0.5s cubic-bezier(0.18, 0.74, 0.32, 1),
    opacity 0.4s ease;
}

.lockout-return .left-pane {
  opacity: 0;
  transform: translateX(-40px);
  pointer-events: none;
}

.attempt-metric {
  position: absolute;
  top: 22px;
  right: 22px;
  font-size: 13px;
  font-weight: 700;
  opacity: 0.6;
  letter-spacing: 0.3px;
}

.right-pane {
  transition:
    transform 0.55s cubic-bezier(0.18, 0.74, 0.32, 1),
    width 0.55s cubic-bezier(0.18, 0.74, 0.32, 1);
}

.lockout-return .right-pane {
  transform: translateX(-12%);
}

.lockout-return .right-pane {
  width: 100%;
  min-width: 100%;
}

.lockout-split.lockout-return {
  grid-template-columns: 0% 100%;
}

.lockout-card,
.lockout-card * {
  color: #111 !important;
}

.theme-night .lockout-card,
.theme-night .lockout-card * {
  color: #111 !important;
}

.attempt-title {
  font-size: 25px;
  font-weight: 700;
  margin-top: 85px;
  margin-bottom: 15px;
}

.attempt-sub {
  font-size: 13px;
  opacity: 0.7;
  margin-bottom: 22px;
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

/* ================================
   FORCE LOCKOUT TEXT READABILITY
================================ */

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
  min-height: 100vh;
  height: 100vh;
  padding: 0;
  margin: 0;
  will-change: transform, opacity;
}

.left-pane {
  width: 100%;
  height: 100%;
  padding: 3.5rem 2rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.25));
  backdrop-filter: blur(8px);
  border-right: 2px solid rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.left-pane::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.35), transparent 60%);
  pointer-events: none;
}

.right-pane {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
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
  min-height: 100vh;
  background: white;
  box-shadow: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
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

.lockout-live-copy {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.4;
  opacity: 0.72;
  max-width: 280px;
  text-align: center;
}

.lockout-top {
  min-height: 100vh;
  padding: 4rem 3rem 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

.lockout-scroll-cue {
  margin-top: 26px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  opacity: 0.72;
}

.lockout-scroll-cue-text {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.lockout-scroll-cue-arrow {
  font-size: 20px;
  line-height: 1;
  animation: lockoutArrowBounce 1.6s ease-in-out infinite;
}

.lockout-marinate {
  width: 100%;
  padding: 0 0 56px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgba(247, 247, 247, 1) 100%);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.lockout-marinate-inner {
  width: min(760px, calc(100% - 32px));
  margin: 0 auto;
  padding-top: 34px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
}

.lockout-marinate-kicker {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.58;
}

.lockout-marinate-title {
  margin: 0 0 20px;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #111;
}

.lockout-question-card,
.lockout-attempt-card {
  background: #fff;
  border: 1px solid rgba(17, 17, 17, 0.1);
  border-radius: 22px;
  padding: 20px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.06);
}

.lockout-attempt-card {
  margin-top: 14px;
}

.lockout-question-label {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.62;
}

.lockout-question-text {
  margin: 0;
  font-size: 24px;
  line-height: 1.35;
  font-weight: 650;
  color: #111;
}

.lockout-attempt-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lockout-attempt-pill {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 2px solid #111;
  background: #fff;
  color: #111;
}

.lockout-attempt-pill.correct {
  background: #111;
  color: #fff;
  border-color: #111;
}

.lockout-attempt-pill.incorrect {
  background: #f7f7f7;
  color: #111;
  border-color: rgba(17, 17, 17, 0.18);
  opacity: 0.78;
}

.lockout-attempt-index {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  background: rgba(0, 0, 0, 0.08);
}

.lockout-attempt-pill.correct .lockout-attempt-index {
  background: rgba(255, 255, 255, 0.14);
}

.lockout-attempt-text {
  min-width: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
}

.lockout-attempt-state {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.72;
}

.lockout-attempt-pill.correct .lockout-attempt-state {
  opacity: 0.9;
}

@keyframes lockoutArrowBounce {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.75;
  }
  50% {
    transform: translateY(6px);
    opacity: 1;
  }
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
  margin: 0;
  padding: 0;
  background: var(--bg-color);
  overscroll-behavior-y: none;
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

/* --- Cleaning Referral Formatting --- */

/* --- Share Modal Upgrade --- */

.share-modal {
  width: min(760px, 92vw);
  max-width: 760px;
  padding: 0;
  background: transparent;
  box-shadow: none;
  border-radius: 0;
}

.share-card-lite {
  position: relative;
  width: 100%;
  background:
    radial-gradient(900px 420px at 20% 15%, rgba(255, 255, 255, 0.08), transparent 55%),
    linear-gradient(135deg, #0d0f11 0%, #14181d 100%);
  color: #fff;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
  padding: 28px 28px 22px;
  text-align: left;
  overflow: hidden;
}

.share-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.share-close:hover {
  opacity: 0.9;
  transform: scale(1.03);
}

.share-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.share-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.share-brand-logo {
  width: 64px;
  height: 64px;
  outline: 2px solid rgba(255, 255, 255, 0.9);
  flex-shrink: 0;
}

.share-brand-text {
  min-width: 0;
}

.share-brand-name {
  font-size: 34px;
  font-weight: 900;
  letter-spacing: -0.8px;
  line-height: 1;
}

.share-brand-tag {
  margin-top: 6px;
  font-size: 14px;
  opacity: 0.72;
  line-height: 1.35;
}

.share-badge {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.4px;
  padding: 9px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  opacity: 0.95;
}

.share-copy-block {
  margin-top: 24px;
}

.share-title {
  margin: 0;
  font-size: 30px;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.5px;
  color: #fff;
}

.share-subtitle {
  margin: 10px 0 0;
  font-size: 16px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.78);
}

.share-stats-row {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.share-stat {
  border-radius: 18px;
  padding: 18px 18px 16px;
  min-width: 0;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.32);
}

.share-stat-invited {
  background: linear-gradient(180deg, #34e3a0, #1fbf85);
  color: #fff;
}

.share-stat-abroad {
  background: linear-gradient(180deg, #6d8cff, #4b63ff);
  color: #fff;
}

.share-stat-countries {
  background: linear-gradient(180deg, #ffd36a, #ffb547);
  color: #111;
}

.share-stat-label {
  font-size: 12px;
  font-weight: 800;
  opacity: 0.9;
  letter-spacing: 0.3px;
}

.share-stat-value {
  margin-top: 8px;
  font-size: 34px;
  font-weight: 950;
  line-height: 1;
  letter-spacing: -0.5px;
}

.share-note {
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 13px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.82);
  text-align: center;
}

.share-actions {
  margin-top: 22px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

.share-action {
  border-radius: 999px;
  padding: 11px 18px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.16s ease,
    opacity 0.16s ease;
  min-width: 110px;
  text-align: center;
}

.share-action:hover {
  transform: translateY(-1px);
  opacity: 0.95;
}

.share-action.primary {
  background: #ffffff;
  color: #111;
  border: 1px solid #ffffff;
}

.share-action.secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.share-action.ghost {
  background: transparent;
  color: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.share-footer {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  text-align: right;
  font-size: 14px;
  font-weight: 800;
  opacity: 0.82;
}

.share-btn {
  width: 100%;
  padding: 0.45rem 2.5rem;
  font-size: var(--fs-md);
  font-weight: 700;
  border-radius: 10px;

  background: rgba(255, 255, 255, 0.85);
  color: #111;
  backdrop-filter: blur(6px);

  border: 2px solid #d0d0d0;
  cursor: pointer;

  transition:
    transform 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
}

.share-btn:hover {
  background: #dcdcdc;
  transform: translateY(-1px);
}

.share-btn:active {
  transform: translateY(0);
  background: #d2d2d2;
}

.share-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

/* Mobile */
@media (max-width: 700px) {
  .share-modal {
    width: 92vw;
    max-width: 92vw;
  }

  .share-card-lite {
    padding: 18px 18px 16px;
    border-radius: 22px;
  }

  .share-head {
    gap: 10px;
    align-items: flex-start;
  }

  .share-brand {
    gap: 10px;
  }

  .share-brand-logo {
    width: 46px;
    height: 46px;
  }

  .share-brand-name {
    font-size: 22px;
  }

  .share-brand-tag {
    font-size: 11px;
    margin-top: 4px;
  }

  .share-badge {
    font-size: 10px;
    padding: 6px 8px;
  }

  .share-copy-block {
    margin-top: 16px;
  }

  .share-title {
    font-size: 22px;
  }

  .share-subtitle {
    font-size: 13px;
    margin-top: 8px;
  }

  .share-stats-row {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 16px;
  }

  .share-stat {
    padding: 14px 14px 12px;
    border-radius: 14px;
  }

  .share-stat-label {
    font-size: 10px;
  }

  .share-stat-value {
    font-size: 24px;
    margin-top: 6px;
  }

  .share-note {
    margin-top: 12px;
    padding: 11px 12px;
    font-size: 11px;
    border-radius: 12px;
  }

  .share-actions {
    margin-top: 16px;
    gap: 10px;
  }

  .share-action {
    width: 100%;
    justify-content: center;
    text-align: center;
    padding: 11px 14px;
    font-size: 13px;
  }

  .share-footer {
    margin-top: 14px;
    padding-top: 10px;
    font-size: 12px;
  }

  .share-close {
    top: 12px;
    right: 12px;
    width: 34px;
    height: 34px;
    font-size: 22px;
  }
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

.answer-input.shake {
  animation: shake 0.35s ease;
}

.locked-result {
  animation: riseIn 0.45s cubic-bezier(0.18, 0.74, 0.32, 1) both;
}

.locked-result:nth-child(1) {
  animation-delay: 0.05s;
}
.locked-result:nth-child(2) {
  animation-delay: 0.12s;
}
.locked-result:nth-child(3) {
  animation-delay: 0.19s;
}
.locked-result:nth-child(4) {
  animation-delay: 0.26s;
}
.locked-result:nth-child(5) {
  animation-delay: 0.33s;
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

@keyframes riseIn {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
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

/* ============================================================
   MOBILE GAMEPLAY TUNING
============================================================ */
@media (max-width: 600px) {
  /* ---------- FULL HEIGHT + BG LOCK ---------- */

  .logo {
    width: 45px;
    height: 45px;
    outline: 1px solid #000000;
    cursor: pointer;
  }
  .play-wrapper {
    min-height: 100svh;
    height: auto;
    padding-top: 100px;
    padding-bottom: 100px;
  }

  /* ---------- HEADER CLUSTER ---------- */

  .header {
    margin-top: 12px;
    margin-bottom: 8px;
    gap: 6px;
  }

  .button-row {
    display: flex;
    gap: 22px;
    min-width: 150px;
  }

  .divider {
    opacity: 0.5;
    font-weight: 400px;
    font-size: 20px;
  }

  .attempts-row {
    margin-bottom: 6px;
  }

  .attempt-metric {
    position: relative;
    top: auto;
    right: auto;
    margin-bottom: 18px;
    font-size: 13px;
    opacity: 0.7;
  }

  /* ---------- QUESTION ---------- */

  .question-title {
    font-size: 20px;
    margin-bottom: 18px;
    max-width: 92%;
  }

  /* ---------- INPUT STACK ---------- */

  .input-group {
    min-width: 200px;
    gap: 14px;
  }

  .answer-input {
    font-size: 16px;
    padding: 0.7rem 1rem;
  }

  /* ---------- LOCK BUTTON ---------- */

  .button-row {
    margin-top: 10px;
  }

  .lock {
    width: 92%;
    max-width: 420px;
  }

  /* ---------- ATTEMPT DOTS ---------- */

  .dots {
    gap: 8px;
  }

  .dot {
    width: 13px;
    height: 13px;
  }

  /* ---------- MODALS ---------- */

  .modal {
    width: 88%;
    max-width: 420px;
  }

  /* ---------- SPLIT LOCKOUT ---------- */

  .lockout-split {
    grid-template-columns: 100%;
    min-height: 100svh;
    height: auto;
  }

  .left-pane {
    display: none;
  }

  .right-pane {
    width: 100%;
  }

  .lockout-top {
    min-height: 100svh;
    padding: 40px 18px 28px;
  }

  .lockout-logo {
    margin-top: 20px;
    width: 90px;
    height: 90px;
  }

  .lockout-headline-strong {
    font-size: 26px;
  }

  .lockout-headline-sub {
    font-size: 18px;
    line-height: 1.35;
    max-width: 320px;
  }

  .lockout-live-copy {
    max-width: 300px;
    font-size: 12px;
  }

  .lockout-scroll-cue {
    margin-top: 20px;
  }

  .lockout-scroll-cue-text {
    font-size: 12px;
  }

  .lockout-marinate {
    padding-bottom: 34px;
  }

  .lockout-marinate-inner {
    width: calc(100% - 24px);
    padding-top: 22px;
  }

  .lockout-marinate-title {
    font-size: 22px;
    margin-bottom: 14px;
  }

  .lockout-question-card,
  .lockout-attempt-card {
    border-radius: 18px;
    padding: 14px;
  }

  .lockout-question-text {
    font-size: 18px;
  }

  .lockout-attempt-pill {
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 10px;
    padding: 12px 12px;
  }

  .lockout-attempt-index {
    width: 28px;
    height: 28px;
    font-size: 11px;
  }

  .lockout-attempt-text {
    font-size: 15px;
  }

  .lockout-attempt-state {
    grid-column: 2 / 3;
    justify-self: start;
    margin-top: 2px;
    font-size: 10px;
  }

  /* ---------- SCROLL SAFETY ---------- */

  .play-wrapper::after {
    content: '';
    display: block;
    height: env(safe-area-inset-bottom);
  }
}
</style>
