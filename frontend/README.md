# 行囊 · 前端

Vue 3 + TypeScript + Vite 8 + Naive UI 单页应用。项目总览、功能清单、技术栈、快速开始与效果展示见仓库根 **[README.md](../README.md)**，本文只保留前端专属信息，避免重复。

## 开发（端口 5173）
```bash
npm install
npm run dev          # http://localhost:5173（端口占用时 Vite 自动 +1）
```
- 接口地址由 `.env.development` 的 `VITE_API_BASE_URL` 决定（默认 `http://localhost:3000/api`）。
- 上传的 `/uploads` 图片由 `vite.config.ts` 的 `server.proxy` 转发到后端 3000；改这两处配置后需重启 dev server。
- 需先启动后端（见 [`../backend-nestjs/README.md`](../backend-nestjs/README.md)）。

## 目录速览
```
src/
├── api/          接口层：request(axios 封装) / auth / journey / diary / photo / copywriting / stats / user / upload
├── views/        页面：Home / JourneyList / JourneyDetail / DiaryEditor / CopywritingGenerate /
│                 CopywritingList / Inspiration / Stats / Profile / Login / Register
├── components/   AppNavbar / JourneyFormModal / JourneyJournal(手帐) / MoodPicker / PhotoUploader / RichTextEditor
├── stores/       user.ts（Pinia，含单测）
├── router/       index.ts（路由 + 守卫）
├── utils/        format / mood / scene / china-places（纯函数，含 .test.ts 单测）
├── config/hero.ts 首页轮播配置
└── assets/main.css 全局样式与主题变量（苔藓绿 #5b8c5a）
```

## 命令
| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发服务器 |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run preview` | 预览构建产物 |
| `npm run type-check` | vue-tsc 类型检查 |
| `npm test` | 单元测试（Vitest） |
| `npm run format` | Prettier 格式化 |

## 相关文档
[根 README](../README.md) · [技术选用说明](../docs/技术选用说明.md) · [后端 API 测试指南](../backend-nestjs/API_TEST_GUIDE.md)
