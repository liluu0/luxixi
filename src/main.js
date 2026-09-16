import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './style.css';
const app = createApp(App).use(router);
// Keep the HTML startup content visible until the initial route is available.
router.isReady().then(() => app.mount('#app')).catch(() => {
  const status = document.querySelector('#startup-status');
  if (status) status.textContent = '页面加载失败，请刷新重试。';
});
