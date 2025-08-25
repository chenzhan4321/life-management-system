# Railway 部署设置指南

## 获取 Railway Token

1. 访问 [Railway.app](https://railway.app/)
2. 登录你的账户
3. 进入账户设置 → API Tokens
4. 创建新的 API Token
5. 复制 token 值

## 在 GitHub 仓库中配置 Secret

1. 进入你的 GitHub 仓库: https://github.com/chenzhan4321/life-management-system
2. 点击 Settings 标签
3. 在左侧菜单点击 "Secrets and variables" → "Actions"
4. 点击 "New repository secret"
5. Name: `RAILWAY_TOKEN`
6. Secret: 粘贴你的 Railway API token
7. 点击 "Add secret"

## 验证部署

配置完成后，任何新的 push 到 main 分支都会自动触发 Railway 部署。

## 手动部署（alternative）

如果不想使用自动部署，也可以手动部署：

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 在项目目录中初始化
railway init

# 部署
railway up
```

## 部署后的功能

Railway 部署后你将获得：
- ✅ 完整的 FastAPI 后端
- ✅ SQLite 数据库支持
- ✅ AI 任务处理功能
- ✅ 数据同步和编辑
- ✅ 完整的任务管理系统

## 当前状态

- GitHub Pages: 静态版本（只读，显示历史数据）
- Railway: 完整后端版本（完整功能）

两个版本可以同时使用！