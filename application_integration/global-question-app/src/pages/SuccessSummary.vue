<!--SuccessSummary.vue -->
<template>
  <div class="success-shell">
    <!-- ===================== HERO STRIP ===================== -->
    <header class="hero">
      <div class="hero-logo">
        <img src="/logo-800-full.svg" alt="Akinto logo" @click="goHome" />
      </div>

      <div class="hero-copy">
        <p class="hero-kicker" v-if="dateLabel">{{ dateLabel }} • {{ windowLabel }}</p>
        <h1 class="hero-title">
          {{ heroTitle }}
        </h1>
        <p class="hero-sub">
          <template v-if="metrics?.completionReason === 'solved'">
            You solved all {{ totalAnswers }} answers correctly today.
          </template>
          <template v-else>
            You found {{ summary.correctCount }} of {{ totalAnswers }} answers today.
          </template>
        </p>

        <div class="hero-chips">
          <span class="chip chip-strong" v-if="metrics?.completionReason === 'solved'">
            Perfect solve
          </span>

          <span class="chip" v-if="summary.attemptsUsed">
            {{ summary.attemptsUsed }} attempt{{ summary.attemptsUsed === 1 ? '' : 's' }}
          </span>
          <span class="chip" v-if="summary.hintCount > 0">
            {{ summary.hintCount }} hint{{ summary.hintCount === 1 ? '' : 's' }}
          </span>
          <span class="chip chip-soft"> Session ID • {{ shortId }} </span>
        </div>
      </div>

      <div class="hero-share">
        <p class="postplay-share-prompt">Share today’s result</p>
        <button class="share-btn-top" @click="openShareOverlay">Share</button>
      </div>
    </header>

    <!-- ===================== MAIN GRID ===================== -->
    <main class="grid">
      <!-- ============ LEFT: ANSWERS ============ -->
      <section class="column answers-column">
        <div class="card card-main">
          <h2 class="card-title">Your answers</h2>
          <p class="card-sub">
            Locked in at
            <span class="card-sub-strong">{{ timeLabel }}</span>
          </p>

          <div v-if="userAnswers.length" class="pill-stack pill-stack-dark">
            <div v-for="(ans, i) in userAnswers" :key="i" class="pill pill-dark">
              <span class="pill-index">{{ i + 1 }}</span>
              <span class="pill-text">{{ ans || '-' }}</span>
            </div>
          </div>

          <p v-else class="empty-copy">
            We couldn’t find a recent session. Hop back to the game and try today’s question.
          </p>
        </div>

        <div v-if="otherAccepted.length" class="card card-secondary">
          <h3 class="card-title-sm">Other accepted answers you didn’t use</h3>
          <p class="card-sub">These would also have counted as correct today.</p>

          <div class="pill-stack pill-stack-light">
            <div v-for="(ans, i) in otherAccepted" :key="i" class="pill pill-light">
              {{ ans }}
            </div>
          </div>
        </div>
      </section>

      <!-- ============ RIGHT: PERSONAL METRICS ============ -->
      <section class="column metrics-column">
        <!-- Top stat block -->
        <div class="card metrics-hero">
          <h2 class="card-title">Today’s brainprint</h2>
          <p class="card-sub">A quick snapshot of how you moved through today’s puzzle.</p>

          <div class="metrics-row">
            <div class="metric metric-big">
              <p class="metric-label">Accuracy</p>
              <p class="metric-value-lg">
                {{ accuracy.toFixed(0) }}<span class="metric-unit">%</span>
              </p>
              <p class="metric-footnote">Correct out of all answers.</p>
            </div>

            <div class="metric metric-big">
              <p class="metric-label">Completion</p>
              <p class="metric-value-lg">
                {{ Math.max(0, Math.min(100, Math.round(metrics?.completion ?? 0))) }}
                <span class="metric-unit">%</span>
              </p>

              <p class="metric-footnote">
                <template v-if="metrics?.completionReason === 'solved'">
                  You solved the full board.
                </template>
                <template v-else-if="metrics?.completionReason === 'engaged'">
                  You meaningfully worked the board.
                </template>
                <template v-else> Session logged across today’s windows. </template>
              </p>
            </div>
          </div>
        </div>

        <!-- Mini metrics grid -->
        <div class="card metrics-grid-card">
          <div class="metrics-grid">
            <div class="metric">
              <p class="metric-label">Attempts used</p>
              <p class="metric-value">
                {{ metrics?.totalAttemptsUsed ?? (summary.attemptsUsed || 1) }}
              </p>
              <p class="metric-footnote">These are summed throughout your daily windows.</p>
            </div>

            <div class="metric">
              <p class="metric-label">Solve style</p>
              <p class="metric-value">{{ solveStyle.label }}</p>
              <p class="metric-footnote">
                {{ solveStyle.copy }}
              </p>
            </div>

            <div class="metric">
              <p class="metric-label">Hint usage</p>
              <p class="metric-value">
                <template v-if="summary.hintCount > 0">
                  {{ summary.hintCount }} hint{{ summary.hintCount === 1 ? '' : 's' }} used
                </template>
                <template v-else> Unaided </template>
              </p>

              <p class="metric-footnote">
                <template v-if="summary.hintCount > 0"> You leaned on a hint. </template>
                <template v-else> You solved without hints. </template>
              </p>
            </div>

            <div class="metric">
              <p class="metric-label">Window</p>
              <p class="metric-value">
                {{ windowShort }}
              </p>
              <p class="metric-footnote">
                {{ windowMicroCopy }}
              </p>
            </div>
          </div>
        </div>

        <!-- Reflection / CTA card -->
        <div class="card reflection-card continuation-card">
          <h3 class="card-title-sm">What continues from here</h3>
          <ul class="continuation-list">
            <li>{{ continuationLines[0] }}</li>
            <li>{{ continuationLines[1] }}</li>
            <li>{{ continuationLines[2] }}</li>
          </ul>

          <div class="cta-row cta-row-stack">
            <p class="global-tease">The world is still moving without you</p>

            <div class="cta-row continuation-actions">
              <button class="btn btn-primary" @click="goAnalytics">See live board</button>
              <button class="btn" @click="handleInviteShare">Add a country</button>
            </div>
          </div>
        </div>

        <div class="card feedback-card">
          <button class="feedback-toggle" @click="feedbackOpen = !feedbackOpen">
            <span>Think we missed something?</span>
            <span class="feedback-toggle-icon">{{ feedbackOpen ? '−' : '+' }}</span>
          </button>

          <p class="feedback-intro" v-if="!feedbackOpen">
            If an answer should have counted, the wording felt unfair, or something looks off, tell
            us.
          </p>

          <div v-if="feedbackOpen" class="feedback-form-wrap">
            <p class="feedback-intro">
              We review these to improve question quality and answer coverage over time.
            </p>

            <label class="feedback-label" for="success-disputed-answer">
              Which answer do you disagree with?
            </label>
            <input
              id="success-disputed-answer"
              v-model="feedbackForm.disputedAnswer"
              class="feedback-input"
              type="text"
              placeholder="e.g. Côte d’Ivoire / Ivory Coast"
              maxlength="120"
            />

            <label class="feedback-label" for="success-suggested-answer">
              What do you think should count?
            </label>
            <input
              id="success-suggested-answer"
              v-model="feedbackForm.suggestedAnswer"
              class="feedback-input"
              type="text"
              placeholder="Your suggested accepted answer"
              maxlength="120"
            />

            <label class="feedback-label" for="success-further-comments"> Further comments </label>
            <textarea
              id="success-further-comments"
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

            <div class="cta-row feedback-cta-row">
              <button
                class="btn btn-primary"
                @click="submitAnswerIssue"
                :disabled="feedbackSubmitting"
              >
                {{ feedbackSubmitting ? 'Sending...' : 'Submit feedback' }}
              </button>

              <button class="btn" @click="feedbackOpen = false" :disabled="feedbackSubmitting">
                Close
              </button>
            </div>
          </div>
        </div>

        <div class="card invite-card">
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
            <span
              v-for="name in visibleUnlockedCountryNames"
              :key="name"
              class="invite-country-pill"
            >
              {{ name }}
            </span>
          </div>

          <div class="cta-row invite-cta-row">
            <button class="btn btn-primary" @click="handleInviteShare">Share</button>
            <button class="btn" @click="copyInviteLink">
              {{ referralCopied ? 'Copied ✓' : 'Copy link' }}
            </button>
          </div>
        </div>
      </section>
    </main>
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
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { registerPush } from '@/push/registerPush'
import { computeDailyMetrics } from '../../lib/metricsEngine.js'
import { getTimezone, todayKey } from '../utils/windows.js'
import html2canvas from 'html2canvas'
import ShareCard from '@/components/ShareCard.vue'

