<template>
  <div :class="['play-wrapper', timeClass]">
    
    <!-- HEADER -->
    <header class="header">
      <img src="/logo-800-full.svg" class="logo" />
      <span class="counter">
        <span class="num-light">1 </span> / <span class="num-bold"> 1</span>
      </span>
      <span class="divider">|</span>
      <span class="stage">{{ stageLabel }}</span>
    </header>

    <!-- ATTEMPTS INDICATOR -->
    <div class="attempts-row">
      <span class="attempts-label">Attempts this check-in:</span>
      <div class="dots">
        <span
          v-for="n in MAX_ATTEMPTS"
          :key="n"
          :class="['dot', { active: n <= attemptsRemaining }]"
        />
      </div>
    </div>


<!-- ========================================================= -->
<!-- 🔥 SPLIT LAYOUT WITH ANIMATION (correct structure)       -->
<!-- ========================================================= -->
<transition name="split-lock" mode="out-in">
  <div v-if="hardLocked && !isDayComplete" class="lockout-split">

    <!-- LEFT SIDE — Last attempt answers -->
    <div class="left-pane">
      <h2 class="attempt-title">Latest Attempt</h2>

      <div 
        v-for="(ans,i) in answers" 
        :key="i"
        class="locked-result"
        :class="fieldStatus[i]"
      >
        {{ ans || "—" }}
      </div>
    </div>

    <!-- RIGHT SIDE — Countdown -->
    <div class="right-pane">
      <img src="/logo-800-full.svg" class="mini-logo"/>

      <h1 class="lockout-title">That’s all for now</h1>
      <p class="next-label">Next check-in:</p>

      <p class="lockout-time">{{ nextSlotShort }}</p>
      <p class="lockout-countdown">Come back in {{ timeRemaining }}</p>

      <button 
        v-if="timeRemaining.includes('Available')" 
        class="reopen-btn"
        @click="unlockReturn"
      >
        Give it another shot ↻
      </button>
    </div>

  </div>
</transition>



    <!-- ========================================================= -->
    <!-- ORIGINAL FULLSCREEN LOCKOUT (kept for end-of-day/perfect) -->
    <!-- ========================================================= -->
<!-- ========================= master UI switch ========================= -->
<template v-if="hardLocked && !isDayComplete">
  <!-- split lockout (with animation wrapper) -->
  <transition name="split-lock" mode="out-in">
    <div class="lockout-split">

      <div class="left-pane">
        <h2 class="attempt-title">Latest Attempt</h2>

        <div 
          v-for="(ans,i) in answers" 
          :key="i"
          class="locked-result"
          :class="fieldStatus[i]"
        >
          {{ ans || "—" }}
        </div>
      </div>

      <div class="right-pane">
        <img src="/logo-800-full.svg" class="mini-logo"/>

        <h1 class="lockout-title">That’s all for now</h1>
        <p class="next-label">Next check-in:</p>

        <p class="lockout-time">{{ nextSlotShort }}</p>
        <p class="lockout-countdown">Come back in {{ timeRemaining }}</p>

        <button 
          v-if="timeRemaining.includes('Available')" 
          class="reopen-btn"
          @click="unlockReturn"
        >
          Give it another shot ↻
        </button>
      </div>

    </div>
  </transition>
</template>

<!-- ========================= FULLSCREEN LOCKOUT ========================= -->
<template v-else-if="modalMode === 'lockout_full'">
  <div class="lockout-fullscreen">
    <div class="lockout-center">

      <img src="/logo-800-full.svg" class="lockout-logo"/>
      <h1 class="lockout-title">
        <span v-if="allPerfect">You cleared today flawlessly!</span>
        <span v-else-if="isDayComplete">You learn something new everyday!</span>
        <span v-else>That’s all for now</span>
      </h1>

      <template v-if="isDayComplete || allPerfect">
        <p class="lockout-subtext">Let’s see how you stack up globally</p>

        <div class="reveal-block" v-if="missingAnswers.length">
          <p class="reveal-title">Other answers you didn’t find:</p>
          <ul class="reveal-list">
            <li v-for="a in missingAnswers" :key="a">{{ a }}</li>
          </ul>
        </div>

        <button class="lockout-btn" @click="goAnalytics">
          View today’s analytics →
        </button>
      </template>

      <template v-else>
        <p class="lockout-subtext">Next check-in:</p>
        <p class="lockout-time">{{ nextSlotShort }}</p>
        <p class="lockout-countdown">Come back in {{ timeRemaining }}</p>
      </template>

    </div>
  </div>
