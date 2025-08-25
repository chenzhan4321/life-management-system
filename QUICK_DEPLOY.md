# 🚀 快速部署指南 - 5分钟上线！

## 第一步：登录 GitHub（如果还没登录）

在终端运行：
```bash
gh auth login
```

选择：
1. GitHub.com
2. HTTPS
3. Login with a web browser
4. 复制验证码，在浏览器中粘贴

## 第二步：创建并推送到 GitHub

在项目目录运行以下命令：

```bash
# 创建 GitHub 仓库并推送（一条命令搞定）
gh repo create life-management-system --public \
  --description "AI生活管理系统 - Life Management System" \
  --source=. --remote=origin --push
```

如果上面的命令失败，可以分步执行：

```bash
# 1. 创建远程仓库
gh repo create life-management-system --public

# 2. 添加远程仓库
git remote add origin https://github.com/$(gh api user --jq .login)/life-management-system.git

# 3. 推送代码
git push -u origin main
```

## 第三步：部署到 Railway（最简单）

### 方法 A：通过 Railway 网站（推荐）

1. 打开 [railway.app](https://railway.app/)
2. 点击 "Start a New Project"
3. 选择 "Deploy from GitHub repo"
4. 授权 Railway 访问你的 GitHub
5. 选择 `life-management-system` 仓库
6. Railway 会自动检测项目并开始部署
7. 等待 2-3 分钟，部署完成！

### 方法 B：通过命令行

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 链接项目
railway link

# 部署
railway up

# 获取部署 URL
railway open
```

## 第四步：获取你的公网地址

部署成功后，Railway 会给你一个公网地址，格式如：
```
https://life-management-xxx.up.railway.app
```

## 🎉 完成！

现在你和任何人都可以通过这个地址访问你的生活管理系统了！

### 分享给朋友

把你的公网地址分享给朋友，他们就能：
- 在手机、平板、电脑上使用
- 创建自己的任务
- 使用 AI 智能管理

### 可选：配置 DeepSeek API

如果你想启用 AI 功能（不配置也能用，会使用模拟模式）：

1. 在 Railway 项目中点击 "Variables"
2. 添加环境变量：
   ```
   DEEPSEEK_API_KEY=你的API密钥
   ```
3. 重新部署

## 常见问题

### Q: 部署失败怎么办？
A: 检查 Railway 的日志，通常是端口配置问题。确保 `run.py` 使用了环境变量 PORT。

### Q: 数据会保存吗？
A: Railway 免费版的 SQLite 数据会保存，但建议定期备份。

### Q: 可以自定义域名吗？
A: 可以！在 Railway 项目设置中添加自定义域名。

### Q: 如何更新？
A: 
```bash
git add .
git commit -m "更新"
git push
# Railway 会自动重新部署
```

## 需要帮助？

- Railway 文档：[docs.railway.app](https://docs.railway.app/)
- 项目 Issues：在 GitHub 仓库提交 Issue

---

**提示**：整个部署过程通常只需要 5-10 分钟！