onMounted(() => {
  setTimeout(() => {
    registerPush()
  }, 1500)
})

const router = useRouter()

const maxAttempts = 3

const summary = ref({
  answers: [],
  correctAnswers: [],
  fieldStatus: [],
  correctCount: 0,
  incorrectCount: 0,
  attemptsUsed: 0,
  completed: false,
  hintUsed: false,
  hintCount: 0,
  date: '',
  timestamp: '',
  windowIndex: 0,
  userId: '',
  streakContinues: 0,
})

const metrics = ref(null)
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

function pctSafe(n) {
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

const canonicalShareMetrics = computed(() => ({
  completion: pctSafe(metrics.value?.completion ?? 0),
  accuracy: pctSafe(metrics.value?.accuracy ?? 0),
  pace:
    typeof metrics.value?.pacePercentile === 'number'
      ? `${pctSafe(metrics.value.pacePercentile)}%`
      : metrics.value?.paceSeconds
        ? `${Math.max(1, Math.round(metrics.value.paceSeconds / 60))}m`
        : '-',
  pacePercentile:
    typeof metrics.value?.pacePercentile === 'number' ? metrics.value.pacePercentile : null,
  completionReason: metrics.value?.completionReason || 'engaged',
  dailyScore: pctSafe(metrics.value?.dailyScore ?? 0),
}))

/**
 * Helper: lightweight normaliser for answer comparison.
 */
function normalise(str = '') {
  return str.toString().trim().toLowerCase().replace(/\s+/g, '')
}

function getUserId() {
  return localStorage.getItem('akinto_user_id') || localStorage.getItem('akinto_uuid')
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

    if (!res.ok) {
      referralLink.value = `https://akinto.io/?ref=${userId}`
      return
    }

    const data = await res.json()

    referralLink.value = data.referralUrl || `https://akinto.io/?ref=${userId}`
    invitedUsersCount.value = Number(data.invitedUsersCount || 0)
    crossBorderInvitesCount.value = Number(data.crossBorderInvitesCount || 0)
    unlockedCountries.value = Array.isArray(data.unlockedCountries) ? data.unlockedCountries : []
    unlockedCountryNames.value = Array.isArray(data.unlockedCountryNames)
      ? data.unlockedCountryNames
      : []
    latestUnlockedCountryName.value = String(data.latestUnlockedCountryName || '')
    todaysBoardCountryCount.value = Number(data.todaysBoardCountryCount || 0)
  } catch (e) {
    console.error('SuccessSummary growth load error:', e)
    referralLink.value = `https://akinto.io/?ref=${userId}`
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
    console.error('SuccessSummary live board load error:', e)
  }
}

