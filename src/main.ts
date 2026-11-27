import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { bootApiKey } from './composables/useApiKey'
import { bootTheme } from './composables/useTheme'
import './assets/main.css'

bootTheme()
bootApiKey()
createApp(App).use(router).mount('#app')