</template>

<!-- ========================= NORMAL GAMEPLAY ========================= -->
<template v-else>
  <h1 v-if="loading" class="question-title muted">Loading question...</h1>
  <h1 v-else-if="!question" class="question-title muted">No question found.</h1>
  <h1 v-else class="question-title">{{ question }}</h1>

  <div class="input-group" v-if="answers.length">
    <input
      v-for="(ans, i) in answers"
      :key="i"
      v-model="answers[i]"
      :placeholder="(i + 1) + '.'"
      :class="['answer-input', fieldStatus[i]]"
      :disabled="fieldStatus[i] === 'correct'"
    />
  </div>

  <div class="button-row">
    <button class="lock" @click="onLockIn" :disabled="attemptsRemaining <= 0">
      Lock In
    </button>
  </div>
</template>



    <!-- ========================================================= -->
    <!-- MODAL (unchanged) -->
    <!-- ========================================================= -->
    <div v-if="showModal" class="overlay">
      <div class="modal">
        
        <template v-if="modalMode === 'success'">
          <h2 class="modal-title">Nicely done!</h2>
          <p class="modal-text">You’ve locked in all {{ answerCount }} answers correctly.</p>
          <button class="modal-btn primary" @click="closeModal">Continue</button>
        </template>

        <template v-else-if="modalMode === 'askHint'">
          <h2 class="modal-title">Not quite yet…</h2>
          <p class="modal-text">Some of your answers aren’t quite there. Want a hint?</p>
          <div class="modal-actions">
            <button class="modal-btn secondary" @click="closeModal">No, retry</button>
            <button class="modal-btn primary" @click="showHint">Yes, show hint</button>
          </div>
        </template>

        <template v-else-if="modalMode === 'hint'">
          <div class="hint-wrapper">
            <h2 class="modal-title">Hint</h2>
            <p class="modal-text">{{ hintText || 'Hint coming soon.' }}</p>
            <button class="modal-btn primary" @click="closeModal" style="margin-top:14px">Back</button>
          </div>
        </template>

      </div>
    </div>

  </div>
</template>



<script setup>
import { ref, computed, onMounted } from "vue"
import Airtable from "airtable"
import { useRouter } from "vue-router"   // ⬅ Add at top of <script setup>
const router = useRouter()

/* ---------- Airtable set-up ---------- */
const token = import.meta.env.VITE_AIRTABLE_TOKEN;
const baseID = "appJruOxLGdiwKrRw"
const base = new Airtable({ apiKey: token }).base(baseID)

/* ---------- Time-block label (for storage key) ---------- */
const hour = new Date().getHours()
const timeBlock =
  hour < 11 ? "FirstLook"
  : hour < 15 ? "DontWorry"
  : hour < 20 ? "Midday"
  : "LastChance"

/* ---------- Reactive state ---------- */
const question = ref("")
const answerCount = ref(0)
const correctAnswers = ref([])   // canonical list from Airtable
const hintText = ref("")
const loading = ref(true)
const questionDate = ref("")     // Airtable Date field (for key)

const answers = ref([])          // user inputs
const fieldStatus = ref([])      // "correct" | "incorrect" | "" for styling

// attempts per time-window
const MAX_ATTEMPTS = 3
const attemptsRemaining = ref(MAX_ATTEMPTS)

// modal state
const showModal = ref(false)
const modalMode = ref("success") // "success" | "askHint" | "hint" | "lockout"

// localStorage key (per-day; keep same question across slots)
const storageKey = computed(() =>
  questionDate.value
    ? `dailyApp_${questionDate.value}`  // removed timeBlock so state persists all day
    : null
)

const userCorrect = computed(() =>
  answers.value.filter(a => isAnswerCorrect(a))
)

const missingAnswers = computed(() =>
  correctAnswers.value.filter(c =>
    !userCorrect.value.map(normalise).includes(normalise(c))
  )
)

const hardLocked = ref(false)  // NEW — true when attempts are 0

