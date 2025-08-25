# 🚀 Railway 后端部署完整指南

## 📋 部署前检查

### ✅ 项目已准备就绪！
- **后端架构**: FastAPI + SQLAlchemy + AI集成
- **配置文件**: `railway.json` ✅
- **依赖文件**: `requirements-railway.txt` ✅ (轻量化版本)
- **项目ID**: `07b68028-eece-48f3-b9c8-abb0371f384a`

### 📦 支持的功能
- ✅ **任务管理** - CRUD操作
- ✅ **AI智能处理** - DeepSeek API集成  
- ✅ **时间调度** - 智能排程
- ✅ **数据分析** - 生产力统计
- ✅ **用户认证** - JWT认证

## 🔧 部署步骤

### 1. Railway登录和初始化
```bash
# 1. 登录Railway账户
railway login

# 2. 切换到项目目录
cd /Users/zhanchen/Library/CloudStorage/GoogleDrive-chenzhan4321@gmail.com/My\ Drive/Projects/life_management

# 3. 确认项目配置
railway status
```

### 2. 环境变量配置
在Railway控制台设置以下环境变量：

```bash
# 必需的环境变量
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DATABASE_URL=postgresql://...  # Railway自动提供
PRODUCTION=true

# 可选的环境变量
JWT_SECRET_KEY=your_jwt_secret_here
CORS_ORIGINS=https://chenzhan4321.github.io,https://your-custom-domain.com
```

### 3. 数据库设置
Railway会自动提供PostgreSQL数据库，但你也可以手动配置：

```bash
# 添加PostgreSQL服务（如果需要）
railway add postgresql

# 查看数据库连接信息
railway variables
```

### 4. 部署应用
```bash
# 部署当前代码到Railway
railway up

# 或者设置GitHub自动部署
railway connect  # 连接到GitHub仓库
```

### 5. 验证部署
```bash
# 查看部署状态
railway status

# 查看日志
railway logs

# 获取应用URL
railway domain
```

## 🔗 部署后配置

### 1. 获取后端URL
部署成功后，Railway会提供一个URL，类似：
```
https://life-management-system-production.up.railway.app
```

### 2. 更新前端API配置
需要更新前端的API配置来连接后端：

**GitHub Pages版本** (`docs/app.js`):
```javascript
// 检测API环境
const API_BASE = window.location.hostname === 'chenzhan4321.github.io' 
    ? 'https://your-railway-app.up.railway.app/api'  // 生产环境
    : 'http://127.0.0.1:8000/api';  // 开发环境
```

**本地版本** (`src/frontend/static/app.js`):
```javascript
// 保持不变，继续使用本地API
const API_BASE = 'http://127.0.0.1:8000/api';
```

## ⚡ 自动部署设置 (推荐)

### GitHub集成
1. 在Railway控制台中连接GitHub仓库
2. 设置自动部署分支（main）
3. 每次push到main分支时自动部署

### 配置Webhook
```bash
# 设置GitHub webhook自动部署
railway connect --repo chenzhan4321/life-management-system
```

## 🛠️ 故障排除

### 常见问题

**1. 构建失败 - 依赖问题**
```bash
# 检查requirements-railway.txt是否正确
pip install -r requirements-railway.txt
```

**2. 数据库连接失败**
```bash
# 确认DATABASE_URL环境变量
railway variables | grep DATABASE_URL
```

**3. CORS错误**
```bash
# 确认CORS_ORIGINS包含前端域名
railway variables set CORS_ORIGINS=https://chenzhan4321.github.io
```

### 日志调试
```bash
# 查看实时日志
railway logs --follow

# 查看特定时间的日志
railway logs --since 1h
```

## 📊 预期结果

### 部署成功后：
- ✅ **API服务**: `https://your-app.up.railway.app/api`
- ✅ **健康检查**: `https://your-app.up.railway.app/health`
- ✅ **API文档**: `https://your-app.up.railway.app/docs`
- ✅ **数据库**: PostgreSQL自动配置
- ✅ **HTTPS**: 自动SSL证书

### 架构图
```
GitHub Pages (前端)
       ↓
   HTTPS API
       ↓
Railway (后端FastAPI)
       ↓
PostgreSQL (数据库)
       ↓
DeepSeek API (AI服务)
```

## 🎯 下一步

1. **完成Railway部署**
2. **更新前端API配置**  
3. **测试完整功能**
4. **设置域名映射**（可选）
5. **配置监控和日志**

---

*这个指南基于你现有的完整配置创建，所有必要文件都已准备就绪！*