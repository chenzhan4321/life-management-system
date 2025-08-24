# SQLite 数据库架构设计

## 核心设计原则

基于 Palantir 架构，采用以下设计原则：

1. **对象本体化**: 每个实体都有明确的类型和属性
2. **关系图式**: 实体间的关系明确建模
3. **版本控制**: 所有数据变更都有版本记录
4. **时间序列**: 支持历史数据查询和分析
5. **元数据驱动**: 丰富的元数据支持智能处理

## 数据库表结构

### 1. 核心实体表 (Ontology Layer)

#### 任务表 (tasks)
```sql
CREATE TABLE tasks (
    -- 基础标识
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,  -- 全局唯一标识
    
    -- 核心属性
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled', 'deferred')) DEFAULT 'pending',
    priority INTEGER CHECK(priority BETWEEN 1 AND 5) DEFAULT 3,  -- 1=最高, 5=最低
    
    -- 时间属性
    estimated_duration INTEGER,  -- 预估时长(分钟)
    actual_duration INTEGER,     -- 实际时长(分钟)
    due_date DATETIME,
    start_date DATETIME,
    completion_date DATETIME,
    
    -- 分类属性
    domain TEXT CHECK(domain IN ('academic', 'income', 'growth', 'life')) NOT NULL,
    category TEXT,
    tags TEXT,  -- JSON 数组格式
    
    -- 关联关系
    project_id INTEGER REFERENCES projects(id),
    parent_task_id INTEGER REFERENCES tasks(id),  -- 子任务关系
    assigned_to INTEGER REFERENCES persons(id),
    
    -- 外部集成
    external_source TEXT,  -- 'calendar', 'reminders', 'manual'
    external_id TEXT,      -- 外部系统ID
    
    -- 元数据
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    
    -- AI增强属性
    ai_priority_score REAL,     -- AI计算的优先级分数
    ai_complexity_score REAL,   -- 复杂度评分
    ai_similar_tasks TEXT       -- 相似任务ID列表 (JSON)
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_domain ON tasks(domain);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
```

#### 时间块表 (time_blocks)
```sql
CREATE TABLE time_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    
    -- 时间属性
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    duration INTEGER GENERATED ALWAYS AS (
        (julianday(end_time) - julianday(start_time)) * 24 * 60
    ) STORED,  -- 自动计算时长(分钟)
    
    -- 分类属性
    domain TEXT CHECK(domain IN ('academic', 'income', 'growth', 'life')) NOT NULL,
    block_type TEXT CHECK(block_type IN ('focused', 'routine', 'buffer', 'break')) DEFAULT 'focused',
    
    -- 内容描述
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    
    -- 状态
    status TEXT CHECK(status IN ('planned', 'active', 'completed', 'cancelled')) DEFAULT 'planned',
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern TEXT,  -- JSON格式的重复规则
    
    -- 关联关系
    linked_task_id INTEGER REFERENCES tasks(id),
    
    -- 外部集成
    calendar_event_id TEXT,
    
    -- 元数据
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    
    -- 效率记录
    productivity_rating INTEGER CHECK(productivity_rating BETWEEN 1 AND 5),
    actual_work_time INTEGER,  -- 实际工作时间(分钟)
    interruption_count INTEGER DEFAULT 0
);

CREATE INDEX idx_time_blocks_start_time ON time_blocks(start_time);
CREATE INDEX idx_time_blocks_domain ON time_blocks(domain);
CREATE INDEX idx_time_blocks_status ON time_blocks(status);
```