/* ---------- Fetch today’s question ---------- */
onMounted(() => {
  base("Questions")
  .select({
    filterByFormula: `IS_SAME({Date}, TODAY(), 'day')`,  // Only pull today's row
    maxRecords: 1
  })
    .firstPage((err, records) => {
      loading.value = false
      if (err || !records?.length) {
        console.error(err)
        return
      }

      const row = records[0].fields
      question.value = row.QuestionText || ""
      answerCount.value = Number(row.AnswerCount || 1)
      questionDate.value = row.Date || ""

      // Correct answers stored as comma-separated string
      correctAnswers.value = (row.CorrectAnswers || "")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)

      hintText.value = row.HintText || ""

      // generate empty inputs + statuses
      answers.value = Array(answerCount.value).fill("")
      fieldStatus.value = Array(answerCount.value).fill("")

      // try restore from localStorage for this day + block
      restoreState()
    })
})

/* ---------- Normalisation + fuzzy matching ---------- */
function normalise(str) {
  return str.toLowerCase().replace(/\s+/g, "")
}

function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      )
    }
  }
  return dp[m][n]
}

function similar(a, b) {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 2) return false
  const d = levenshtein(a, b)
  return d <= 2
}

function isAnswerCorrect(userAnswer) {
  if (!userAnswer) return false
  const nu = normalise(userAnswer)
  return correctAnswers.value.some((c) => {
    const nc = normalise(c)
    return similar(nu, nc)
  })
}

/* -----------------------------------------------
   🧠 SESSION SUMMARY + ANALYTICS EXPORT (FINAL)
------------------------------------------------*/
import airtable from "airtable"
const analyticsTable = base("Analytics")  // NEW analytics table


/* ---------- Build analytics object ---------- */
function buildSessionSummary() {
  const totalCorrect = fieldStatus.value.filter(s => s === "correct").length
  const totalFields  = fieldStatus.value.length
  const attemptsUsed = MAX_ATTEMPTS - attemptsRemaining.value

  return {
    userId: localStorage.getItem("akinto_uid") || generateAnonID(),   // NEW
    date: questionDate.value,
    questionId: questionDate.value, // later switch to Q-ID field from Airtable

    answers: answers.value.slice(),
    correctAnswers: correctAnswers.value.slice(),
    fieldStatus: fieldStatus.value.slice(),

    correctCount: totalCorrect,
    incorrectCount: totalFields - totalCorrect,
    attemptsUsed,
    completed: totalCorrect === totalFields,
    hintUsed: answers.value.some(a => a === "__HINT__"),   // optional later
    timestamp: new Date().toISOString()
  }
}


/* ---------- New: Save to Airtable ---------- */
function saveAnalytics(summary) {
  analyticsTable.create([
    {
      fields: {
        UserID: summary.userId,
        Country: localStorage.getItem("akinto_country") || "unknown",
        Date: summary.date,
        QuestionID: summary.questionId,
        CorrectCount: summary.correctCount,
        AttemptCount: summary.attemptsUsed,
        Completed: summary.completed,
        HintUsed: summary.hintUsed,
        Answers: JSON.stringify(summary.answers),
        CorrectAnswers: JSON.stringify(summary.correctAnswers),
        FieldStatus: JSON.stringify(summary.fieldStatus),
        Timestamp: summary.timestamp
      }
    }
  ], err => err && console.error("❌ Analytics write failed:", err))
}


/* Helper: generate anonymous user token if none exists */
function generateAnonID() {
  const id = "user-" + Math.random().toString(36).substring(2,10)
  localStorage.setItem("akinto_uid", id)
  return id
}


/* ---------- Save / restore ---------- */
function saveState() {
  if (!storageKey.value) return

  const payload = {
    answers: answers.value,
    attemptsRemaining: attemptsRemaining.value,
    hardLocked: hardLocked.value,   // ← add
  }

  try {
    localStorage.setItem(storageKey.value, JSON.stringify(payload))

    // 🔥 NEW — Only write summary when today is completed
    if (allPerfect.value || attemptsRemaining.value <= 0 || isDayComplete.value) {
      const summaryKey = `${storageKey.value}_summary`
      const summary = buildSessionSummary()
      localStorage.setItem(summaryKey, JSON.stringify(summary))
      saveAnalytics(summary)
    }

  } catch (e) {
    console.error("Failed to save state", e)
  }
}


