/* --- src/router/index.js --- */

import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'
import Play from '../pages/Play.vue'
import DailyAnalytics from '../pages/DailyAnalytics.vue'
import Privacy from '@/pages/Privacy.vue'
import Cookies from '@/pages/Cookies.vue'

const router = createRouter({
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
        requiresSetup: true,
      },
    },
    {
      path: '/analytics',
      name: 'Analytics',
      component: DailyAnalytics,
      meta: {
        title: 'Akinto Analytics – Global Thinking Patterns',
        requiresSetup: true,
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

// Global Router Guard

router.beforeEach((to, from, next) => {
  if (to.meta?.title) {
    document.title = to.meta.title
  }

  if (to.meta?.requiresSetup) {
    const cookiesAccepted = localStorage.getItem('akinto_consent') === 'true'
    const countrySelected = !!localStorage.getItem('akinto_country')

    if (!cookiesAccepted || !countrySelected) {
      return next({ path: '/', query: { setup: '1' } })
    }
  }

  next()
})

export default router
