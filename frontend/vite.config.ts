import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    // Naive UI 按需自动引入：模板里用到的 <n-xxx> 组件才打包，
    // 替代 main.ts 的 app.use(naive) 全量注册（dts 生成组件全局类型供 vue-tsc 校验）
    Components({
      resolvers: [NaiveUiResolver()],
      dts: 'src/components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // vendor 拆包：按“使用范围”把大型第三方库独立成可长期缓存的 chunk。
        // 关键原则：只显式命名“全站共用”或“确定单页独用”的库，其余交回
        // Vite 默认策略——绝不用 catch-all vendor，否则会把仅单页用的库
        // （如 wangEditor）与首屏依赖（axios）混进同一块，被迫提前到首屏下载。
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          // 仅统计页用：ECharts + 渲染引擎 zrender，随 Stats 路由按需加载
          if (id.includes('echarts') || id.includes('zrender')) return 'echarts'
          // 仅写日记页用：wangEditor 独立成块保持懒加载。
          // 必须放在 vue 判断之前——@wangeditor/editor-for-vue 路径含 'vue' 会被误判
          if (id.includes('@wangeditor')) return 'wangeditor'
          // 全站共用：naive-ui / 图标 / vue 运行时 → 可长期缓存块
          if (id.includes('naive-ui')) return 'naive-ui'
          if (id.includes('@vicons')) return 'vicons'
          if (id.includes('vue') || id.includes('pinia')) return 'vue-vendor'
          // 其余库交回 Vite 默认分块（按被哪些路由引用自动聚合）
          return undefined
        },
      },
    },
  },
  server: {
    proxy: {
      // 后端静态资源（上传图片）：浏览器请求前端 /uploads → 转发到后端 3000 端口
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
