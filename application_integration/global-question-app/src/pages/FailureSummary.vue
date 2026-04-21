<!--FailureSummary.vue -->
<template>
  <div class="failure-wrapper">
    <div class="failure-topbar">
      <div></div>
      <button class="share-btn-top" @click="openShareOverlay">Share</button>
    </div>
    <img src="/logo-800-full.svg" class="fail-logo" @click="goHome" />

    <h1 class="fail-title">{{ headline }}</h1>
    <h2 class="fail-sub">{{ subline }}</h2>
    <p class="postplay-share-prompt">Share today’s result</p>

    <div class="result-block">
      <h3>Your Final Attempt</h3>
      <div class="attempt-list">
        <div
          v-for="(ans, i) in summary.answers"
          :key="i"
          class="attempt-item"
          :class="{ correct: summary.fieldStatus[i] === 'correct' }"
        >
          {{ ans || '-' }}
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

    <div class="failure-cta-stack">
      <p class="global-tease">See how the world answered today’s question</p>
      <button class="analytics-btn" @click="goAnalytics">See global results</button>
    </div>

    <div class="continuation-card">
      <p class="continuation-kicker">What happens next</p>
      <h3 class="continuation-title">{{ continuationTitle }}</h3>
      <p class="continuation-sub">{{ continuationSub }}</p>
      <p class="continuation-micro">{{ continuationMicro }}</p>

      <div class="invite-actions continuation-actions">
        <button class="invite-btn invite-btn-primary" @click="goAnalytics">See live board</button>
        <button class="invite-btn" @click="handleInviteShare">Add a country</button>
      </div>
    </div>

    <div class="feedback-card">
      <button class="feedback-toggle" @click="feedbackOpen = !feedbackOpen">
        <span>Think we missed something?</span>
        <span class="feedback-toggle-icon">{{ feedbackOpen ? '−' : '+' }}</span>
      </button>

      <p class="feedback-intro" v-if="!feedbackOpen">
        If an answer should have counted, the wording felt unfair, or something looks off, tell us.
      </p>

      <div v-if="feedbackOpen" class="feedback-form-wrap">
        <p class="feedback-intro">
          We review these to improve question quality and answer coverage over time.
        </p>

        <label class="feedback-label" for="failure-disputed-answer">
          Which answer do you disagree with?
        </label>
        <input
          id="failure-disputed-answer"
          v-model="feedbackForm.disputedAnswer"
          class="feedback-input"
          type="text"
          placeholder="Which answer felt missing or wrong?"
          maxlength="120"
        />

        <label class="feedback-label" for="failure-suggested-answer">
          What do you think should count?
        </label>
        <input
          id="failure-suggested-answer"
          v-model="feedbackForm.suggestedAnswer"
          class="feedback-input"
          type="text"
          placeholder="Your suggested accepted answer"
          maxlength="120"
        />

        <label class="feedback-label" for="failure-further-comments"> Further comments </label>
        <textarea
          id="failure-further-comments"
          v-model="feedbackForm.furtherComments"
          class="feedback-textarea"
          rows="4"
          placeholder="Anything else that would help us review it?"
          maxlength="1200"
        />

        <p v-if="feedbackStatus === 'success'" class="feedback-status feedback-status-success">
          Thanks - we’ve logged it for review.
        </p>
        <p v-else-if="feedbackStatus === 'error'" class="feedback-status feedback-status-error">
          We couldn’t submit that just now. Please try again in a moment.
        </p>

        <div class="invite-actions feedback-cta-row">
          <button
            class="invite-btn invite-btn-primary"
            @click="submitAnswerIssue"
            :disabled="feedbackSubmitting"
          >
            {{ feedbackSubmitting ? 'Sending...' : 'Submit feedback' }}
          </button>

          <button class="invite-btn" @click="feedbackOpen = false" :disabled="feedbackSubmitting">
            Close
          </button>
        </div>
      </div>
    </div>

    <div class="invite-card">
      <p class="invite-kicker">Your board is growing</p>
      <h3 class="invite-title">{{ growthRewardTitle }}</h3>
      <p class="invite-sub">{{ growthRewardSub }}</p>

      <div class="invite-stats">
        <div class="invite-stat invite-stat-green">
          <span class="invite-stat-label">Unlocked</span>
          <span class="invite-stat-value">{{ unlockedCountryCount }}</span>
        </div>

        <div class="invite-stat invite-stat-blue">
          <span class="invite-stat-label">Today’s board</span>
          <span class="invite-stat-value">{{ todaysBoardCountryCount }}</span>
        </div>

        <div class="invite-stat invite-stat-gold">
          <span class="invite-stat-label">Reached abroad</span>
          <span class="invite-stat-value">{{ crossBorderInvitesCount }}</span>
        </div>
      </div>

      <p class="invite-micro">{{ growthRewardMicro }}</p>

      <div v-if="visibleUnlockedCountryNames.length" class="invite-country-list">
        <span v-for="name in visibleUnlockedCountryNames" :key="name" class="invite-country-pill">
          {{ name }}
        </span>
      </div>

      <div class="invite-actions">
        <button class="invite-btn invite-btn-primary" @click="handleInviteShare">Share</button>
        <button class="invite-btn" @click="copyInviteLink">
          {{ referralCopied ? 'Copied ✓' : 'Copy link' }}
        </button>
      </div>
    </div>
  </div>
  <div class="share-render-target">
    <ShareCard
      ref="shareCardRef"
      :date="summary.date || 'Today'"
      v-bind="canonicalShareMetrics"
      :countryName="shareCountryName"
      :global="shareGlobal"
    />
  </div>

  <Transition name="share-sheet" appear>
    <div v-if="shareOpen" class="share-overlay" @click.self="closeShareOverlay">
      <div class="share-modal">
        <button class="share-close" @click="closeShareOverlay" aria-label="Close share overlay">
          ✕
        </button>

        <div class="share-card-stage">
          <ShareCard
            ref="liveShareCardRef"
            :date="summary.date || 'Today'"
            v-bind="canonicalShareMetrics"
            :countryName="shareCountryName"
            :global="shareGlobal"
          />
        </div>

        <div class="share-actions">
          <button class="share-pill share-icon-pill" @click="copyShareText">
            <span class="share-icon">⧉</span>
            <span class="share-text">{{ copyBtnLabel }}</span>
          </button>

          <button class="share-pill share-icon-pill" @click="shareToTwitter">
            <span class="share-icon">𝕏</span>
            <span class="share-text">X</span>
          </button>

          <button class="share-pill share-icon-pill" @click="shareToFacebook">
            <span class="share-icon">f</span>
            <span class="share-text">Facebook</span>
          </button>

          <button class="share-pill share-icon-pill" @click="shareToWhatsApp">
            <span class="share-icon">◔</span>
            <span class="share-text">WhatsApp</span>
          </button>

          <button class="share-pill share-icon-pill" @click="shareToLinkedIn">
            <span class="share-icon">in</span>
            <span class="share-text">LinkedIn</span>
          </button>

          <button class="share-pill share-primary share-icon-pill" @click="downloadImage">
            <span class="share-icon">↓</span>
            <span class="share-text">Download</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import html2canvas from 'html2canvas'
