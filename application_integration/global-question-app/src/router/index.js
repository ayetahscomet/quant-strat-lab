/* --- src/router/index.js --- */
import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'
import Play from '../pages/Play.vue'
import DailyAnalytics from '../pages/DailyAnalytics.vue'

export default createRouter({
  history: createWebHistory('/'),
  routes: [
    { path: '/', name: 'Home', component: LandingView },
    { path: '/play', name: 'Play', component: Play },
    { path: '/analytics', name: 'Analytics', component: DailyAnalytics },
  ],
})