function restoreState() {
  if (!storageKey.value) return
  try {
    const raw = localStorage.getItem(storageKey.value)
    if (!raw) return
    const saved = JSON.parse(raw)

    if (Array.isArray(saved.answers)) {
      answers.value = saved.answers.slice(0, answerCount.value)
    }
    if (typeof saved.attemptsRemaining === "number") {
      attemptsRemaining.value = Math.max(
        0,
        Math.min(MAX_ATTEMPTS, saved.attemptsRemaining),
      )
    }
    if (saved.hardLocked) {
      hardLocked.value = true
      modalMode.value = "lockout_full"   // ensures returning user sees lock-stat
      modalMode.value = null   // ensures return goes to split mode, not fullscreen modal
    }

    // Recompute field status from restored answers
    fieldStatus.value = answers.value.map((a) =>
      a && isAnswerCorrect(a) ? "correct" : "",
    )
  } catch (e) {
    console.error("Failed to restore state", e)
  }
}

/* ---------- Lock-in behaviour ---------- */
async function onLockIn() {
  // if already out of attempts → show full lockout page
  if (attemptsRemaining.value <= 0) {
    modalMode.value = "lockout_full"
    showModal.value = false
    hardLocked.value = true
    saveAnalytics(buildSessionSummary())
    saveState()
    return
  }

  // require full input
  const filled = answers.value.map(a => a.trim()).filter(Boolean)
  if (filled.length < answerCount.value) {
    window.alert("Hazard a guess in every box before locking in.")
    return
  }

  // evaluate answers + lock correct ones
  fieldStatus.value = answers.value.map(a =>
    a.trim() && isAnswerCorrect(a.trim()) ? "correct" : "incorrect"
  )

  const allCorrectNow = fieldStatus.value.every(s => s === "correct")

  // pause so colours + animation show before modal (longer so they can read)
  await new Promise(r => setTimeout(r, 2200))

  if (allCorrectNow) {
    modalMode.value = "success"
    showModal.value = true
    saveAnalytics(buildSessionSummary())
    saveState()
    return
  }

  // ❗ Wrong answers → lose attempt
  attemptsRemaining.value--

  if (attemptsRemaining.value <= 0) {
    modalMode.value = "lockout_full"
    showModal.value = false
  } else {
    modalMode.value = "askHint"
    showModal.value = true
  }

  saveState()
}


/* ---------- Modal actions ---------- */
function closeModal() {
  // if the success modal is closing, go straight to lockout/analytics screen
  if (modalMode.value === "success") {
    showModal.value = false
    modalMode.value = "lockout_full"
    return
  }
  showModal.value = false
}

function showHint() {
  modalMode.value = "hint"
}

/* ---------- Time-of-day theming ---------- */
const stageLabel = computed(() => {
  if (hour < 11) return "First Look"
  if (hour < 15) return "Don’t Worry We Have All Day"
  if (hour < 20) return "Midday Check-In"
  return "Last Chance."
})

const timeClass = computed(() => {
  if (hour < 11) return "theme-morning"
  if (hour < 15) return "theme-day"
  if (hour < 20) return "theme-evening"
  return "theme-night"
})

const nextCheckLabel = computed(() => {
  if (hour < 11) return "12:00 (Don’t Worry We Have All Day)"
  if (hour < 15) return "15:00 (Midday Check-In)"
  if (hour < 20) return "20:00 (Last Chance.)"
  return "tomorrow morning"
})

/* ==== Lockout timing logic ==== */
const now = new Date();
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function nextAvailableSlot() {
  const d = new Date();
  if (hour < 11)      d.setHours(11,0,0,0);
  else if (hour < 15) d.setHours(15,0,0,0);
  else if (hour < 20) d.setHours(20,0,0,0);
  else { d.setDate(d.getDate()+1); d.setHours(9,0,0,0); }
  return d;
}

const nextSlot = nextAvailableSlot();

/* live countdown */
const timeRemaining = ref("");
setInterval(()=> updateCountdown(),1000);

function updateCountdown(){
  const diff = nextSlot - new Date();
  if(diff <= 0){ timeRemaining.value="Available again now"; return }

  const h = Math.floor(diff/1000/60/60);
  const m = Math.floor(diff/1000/60)%60;
  const s = Math.floor(diff/1000)%60;
  timeRemaining.value = `${h>0?h+'h ':''}${m}m ${s}s`;
}

const nextSlotLabel = computed(()=>{
  return nextSlot.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:timezone})
       + ` (${timezone})`;
});

/* ---------- RESET WHEN TIME UNLOCKS ---------- */
function refreshCheck() {
  if (timeRemaining.value.includes("Available")) {
    attemptsRemaining.value = MAX_ATTEMPTS
    // keep fieldStatus as-is so user still sees which were right/wrong
    fieldStatus.value = fieldStatus.value.slice()
    modalMode.value = null
    saveState()
    return
  }
  updateCountdown()
}

