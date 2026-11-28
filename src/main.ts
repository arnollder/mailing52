import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { bootTheme } from './composables/useTheme'
import './assets/main.css'

bootTheme()
createApp(App).use(router).mount('#app')
