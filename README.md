# 生活管理系统 v4.0 🎯

智能生活管理系统，AI驱动的任务规划和时间管理工具。

## ✨ 特性

- 🤖 **AI智能任务处理** - 自动分类和时间预估
- 📊 **时间域管理** - 学术、收入、成长、生活四大领域
- 🎨 **双主题模式** - 浅色/深色主题切换
- 📱 **响应式设计** - 完美适配桌面和移动端
- 💾 **离线支持** - PWA技术，支持离线使用
- ⚡ **现代架构** - 模块化JavaScript，清晰的代码结构

## 🚀 部署

### 前端部署 (GitHub Pages)

前端自动部署到 GitHub Pages。每次推送到 `main` 分支时会自动触发部署。

### 后端部署 (Vercel)

后端使用 FastAPI 构建，部署到 Vercel。

1. 确保 `api/index.py` 和 `requirements.txt` 存在
2. 将项目连接到 Vercel
3. 使用 `vercel.json` 配置文件进行部署

## 🛠️ 技术栈

- **前端**: Vanilla JavaScript (ES6+), CSS3, PWA
- **后端**: FastAPI, Python 3.9+
- **部署**: GitHub Pages + Vercel
- **样式**: CSS Variables, 响应式设计

## 📁 项目结构

```
life_management/
├── api/                    # 后端API
│   └── index.py           # FastAPI应用
├── js/                    # 前端JavaScript
│   ├── app.js            # 主应用文件
│   └── modules/          # 功能模块
│       ├── api.js
│       ├── theme-manager.js
│       ├── notification-manager.js
│       ├── task-processor.js
│       └── task-manager.js
├── styles/               # 样式文件
│   ├── theme-default.css # 浅色主题
│   ├── theme-dark.css   # 深色主题
│   └── mobile.css       # 移动端适配
├── static/              # 静态资源
├── .github/workflows/   # GitHub Actions
├── index.html          # 主页面
├── manifest.json       # PWA配置
├── sw.js              # Service Worker
├── vercel.json        # Vercel配置
└── requirements.txt   # Python依赖
```

## 🎯 使用方法

1. **AI任务处理**: 在顶部输入框中描述任务，AI会自动分类和预估时间
2. **快速添加**: 使用快速添加区域手动创建任务
3. **时间域管理**: 查看四大生活领域的时间分配
4. **主题切换**: 点击右上角切换浅色/深色主题

## 🔧 开发

### 本地开发

1. 克隆项目
2. 启动后端: `uvicorn api.index:app --reload`
3. 使用 HTTP 服务器打开前端文件

### 代码结构

- 采用模块化架构，每个功能模块独立
- 使用 ES6+ 语法和现代 JavaScript 特性
- CSS 使用变量系统，支持主题切换
- 响应式设计，适配所有设备尺寸

## 📝 更新日志

### v4.0.0 (2025-01-XX)
- 🔥 **完全重构** - 全新的模块化架构
- 🛡️ **安全加强** - 移除硬编码API密钥
- 🎨 **UI现代化** - 简化为双主题模式
- ⚡ **性能优化** - 改善加载速度和响应性
- 📱 **移动端优化** - 更好的触摸体验

## 📄 许可证

MIT License

---

**生活管理系统 v4.0** - 让生活更有序，让时间更高效 🚀

**让数据驱动你的生活，让 AI 优化你的时间！**

*Built with ❤️ for macOS users who value efficiency and intelligence in life management.*
