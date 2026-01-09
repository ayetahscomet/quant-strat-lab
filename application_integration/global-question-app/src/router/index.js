import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'
import DailyAnalytics from '../pages/DailyAnalytics.vue'

export default createRouter({
  history: createWebHistory('/'),
  routes: [
    { path: '/', component: LandingView },
    { path: '/analytics', component: DailyAnalytics },
  ],
})
