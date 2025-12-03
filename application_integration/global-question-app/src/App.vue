<template>
  <transition name="route-fade" mode="out-in">
    <RouterView />
  </transition>
</template>

<script setup></script>

<style>
/* =========================================
   Enhanced route transition (PATCH 14)
   Smooth fade + gentle upward slide
   Timing matches app animations
========================================= */

.route-fade-enter-from,
.route-fade-leave-to {
  opacity: 0;
  transform: translateY(18px); /* was 10px — now smoother */
}

.route-fade-enter-active,
.route-fade-leave-active {
  transition:
    opacity 0.45s ease,
    transform 0.45s cubic-bezier(0.16, 0.84, 0.44, 1); /* premium easing */
}

.route-fade-enter-to,
.route-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
