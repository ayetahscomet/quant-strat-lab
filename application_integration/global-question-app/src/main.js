// main.js
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

router.afterEach((to) => {
  if (to.meta?.title) {
    document.title = to.meta.title
  }
})

app.mount('#app')
