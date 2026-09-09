# API 测试指南

## 启动服务

### 1. 启动数据库和 Redis
```bash
docker-compose up -d
```

### 2. 同步数据库结构
```bash
npx prisma db push
```

### 3. 启动后端应用
```bash
npm run start:dev
```

---

## API 接口测试

### 健康检查
**请求:**
```bash
curl http://localhost:3000/api/health
```

**响应:**
```json
{
  "code": 200,
  "message": "服务运行正常",
  "data": null
}
```

---

### 用户注册
**请求:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**成功响应 (201):**
```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": 1,
    "username": "testuser",
    "email": "test@example.com",
    "avatar": null
  }
}
```

**失败响应 (409) - 用户名已存在:**
```json
{
  "code": 409,
  "message": "用户名已存在",
  "data": null
}
```

**失败响应 (409) - 邮箱已被注册:**
```json
{
  "code": 409,
  "message": "邮箱已被注册",
  "data": null
}
```

---

### 用户登录
**请求:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

**成功响应 (200):**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": 1,
    "username": "testuser",
    "email": "test@example.com",
    "avatar": null
  }
}
```

**失败响应 (401) - 密码错误:**
```json
{
  "code": 401,
  "message": "用户名或密码错误",
  "data": null
}
```

---

## 参数验证规则

### 注册接口
- **username**: 必填，长度 3-50 个字符
- **email**: 必填，必须是有效的邮箱格式
- **password**: 必填，长度 6-100 个字符

### 登录接口
- **username**: 必填
- **password**: 必填

---

## 使用 Postman 测试

1. 导入以下集合到 Postman
2. 先调用注册接口创建用户
3. 再调用登录接口获取 token
4. 后续其他接口需要在 Header 中添加: `Authorization: Bearer {token}`

---

## 注意事项

1. **JWT Token 有效期**: 24 小时（可在 .env 中配置 `JWT_EXPIRES_IN`）
2. **密码加密**: 使用 BCrypt 加密存储
3. **跨域配置**: 已配置 CORS，允许所有来源访问
4. **安全配置**: `/api/auth/**` 路径无需认证，其他路径需要 JWT token
5. **数据库同步**: 使用 `npx prisma db push` 同步表结构

---

## 下一步开发

完成用户认证后，可以继续开发：
1. 旅程管理模块 (Journey CRUD)
2. 日记功能 (Diary CRUD)
3. 照片上传功能
4. AI 文案生成功能