async function loadShareGlobalState() {
  const userId = getUserId()
  if (!userId || !summary.value.date) return

  try {
    const res = await fetch('/api/load-global-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        dateKey: summary.value.date,
        country: localStorage.getItem('akinto_country') || 'xx',
      }),
    })

    if (!res.ok) return

    const g = await res.json()

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
  } catch (e) {
    console.error('SuccessSummary share global load error:', e)
  }
}

async function handleInviteShare() {
  if (!referralLink.value) {
    await loadGrowthState()
  }

  if (!referralLink.value) {
    const userId = getUserId()
    referralLink.value = `https://akinto.io/?ref=${userId}`
  }

  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Akinto',
        text: inviteShareText.value,
        url: referralLink.value,
      })
      return
    }

    await copyInviteLink()
  } catch (e) {
    console.error('Native share failed:', e)
  }
}

async function copyInviteLink() {
  if (!referralLink.value) {
    await loadGrowthState()
  }

  if (!referralLink.value) {
    const userId = getUserId()
    referralLink.value = `https://akinto.io/?ref=${userId}`
  }

  const payload = `${inviteShareText.value}\n\n${referralLink.value}`

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

async function loadSuccessSummaryFromAirtable() {
  const userId = getUserId()
  const tz = getTimezone()
  const dateKey = todayKey(tz)
  if (!userId || !dateKey) return

  // Use the same payload shape as DailyAnalytics + ShareCard
  const res = await fetch('/api/load-personal-analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, dateKey }),
  })

  if (!res.ok) return
  const payload = await res.json()

  const attempts = Array.isArray(payload.attempts) ? payload.attempts : []
  const prof = payload.profile || {}
  const q = payload.question || {}

  feedbackQuestionText.value = q.questionText || q.text || ''

  const correctAnswers = Array.isArray(q.correctAnswers) ? q.correctAnswers : []

  if (!attempts.length) return

  // Prefer AttemptIndex = 999 (final snapshot), else latest success, else latest
  const finalAttempt =
    [...attempts]
      .filter((a) => Number(a.attemptIndex) === 999)
      .sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      )[0] ||
    [...attempts]
      .filter((a) => a.result === 'success')
      .sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      )[0] ||
    [...attempts].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    )[0] ||
    null

  const answers = Array.isArray(finalAttempt.answers) ? finalAttempt.answers : []

  const windowId = finalAttempt.windowId
  const attemptsUsed = attempts.filter(
    (a) => a.windowId === windowId && Number(a.attemptIndex) !== 999 && a.result !== 'snapshot',
  ).length

  const fieldStatus = computeFieldStatus(answers, correctAnswers)
  const correctCount = fieldStatus.filter((s) => s === 'correct').length
  const incorrectCount = fieldStatus.filter((s) => s === 'incorrect').length

  let windowIndex = Number(finalAttempt.windowIndex ?? finalAttempt.windowId)
  if (!Number.isFinite(windowIndex)) {
    const d = new Date(finalAttempt.createdAt)
    const h = d.getHours()
    windowIndex = Math.floor(h / 2)
  }

  const cleanAttempts = attempts.filter(
    (a) => Number(a.attemptIndex) !== 999 && a.result !== 'snapshot' && !a?.isSummary,
  )

  metrics.value = computeDailyMetrics({
    attempts: cleanAttempts,
    question: q,
    profile: prof,
  })

  summary.value = {
    ...summary.value,
    userId,
    date: dateKey,
    timestamp: finalAttempt.createdAt || new Date().toISOString(),
    windowIndex,
    answers,
    correctAnswers,
    fieldStatus,
    correctCount,
    incorrectCount,
    attemptsUsed: attemptsUsed || 1,
    completed: true,
    hintUsed: Number(prof.HintCount || 0) > 0,
    hintCount: Number(prof.HintCount || 0),
    streakContinues: Number(prof.StreakContinues || 0),
  }
}

