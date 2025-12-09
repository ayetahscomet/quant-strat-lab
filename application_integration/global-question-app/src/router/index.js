import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'
import TodayQuestion from '../pages/Play.vue'
import DailyAnalytics from '../pages/DailyAnalytics.vue'

const router = createRouter({
  history: createWebHistory('/'), // ⬅ URL stays at akinto.io
  routes: [
    { path: '/', name: 'landing', component: LandingView },
    { path: '/play', name: 'play', component: TodayQuestion },
    { path: '/analytics', name: 'analytics', component: DailyAnalytics },
    {
      path: '/failure-summary',
      name: 'FailureSummary',
      component: () => import('@/pages/FailureSummary.vue'),
    },
    {
      path: '/success-summary',
      name: 'SuccessSummary',
      component: () => import('@/pages/SuccessSummary.vue'),
    },
  ],
})

export default router
