<template>
  <div v-if="mounted" class="consent-float" :class="{ closing }">
    <div class="consent-card">
      <!-- close button -->
      <button class="close-btn" aria-label="Close" @click="dismiss">×</button>

      <h3>We respect your brain 🧠</h3>

      <p class="consent-body">
        Akinto uses small files to run the game, remember your country and timezone, analyse play
        patterns, and (optionally) send one daily notification. Nothing more, nothing less.
      </p>

      <div class="consent-actions">
        <button class="ghost" @click="acceptEssential">Essential only</button>

        <button class="primary" @click="acceptAll">Accept all</button>
      </div>

      <div class="consent-links">
        <router-link to="/privacy">Privacy</router-link>
        <router-link to="/cookies">Cookies</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const mounted = ref(false)
const closing = ref(false)

function setConsent(val) {
  localStorage.setItem('akinto_consent', val)
  document.cookie = `akinto_consent=${val}; path=/; max-age=31536000`
  closeCard()
}

function acceptAll() {
  setConsent('true')
}

function acceptEssential() {
  setConsent('essential')
}

/* soft dismiss (no consent stored yet) */
function dismiss() {
  closeCard()
}

function closeCard() {
  closing.value = true

  setTimeout(() => {
    mounted.value = false
    closing.value = false
  }, 260)
}

onMounted(() => {
  // ONLY on landing
  if (route.path !== '/') return

  const existing =
    localStorage.getItem('akinto_consent') || document.cookie.includes('akinto_consent=')

  if (existing) return

  // delay 1.2s
  setTimeout(() => {
    mounted.value = true
  }, 1200)
})
</script>

<style scoped>
/* =============================
   FLOATING CONSENT CARD
============================= */

.consent-float {
  position: fixed;
  top: 18px;
  left: 18px;
  z-index: 3000;

  animation: consentPop 0.45s cubic-bezier(0.18, 0.9, 0.38, 1);
}

/* slide-out */
.consent-float.closing {
  animation: consentOut 0.26s ease forwards;
}

/* CARD */

.consent-card {
  position: relative;

  background: white;
  border-radius: 18px;
  padding: 18px 18px 16px;
  width: 360px;
  max-width: calc(100vw - 36px);

  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.18),
    0 4px 10px rgba(0, 0, 0, 0.08);
}

/* CLOSE */

.close-btn {
  position: absolute;
  top: 8px;
  right: 10px;

  background: transparent;
  border: none;
  font-size: 20px;
  line-height: 1;
  font-weight: 700;
  cursor: pointer;
  opacity: 0.35;
}

.close-btn:hover {
  opacity: 0.7;
}

/* TEXT */

h3 {
  margin: 0 0 6px;
  font-size: 18px;
}

.consent-body {
  font-size: 13px;
  opacity: 0.75;
  line-height: 1.55;
}

/* ACTIONS */

.consent-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

button {
  flex: 1;
  padding: 9px;
  border-radius: 11px;
  font-weight: 800;
  cursor: pointer;
}

button.primary {
  background: #000;
  color: white;
  border: none;
}

button.ghost {
  background: white;
  border: 2px solid #000;
}

/* LINKS */

.consent-links {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 10px;
  font-size: 11px;
}

.consent-links a {
  opacity: 0.6;
}

/* =============================
   ANIMATIONS
============================= */

@keyframes consentPop {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes consentOut {
  to {
    opacity: 0;
    transform: translateY(-6px) scale(0.96);
  }
}
</style>