onMounted(async () => {
  await loadSuccessSummaryFromAirtable().catch((e) =>
    console.error('SuccessSummary load error:', e),
  )
  loadGrowthState().catch((e) => console.error('SuccessSummary growth error:', e))
  loadLiveBoardState().catch((e) => console.error('SuccessSummary live board error:', e))
  loadShareGlobalState().catch((e) => console.error('SuccessSummary share global error:', e))
})

/* ---------- Basic derived values ---------- */

const userAnswers = computed(() => summary.value.answers || [])
const correctAnswers = computed(() => summary.value.correctAnswers || [])

const totalAnswers = computed(
  () =>
    (summary.value.fieldStatus && summary.value.fieldStatus.length) ||
    correctAnswers.value.length ||
    0,
)

const accuracy = computed(() => {
  const val = Number(metrics.value?.accuracy ?? 0)
  return Math.max(0, Math.min(100, Math.round(val)))
})

/* ---------- Other accepted answers ---------- */

const otherAccepted = computed(() => {
  if (!correctAnswers.value.length || !userAnswers.value.length) return []

  const userSet = new Set(userAnswers.value.map((a) => normalise(a)))

  return correctAnswers.value.filter((c) => !userSet.has(normalise(c)))
})

/* ---------- Labels & micro-copy ---------- */

