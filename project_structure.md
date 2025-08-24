# macOS 生活管理系统 - 项目结构

## 根目录结构

```
life_management/
├── README.md                     # 项目说明
├── requirements.txt              # Python依赖
├── pyproject.toml               # Python项目配置
├── docker-compose.yml           # 开发环境配置 (可选)
├── .env.example                 # 环境变量示例
├── .gitignore                   # Git忽略文件
├── claude_changelog.md          # 版本更新记录
│
├── backend/                     # Python FastAPI 后端
│   ├── __init__.py
│   ├── main.py                  # FastAPI 应用入口
│   ├── config.py                # 配置管理
│   ├── database.py              # 数据库连接和配置
│   │
│   ├── ontology/                # 本体层 - 核心数据模型
│   │   ├── __init__.py
│   │   ├── models.py            # SQLAlchemy 数据模型
│   │   ├── schemas.py           # Pydantic 数据验证
│   │   └── enums.py             # 枚举类型定义
│   │
│   ├── pipeline/                # 数据管道 - 类似 Pipeline Builder
│   │   ├── __init__.py
│   │   ├── collectors/          # 数据收集器
│   │   │   ├── __init__.py
│   │   │   ├── macos_calendar.py    # macOS日历数据收集
│   │   │   ├── macos_reminders.py   # macOS提醒事项收集
│   │   │   └── manual_input.py      # 手动输入处理
│   │   ├── transformers/        # 数据转换器
│   │   │   ├── __init__.py
│   │   │   ├── normalizer.py        # 数据标准化
│   │   │   └── classifier.py        # 数据分类
│   │   └── processors/          # 实时处理器
│   │       ├── __init__.py
│   │       ├── task_processor.py    # 任务处理
│   │       └── schedule_processor.py # 日程处理
│   │
│   ├── foundry/                 # 平台层 - 类似 Foundry
│   │   ├── __init__.py
│   │   ├── storage/             # 统一数据存储
│   │   │   ├── __init__.py
│   │   │   ├── repository.py        # 数据访问层
│   │   │   └── versioning.py        # 版本控制
│   │   ├── workflows/           # 工作流编排
│   │   │   ├── __init__.py
│   │   │   ├── orchestrator.py      # 工作流编排器
│   │   │   └── task_flows.py        # 任务流定义
│   │   └── security/            # 安全和访问控制
│   │       ├── __init__.py
│   │       └── access_control.py    # 访问控制
│   │
│   ├── apollo/                  # 部署层 - 类似 Apollo
│   │   ├── __init__.py
│   │   ├── config_manager.py    # 配置管理
│   │   ├── updater.py           # 自动更新
│   │   └── health_monitor.py    # 健康监控
│   │
│   ├── ai/                      # AI 集成层
│   │   ├── __init__.py
│   │   ├── prioritizer.py       # 任务优先级算法
│   │   ├── optimizer.py         # 日程优化
│   │   └── pattern_recognizer.py # 模式识别
│   │
│   ├── api/                     # API 路由
│   │   ├── __init__.py
│   │   ├── tasks.py             # 任务相关API
│   │   ├── timeblocks.py        # 时间块API
│   │   ├── projects.py          # 项目API
│   │   ├── persons.py           # 人员API
│   │   └── analytics.py         # 分析API
│   │
│   ├── integrations/            # macOS 集成
│   │   ├── __init__.py
│   │   ├── calendar_api.py      # 日历API集成
│   │   ├── reminders_api.py     # 提醒事项API
│   │   ├── notifications.py     # macOS通知
│   │   └── shortcuts.py         # Shortcuts应用集成
│   │
│   └── utils/                   # 工具函数
│       ├── __init__.py
│       ├── datetime_utils.py    # 时间处理工具
│       ├── validators.py        # 数据验证
│       └── exceptions.py        # 异常定义
│
├── frontend/                    # 前端界面
│   ├── static/                  # 静态资源
│   │   ├── css/
│   │   │   ├── main.css         # 主样式
│   │   │   └── components.css   # 组件样式
│   │   ├── js/
│   │   │   ├── main.js          # 主JavaScript文件
│   │   │   ├── api.js           # API调用封装
│   │   │   ├── components/      # UI组件
│   │   │   │   ├── task-manager.js     # 任务管理组件
│   │   │   │   ├── time-blocks.js      # 时间块组件
│   │   │   │   ├── dashboard.js        # 仪表板组件
│   │   │   │   └── analytics.js        # 分析组件
│   │   │   └── utils/
│   │   │       ├── datetime.js         # 时间处理
│   │   │       └── validation.js       # 前端验证
│   │   └── images/              # 图片资源
│   │
│   └── templates/               # HTML 模板
│       ├── base.html            # 基础模板
│       ├── index.html           # 主页面
│       ├── tasks.html           # 任务管理页面
│       ├── schedule.html        # 日程页面
│       ├── analytics.html       # 分析页面
│       └── settings.html        # 设置页面
│
├── data/                        # 数据目录
│   ├── database/                # 数据库文件
│   │   └── life_management.db   # SQLite数据库
│   ├── logs/                    # 日志文件
│   ├── exports/                 # 数据导出
│   └── backups/                 # 数据备份
│
├── scripts/                     # 脚本文件
│   ├── setup.py                 # 环境设置脚本
│   ├── migrate.py               # 数据库迁移
│   ├── backup.py                # 数据备份脚本
│   └── macos_setup.sh           # macOS特定设置
│
├── tests/                       # 测试文件
│   ├── __init__.py
│   ├── conftest.py              # pytest配置
│   ├── test_ontology/           # 本体层测试
│   ├── test_pipeline/           # 管道层测试
│   ├── test_foundry/            # 平台层测试
│   ├── test_api/                # API测试
│   └── test_integrations/       # 集成测试
│
└── docs/                        # 文档
    ├── architecture.md          # 架构文档
    ├── api_reference.md         # API参考
    ├── deployment.md            # 部署说明
    └── user_guide.md            # 用户指南
```

## 核心设计原理

### 1. 分层架构
- **Ontology Layer**: 定义生活管理的核心对象和关系
- **Pipeline Layer**: 处理数据流转和转换
- **Foundry Layer**: 提供统一的数据平台和工作流
- **Apollo Layer**: 管理配置、部署和监控
- **AI Layer**: 智能算法和模式识别

### 2. macOS 原生集成
- 通过 PyObjC 与 macOS 系统API交互
- 支持日历、提醒事项、通知的原生集成
- 利用 Shortcuts 应用进行自动化

### 3. 本地优先
- SQLite 本地数据库
- 无云依赖的核心功能
- 数据完全掌控在用户手中

### 4. 模块化设计
- 每个组件独立可测试
- 支持渐进式功能扩展
- 清晰的依赖关系管理