import ShareCard from '@/components/ShareCard.vue'
import { computeDailyMetrics } from '../../lib/metricsEngine.js'

const router = useRouter()

const summary = ref({
  answers: [],
  correctAnswers: [],
  fieldStatus: [],
  result: '',
  finalState: '',
  attemptIndex: null,
  windowId: '',
  createdAt: '',
  date: '',
})

const props = defineProps({
  answers: Array,
  correctAnswers: Array,
  mode: {
    type: String,
    default: 'standard',
  },
})

const referralLink = ref('')
const referralCopied = ref(false)
const growthLoading = ref(false)
const invitedUsersCount = ref(0)
const crossBorderInvitesCount = ref(0)
const unlockedCountries = ref([])
const unlockedCountryNames = ref([])
const latestUnlockedCountryName = ref('')
const todaysBoardCountryCount = ref(0)
const liveTodayPlayerCount = ref(0)
const liveTodayCountryCount = ref(0)

const headline = computed(() => {
  if (summary.value.finalState === 'exit-early') {
    return 'You Called It For Today.'
  }

  if (summary.value.finalState === 'final-window-lockout') {
    return 'You Went All In.'
  }

  if (props.mode === 'persistence') {
    return 'You Went All In.'
  }

  return 'Today Didn’t Quite Land.'
})

const subline = computed(() => {
  if (summary.value.finalState === 'exit-early') {
    return 'You chose to stop early. The correct answers are below.'
  }

  if (summary.value.finalState === 'final-window-lockout') {
    return 'You used every window today. The correct answers are below.'
  }

  if (props.mode === 'persistence') {
    return 'You played it through. That matters.'
  }

  return 'Review the gaps and reset for tomorrow.'
})

const shareOpen = ref(false)
const shareCardRef = ref(null)
const liveShareCardRef = ref(null)
const copyBtnLabel = ref('Copy')

