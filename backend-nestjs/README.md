# 行囊 · 后端

NestJS 12 + Prisma 6 + PostgreSQL 16 的 RESTful 服务。项目总览、技术栈、效果展示见仓库根 **[README.md](../README.md)**，本文只列后端专属信息，避免重复。

## 开发（端口 3000）
```bash
docker-compose up -d      # 起 PostgreSQL（Redis 可选）
cp .env.example .env      # 首次：替换 JWT_SECRET 为随机至少 32 字符密钥；DeepSeek Key 可选
npx prisma migrate deploy # 应用已提交的数据库迁移
npm install
npm run start:dev         # 热重载启动
```
健康检查：http://localhost:3000/api/health

## 模块
`auth`(JWT 鉴权) · `journey` · `diary` · `photo`(sharp 缩略图 / exifr 提取 EXIF) · `copywriting` + `deepseek`(多模态文案生成) · `stats` · `user` · `cache`(ioredis 优雅降级) · `health` · `prisma` · `common`(统一响应 & 全局异常过滤)

## 命令
| 命令 | 说明 |
| --- | --- |
| `npm run start:dev` | 开发（热重载） |
| `npm run build` / `start:prod` | 生产构建 / 运行 dist |
| `npm test` | 服务层单元测试（Vitest） |
| `npm run test:e2e` | 端到端测试（需设置独立 `TEST_DATABASE_URL`） |
| `npm run lint` | oxlint 静态检查 |

## 说明
- **DeepSeek Key 可选**：未配置时文案生成接口优雅降级返回 503，其余功能不受影响。
- **Redis 可选**：`/api/stats`(60s) 与 `/api/copywritings/public`(30s) 结果缓存；不启动 Redis 则自动直查数据库。
- **JWT_SECRET 必填**：至少 32 个字符；缺失、过短或使用旧默认值时后端拒绝启动。
- **图片访问**：不再公开静态暴露 `uploads/`；API 返回 15 分钟有效的签名图片 URL。配置 `UPLOAD_DIR` 并挂载持久化磁盘，生产环境允许的前端域名通过 `FRONTEND_ORIGIN` 配置。
- **上传处理**：限制 10MB、只接收 JPEG/PNG/WebP/GIF，经 Sharp 验证、旋转并重新编码成 JPEG，去掉图片内嵌 EXIF/GPS。
- **迁移**：全新数据库使用 `npx prisma migrate deploy`。已有通过 `db push` 建立的数据库先按 Prisma baseline 流程记录当前 schema，再部署迁移；不要直接对已有表运行初始迁移。

## 相关文档
[根 README](../README.md) · [技术选用说明](../docs/技术选用说明.md) · [API 测试指南](./API_TEST_GUIDE.md)