#### 项目表 (projects)
```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    
    -- 基础信息
    name TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK(status IN ('active', 'on_hold', 'completed', 'cancelled')) DEFAULT 'active',
    
    -- 时间跟踪
    start_date DATE,
    target_end_date DATE,
    actual_end_date DATE,
    
    -- 分类属性
    domain TEXT CHECK(domain IN ('academic', 'income', 'growth', 'life')) NOT NULL,
    category TEXT,
    priority INTEGER CHECK(priority BETWEEN 1 AND 5) DEFAULT 3,
    
    -- 进度跟踪
    progress_percentage REAL CHECK(progress_percentage BETWEEN 0 AND 100) DEFAULT 0,
    total_estimated_hours REAL,
    total_actual_hours REAL,
    
    -- 关联关系
    owner_id INTEGER REFERENCES persons(id),
    parent_project_id INTEGER REFERENCES projects(id),
    
    -- 元数据
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    
    -- 项目设置
    color_code TEXT,  -- 项目颜色标识
    is_archived BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_domain ON projects(domain);
CREATE INDEX idx_projects_owner ON projects(owner_id);
```

#### 人员表 (persons)
```sql
CREATE TABLE persons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    
    -- 基础信息
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    
    -- 关系分类
    relationship_type TEXT CHECK(relationship_type IN (
        'self', 'family', 'friend', 'colleague', 'professional', 'mentor', 'mentee', 'other'
    )) DEFAULT 'other',
    
    -- 交互历史
    last_interaction_date DATE,
    interaction_frequency TEXT CHECK(interaction_frequency IN (
        'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'rare'
    )),
    
    -- 联系人集成
    contacts_id TEXT,  -- macOS通讯录ID
    
    -- 元数据
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    
    -- 个性化设置
    notes TEXT,
    importance_level INTEGER CHECK(importance_level BETWEEN 1 AND 5) DEFAULT 3,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_persons_relationship ON persons(relationship_type);
CREATE INDEX idx_persons_name ON persons(name);
```

### 2. 关系表 (Relations)

#### 任务依赖关系表
```sql
CREATE TABLE task_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    predecessor_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    successor_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type TEXT CHECK(dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')) DEFAULT 'finish_to_start',
    lag_time INTEGER DEFAULT 0,  -- 延迟时间(分钟)
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(predecessor_task_id, successor_task_id)
);
```

#### 项目成员表
```sql
CREATE TABLE project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at DATE DEFAULT CURRENT_DATE,
    
    UNIQUE(project_id, person_id)
);
```

### 3. 版本控制和审计表 (Foundry Layer)

#### 数据变更历史表
```sql
CREATE TABLE change_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    record_uuid TEXT NOT NULL,
    
    -- 变更信息
    operation TEXT CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')) NOT NULL,
    old_values TEXT,  -- JSON格式的旧值
    new_values TEXT,  -- JSON格式的新值
    changed_fields TEXT,  -- JSON数组，记录变更的字段
    
    -- 变更上下文
    change_reason TEXT,
    change_source TEXT CHECK(change_source IN ('user', 'system', 'api', 'import', 'sync')),
    
    -- 时间戳
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 版本控制
    version_before INTEGER,
    version_after INTEGER
);

CREATE INDEX idx_change_history_table_record ON change_history(table_name, record_id);
CREATE INDEX idx_change_history_timestamp ON change_history(changed_at);
```

### 4. 配置和系统表 (Apollo Layer)

#### 系统配置表
```sql
CREATE TABLE system_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT,
    config_type TEXT CHECK(config_type IN ('string', 'integer', 'boolean', 'json')) DEFAULT 'string',
    description TEXT,
    is_user_configurable BOOLEAN DEFAULT TRUE,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- 初始化基础配置
INSERT INTO system_config (config_key, config_value, config_type, description, is_user_configurable) VALUES
('app_version', '1.0.0', 'string', '应用程序版本', FALSE),
('database_version', '1.0.0', 'string', '数据库架构版本', FALSE),
('default_time_block_duration', '240', 'integer', '默认时间块时长(分钟)', TRUE),
('work_domains', '["academic", "income", "growth", "life"]', 'json', '工作域定义', TRUE),
('ai_features_enabled', 'true', 'boolean', '是否启用AI功能', TRUE),
('macos_integration_enabled', 'true', 'boolean', '是否启用macOS集成', TRUE);
```