const feedbackOpen = ref(false)
const feedbackSubmitting = ref(false)
const feedbackStatus = ref('')
const feedbackQuestionText = ref('')
const feedbackForm = ref({
  disputedAnswer: '',
  suggestedAnswer: '',
  furtherComments: '',
})

const metrics = ref(null)
const shareGlobalData = ref({
  totalPlayers: null,
  avgCompletion: null,
  avgAccuracy: null,
  yourCountryRank: null,
  yourCountryAvgCompletion: null,
  countryLeaderboard: [],
})

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

function pct(n) {
  const x = Number(n)
  if (!isFinite(x)) return 0
  return clamp(Math.round(x), 0, 100)
}

function normaliseAirtablePercent(x) {
  if (x === null || x === undefined) return null
  let n = Number(x)
  if (!isFinite(n)) return null
  if (n > 0 && n <= 1) n *= 100
  while (n > 100) n /= 10
  return n
}

const shareCountryName = computed(() => {
  const raw = localStorage.getItem('akinto_country') || ''
  return raw ? raw.toUpperCase() : null
})

const shareGlobal = computed(() => shareGlobalData.value)

const failureCorrectCount = computed(
  () => summary.value.fieldStatus.filter((s) => s === 'correct').length,
)

const failureTotal = computed(() => summary.value.correctAnswers.length || 0)

const failureAccuracy = computed(() => {
  const totalSubmitted = summary.value.answers.filter((a) => String(a || '').trim()).length || 0
  if (!totalSubmitted) return 0
  return Math.round((failureCorrectCount.value / totalSubmitted) * 100)
})

const failureCompletion = computed(() => {
  if (!failureTotal.value) return 0
  return Math.round((failureCorrectCount.value / failureTotal.value) * 100)
})

const canonicalShareMetrics = computed(() => {
  if (metrics.value) {
    return {
      completion: pct(metrics.value.completion),
      accuracy: pct(metrics.value.accuracy),
      pace:
        typeof metrics.value.pacePercentile === 'number'
          ? `${pct(metrics.value.pacePercentile)}%`
          : metrics.value.paceSeconds
            ? `${Math.max(1, Math.round(metrics.value.paceSeconds / 60))}m`
            : '-',
      pacePercentile:
        typeof metrics.value.pacePercentile === 'number' ? metrics.value.pacePercentile : null,
      completionReason: metrics.value.completionReason || 'engaged',
      dailyScore: pct(metrics.value.dailyScore),
    }
  }

  return {
    completion: failureCompletion.value,
    accuracy: failureAccuracy.value,
    pace: '-',
    pacePercentile: null,
    completionReason: failureCompletion.value === 100 ? 'solved' : 'engaged',
    dailyScore: Math.round(failureCompletion.value * 0.6 + failureAccuracy.value * 0.4),
  }
})

const unlockedCountryCount = computed(() => unlockedCountries.value.length)

const visibleUnlockedCountryNames = computed(() => unlockedCountryNames.value.slice(0, 6))

const growthRewardTitle = computed(() => {
  if (growthLoading.value) return 'Loading your board…'

  if (unlockedCountryCount.value > 0) {
    return `You’ve unlocked ${unlockedCountryCount.value} ${unlockedCountryCount.value === 1 ? 'country' : 'countries'}`
  }

  return 'Unlock your first country'
})

const growthRewardSub = computed(() => {
  if (!todaysBoardCountryCount.value) {
    return 'Today’s board is still early. Invite someone abroad to unlock a new comparison.'
  }

  const noun = todaysBoardCountryCount.value === 1 ? 'country' : 'countries'

  if (latestUnlockedCountryName.value) {
    return `Today’s board includes ${todaysBoardCountryCount.value} ${noun}. Invite someone abroad to add another.`
  }

  return `Today’s board includes ${todaysBoardCountryCount.value} ${noun}. Invite someone abroad to unlock a new comparison.`
})

const growthRewardMicro = computed(() => {
  if (growthLoading.value) return 'Loading growth state...'

  if (latestUnlockedCountryName.value) {
    return `Latest unlock: ${latestUnlockedCountryName.value}.`
  }

  if (unlockedCountryCount.value > 0) {
    return 'Invite someone in another country to unlock the next one.'
  }

  return 'Your next share could unlock your first country.'
})

