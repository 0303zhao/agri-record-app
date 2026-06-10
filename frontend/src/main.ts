import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 引入 Vant 样式（组件通过 unplugin-vue-components 自动按需引入）
import 'vant/lib/index.css'

// 引入全局样式
import './assets/global.css'

const app = createApp(App)
app.use(router)
app.mount('#app')