const heroTitle = computed(() =>
  summary.value.completed ? 'Great Work - You Cracked It.' : 'Nice Run - You Got There.',
)

const shortId = computed(() => {
  const id = summary.value.userId || 'guest'
  return id.slice(0, 8)
})

const dateLabel = computed(() => {
  if (!summary.value.date) return ''
  const d = new Date(summary.value.date)
  if (Number.isNaN(d.getTime())) return summary.value.date
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
})

const timeLabel = computed(() => {
  const t = summary.value.timestamp
  if (!t) return 'today'
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return 'today'
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
})

/* Window / day-part labelling based on windowIndex (2-hour blocks) */
const windowLabel = computed(() => {
  const idx = Number(summary.value.windowIndex || 0)

  if (idx <= 4) return 'Morning check-in'
  if (idx <= 6) return 'Midday check-in'
  if (idx <= 8) return 'Afternoon check-in'
  if (idx <= 10) return 'Evening check-in'
  return 'Daily check-in'
})

const windowShort = computed(() => {
  const idx = Number(summary.value.windowIndex || 0)

  if (idx <= 4) return 'Morning'
  if (idx <= 6) return 'Midday'
  if (idx <= 8) return 'Afternoon'
  if (idx <= 10) return 'Evening'
  return 'Late'
})

const windowMicroCopy = computed(() => {
  switch (windowShort.value) {
    case 'Morning':
      return 'You like starting the day with a puzzle.'
    case 'Midday':
      return 'A solid lunchtime check-in.'
    case 'Afternoon':
      return 'You closed the loop before evening.'
    case 'Evening':
      return 'Last-hour focus still strong.'
    default:
      return 'You solved it towards the end of the cycle.'
  }
})

/* Solve style heuristic based on attempts + hint usage */
const solveStyle = computed(() => {
  const a = summary.value.attemptsUsed || 1
  const hint = !!summary.value.hintUsed

  if (a === 1 && !hint) {
    return {
      label: 'Clean snap',
      copy: 'You saw the pattern almost immediately.',
    }
  }
  if (a === 1 && hint) {
    return {
      label: 'Guided snap',
      copy: 'One attempt with a small nudge along the way.',
    }
  }
  if (a === 2 && !hint) {
    return {
      label: 'Patient adjuster',
      copy: 'You used your first attempt to feel out the space, then corrected cleanly.',
    }
  }
  if (a >= 3 && !hint) {
    return {
      label: 'Stubborn solver',
      copy: 'You kept iterating until everything clicked.',
    }
  }
  return {
    label: 'Exploratory',
    copy: 'You mixed intuition, trial and hints to land the final grid.',
  }
})