const inviteShareText = computed(() => {
  if (latestUnlockedCountryName.value) {
    return `I’ve unlocked ${unlockedCountryCount.value} ${unlockedCountryCount.value === 1 ? 'country' : 'countries'} on Akinto - latest unlock: ${latestUnlockedCountryName.value}. Play today’s board and add your country.`
  }

  if (unlockedCountryCount.value > 0) {
    return `I’ve unlocked ${unlockedCountryCount.value} ${unlockedCountryCount.value === 1 ? 'country' : 'countries'} on Akinto. Play today’s board and add your country.`
  }

  return `Play today’s Akinto board with me. Invite someone abroad and unlock a new country comparison.`
})

const continuationTitle = computed(() => {
  if (summary.value.finalState === 'exit-early') {
    return 'The board moves on without you'
  }

  if (summary.value.finalState === 'final-window-lockout') {
    return 'You gave today the full run'
  }

  if (props.mode === 'persistence') {
    return 'You were closer than it feels'
  }

  return 'Tomorrow is the next swing'
})

const continuationSub = computed(() => {
  if (liveTodayPlayerCount.value > 1 && liveTodayCountryCount.value > 1) {
    return `${liveTodayPlayerCount.value} players across ${liveTodayCountryCount.value} countries are still shaping today’s board.`
  }

  if (liveTodayCountryCount.value > 1) {
    return `The board is still moving across ${liveTodayCountryCount.value} countries today.`
  }

  return 'More answers are still coming in today.'
})

const continuationMicro = computed(() => {
  if (unlockedCountryCount.value > 0) {
    return `You’ve seen ${unlockedCountryCount.value} ${unlockedCountryCount.value === 1 ? 'country' : 'countries'} so far - come back tomorrow to widen the comparison.`
  }

  return 'Come back tomorrow to see how your country compares again.'
})

function normalise(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function getUserId() {
  return localStorage.getItem('akinto_user_id') || localStorage.getItem('akinto_uuid')
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
}

async function createReferralLink() {
  const userId = getUserId()
  if (!userId) return null

  try {
    const res = await fetch('/api/create-referral-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      console.error('FailureSummary create-referral-link failed:', res.status, data)
      return null
    }

    const url = data?.referralUrl || null

    if (url) {
      referralLink.value = url
    }

    return url
  } catch (e) {
    console.error('FailureSummary create-referral-link error:', e)
    return null
  }
}

async function ensureReferralLink() {
  if (referralLink.value) return referralLink.value

  const created = await createReferralLink()
  if (created) return created

  const userId = getUserId()
  if (!userId) return null

  try {
    const res = await fetch('/api/load-growth-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    if (!res.ok) return null

    const data = await res.json()
    const url = data?.referralUrl || null

    if (url) {
      referralLink.value = url
      return url
    }

    return null
  } catch (e) {
    console.error('FailureSummary ensureReferralLink fallback error:', e)
    return null
  }
}

async function loadGrowthState() {
  const userId = getUserId()
  if (!userId) return

  try {
    growthLoading.value = true

    const res = await fetch('/api/load-growth-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    if (res.ok) {
      const data = await res.json()

      referralLink.value = data.referralUrl || ''
      invitedUsersCount.value = Number(data.invitedUsersCount || 0)
      crossBorderInvitesCount.value = Number(data.crossBorderInvitesCount || 0)
      unlockedCountries.value = Array.isArray(data.unlockedCountries) ? data.unlockedCountries : []
      unlockedCountryNames.value = Array.isArray(data.unlockedCountryNames)
        ? data.unlockedCountryNames
        : []
      latestUnlockedCountryName.value = String(data.latestUnlockedCountryName || '')
      todaysBoardCountryCount.value = Number(data.todaysBoardCountryCount || 0)
    }

    if (!referralLink.value) {
      await ensureReferralLink()
    }
  } catch (e) {
    console.error('FailureSummary growth load error:', e)
    await ensureReferralLink()
  } finally {
    growthLoading.value = false
  }
}

async function loadLiveBoardState() {
  try {
    const res = await fetch('/api/load-landing-board')

    if (!res.ok) return

    const data = await res.json()

    liveTodayPlayerCount.value = Number(data.todayPlayerCount || 0)
    liveTodayCountryCount.value = Number(data.todayCountryCount || 0)
  } catch (e) {
    console.error('FailureSummary live board load error:', e)
  }
}

async function loadShareAnalytics() {
  const userId = getUserId()
  const dateKey = todayKey()

  if (!userId || !dateKey) return

  try {
    const [personalRes, globalRes] = await Promise.all([
      fetch('/api/load-personal-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, dateKey }),
      }),
      fetch('/api/load-global-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          dateKey,
          country: localStorage.getItem('akinto_country') || 'xx',
        }),
      }),
    ])

    if (personalRes.ok) {
      const payload = await personalRes.json()
      metrics.value = computeDailyMetrics({
        attempts: Array.isArray(payload.attempts) ? payload.attempts : [],
        question: payload.question || {},
        profile: payload.profile || {},
      })
    }

    if (globalRes.ok) {
      const g = await globalRes.json()

      shareGlobalData.value = {
        totalPlayers: typeof g.totalPlayers === 'number' ? g.totalPlayers : null,
        avgCompletion:
          typeof g.avgCompletion === 'number' ? normaliseAirtablePercent(g.avgCompletion) : null,
        avgAccuracy:
          typeof g.avgAccuracy === 'number' ? normaliseAirtablePercent(g.avgAccuracy) : null,
        yourCountryRank: typeof g.yourCountryRank === 'number' ? g.yourCountryRank : null,
        yourCountryAvgCompletion:
          typeof g.yourCountryAvgCompletion === 'number'
            ? normaliseAirtablePercent(g.yourCountryAvgCompletion)
            : null,
        countryLeaderboard: Array.isArray(g.countryLeaderboard) ? g.countryLeaderboard : [],
      }

      if (
        metrics.value &&
        typeof g.pacePercentileForUser === 'number' &&
        metrics.value.pacePercentile == null
      ) {
        metrics.value = {
          ...metrics.value,
          pacePercentile: normaliseAirtablePercent(g.pacePercentileForUser),
          dailyScore: Math.max(
            0,
            Math.min(
              100,
              Math.round(
                metrics.value.completion * 0.5 +
                  metrics.value.accuracy * 0.3 +
                  normaliseAirtablePercent(g.pacePercentileForUser) * 0.2,
              ),
            ),
          ),
        }
      }
    }
  } catch (e) {
    console.error('FailureSummary share analytics load error:', e)
  }
}