#### 集成状态表
```sql
CREATE TABLE integration_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT UNIQUE NOT NULL,  -- 'calendar', 'reminders', 'contacts' 等
    is_enabled BOOLEAN DEFAULT FALSE,
    last_sync_at DATETIME,
    sync_status TEXT CHECK(sync_status IN ('success', 'failed', 'in_progress', 'never')) DEFAULT 'never',
    error_message TEXT,
    sync_count INTEGER DEFAULT 0,
    
    -- 服务特定配置
    service_config TEXT,  -- JSON格式的服务配置
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 初始化集成服务状态
INSERT INTO integration_status (service_name, is_enabled) VALUES
('macos_calendar', FALSE),
('macos_reminders', FALSE),
('macos_contacts', FALSE),
('macos_notifications', TRUE);
```

### 5. AI 和分析表

#### 模式识别表
```sql
CREATE TABLE productivity_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_name TEXT NOT NULL,
    pattern_type TEXT CHECK(pattern_type IN ('time_preference', 'task_sequencing', 'productivity_cycle', 'interruption_pattern')),
    
    -- 模式数据
    pattern_data TEXT,  -- JSON格式的模式数据
    confidence_score REAL CHECK(confidence_score BETWEEN 0 AND 1),
    
    -- 适用范围
    applies_to_domain TEXT,
    applies_to_timeframe TEXT,  -- 'daily', 'weekly', 'monthly'
    
    -- 发现信息
    discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_validated_at DATETIME,
    validation_count INTEGER DEFAULT 0,
    
    -- 应用效果
    improvement_suggestion TEXT,
    estimated_benefit REAL
);
```

### 6. 触发器和约束

```sql
-- 自动更新 updated_at 字段的触发器
CREATE TRIGGER update_tasks_timestamp 
AFTER UPDATE ON tasks
BEGIN
    UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_projects_timestamp 
AFTER UPDATE ON projects
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 数据变更记录触发器
CREATE TRIGGER log_task_changes
AFTER UPDATE ON tasks
WHEN OLD.version != NEW.version
BEGIN
    INSERT INTO change_history (table_name, record_id, record_uuid, operation, old_values, new_values, version_before, version_after)
    VALUES ('tasks', NEW.id, NEW.uuid, 'UPDATE', 
            json_object('title', OLD.title, 'status', OLD.status, 'priority', OLD.priority),
            json_object('title', NEW.title, 'status', NEW.status, 'priority', NEW.priority),
            OLD.version, NEW.version);
END;

-- 项目进度自动计算触发器
CREATE TRIGGER update_project_progress
AFTER UPDATE ON tasks
WHEN OLD.status != NEW.status AND NEW.project_id IS NOT NULL
BEGIN
    UPDATE projects 
    SET progress_percentage = (
        SELECT ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0) / COUNT(*), 2)
        FROM tasks 
        WHERE project_id = NEW.project_id
    )
    WHERE id = NEW.project_id;
END;
```

## 索引优化策略

```sql
-- 复合索引优化查询性能
CREATE INDEX idx_tasks_status_domain ON tasks(status, domain);
CREATE INDEX idx_tasks_due_priority ON tasks(due_date, priority) WHERE due_date IS NOT NULL;
CREATE INDEX idx_time_blocks_domain_time ON time_blocks(domain, start_time, end_time);

-- 全文搜索索引
CREATE VIRTUAL TABLE tasks_fts USING fts5(title, description, tags, content='tasks', content_rowid='id');
```

这个数据库架构设计充分考虑了：

1. **Palantir风格的对象建模**: 清晰的实体关系和属性定义
2. **版本控制**: 完整的数据变更历史跟踪
3. **时间序列支持**: 支持历史数据分析和趋势识别
4. **AI就绪**: 预留AI算法所需的字段和表结构
5. **macOS集成**: 支持与macOS原生应用的数据同步
6. **性能优化**: 合理的索引设计和查询优化
7. **扩展性**: 模块化设计支持未来功能扩展