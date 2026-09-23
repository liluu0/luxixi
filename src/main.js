import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'
import { recordHomeVisit } from './api/visitApi'

const app = createApp(App).use(router)

router.isReady().then(() => {
  app.mount('#app')
  if (router.currentRoute.value.path === '/') recordHomeVisit().catch(() => {})
}).catch(() => {
  const status = document.querySelector('#startup-status')
  if (status) status.textContent = '页面加载失败，请刷新重试。'
})