async function handleInviteShare() {
  const resolvedReferralLink = await ensureReferralLink()

  if (!resolvedReferralLink) {
    console.error('No referral link available for failure summary share')
    return
  }

  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Akinto',
        text: inviteShareText.value,
        url: resolvedReferralLink,
      })
      return
    }

    await copyInviteLink()
  } catch (e) {
    console.error('Native share failed:', e)
  }
}

async function copyInviteLink() {
  const resolvedReferralLink = await ensureReferralLink()

  if (!resolvedReferralLink) {
    console.error('No referral link available to copy from failure summary')
    return
  }

  const payload = `${inviteShareText.value}\n\n${resolvedReferralLink}`

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(payload)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = payload
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
    console.error('Copy failed:', e)
  }
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

  const [progressRes, questionRes] = await Promise.all([
    fetch('/api/load-day-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, dateKey }),
    }),
    fetch('/api/get-today-question'),
  ])

  if (!progressRes.ok) return
  const data = await progressRes.json()

  if (questionRes.ok) {
    const q = await questionRes.json()
    feedbackQuestionText.value = q.text || ''
  }

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
    .sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime()
      const tb = new Date(b.createdAt || 0).getTime()

      if (tb !== ta) return tb - ta
      return Number(b.attemptIndex || 0) - Number(a.attemptIndex || 0)
    })

  const finalAttempt = realAttempts.length ? realAttempts[0] : null

  const finalAnswers =
    finalAttempt && Array.isArray(finalAttempt.answers) ? finalAttempt.answers : []

  summary.value = {
    answers: finalAnswers,
    correctAnswers,
    fieldStatus: computeFieldStatus(finalAnswers, correctAnswers),
    result: finalAttempt?.result || '',
    finalState: data.dayEndResult || finalAttempt?.result || '',
    attemptIndex: finalAttempt?.attemptIndex ?? null,
    windowId: finalAttempt?.windowId || '',
    createdAt: finalAttempt?.createdAt || '',
    date: dateKey,
  }
}

onMounted(() => {
  loadFailureSummaryFromAirtable().catch((e) => console.error('FailureSummary load error:', e))
  loadGrowthState().catch((e) => console.error('FailureSummary growth error:', e))
  loadLiveBoardState().catch((e) => console.error('FailureSummary live board error:', e))
  loadShareAnalytics().catch((e) => console.error('FailureSummary share analytics error:', e))
})

