# 🎯 生活管理系统 - 基于 Palantir 架构理念

一个基于企业级数据架构的个人生活管理系统，集成 DeepSeek AI 实现智能任务管理。

## ✨ 核心功能

### 🤖 AI 智能功能
- **自动任务分类**：AI 自动将任务分配到合适的时间域
- **时间预测**：基于历史数据智能预测任务所需时间
- **智能调度**：自动寻找最佳空闲时间槽安排任务
- **持续学习**：每日更新本体论，不断优化分类和预测准确度

### ⏰ 4x4 时间管理模型
- **学术域**（4小时）：论文、研究、学习
- **收入域**（4小时）：工作、项目、挣钱活动
- **成长域**（4小时）：健身、技能提升、个人发展
- **生活域**（4小时）：家务、社交、日常琐事
- **睡眠**（8小时）：保证充足休息

## 🚀 快速开始

### 1. 一键安装
```bash
# 克隆或下载项目后，运行安装脚本
./setup.sh
```

### 2. 配置 API Key
编辑 `.env` 文件，添加您的 DeepSeek API Key：
```env
DEEPSEEK_API_KEY=your_api_key_here
```

获取 API Key：[https://platform.deepseek.com/](https://platform.deepseek.com/)

### 3. 启动系统
```bash
python run.py
```

### 4. 访问系统
打开浏览器访问：http://localhost:8000

## 💻 使用指南

### 快速添加任务
在输入框中输入任务描述，AI 会自动：
- 分类到合适的时间域
- 预测所需时间
- 分配最佳时间槽

示例输入：
- "回复 Tony 的邮件"
- "研究 OCR 错误检测方法"
- "整理出差票据给雪媚"

### 批量添加任务
在批量输入框中，每行输入一个任务，系统会批量处理。

### 智能优化
- **优化日程**：重新安排任务以减少上下文切换
- **AI 学习**：基于历史数据优化分类和预测规则

## 🏗️ 系统架构

基于 Palantir 的四层架构：

1. **Ontology 层**：任务、项目、人员的语义建模
2. **Pipeline 层**：数据采集、转换、处理管道
3. **Foundry 层**：统一数据管理和工作流
4. **Apollo 层**：配置管理和持续优化

## 📱 键盘快捷键

- `Cmd/Ctrl + Enter`：快速添加任务
- `Cmd/Ctrl + O`：优化日程
- `Cmd/Ctrl + L`：触发 AI 学习

## 🛠️ 技术栈

- **后端**：Python, FastAPI, SQLAlchemy
- **前端**：HTML5, CSS3, JavaScript
- **数据库**：SQLite
- **AI**：DeepSeek API
- **平台**：macOS 优化

## 📊 API 文档

访问 http://localhost:8000/docs 查看完整的 API 文档。

主要端点：
- `POST /api/tasks/quick-add`：快速添加任务
- `POST /api/tasks/batch-add`：批量添加任务
- `GET /api/tasks`：获取任务列表
- `POST /api/schedule/optimize`：优化日程
- `POST /api/ontology/update`：更新本体论

## 🔧 高级配置

### 环境变量
```env
DEEPSEEK_API_KEY=xxx      # DeepSeek API 密钥
DATABASE_URL=sqlite:///... # 数据库路径
HOST=0.0.0.0              # 服务器地址
PORT=8000                 # 服务器端口
LOG_LEVEL=INFO            # 日志级别
```

### 自定义时间域
修改 `src/core/models.py` 中的 `TimeDomain` 枚举。

### 调整 AI 参数
修改 `src/ai/deepseek_agent.py` 中的系统提示词和参数。

## 📝 开发计划

- [ ] macOS 原生集成（日历、提醒事项）
- [ ] 移动端支持
- [ ] 数据可视化增强
- [ ] 团队协作功能
- [ ] 更多 AI 模型支持

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可

MIT License

## 🙏 致谢

- Palantir 的企业架构理念
- DeepSeek 提供的 AI 能力
- 开源社区的支持

---

**让 AI 帮您管理生活，实现时间的最优配置！** 🚀