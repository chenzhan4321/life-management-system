# 🚀 生活管理系统 v4.0 部署指南

## 📋 部署架构

```
前端 (GitHub Pages) ←→ 后端 (Vercel)
```

- **前端**: 静态文件托管在 GitHub Pages
- **后端**: FastAPI 应用部署到 Vercel
- **数据**: 内存存储（重启后重置）

## 🔧 部署步骤

### 1. 后端部署到 Vercel

#### 方法一：通过 Vercel CLI (推荐)
```bash
# 安装 Vercel CLI
npm install -g vercel

# 在项目根目录运行
vercel

# 按照提示操作：
# - Set up "~/path/to/life_management"? [Y/n] y
# - Which scope should contain your project? (选择账户)
# - What's your project's name? life-management-api-v4
# - In which directory is your code located? ./
# - Want to override the settings? [y/N] n

# 部署完成后，记录返回的 URL（例如：https://life-management-api-v4.vercel.app）
```

#### 方法二：通过 Vercel Dashboard
1. 访问 [vercel.com](https://vercel.com) 并登录
2. 点击 "New Project"
3. 导入 GitHub 仓库 `chenzhan4321/life-management-system`
4. 配置设置：
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: 留空
   - **Output Directory**: 留空
   - **Install Command**: `pip install -r requirements.txt`
5. 点击 "Deploy"

### 2. 更新前端 API 配置

部署后端完成后，需要更新前端的 API 配置：

```bash
# 编辑 js/modules/api.js 文件
# 将第13行的 URL 替换为你的 Vercel 部署地址
# return 'https://your-vercel-app.vercel.app';
# 改为：
# return 'https://life-management-api-v4.vercel.app';  # 替换为你的实际URL
```

### 3. 前端自动部署

前端会通过 GitHub Actions 自动部署到 GitHub Pages：

1. 推送代码到 `main` 分支会触发自动部署
2. 访问 GitHub 仓库的 Actions 标签查看部署状态
3. 部署完成后，前端可通过以下地址访问：
   `https://chenzhan4321.github.io/life-management-system/`

### 4. 配置 GitHub Pages

确保 GitHub Pages 已启用：

1. 访问仓库设置: `Settings > Pages`
2. 选择 Source: `GitHub Actions`
3. 等待部署完成

## 🔗 访问地址

部署完成后的访问地址：

- **前端**: https://chenzhan4321.github.io/life-management-system/
- **后端**: https://life-management-api-v4.vercel.app (替换为你的实际URL)
- **健康检查**: https://life-management-api-v4.vercel.app/health

## ⚙️ 环境变量配置

### Vercel 环境变量 (可选)

如果需要配置环境变量，在 Vercel Dashboard 中：

1. 进入项目 Settings
2. 选择 Environment Variables
3. 添加以下变量：
   ```
   ENVIRONMENT=production
   PYTHON_VERSION=3.9
   ```

## 🐛 故障排除

### 常见问题

1. **后端 502 错误**
   - 检查 `api/index.py` 文件语法
   - 查看 Vercel 函数日志
   - 确认 `requirements.txt` 依赖正确

2. **前端无法连接后端**
   - 检查 API 配置 URL 是否正确
   - 确认 CORS 设置允许前端域名
   - 查看浏览器控制台错误

3. **PWA 功能异常**
   - 确保使用 HTTPS 访问
   - 检查 Service Worker 是否注册成功
   - 清除浏览器缓存重试

### 调试工具

- **后端日志**: Vercel Dashboard > Functions > View Function Logs
- **前端调试**: 浏览器开发者工具 > Console
- **网络请求**: 开发者工具 > Network 标签

## 📱 PWA 安装

部署完成后，用户可以：

1. 在浏览器中访问应用
2. 查看地址栏的安装提示
3. 点击安装按钮添加到主屏幕
4. 享受类原生应用体验

## 🔄 更新部署

### 更新后端
```bash
# 修改代码后
vercel --prod
```

### 更新前端
```bash
# 推送到 main 分支即可自动部署
git push origin main
```

## 📊 监控和维护

### 性能监控
- Vercel Analytics: 自动启用
- GitHub Pages: 通过 Actions 监控

### 日志查看
- Vercel: Dashboard > Functions > Logs
- GitHub: Actions > 部署日志

---

🎉 **部署完成！** 

现在你有了一个完全现代化的生活管理系统，支持：
- 🤖 AI 智能任务处理
- 📱 PWA 离线功能
- 🎨 双主题切换
- 📊 时间域统计
- ⚡ 快速响应