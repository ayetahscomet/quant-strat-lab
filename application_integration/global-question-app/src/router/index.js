import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'
import PlayView from '../views/PlayView.vue'
import DailyAnalytics from '../pages/DailyAnalytics.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: LandingView },
    { path: '/play', component: PlayView },
    { path: '/analytics', component: DailyAnalytics },
  ],
})
