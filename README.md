# 生活管理系统 v3.5

基于 AI 的智能任务管理和时间优化系统，采用前后端分离架构。

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🏗️ 项目结构（重构后）

```
life_management/
├── frontend/          # 前端静态文件（可部署到 GitHub Pages）
│   ├── index.html    # 主页面
│   ├── css/          # 样式文件
│   ├── js/           # JavaScript文件
│   └── assets/       # 静态资源
│
├── backend/          # Python FastAPI 后端（可部署到 Vercel）
│   ├── main.py       # FastAPI主入口
│   ├── api/          # API路由
│   ├── core/         # 核心业务逻辑
│   ├── ai/           # AI相关功能
│   └── utils/        # 工具函数
│
└── scripts/          # 部署和运行脚本
    ├── run-local.sh           # 本地运行
    ├── deploy-github-pages.sh # 部署前端到GitHub Pages
    └── deploy-vercel.sh       # 部署后端到Vercel
```

## ✨ 功能特性

### 核心功能
- **AI 智能任务处理**：自动分类任务、预测时间、安排时间槽
- **四象限任务管理**：学术、收入、成长、生活四个时间域
- **拖拽式界面**：任务可在不同区域间自由拖动
- **实时计时器**：任务计时和提醒功能
- **深浅主题切换**：支持浅色和深色主题
- **PWA 支持**：可安装为桌面应用

### Palantir 架构特性
- **本体层 (Ontology)**: 生活对象的结构化建模
  - 任务对象 (Tasks) - 优先级、时长、领域分类
  - 时间块对象 (Time Blocks) - 四域时间管理理论
  - 项目对象 (Projects) - 目标导向的任务组织
  - 人员对象 (Persons) - 关系网络管理

- **管道层 (Pipeline)**: 智能数据处理流水线
  - 自动数据收集
  - 智能数据分类和标准化
  - 实时处理和状态更新
  - AI 驱动的洞察生成

## 🚀 快速开始

### 本地运行

1. **安装依赖**：
```bash
pip install -r backend/requirements.txt
```

2. **运行服务**：
```bash
./scripts/run-local.sh
```

3. **访问应用**：
- 前端：http://localhost:8080
- 后端API：http://localhost:8000
- API文档：http://localhost:8000/docs

## 📦 部署指南

### 方案一：GitHub Pages + Vercel（推荐）

#### 部署前端到 GitHub Pages

1. Fork 或 Clone 本仓库
2. 在 GitHub 仓库设置中启用 Pages
3. 运行部署脚本：
```bash
./scripts/deploy-github-pages.sh
```
4. 选择 `gh-pages` 分支作为源
5. 访问：`https://[your-username].github.io/[repo-name]/`

#### 部署后端到 Vercel

1. 安装 Vercel CLI：
```bash
npm i -g vercel
```

2. 运行部署脚本：
```bash
./scripts/deploy-vercel.sh
```

3. 更新前端配置：
编辑 `frontend/js/config.js`，将 Vercel 后端地址替换为你的实际地址：
```javascript
// GitHub Pages 部署时，更新这里的后端地址
if (hostname.includes('github.io')) {
    return 'https://your-backend.vercel.app';
}
```

### 方案二：使用 GitHub Actions 自动部署

项目已配置 GitHub Actions，推送代码时会自动部署：
- 前端自动部署到 GitHub Pages
- 配置 Vercel 的 GitHub 集成后，后端也会自动部署

## 🔧 配置说明

### 前端配置

编辑 `frontend/js/config.js` 配置后端API地址：

```javascript
const API_CONFIG = {
    baseURL: (() => {
        // 本地开发
        if (hostname === 'localhost') {
            return 'http://localhost:8000';
        }
        // GitHub Pages 部署
        if (hostname.includes('github.io')) {
            return 'https://your-backend.vercel.app';
        }
        return '';
    })()
};
```

### 后端环境变量

创建 `.env` 文件（不要提交到Git）：

```env
# API配置
API_KEY=your-api-key
PRODUCTION=true

# 数据库配置
DATABASE_URL=sqlite:///./data/tasks.db

# AI配置（如果使用）
DEEPSEEK_API_KEY=your-deepseek-api-key
```

## 🛠️ 技术栈

- **前端**：
  - 原生 JavaScript (ES6+)
  - CSS3 + 响应式设计
  - PWA (Progressive Web App)
  
- **后端**：
  - Python 3.9+
  - FastAPI
  - SQLAlchemy
  - Pydantic
  
- **AI集成**：
  - DeepSeek API
  - 智能任务分类和时间预测
  
- **部署**：
  - GitHub Pages（前端）
  - Vercel（后端）
  - GitHub Actions（CI/CD）

## 📚 API文档

后端API文档可通过以下地址访问：
- 本地：http://localhost:8000/docs
- 生产：https://your-backend.vercel.app/docs

主要端点：
- `POST /api/tasks/ai-process` - AI智能处理任务
- `GET /api/tasks` - 获取任务列表
- `PATCH /api/tasks/{id}` - 更新任务
- `DELETE /api/tasks/{id}` - 删除任务

## 🔄 更新日志

查看 [claude_changelog.md](./claude_changelog.md) 了解详细更新历史。

最新版本 v3.5 更新：
- ✅ 前后端完全分离
- ✅ 支持 GitHub Pages + Vercel 部署
- ✅ 清理项目结构，移除冗余文件
- ✅ 优化部署流程和脚本

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- Palantir 的数据架构理念
- FastAPI 框架
- DeepSeek AI
- 所有贡献者