import './assets/main.css'

import { createApp } from 'vue'
import { createHead } from '@vueuse/head'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const head = createHead()

app.use(router)
app.use(head)

router.afterEach((to) => {
  if (to.meta?.title) {
    document.title = to.meta.title
  }
})

app.mount('#app')
