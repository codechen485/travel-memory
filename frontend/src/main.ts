import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './assets/main.css'

const app = createApp(App)

// Naive UI 组件改由 unplugin-vue-components 按需自动引入（见 vite.config.ts），
// 不再 app.use(naive) 全量注册，避免整包 naive-ui 打进首屏
app.use(createPinia())
app.use(router)

app.mount('#app')