async function submitAnswerIssue() {
  if (
    !feedbackForm.value.disputedAnswer.trim() &&
    !feedbackForm.value.suggestedAnswer.trim() &&
    !feedbackForm.value.furtherComments.trim()
  ) {
    feedbackStatus.value = 'error'
    return
  }

  try {
    feedbackSubmitting.value = true
    feedbackStatus.value = ''

    const userId = getUserId()
    const userCountry = localStorage.getItem('akinto_country') || 'xx'
    const source =
      localStorage.getItem('akinto_source') || sessionStorage.getItem('akinto_source') || ''

    const res = await fetch('/api/report-answer-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        dateKey: summary.value.date || '',
        questionText: feedbackQuestionText.value || '',
        userCountry,
        source,
        summaryType:
          summary.value.finalState === 'exit-early'
            ? 'exit-early'
            : summary.value.finalState === 'final-window-lockout'
              ? 'final-window-lockout'
              : props.mode === 'persistence'
                ? 'failure'
                : 'lockout',
        disputedAnswer: feedbackForm.value.disputedAnswer.trim(),
        suggestedAnswer: feedbackForm.value.suggestedAnswer.trim(),
        furtherComments: feedbackForm.value.furtherComments.trim(),
        windowId: summary.value.windowId || '',
        correctAnswersSnapshot: summary.value.correctAnswers || [],
        userAnswersSnapshot: summary.value.answers || [],
      }),
    })

    if (!res.ok) {
      throw new Error('report-answer-issue failed')
    }

    feedbackStatus.value = 'success'
    feedbackForm.value = {
      disputedAnswer: '',
      suggestedAnswer: '',
      furtherComments: '',
    }
  } catch (e) {
    console.error('FailureSummary report issue error:', e)
    feedbackStatus.value = 'error'
  } finally {
    feedbackSubmitting.value = false
  }
}

function goAnalytics() {
  // router name in src/router/index.js is "Analytics"
  try {
    router.replace({ name: 'Analytics' })
  } catch {
    router.replace('/analytics')
  }
}

function goHome() {
  try {
    router.replace({ name: 'Home' })
  } catch {
    router.replace('/')
  }
}

function openShareOverlay() {
  shareOpen.value = true
  document.body.classList.add('blur-active')
}

function closeShareOverlay() {
  shareOpen.value = false
  document.body.classList.remove('blur-active')
}

function buildShareText() {
  return `I played today’s Akinto board.

One question. Many countries.
akinto.io`
}

async function copyShareText() {
  try {
    await navigator.clipboard.writeText(buildShareText())
    copyBtnLabel.value = 'Copied ✓'
    setTimeout(() => {
      copyBtnLabel.value = 'Copy'
    }, 1400)
  } catch {
    copyBtnLabel.value = 'Copy failed'
    setTimeout(() => {
      copyBtnLabel.value = 'Copy'
    }, 1400)
  }
}

let shareBusy = false

async function generateShareImage() {
  if (shareBusy) return null
  shareBusy = true

  try {
    await nextTick()
    await document.fonts.ready
    const el = liveShareCardRef.value?.$el
    if (!el) return null

    const canvas = await html2canvas(el, {
      scale: 3,
      backgroundColor: null,
    })

    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  } finally {
    shareBusy = false
  }
}

async function tryNativeShare(blob) {
  try {
    const file = new File([blob], 'akinto-results.png', { type: 'image/png' })

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Akinto',
        text: buildShareText(),
        url: 'https://akinto.io',
      })
      return true
    }
  } catch (e) {
    console.warn('Native share failed:', e)
  }

  return false
}

async function shareToTwitter() {
  const blob = await generateShareImage()
  if (!blob) return

  const usedNative = await tryNativeShare(blob)
  if (usedNative) return

  const text = buildShareText()
  const url = 'https://akinto.io'

  window.open(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text}\n\n${url}`)}`,
    '_blank',
  )
}

async function shareToFacebook() {
  const blob = await generateShareImage()
  if (!blob) return

  const usedNative = await tryNativeShare(blob)
  if (usedNative) return

  window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://akinto.io')}`,
    '_blank',
  )
}

async function shareToWhatsApp() {
  const blob = await generateShareImage()
  if (!blob) return

  const usedNative = await tryNativeShare(blob)
  if (usedNative) return

  const text = `${buildShareText()}\n\nhttps://akinto.io`
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}

async function shareToLinkedIn() {
  const blob = await generateShareImage()
  if (!blob) return

  const usedNative = await tryNativeShare(blob)
  if (usedNative) return

  window.open(
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://akinto.io')}`,
    '_blank',
  )
}

let downloading = false