function unlockReturn(){
  hardLocked.value = false
  attemptsRemaining.value = MAX_ATTEMPTS
  modalMode.value = null        // return to play screen
  saveState()
}

const nextSlotShort = computed(() => {
  return nextSlot.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,            // forces 20:00 rather than 8:00pm
    timeZoneName: "short"     // shows BST / GMT instead of Europe/London
  });
});

const isDayComplete = computed(() => hour >= 20)        // no more check-ins tonight
const allPerfect    = computed(() => fieldStatus.value.length > 0 && fieldStatus.value.every(s => s==="correct"))

const analyticsLoading = ref(false)


function goAnalytics() {
  analyticsLoading.value = true
  setTimeout(() => {
    router.replace({ name: "DailyAnalytics" })
  }, 1800)
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

.theme-morning { --bg-color:#9fd5ff; background:#9fd5ff; }
.theme-day     { --bg-color:#9fd5ff; background:#9fd5ff; }
.theme-evening { --bg-color:#6ec04d; background:#6ec04d; }
.theme-night   { --bg-color:#0e0c24; background:#0e0c24; color:white; }


/* HEADER */
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
  background: rgba(255,255,255,0.18) !important;    /* used */
  opacity: 1 !important;
}

.theme-night .dot.active { 
  background: #ffffff !important;                   /* remaining */
  opacity: 1 !important;
}

/* label also brightens for clarity */
.theme-night .attempts-label {
  color: white !important;
}
.theme-night .dots {
  filter: drop-shadow(0 0 3px rgba(255,255,255,0.45));
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
  padding: .75rem 1rem;
  border-radius: 10px;
  border: 2px solid #111;
  outline: none;
  transition: 0.18s ease;
}

/* --- DEFAULT correct behaviour (morning/day/evening) --- */
.answer-input.correct {
  animation: fadeOutText .8s forwards;
  background: #000;
  border-color: #000;
  color: var(--bg-color); /* dynamic colour */
  font-weight: 600;
  transition: 0.25s;
}

/* --- NIGHT MODE / LAST CHANCE (white text instead of green fade) --- */
.theme-night .answer-input.correct {
  color:white;
}


.answer-input.incorrect {
  background: #ffffff;
  border-color: #242227;
  animation: shake 0.35s ease;
}

/* BUTTONS */
.button-row {
  display: flex;
  gap: 22px;
}

.lock {
  background: #83b54c;
  border: 2px solid #111;
  padding: .75rem 2.1rem;
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
.modal-title { font-size: 26px !important; color:#000; }
.modal-text  { font-size: 18px !important; color:#000; line-height:1.5; padding-bottom: 20;}
.modal-sub   { font-size: 32px !important; color:#444; }

.stage { font-size: var(--fs-xl) !important; font-weight:1000; } /* larger stage text */

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

.lockout-screen{
  position:fixed;
  inset:0;
  display:flex;
  align-items:center;
  justify-content:center;
  background:inherit;    /* matches theme */
  animation:fadein .4s ease-out;
}

.lockout-card{
  text-align:center;
  background:rgba(255,255,255,.9);
  padding:40px 50px;
  border-radius:20px;
  width:80%;
  max-width:500px;
  box-shadow:0 20px 60px rgba(0,0,0,.25);
}

.lockout-card h1{ font-size:30px; font-weight:800; color:#111; margin-bottom:10px; }
.lockout-card .next{ font-size:20px; opacity:.8; margin-top:2px; }
.lockout-card .time{ font-size:26px; font-weight:700; margin:2px 0 2px; }
.lockout-card .countdown{ font-size:18px; margin-top:2px; }

.recheck-btn{
  margin-top:25px;
  padding:12px 40px;
  background:#111;
  color:#fff;
  border-radius:10px;
  border:none;
  font-size:18px;
  cursor:pointer;
}

/* 🔥 NEW LOCK-OUT DESIGN */

.lockout-fullscreen {
  position: fixed;
  inset: 0;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  animation: fadein 0.45s ease-out;
}

.lockout-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.lockout-logo {
  width: 80px;
  margin-bottom: 6px;
  outline: 1.5px solid #000000;
}

.lockout-title {
  font-size: 36px;
  font-weight: 800;
  color: #242227;
  margin: 0;
}

.lockout-subtext {
  font-size: 17px;
  opacity: .75;
  color: #242227;
  margin-top: 3px;
}

.lockout-time {
  font-size: 33px;
  font-weight: 750;
  color: #242227;
  margin: 0;
}

.lockout-countdown {
  font-size: 17px;
  opacity: .85;
  color: #242227;
  margin-bottom: 15px;
}

.lockout-btn {
  background: #000;
  color: #fff;
  border-radius: 14px;
  padding: 14px 32px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: .2s;
}

.lockout-btn:hover {
  opacity:0.25;
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
  color: rgba(255,255,255,0.75) !important;
}

/* Unanswered input boxes still white borders — flip for visibility */
.theme-night .answer-input {
  background:#fff;
  color:#000;
}

/* Correct answers already handled above, but reinforce */
.theme-night .answer-input.correct {
  background:#000;
  color:#fff !important;
  border-color:#fff;
}

/* ===========================
   🌗 GLOBAL THEME VARIABLE SYSTEM
   =========================== */
.play-wrapper {
  --text-color: #242227;
  --text-muted: rgba(36,34,39,0.6);
  --input-bg: #ffffff;
  --input-text: #000000;
  --correct-text: var(--bg-color); /* keeps your fading behaviour */
}

/* NIGHT REVERSES EVERYTHING */
.theme-night.play-wrapper {
  --text-color: #ffffff;
  --text-muted: rgba(255,255,255,0.75);
  --input-bg: #111;
  --input-text: #fff;
  --correct-text: #fff;
}

/* Base UI adopts variables */
.play-wrapper,
.play-wrapper * {
  color: var(--text-color);
}

/* Ensure lockout is always readable (override theme + vars) */
.lockout-fullscreen,
.lockout-fullscreen * {
  color: #242227 !important;
}

/* Input default */
.answer-input {
  background: var(--input-bg);
  color: var(--input-text);
}

/* Correct-state universal */
.answer-input.correct {
  background:#000;
  color: var(--correct-text)!important;
}

/* Placeholder obeys theme */
input::placeholder {
  color: var(--text-muted)!important;
}

.reveal-block {
  margin-top: 20px;
  background: rgba(0,0,0,0.05);
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

.lockout-split {
  display: flex;
  height: 100vh;
  width: 100%;
}

.left-pane {
  width: 30%;
  background: rgba(0,0,0,0.05);
  padding: 2rem;
  overflow-y: auto;
  border-right: 2px solid rgba(0,0,0,0.1);
}

.right-pane {
  width: 70%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.locked-result {
  padding: .75rem 1rem;
  margin-bottom: .5rem;
  border-radius: 10px;
  background: #fff;
  font-size: 18px;
  border: 2px solid #111;
}

.locked-result.correct   { background:#000; color:white; border-color:#000; }
.locked-result.incorrect { opacity:.4; }

.reopen-btn {
  margin-top:20px;
  background:#000;
  color:#fff;
  padding:12px 28px;
  border-radius:10px;
  cursor:pointer;
  font-size:17px;
}

/* ===============================
   🔥 Split-Lockout Page Animation
=============================== */
.split-lock-enter-from {
  opacity: 0;
  transform: translateY(30px);
}
.split-lock-enter-active {
  transition: 0.55s cubic-bezier(.21,.75,.29,.99);
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


/* animations */

@keyframes fadein {0%{opacity:0;}100%{opacity:1;}}
@keyframes fadeOutText {
  0% { color:#fff; }
  100% { color:var(--bg-color); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  50% { transform: translateX(4px); }
  75% { transform: translateX(-3px); }
}
@keyframes pop {
  0% { transform: scale(0.98); }
  60% { transform: scale(1.03); }
  100% { transform: scale(1); }
}

/* 🔒 MODAL ALWAYS FORMATTED BLACK ON WHITE */
.modal, .modal * {
  color:#000 !important;
  background:#fff !important;
}

.overlay {
  backdrop-filter: blur(10px);
  background: rgba(0,0,0,0.55) !important; /* stronger dim */
}

/* ========= SPINNER WRAP PAGE ========= */
.analytics-loading{
  position:fixed;
  inset:0;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  background:#fff;
  color:#000;
}

.spinner {
  width:60px;
  height:60px;
  border-radius:50%;
  border:6px solid #000;
  border-top-color:transparent;
  animation:spin .85s linear infinite;
  margin-bottom:14px;
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
.section-sub { opacity:.7; margin-top:-4px }

.hero-container {
  margin:28px 0;
  background:#161a1f;
  border-radius:18px;
  padding:22px 26px;
}
.hero-headline { font-size:22px; margin:0 0 6px }
.hero-sub { opacity:.8;font-size:14px }

/* --- GRID VISUAL STATS --- */
.stats-grid {
  margin-top:30px;
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap:18px;
}

.vis-card {
  background:#14181d;
  border-radius:18px;
  padding:18px;
  text-align:center;
}

.vis-title { font-size:13px; opacity:.8;margin-bottom:12px }

/* ---- CIRCLE GAUGE ---- */
.circle-meter svg { width:90px; height:90px }
.meter-bg {
  fill:none; stroke:#2a2f35; stroke-width:3.5;
}
.meter-fg {
  fill:none; stroke:#1ee38c; stroke-width:4.6;
  stroke-linecap:round; transform:rotate(-90deg); transform-origin:50% 50%;
  transition:.4s;
}
.meter-fg-2 {
  fill:none; stroke:#4f8bff; stroke-width:4.6;
  stroke-linecap:round; transform:rotate(-90deg); transform-origin:50% 50%;
  transition:.4s;
}
.circle-value {
  position:relative; top:-66px;
  font-size:17px; font-weight:bold;
}

/* ---- SPEED BAR ---- */
.bar-meter {
  background:#2d3237; height:10px; border-radius:14px; overflow:hidden;
}
.bar-fill {
  height:100%; background:#6cf088; border-radius:14px 0 0 14px;
  transition:.3s;
}
.bar-label { margin-top:6px;font-size:14px }

/* --- RIGHT GLOBAL --- (COMING NEXT) */


@keyframes spin {to{transform:rotate(360deg);}}

/* -----------------------------------
   Responsive Layout Adjustments
-----------------------------------*/

/* Tablet */
@media (max-width: 900px) {
  .play-wrapper { padding-top: var(--space-md); }
  .question-title { font-size: var(--fs-md); }
}

/* Mobile */
@media (max-width: 600px) {
  .question-title {
    font-size: var(--fs-sm);
    max-width: 90%;
  }
  .stage {
    font-size: var(--fs-lg) !important;
  }
}

/* Very small mobile */
@media (max-width: 400px) {
  .answer-input {
    font-size: var(--fs-sm);
  }
  .lock {
    font-size: var(--fs-sm);
    padding: .6rem 1.6rem;
  }
}

html, body {
  overflow-x: hidden;
  overflow-y: hidden;
  overscroll-behavior: hidden;
}

/* ✨ Left side slides in from left edge */
.left-pane {
  animation: slide-left 0.6s cubic-bezier(.18,.74,.32,1) forwards;
  opacity: 0;
}
@keyframes slide-left {
  from { transform: translateX(-50px); opacity:0; }
  to   { transform: translateX(0); opacity:1; }
}

/* ✨ Right panel soft zoom-in with delay */
.right-pane {
  animation: pop-in 0.7s cubic-bezier(.17,.85,.39,1) forwards;
  animation-delay: .15s;
  opacity: 0;
}
@keyframes pop-in {
  from { transform: scale(.94) translateX(40px); opacity:0; }
  to   { transform: scale(1) translateX(0); opacity:1; }
}

/* Increase space above modal secondary content */
.lockout-subtext {
  margin-top: 12px !important;    /* was too tight */
}

/* Grey reveal box — reduce padding slightly & tighten vertical spacing */
.reveal-block {
  margin-top: 22px;               /* slightly increased to breathe */
  padding: 10px 16px;             /* reduced from 14px 18px */
  border-radius: 12px;
}

/* More compact spacing between items inside reveal list */
.reveal-list li {
  margin-bottom: 4px;             /* cleaner rhythm */
}

/* Increase vertical gap before the analytics button */
.lockout-btn {
  margin-top: 28px;               /* creates separation from grey box */
}

/* Make button text white (it was appearing dark depending on inherit) */
.lockout-btn {
  background:#000 !important;
  color:#fff !important;
}

.reveal-title {
  font-size: 17px;
  font-weight: 650;      /* increased from 500-ish default */
  letter-spacing: 0.15px;
  color: #111;           /* rich contrast */
  margin-bottom: 6px;
}

</style>