const reflectionLines = computed(() => {
  const lines = []

  if (!summary.value.hintUsed) {
    lines.push('Bank this hint-free day as part of your streak.')
  } else {
    lines.push('Notice which part of the hint unlocked the pattern for you.')
  }

  if (summary.value.attemptsUsed <= 1) {
    lines.push('Next time, deliberately think of at least one “unlikely” answer before locking in.')
  } else if (summary.value.attemptsUsed === 2) {
    lines.push('On your first attempt tomorrow, try to cover more “edges” of the concept.')
  } else {
    lines.push('Use the early attempts to map the space, not just re-enter similar guesses.')
  }

  lines.push('Check your Daily Analytics to see how today compares with previous runs.')

  return lines
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

const continuationLines = computed(() => {
  const lines = []

  if (liveTodayPlayerCount.value > 1 && liveTodayCountryCount.value > 1) {
    lines.push(
      `${liveTodayPlayerCount.value} players across ${liveTodayCountryCount.value} countries are still shaping today’s board.`,
    )
  } else if (liveTodayCountryCount.value > 1) {
    lines.push(`The board is still moving across ${liveTodayCountryCount.value} countries today.`)
  } else {
    lines.push('Today’s board is still moving - more answers are still coming in.')
  }

  if (summary.value.streakContinues > 1) {
    lines.push(
      `You’re on a ${summary.value.streakContinues}-day run. Come back tomorrow to keep it alive.`,
    )
  } else if (unlockedCountryCount.value > 0) {
    lines.push(
      `You’ve seen ${unlockedCountryCount.value} ${unlockedCountryCount.value === 1 ? 'country' : 'countries'} so far. Tomorrow can widen that comparison.`,
    )
  } else {
    lines.push('Tomorrow gives you a fresh comparison against your country and the world.')
  }

  lines.push('Come back tomorrow to see how your country performs again.')

  return lines
})

/* ---------- Navigation ---------- */

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
        summaryType: 'success',
        disputedAnswer: feedbackForm.value.disputedAnswer.trim(),
        suggestedAnswer: feedbackForm.value.suggestedAnswer.trim(),
        furtherComments: feedbackForm.value.furtherComments.trim(),
        windowId: windowShort.value || '',
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
    console.error('SuccessSummary report issue error:', e)
    feedbackStatus.value = 'error'
  } finally {
    feedbackSubmitting.value = false
  }
}

