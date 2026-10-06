import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// 单元测试配置：与主构建解耦，独立用 Vitest + happy-dom 跑纯逻辑（utils / pinia store）
// 组件级测试如需 DOM，环境已是 happy-dom，可直接引入 @vue/test-utils
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{ts,js}'],
  },
})
