import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'
import TodayQuestion from '../pages/Play.vue'
import DailyAnalytics from '../pages/DailyAnalytics.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: LandingView,
    },
    {
      path: '/play',
      name: 'play',
      component: TodayQuestion,
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: DailyAnalytics,
    },
  ],
})

export default router
