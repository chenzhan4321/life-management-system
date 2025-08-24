# 🚀 部署指南

本项目可以部署到多个云平台，让所有人都能使用你的生活管理系统。

## 部署选项对比

| 平台 | 免费额度 | 优点 | 缺点 |
|------|---------|------|------|
| **Railway** | $5/月 | 支持SQLite，一键部署 | 免费额度有限 |
| **Render** | 免费 | 完全免费 | 15分钟无访问会休眠 |
| **Vercel** | 免费 | 性能好，全球CDN | 需要改用PostgreSQL |
| **Heroku** | 免费(有限) | 稳定 | 免费版限制多 |

## 方法 1: Railway 部署（推荐）

Railway 支持 SQLite，最接近本地开发环境。

### 步骤：

1. **注册 Railway 账号**
   - 访问 [railway.app](https://railway.app/)
   - 使用 GitHub 账号登录

2. **创建新项目**
   ```bash
   # 安装 Railway CLI
   npm install -g @railway/cli
   
   # 登录
   railway login
   
   # 在项目目录初始化
   railway init
   
   # 部署
   railway up
   ```

3. **或通过 GitHub 部署**
   - 将代码推送到 GitHub
   - 在 Railway 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你的仓库
   - Railway 会自动检测并部署

4. **配置环境变量**
   - 在 Railway 项目设置中添加：
   ```
   DEEPSEEK_API_KEY=你的API密钥
   ```

## 方法 2: Render 部署（完全免费）

### 步骤：

1. **准备 GitHub 仓库**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/你的用户名/life-management.git
   git push -u origin main
   ```

2. **注册 Render**
   - 访问 [render.com](https://render.com/)
   - 使用 GitHub 登录

3. **创建 Web Service**
   - 点击 "New +"
   - 选择 "Web Service"
   - 连接你的 GitHub 仓库
   - 选择仓库和分支

4. **配置服务**
   - Name: `life-management`
   - Runtime: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `cd src && uvicorn api.main:app --host 0.0.0.0 --port $PORT`

5. **添加环境变量**
   - 添加 `DEEPSEEK_API_KEY`

## 方法 3: Vercel 部署

### 步骤：

1. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **部署**
   ```bash
   vercel
   ```

3. **配置环境变量**
   ```bash
   vercel env add DEEPSEEK_API_KEY
   ```

## 方法 4: 本地 Docker 部署

如果你想在自己的服务器上部署：

### 创建 Dockerfile：

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 构建和运行：

```bash
# 构建镜像
docker build -t life-management .

# 运行容器
docker run -d -p 8000:8000 \
  -e DEEPSEEK_API_KEY=你的密钥 \
  -v $(pwd)/data:/app/data \
  life-management
```

## 快速开始（GitHub Pages + Netlify Functions）

如果你只想要一个静态前端 + 无服务器后端：

1. **前端部署到 GitHub Pages**
   - 在仓库设置中启用 GitHub Pages
   - 选择 `main` 分支，`/docs` 文件夹

2. **后端部署到 Netlify Functions**
   - 需要将 FastAPI 改写为 Netlify Functions
   - 在 Netlify 中连接 GitHub 仓库

## 部署后配置

### 1. 自定义域名
大多数平台都支持自定义域名：
- Railway: 项目设置 → Domains
- Render: Settings → Custom Domains
- Vercel: Project Settings → Domains

### 2. 数据库备份
建议定期备份数据：
```bash
# SQLite 备份
sqlite3 life_management.db ".backup backup.db"

# PostgreSQL 备份
pg_dump DATABASE_URL > backup.sql
```

### 3. 监控和日志
- Railway: 内置日志查看器
- Render: Dashboard → Logs
- Vercel: Functions → Logs

## 环境变量说明

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | 否（可用模拟模式）|
| `DATABASE_URL` | 数据库连接字符串 | 否（默认SQLite）|
| `PORT` | 服务端口 | 自动设置 |

## 常见问题

### Q: 如何获取 DeepSeek API Key？
A: 访问 [DeepSeek Platform](https://platform.deepseek.com/) 注册并获取 API Key。

### Q: 免费版够用吗？
A: 
- 个人使用完全够用
- Railway 的 $5 额度可以运行整月
- Render 免费版会休眠，但个人使用影响不大

### Q: 数据会丢失吗？
A: 
- Railway/Render 的付费版数据持久化
- 免费版建议定期备份
- 可以使用外部数据库服务（如 Supabase）

### Q: 如何更新部署的版本？
A: 
```bash
git add .
git commit -m "Update"
git push

# 平台会自动重新部署
```

## 推荐部署方案

### 个人使用
- **Railway** + SQLite
- 简单快速，最接近本地体验

### 团队使用
- **Render** + PostgreSQL
- 免费，支持多用户

### 高性能需求
- **Vercel** + Supabase
- 全球 CDN，响应快速

## 需要帮助？

- 提交 Issue: [GitHub Issues](https://github.com/你的用户名/life-management/issues)
- 查看文档: [项目 Wiki](https://github.com/你的用户名/life-management/wiki)

---

祝你部署顺利！🎉