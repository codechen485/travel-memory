import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'

import App from './App.vue'
import router from './router'
import './assets/main.css'

const app = createApp(App)

// 注册 Naive UI
app.use(naive)

app.use(createPinia())
app.use(router)

app.mount('#app')
