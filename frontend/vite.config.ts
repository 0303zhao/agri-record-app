import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from '@vant/auto-import-resolver'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // Vant 组件自动按需引入，无需手动 import
    Components({
      resolvers: [VantResolver()],
    }),
    // PWA 离线安装支持
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // 只缓存构建产物中的静态资源
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // 不缓存外部请求
        runtimeCaching: [],
      },
      manifest: {
        name: '农记',
        short_name: '农记',
        description: '农业数据记录 App，长期记录地块种植数据，方便多年对比分析',
        theme_color: '#2f8f46',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
  },
})
