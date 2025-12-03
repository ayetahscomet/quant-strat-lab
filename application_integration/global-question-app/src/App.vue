<template>
  <transition name="route-fade" mode="out-in">
    <RouterView />
  </transition>
</template>

<script setup></script>

<style>
/* ================================
   PATCH 11 — Route fade/slide transition
================================ */

.route-fade-enter-from,
.route-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.route-fade-enter-active,
.route-fade-leave-active {
  transition:
    opacity 0.32s cubic-bezier(0.16, 0.8, 0.34, 1),
    transform 0.32s cubic-bezier(0.16, 0.8, 0.34, 1);
}

.route-fade-enter-to,
.route-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
