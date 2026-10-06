# API 测试指南

> 《行囊》后端（NestJS + Prisma + PostgreSQL）全部接口一览与测试示例。Base URL：`http://localhost:3000`。

## 启动服务

```powershell
# 1) 起数据库（Redis 可选）
docker-compose up -d

# 2) 同步表结构
npx prisma db push

# 3) 启动后端
npm run start:dev
```

## 统一响应格式

所有接口返回同一信封（`AllExceptionsFilter` + `ApiResponse`）：
```json
{ "code": 200, "message": "操作成功", "data": { } }
```
出错时 `code` 为对应 HTTP 状态码（400/401/404/409/503…），`message` 为中文提示，`data` 为 `null`。

## 认证说明

- 除 `GET /api/health` 和 `POST /api/auth/*` 外，**所有接口都需要 JWT**。
- 用法：登录/注册拿到 `token` 后，请求头带 `Authorization: Bearer <token>`。
- Token 默认 24h 过期（`.env` 的 `JWT_EXPIRES_IN`）。

> 💡 下面示例用 bash/curl 风格（Git Bash、WSL 可直接跑）。用 PowerShell 的 `Invoke-RestMethod` 时，含中文的 Body 建议用 UTF-8 字节体：`-Body ([Text.Encoding]::UTF8.GetBytes($json))`，否则中文会乱码。

---

## 0. 健康检查（无需认证）

```bash
curl http://localhost:3000/api/health
# → {"code":200,"message":"服务运行正常","data":null}
```

---

## 1. 用户认证

### 注册 `POST /api/auth/register`
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```
- 校验：username 3–50、email 合法格式、password 6–100
- 成功 `201`：`data` 含 `token / userId / username / email / avatar`
- 用户名已存在 / 邮箱已注册 → `409`

### 登录 `POST /api/auth/login`
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```
- 成功 `200`：`data` 含 `token`；用户名或密码错误 → `401`

拿到 token 后：`TOKEN=<上面的 token>`，后续都用 `-H "Authorization: Bearer $TOKEN"`。

---

## 2. 旅程管理（需 JWT）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/journeys` | 创建旅程（title/destinations/startDate/endDate，可选 coverImage/tags）|
| GET | `/api/journeys` | 我的旅程列表（倒序，含 `_count`）|
| GET | `/api/journeys/:id` | 旅程详情（含日记 + 照片，按日期倒序）|
| GET | `/api/journeys/:id/journal` | 生成电子手帐 HTML |
| PUT | `/api/journeys/:id` | 更新（字段可选）|
| POST | `/api/journeys/:id/archive` | 封存（封存后不可编辑，重复封存 409）|
| DELETE | `/api/journeys/:id` | 删除（级联删日记，照片解除引用）|

```bash
# 创建
curl -X POST http://localhost:3000/api/journeys \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"杭州之旅","destinations":["杭州","西湖"],"startDate":"2026-09-01","endDate":"2026-09-03"}'

# 列表 / 详情
curl http://localhost:3000/api/journeys           -H "Authorization: Bearer $TOKEN"
curl http://localhost:3000/api/journeys/1         -H "Authorization: Bearer $TOKEN"
```
- 结束日期早于开始日期 → `400`；访问他人/不存在旅程 → `404`；已封存再编辑 → `409`

---

## 3. 日记（需 JWT）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/diaries` | 创建（journeyId/date/title/content，可选 mood/locationName）|
| GET | `/api/diaries/:id` | 详情（含照片）|
| PUT | `/api/diaries/:id` | 更新 |
| DELETE | `/api/diaries/:id` | 删除（关联照片 diaryId 置空）|

- `mood` 为自由字符串（≤20，预设 key 或自定义均可）
- 目标旅程不存在 404；旅程已封存 409；非本人 404

---

## 4. 照片（需 JWT）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/photos/upload` | 上传照片（multipart：`file` + `journeyId` + 可选 `diaryId`）|
| POST | `/api/photos/upload-image` | 通用图片上传（multipart：`file` → 只返回 `{url}`，不建 Photo 记录）|
| GET | `/api/photos/:id` | 照片详情 |
| DELETE | `/api/photos/:id` | 删除（DB 记录 + 磁盘文件）|