function goAnalytics() {
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

function goBackToGame() {
  try {
    router.replace({ name: 'Play' })
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
  const solved = metrics.value?.completionReason === 'solved'

  if (solved) {
    return `I solved today’s Akinto board.

One question. Many countries.
akinto.io`
  }

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
.success-shell {
  min-height: 100vh;
  width: 100vw !important;
  max-width: none !important;
  padding-bottom: 96px !important;
  overflow-x: hidden;

  background: radial-gradient(
    circle at top left,
    #f3f5ff 0,
    #eef1ff 32%,
    #f9fbff 60%,
    #ffffff 100%
  );

  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Inter',
    sans-serif;

  color: #0b0c11;

  /* lighter gutters so content breathes */

  box-sizing: border-box;
}

/* HERO */
.hero {
  width: min(100%, 1400px);
  max-width: 1400px;
  margin: 0 auto 34px;

  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 34px;
  box-sizing: border-box;
}

.hero-logo img {
  width: 70px;
  height: 70px;
  outline: 1.5px solid #000000;
  cursor: pointer;
}

.hero-kicker {
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.65;
  margin: 0 0 4px;
}

.hero-title {
  font-size: 30px;
  font-weight: 730;
  letter-spacing: -0.02em;
  margin: 0 0 4px;
}

.hero-sub {
  margin: 0 0 12px;
  font-size: 15px;
  opacity: 0.8;
}

.hero-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(12, 15, 28, 0.16);
  background: rgba(255, 255, 255, 0.8);
}

.chip-strong {
  background: #0b0c11;
  color: #fff;
  border-color: #0b0c11;
}

.chip-soft {
  background: rgba(11, 12, 17, 0.06);
}

/* GRID LAYOUT */
.grid {
  width: min(100%, 1400px);
  max-width: 1400px;
  margin: 0 auto;

  display: grid;

  /* balanced desktop layout */
  grid-template-columns: minmax(0, 0.58fr) minmax(0, 0.42fr);

  gap: 46px;
  box-sizing: border-box;
}

.column {
  min-width: 0;
}

.answers-column {
  width: 100% !important;
}

.metrics-column {
  width: 80% !important;
}

/* CARDS */
.card {
  background: #ffffff;
  border-radius: 20px;
  padding: 22px 22px 22px;
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.18),
    0 0 0 1px rgba(15, 23, 42, 0.02);
  box-sizing: border-box;
}

.card-main {
  padding: 22px 22px 20px;
}

.card-secondary {
  margin-top: 16px;
  padding-top: 18px;
}

.metrics-hero {
  background: linear-gradient(135deg, #0d0f11, #20232f);
  color: #ffffff;
  padding: 28px 28px 26px;
}

.metrics-grid-card {
  margin-top: 18px;
}

.reflection-card {
  margin-top: 14px;
}

.feedback-card {
  margin-top: 14px;
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
  color: #0b0c11;
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
  color: #0b0c11;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
}

.feedback-input:focus,
.feedback-textarea:focus {
  border-color: #0b0c11;
  box-shadow: 0 0 0 3px rgba(11, 12, 17, 0.08);
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

.card-title {
  margin: 0 0 2px;
  font-size: 18px;
  font-weight: 650;
}

.card-title-sm {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 620;
}

.card-sub {
  margin: 0 0 14px;
  font-size: 13px;
  opacity: 0.76;
}

.card-sub-strong {
  font-weight: 600;
  opacity: 0.9;
}

.empty-copy {
  margin: 12px 0 0;
  font-size: 14px;
  opacity: 0.8;
}

/* PILLS */
.pill-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pill {
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 14px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.pill-dark {
  background: #0b0c11;
  color: #ffffff;
  justify-content: space-between;
}

.pill-light {
  background: #ffffff;
  border: 1.5px solid #111318;
  color: #111318;
  justify-content: center;
}

.pill-index {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.7;
  margin-right: 10px;
}

.pill-text {
  flex: 1;
  text-align: center;
}

.pill-stack-dark {
  background: #f4f5ff;
  padding: 12px 10px;
  border-radius: 16px;
}

.pill-stack-light {
  margin-top: 8px;
}

/* METRICS */
.metrics-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 6px;
}

.metric {
  background: rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  padding: 14px 16px 13px;
  box-sizing: border-box;
}

.metrics-hero .metric {
  background: rgba(15, 23, 42, 0.58);
}

.metric-big {
  text-align: left;
}

.metric-label {
  font-size: 11px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  opacity: 0.7;
  margin: 0 0 4px;
}

.metric-value-lg {
  margin: 0;
  font-size: 26px;
  font-weight: 720;
}

.metric-unit {
  font-size: 16px;
  margin-left: 2px;
  opacity: 0.8;
}

.metric-footnote {
  margin: 3px 0 0;
  font-size: 11px;
  opacity: 0.78;
}

.metric-value {
  margin: 2px 0 0;
  font-size: 17px;
  font-weight: 620;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

/* REFLECTION */
.reflection-list {
  margin: 4px 0 14px 18px;
  padding: 0;
  font-size: 13px;
  opacity: 0.9;
}

.reflection-list li + li {
  margin-top: 4px;
}

.continuation-card {
  margin-top: 14px;
}

.continuation-list {
  margin: 4px 0 14px 18px;
  padding: 0;
  font-size: 13px;
  opacity: 0.92;
}

.continuation-list li + li {
  margin-top: 6px;
}

.continuation-actions {
  margin-top: 2px;
}

/* BUTTONS */
.cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
}

.btn {
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  border: 1.5px solid #0b0c11;
  cursor: pointer;
}

.btn-primary {
  background: #0b0c11;
  color: #ffffff;
}

.invite-card {
  margin-top: 14px;
  background: linear-gradient(135deg, #0d0f11, #14181d);
  color: #fff;
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
  gap: 12px;
  margin-top: 18px;
}

.invite-stat {
  border-radius: 16px;
  padding: 14px 16px;
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
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.9;
}

.invite-stat-value {
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
}

.invite-micro {
  margin: 16px 0 0;
  font-size: 13px;
  opacity: 0.8;
}

.invite-cta-row {
  margin-top: 16px;
}

.invite-card .btn {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.18);
}

.invite-card .btn.btn-primary {
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

.share-btn-top {
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

.hero-share {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  justify-self: end;
  align-self: start;
}

.postplay-share-prompt {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  opacity: 0.75;
  text-align: right;
}

.cta-row-stack {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.global-tease {
  font-size: 13px;
  opacity: 0.75;
  margin: 0;
}

@media (max-width: 600px) {
  .invite-stats {
    grid-template-columns: 1fr;
  }

  .invite-title {
    font-size: 18px;
  }

  .hero-share {
    align-items: flex-end;
    gap: 6px;
  }

  .postplay-share-prompt {
    display: none;
  }
}

/* RESPONSIVE */
@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    row-gap: 16px;
  }

  .hero-logo {
    justify-self: flex-start;
  }

  .grid {
    grid-template-columns: 1fr 0.9fr;
  }
}

@media (max-width: 600px) {
  .success-shell {
    padding: 22px 16px 30px;
  }

  .hero-title {
    font-size: 24px;
  }

  .metrics-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .metrics-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
.success-shell > * {
  max-width: none !important;
}

/* ============================================================
   SUCCESS SUMMARY - MOBILE REFLOW
============================================================ */
@media (max-width: 600px) {
  /* ROOT */
  .success-shell {
    padding: 20px 16px 0;
  }

  /* HERO */
  .hero {
    width: 100% !important;
    grid-template-columns: 50px minmax(0, 1fr) auto !important;
    align-items: flex-start !important;
    gap: 8px;
  }

  .hero-title {
    font-size: 22px;
  }

  .hero-logo {
    margin-top: 14px;
    outline: 0.1px;
  }

  .hero-logo img {
    width: 50px;
    height: 50px;
  }

  .hero-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .hero-kicker {
    font-size: 11px;
  }

  .hero-sub {
    font-size: 13px;
  }

  .share-btn-top {
    padding: 7px 10px;
    font-size: 12px;
    line-height: 1;
  }

  .hero-title,
  .hero-sub,
  .hero-kicker {
    min-width: 0;
    overflow-wrap: break-word;
  }

  /* =====================================================
     MAIN GRID → SINGLE COLUMN
  ===================================================== */

  .grid {
    grid-template-columns: 1fr !important;
    width: 100%;
    max-width: 100%;
    gap: 12px;
    justify-items: center;
  }

  .answers-column,
  .metrics-column {
    width: min(100%, 560px) !important;
    max-width: min(100%, 560px) !important;
    margin: 0 auto;
  }

  /* =====================================================
     ANSWERS + OTHER ACCEPTED → FULL WIDTH
  ===================================================== */

  .answers-column {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* =====================================================
     TODAY’S BRAINPRINT → FULL WIDTH
  ===================================================== */

  .metrics-hero {
    padding: 12px;
  }

  .metrics-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .metrics-hero {
    background: linear-gradient(270deg, #0d0f11, #20232f);
    color: #ffffff;
    padding: 0px 0px 0px;
  }

  /* =====================================================
     MINI METRICS → 2 x 2 GRID
  ===================================================== */

  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .metrics-grid-card {
    padding: 10px;
  }

  /* =====================================================
     REFLECTION → FULL WIDTH
  ===================================================== */

  .reflection-card {
    margin-top: 8px;
  }

  /* =====================================================
     CARDS → TIGHTER HEIGHT / BETTER TYPE
  ===================================================== */

  .card {
    padding: 12px;
  }

  .card-title {
    font-size: 16px;
  }

  .card-title-sm {
    font-size: 14px;
  }

  .card-sub {
    font-size: 13px;
  }

  /* =====================================================
     PILLS / ANSWERS
  ===================================================== */

  .pill {
    font-size: 14px;
    padding: 14px 14px;
  }

  .pill-stack-dark {
    padding: 12px;
  }

  /* =====================================================
     METRIC VALUES SCALE DOWN SLIGHTLY
  ===================================================== */

  .metric-value-lg {
    font-size: 22px;
  }

  .metric-value {
    font-size: 16px;
  }

  /* =====================================================
     SAFE BOTTOM SCROLL SPACE
  ===================================================== */

  .success-shell::after {
    content: '';
    display: block;
  }
}

@supports (-webkit-touch-callout: none) {
  .hero-logo {
    margin-top: 16px;
  }
}

.share-sheet-enter-from,
.share-sheet-leave-to {
  opacity: 0;
}

.share-sheet-enter-active,
.share-sheet-leave-active {
  transition: opacity 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.share-sheet-enter-active .share-modal {
  animation: shareModalIn 520ms cubic-bezier(0.18, 0.9, 0.22, 1) both;
}

.share-sheet-leave-active .share-modal {
  animation: shareModalOut 220ms cubic-bezier(0.4, 0, 0.2, 1) both;
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
</style>
