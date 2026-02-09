/* --- src/router/index.js --- */
import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'
import Play from '../pages/Play.vue'
import DailyAnalytics from '../pages/DailyAnalytics.vue'
import Privacy from '@/pages/Privacy.vue'
import Cookies from '@/pages/Cookies.vue'

export default createRouter({
  history: createWebHistory('/'),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: LandingView,
      meta: {
        title: 'Akinto – The Global Daily Knowledge Game',
      },
    },
    {
      path: '/play',
      name: 'Play',
      component: Play,
      meta: {
        title: 'Akinto Play – Today’s Global Knowledge Puzzle',
      },
    },
    {
      path: '/analytics',
      name: 'Analytics',
      component: DailyAnalytics,
      meta: {
        title: 'Akinto Analytics – Global Thinking Patterns',
      },
    },
    {
      path: '/privacy',
      component: Privacy,
      meta: {
        title: 'Privacy Policy – Akinto',
      },
    },
    {
      path: '/cookies',
      component: Cookies,
      meta: {
        title: 'Cookies Policy – Akinto',
      },
    },
  ],
})