```bash
# 上传照片（单张 ≤10MB、仅图片）
curl -X POST http://localhost:3000/api/photos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/photo.jpg" -F "journeyId=1" -F "diaryId=1"
```
- 后端用 sharp 生成 480px 缩略图、读取宽高，并尝试提取 EXIF GPS（无 EXIF 静默跳过）
- 返回的 `/uploads/xxx.jpg` 为相对路径，静态托管于后端；上传到不存在旅程 404、未传文件 400

---

## 5. AI 文案（需 JWT）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/copywritings/generate` | AI 生成三版本（不落库；可传 journeyId + photoId/photoUrl + 可选 mood）|
| POST | `/api/copywritings` | 保存文案（三版本 + finalVersion，可选 isPublic）|
| GET | `/api/copywritings/my` | 我的文案（可按 journeyId/mood 筛选）|
| GET | `/api/copywritings/:id` | 详情（含照片 + 旅程，归属校验）|
| PUT | `/api/copywritings/:id` | 更新（finalVersion/isPublic/sceneTag/mood）|
| DELETE | `/api/copywritings/:id` | 删除 |

```bash
# 生成（deepseek-flash 会读照片自行识别场景）
curl -X POST http://localhost:3000/api/copywritings/generate \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"journeyId":1,"photoId":1,"mood":"peaceful"}'
```
- 未配 `DEEPSEEK_API_KEY` 或 AI 异常 → `503`；旅程/照片归属不符 → `404`

---

## 6. 灵感漂流（需 JWT）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/copywritings/public` | 公开文案分页列表（`page`/`pageSize` 1–50，按点赞+时间排序，匿名不返回作者）|
| POST | `/api/copywritings/:id/like` | 点赞（likesCount+1，仅公开可赞）|
| POST | `/api/copywritings/:id/collect` | 收藏（upsert 幂等，重复收藏不报错）|
| GET | `/api/copywritings/collected` | 我的收藏列表（按收藏时间倒序）|

```bash
curl "http://localhost:3000/api/copywritings/public?page=1&pageSize=12" \
  -H "Authorization: Bearer $TOKEN"
curl -X POST http://localhost:3000/api/copywritings/1/collect \
  -H "Authorization: Bearer $TOKEN"
```

---

## 7. 旅行统计（需 JWT）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/stats` | 总览 + 城市足迹 + 心情分布 + 最常用心情 + 每月旅程数（一次聚合返回）|

```bash
curl http://localhost:3000/api/stats -H "Authorization: Bearer $TOKEN"
```

---

## 8. 个人中心（需 JWT）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/users/profile` | 资料安全字段（不含密码）+ 旅程/文案/收藏计数 |
| PUT | `/api/users/profile` | 更新 nickname(≤50)/bio(≤200)/avatar，空字符串视为清空 |

```bash
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"nickname":"小明","bio":"爱旅行的开发者"}'
```

---

## 使用 Postman

1. 先 `POST /api/auth/register` 或 `/login`，从响应 `data.token` 取值。
2. 在集合变量里存 `{{token}}`，请求头统一加 `Authorization: Bearer {{token}}`。
3. 上传类接口用 `form-data`（key 填 `file`，选 File 类型）。

---

## 注意事项

1. **JWT 有效期** 24h（`.env` 配 `JWT_EXPIRES_IN`）。
2. **密码加密** BCrypt。
3. **CORS** 开发放行所有来源；生产建议在后端 `main.ts` 收紧为具体前端域名（见部署指南）。
4. **公开接口** 仅 `/api/health`、`/api/auth/*` 免鉴权，其余必须带 token。
5. **数据库同步** `npx prisma db push`。
6. **接口自测**：服务层单元测试 `npm test`（Vitest，39 例，覆盖认证/旅程/统计/AI解析/文案业务规则）。
