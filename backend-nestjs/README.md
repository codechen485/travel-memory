# 行囊 · 后端

NestJS 12 + Prisma 6 + PostgreSQL 16 的 RESTful 服务。项目总览、技术栈、效果展示见仓库根 **[README.md](../README.md)**，本文只列后端专属信息，避免重复。

## 开发（端口 3000）
```bash
docker-compose up -d      # 起 PostgreSQL（Redis 可选）
cp .env.example .env      # 首次：按需填 JWT_SECRET / DEEPSEEK_API_KEY
npx prisma db push        # 同步表结构
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
| `npm run lint` | oxlint 静态检查 |

## 说明
- **DeepSeek Key 可选**：未配置时文案生成接口优雅降级返回 503，其余功能不受影响。
- **Redis 可选**：`/api/stats`(60s) 与 `/api/copywritings/public`(30s) 结果缓存；不启动 Redis 则自动直查数据库。

## 相关文档
[根 README](../README.md) · [技术选用说明](../docs/技术选用说明.md) · [API 测试指南](./API_TEST_GUIDE.md)