async function downloadImage() {
  if (downloading) return
  downloading = true

  try {
    const blob = await generateShareImage()
    if (!blob) return

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'akinto-results.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } finally {
    downloading = false
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

.postplay-share-prompt {
  margin-top: 10px;
  font-size: 13px;
  font-weight: 600;
  opacity: 0.75;
}

.failure-cta-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
}

.global-tease {
  font-size: 13px;
  opacity: 0.75;
  margin: 0;
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

.feedback-card {
  width: 100%;
  max-width: 400px;
  margin-top: 20px;
  padding: 18px 20px;
  border-radius: 18px;
  background: #ffffff;
  color: #111;
  text-align: left;
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.08),
    0 0 0 1px rgba(15, 23, 42, 0.04);
}

.feedback-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  background: transparent;
  border: none;
  padding: 0;
  font-size: 15px;
  font-weight: 650;
  color: #111;
  cursor: pointer;
}

.feedback-toggle-icon {
  font-size: 22px;
  line-height: 1;
  opacity: 0.7;
}

.feedback-intro {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.5;
  opacity: 0.75;
}

.feedback-form-wrap {
  margin-top: 14px;
}

.feedback-label {
  display: block;
  margin: 14px 0 6px;
  font-size: 12px;
  font-weight: 650;
  opacity: 0.9;
}

.feedback-input,
.feedback-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1.5px solid rgba(12, 15, 28, 0.14);
  border-radius: 12px;
  background: #fff;
  color: #111;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
}

.feedback-input:focus,
.feedback-textarea:focus {
  border-color: #111;
  box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08);
}

.feedback-textarea {
  resize: vertical;
  min-height: 96px;
}

.feedback-status {
  margin: 12px 0 0;
  font-size: 13px;
  font-weight: 600;
}

.feedback-status-success {
  color: #127a4a;
}

.feedback-status-error {
  color: #b42318;
}

.feedback-cta-row {
  margin-top: 14px;
}

.invite-card {
  width: 100%;
  max-width: 400px;
  margin-top: 22px;
  padding: 20px;
  border-radius: 18px;
  background: linear-gradient(135deg, #0d0f11, #14181d);
  color: #fff;
  text-align: left;
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.18),
    0 0 0 1px rgba(255, 255, 255, 0.04);
}

.invite-kicker {
  margin: 0 0 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.68;
}

.invite-title {
  margin: 0;
  font-size: 20px;
  font-weight: 750;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.invite-sub {
  margin: 8px 0 0;
  font-size: 14px;
  opacity: 0.82;
  line-height: 1.45;
}

.invite-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.invite-stat {
  border-radius: 14px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.invite-stat-green {
  background: linear-gradient(180deg, #34e3a0, #1fbf85);
  color: #fff;
}

.invite-stat-blue {
  background: linear-gradient(180deg, #6d8cff, #4b63ff);
  color: #fff;
}

.invite-stat-gold {
  background: linear-gradient(180deg, #ffd36a, #ffb547);
  color: #111;
}

.invite-stat-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.92;
}

.invite-stat-value {
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
}

.invite-micro {
  margin: 14px 0 0;
  font-size: 13px;
  opacity: 0.8;
}

.invite-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.invite-btn {
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  border: 1.5px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: pointer;
}

.invite-btn-primary {
  background: #fff;
  color: #111;
  border-color: #fff;
}

.invite-country-list {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.invite-country-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.continuation-card {
  width: 100%;
  max-width: 400px;
  margin-top: 20px;
  padding: 18px 20px;
  border-radius: 18px;
  background: #ffffff;
  color: #111;
  text-align: left;
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.08),
    0 0 0 1px rgba(15, 23, 42, 0.04);
}

.continuation-kicker {
  margin: 0 0 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.68;
}

.continuation-title {
  margin: 0;
  font-size: 20px;
  font-weight: 750;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.continuation-sub {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.45;
  opacity: 0.86;
}

.continuation-micro {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.45;
  opacity: 0.75;
}

.continuation-actions {
  margin-top: 16px;
}

.share-btn-top {
  justify-self: end;
  align-self: start;
  border: 2px solid #111;
  background: #fff;
  color: #111;
  border-radius: 999px;
  padding: 10px 14px;
  font-weight: 750;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ShareCard Overlay Amendments */

.share-render-target {
  position: fixed;
  left: -9999px;
  top: -9999px;
  pointer-events: none;
}

.share-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  padding: 16px;
  background: rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  display: grid;
  place-items: center;
  overscroll-behavior: contain;
}

.share-modal {
  width: min(920px, calc(100vw - 32px));
  max-height: min(94vh, 920px);
  border-radius: 28px;
  padding: 20px 20px 16px;
  position: relative;
  background: rgba(17, 17, 17, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow:
    0 40px 90px rgba(0, 0, 0, 0.55),
    0 10px 30px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  transform-origin: center;
  will-change: transform, opacity, filter;
  overflow: hidden;
}

.share-modal > * {
  max-width: 100%;
}

.share-card-stage {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.share-card-stage :deep(.share-card) {
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
}

.share-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition:
    transform 0.18s ease,
    background 0.18s ease,
    opacity 0.18s ease;
  z-index: 3;
}

.share-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition:
    transform 0.18s ease,
    background 0.18s ease,
    opacity 0.18s ease;
  z-index: 3;
}

.share-close:hover {
  transform: scale(1.06);
  background: rgba(255, 255, 255, 0.12);
}

.share-actions {
  width: 100%;
  display: flex;
  gap: 10px;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
  padding: 2px 0 0;
  flex: 0 0 auto;
}

.share-actions button {
  background: transparent;
  color: white;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 10px 16px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.18s ease;
}

.share-actions button:hover {
  background: white;
  color: black;
}

.share-pill {
  appearance: none;
  border: 1.5px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.92);
  border-radius: 999px;
  padding: 10px 14px;
  font-weight: 750;
  cursor: pointer;
  flex: 0 0 auto;
  transition:
    transform 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease,
    opacity 0.18s ease;
}

.share-pill:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.24);
}

.share-pill:active {
  transform: translateY(0px) scale(0.99);
  opacity: 0.96;
}

.share-primary {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.24);
}

.share-icon-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  white-space: nowrap;
}

