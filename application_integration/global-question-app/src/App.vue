<template>
  <div class="app-shell" :class="{ 'share-mode-active': isShareMode }">
    <!-- GLOBAL COOKIE CONSENT -->
    <ConsentBanner />

    <transition name="route-fade" mode="out-in">
      <RouterView />
    </transition>

    <!-- GLOBAL FOOTER -->
    <footer v-if="!isShareMode" class="trust-footer">
      <span>No ads. No paywalls. We only store gameplay data.</span>
      <span>
        <a href="/privacy">Privacy</a>
        ·
        <a href="/cookies">Cookies</a>
      </span>
    </footer>
  </div>
</template>

<script setup>
import { ref, provide } from 'vue'
import ConsentBanner from '@/components/ConsentBanner.vue'

const isShareMode = ref(false)

provide('setShareMode', (value) => {
  isShareMode.value = !!value

  if (value) {
    document.body.classList.add('share-open')
  } else {
    document.body.classList.remove('share-open')
  }
})
</script>

<style>
.route-fade-enter-from,
.route-fade-leave-to {
  opacity: 0;
  transform: translateY(18px);
}

.route-fade-enter-active,
.route-fade-leave-active {
  transition:
    opacity 0.45s ease,
    transform 0.45s cubic-bezier(0.16, 0.84, 0.44, 1);
}

.route-fade-enter-to,
.route-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.app-shell {
  min-height: 100vh;
  position: relative;
}

.trust-footer {
  position: fixed;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.15px;
  text-align: center;
  color: #111;
  opacity: 0.85;
  pointer-events: auto;
  z-index: 9999;
  width: max-content;
  max-width: 90vw;
  white-space: nowrap;
  transition:
    color 0.25s ease,
    opacity 0.25s ease;
}

.trust-footer a {
  color: inherit;
  text-decoration: none;
  font-weight: 900;
}

.trust-footer a:hover {
  text-decoration: underline;
  opacity: 0.95;
}

@media (max-width: 520px) {
  .trust-footer {
    font-size: 9.5px;
    bottom: 12px;
    white-space: normal;
  }
}

body.dark-bg .trust-footer {
  color: #f2f2f2;
  opacity: 0.9;
}

body.dark-bg .trust-footer a {
  color: #ffffff;
}

.share-mode-active .trust-footer {
  display: none !important;
}

.share-mode-active .trust-footer {
  display: none !important;
}
</style>