.share-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 15px;
  font-weight: 900;
  line-height: 1;
  flex-shrink: 0;
}

.share-text {
  display: inline-block;
  line-height: 1;
}

@media (max-width: 600px) {
  .invite-stats {
    grid-template-columns: 1fr;
  }

  .failure-topbar {
    width: 100%;
    max-width: 400px;
    margin-bottom: 10px;
  }

  .share-btn-top {
    padding: 7px 10px;
    font-size: 12px;
    line-height: 1;
  }
}

.invite-title {
  font-size: 18px;
}

@keyframes shareModalIn {
  0% {
    opacity: 0;
    transform: translateY(28px) scale(0.94);
    filter: blur(2px);
  }
  55% {
    opacity: 1;
    transform: translateY(-2px) scale(1.01);
    filter: blur(0px);
  }
  100% {
    opacity: 1;
    transform: translateY(0px) scale(1);
    filter: blur(0px);
  }
}

@keyframes shareModalOut {
  0% {
    opacity: 1;
    transform: translateY(0px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(18px) scale(0.98);
  }
}

@keyframes popUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 720px) {
  .share-overlay {
    padding: 8px;
  }

  .share-modal {
    width: min(100vw - 16px, 430px);
    max-height: calc(100vh - 16px);
    padding: 10px 8px 8px;
    border-radius: 22px;
    gap: 8px;
    justify-content: flex-start;
  }

  .share-card-stage {
    width: 100%;
    overflow: hidden;
  }

  .share-card-stage :deep(.share-card) {
    width: 100%;
    max-width: 100%;
  }

  .share-close {
    top: 8px;
    right: 8px;
    width: 30px;
    height: 30px;
    font-size: 13px;
  }

  .share-actions {
    gap: 6px;
    padding: 0;
    flex-wrap: nowrap;
    justify-content: center;
  }

  .share-pill {
    width: 40px;
    height: 40px;
    padding: 0;
    border-radius: 999px;
    flex: 0 0 40px;
  }

  .share-icon-pill {
    gap: 0;
  }

  .share-icon {
    font-size: 14px;
  }

  .share-text {
    display: none;
  }
}

@media (max-width: 420px) {
  .share-modal {
    width: calc(100vw - 10px);
    max-height: calc(100vh - 10px);
    padding: 8px 6px 6px;
    border-radius: 18px;
    gap: 6px;
  }

  .share-actions {
    gap: 5px;
  }

  .share-pill {
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
  }

  .share-icon {
    font-size: 13px;
  }

  .right-footer {
    margin-top: 28px;
    padding-top: 16px;
    padding-bottom: 18px;
    flex-wrap: wrap;
  }

  .rotation-note {
    line-height: 1.45;
  }

  .left-footer {
    margin-bottom: 10px;
  }
}

.failure-topbar {
  width: min(100%, 900px);
  max-width: 900px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  box-sizing: border-box;
}
</style>
