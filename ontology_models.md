# 核心数据模型定义 (Ontology Layer)

## 设计理念

基于 Palantir 的本体论架构，我们将生活管理抽象为以下核心对象和关系：

1. **对象 (Objects)**: 具有明确属性和行为的实体
2. **关系 (Links)**: 对象之间的连接和依赖
3. **属性 (Properties)**: 对象的特征和元数据
4. **事件 (Events)**: 时间序列中的状态变化

## Python 数据模型 (Pydantic + SQLAlchemy)

### 1. 枚举类型定义

```python
# backend/ontology/enums.py
from enum import Enum

class TaskStatus(str, Enum):
    """任务状态枚举"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DEFERRED = "deferred"

class TaskDomain(str, Enum):
    """生活域枚举 - 基于4小时时间块理论"""
    ACADEMIC = "academic"    # 学术/学习域
    INCOME = "income"        # 收入/工作域
    GROWTH = "growth"        # 成长/发展域
    LIFE = "life"            # 生活/维护域

class TaskPriority(int, Enum):
    """任务优先级"""
    CRITICAL = 1    # 紧急重要
    HIGH = 2        # 重要不紧急
    MEDIUM = 3      # 紧急不重要
    LOW = 4         # 不紧急不重要
    SOMEDAY = 5     # 未来可能

class TimeBlockType(str, Enum):
    """时间块类型"""
    FOCUSED = "focused"      # 专注工作时间
    ROUTINE = "routine"      # 例行公事时间
    BUFFER = "buffer"        # 缓冲时间
    BREAK = "break"          # 休息时间

class ProjectStatus(str, Enum):
    """项目状态"""
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class RelationshipType(str, Enum):
    """关系类型"""
    SELF = "self"
    FAMILY = "family"
    FRIEND = "friend"
    COLLEAGUE = "colleague"
    PROFESSIONAL = "professional"
    MENTOR = "mentor"
    MENTEE = "mentee"
    OTHER = "other"

class DataSource(str, Enum):
    """数据来源"""
    MANUAL = "manual"
    CALENDAR = "calendar"
    REMINDERS = "reminders"
    IMPORT = "import"
    API = "api"
    SYNC = "sync"
```

### 2. SQLAlchemy 数据库模型

```python
# backend/ontology/models.py
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey, CheckConstraint, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.sqlite import UUID

Base = declarative_base()

class TimestampMixin:
    """时间戳混合类"""
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class VersionMixin:
    """版本控制混合类"""
    version = Column(Integer, default=1, nullable=False)

class UUIDMixin:
    """UUID混合类"""
    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(String, unique=True, default=lambda: str(uuid.uuid4()), nullable=False)

class Task(Base, UUIDMixin, TimestampMixin, VersionMixin):
    """任务实体 - 生活管理的核心对象"""
    __tablename__ = "tasks"
    
    # 基础属性
    title = Column(String, nullable=False)
    description = Column(Text)
    
    # 状态和优先级
    status = Column(String, nullable=False, default=TaskStatus.PENDING.value)
    priority = Column(Integer, nullable=False, default=TaskPriority.MEDIUM.value)
    
    # 时间属性
    estimated_duration = Column(Integer)  # 分钟
    actual_duration = Column(Integer)     # 分钟
    due_date = Column(DateTime)
    start_date = Column(DateTime)
    completion_date = Column(DateTime)
    
    # 分类属性
    domain = Column(String, nullable=False)
    category = Column(String)
    tags = Column(JSON)  # 标签数组
    
    # 关联关系
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=True)
    parent_task_id = Column(Integer, ForeignKey('tasks.id'), nullable=True)
    assigned_to = Column(Integer, ForeignKey('persons.id'), nullable=True)
    
    # 外部集成
    external_source = Column(String)  # 数据来源
    external_id = Column(String)      # 外部系统ID
    
    # AI增强属性
    ai_priority_score = Column(Float)     # AI计算的优先级分数
    ai_complexity_score = Column(Float)   # 复杂度评分
    ai_similar_tasks = Column(JSON)       # 相似任务ID列表
    
    # 关系定义
    project = relationship("Project", back_populates="tasks")
    subtasks = relationship("Task", back_populates="parent_task", remote_side=[parent_task_id])
    parent_task = relationship("Task", back_populates="subtasks")
    assignee = relationship("Person", back_populates="assigned_tasks")
    time_blocks = relationship("TimeBlock", back_populates="linked_task")
    
    # 数据库约束
    __table_args__ = (
        CheckConstraint(status.in_([s.value for s in TaskStatus]), name='check_task_status'),
        CheckConstraint(priority.between(1, 5), name='check_task_priority'),
        CheckConstraint(domain.in_([d.value for d in TaskDomain]), name='check_task_domain'),
    )

class TimeBlock(Base, UUIDMixin, TimestampMixin, VersionMixin):
    """时间块实体 - 时间管理的基础单位"""
    __tablename__ = "time_blocks"
    
    # 时间属性
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    # duration 通过计算属性实现
    
    # 分类属性
    domain = Column(String, nullable=False)
    block_type = Column(String, nullable=False, default=TimeBlockType.FOCUSED.value)
    
    # 内容描述
    title = Column(String, nullable=False)
    description = Column(Text)
    location = Column(String)
    
    # 状态
    status = Column(String, default="planned")
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(JSON)  # 重复规则
    
    # 关联关系
    linked_task_id = Column(Integer, ForeignKey('tasks.id'), nullable=True)
    
    # 外部集成
    calendar_event_id = Column(String)
    
    # 效率记录
    productivity_rating = Column(Integer)  # 1-5评分
    actual_work_time = Column(Integer)     # 实际工作时间(分钟)
    interruption_count = Column(Integer, default=0)
    
    # 关系定义
    linked_task = relationship("Task", back_populates="time_blocks")
    
    # 数据库约束
    __table_args__ = (
        CheckConstraint(domain.in_([d.value for d in TaskDomain]), name='check_timeblock_domain'),
        CheckConstraint(block_type.in_([t.value for t in TimeBlockType]), name='check_timeblock_type'),
        CheckConstraint(productivity_rating.between(1, 5), name='check_productivity_rating'),
    )
    
    @property
    def duration(self) -> int:
        """计算时长（分钟）"""
        if self.start_time and self.end_time:
            return int((self.end_time - self.start_time).total_seconds() / 60)
        return 0

class Project(Base, UUIDMixin, TimestampMixin, VersionMixin):
    """项目实体 - 任务的容器和组织单位"""
    __tablename__ = "projects"
    
    # 基础信息
    name = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, nullable=False, default=ProjectStatus.ACTIVE.value)
    
    # 时间跟踪
    start_date = Column(DateTime)
    target_end_date = Column(DateTime)
    actual_end_date = Column(DateTime)
    
    # 分类属性
    domain = Column(String, nullable=False)
    category = Column(String)
    priority = Column(Integer, nullable=False, default=TaskPriority.MEDIUM.value)
    
    # 进度跟踪
    progress_percentage = Column(Float, default=0.0)
    total_estimated_hours = Column(Float)
    total_actual_hours = Column(Float)
    
    # 关联关系
    owner_id = Column(Integer, ForeignKey('persons.id'), nullable=True)
    parent_project_id = Column(Integer, ForeignKey('projects.id'), nullable=True)
    
    # 项目设置
    color_code = Column(String)  # 项目颜色标识
    is_archived = Column(Boolean, default=False)
    
    # 关系定义
    owner = relationship("Person", back_populates="owned_projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    subprojects = relationship("Project", back_populates="parent_project", remote_side=[parent_project_id])
    parent_project = relationship("Project", back_populates="subprojects")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    
    # 数据库约束
    __table_args__ = (
        CheckConstraint(status.in_([s.value for s in ProjectStatus]), name='check_project_status'),
        CheckConstraint(domain.in_([d.value for d in TaskDomain]), name='check_project_domain'),
        CheckConstraint(progress_percentage.between(0, 100), name='check_progress_range'),
        CheckConstraint(priority.between(1, 5), name='check_project_priority'),
    )

class Person(Base, UUIDMixin, TimestampMixin, VersionMixin):
    """人员实体 - 关系管理的核心"""
    __tablename__ = "persons"
    
    # 基础信息
    name = Column(String, nullable=False)
    email = Column(String)
    phone = Column(String)
    avatar_url = Column(String)
    
    # 关系分类
    relationship_type = Column(String, nullable=False, default=RelationshipType.OTHER.value)
    
    # 交互历史
    last_interaction_date = Column(DateTime)
    interaction_frequency = Column(String)  # 'daily', 'weekly', 'monthly' etc.
    
    # 联系人集成
    contacts_id = Column(String)  # macOS通讯录ID
    
    # 个性化设置
    notes = Column(Text)
    importance_level = Column(Integer, default=3)  # 1-5评分
    is_active = Column(Boolean, default=True)
    
    # 关系定义
    assigned_tasks = relationship("Task", back_populates="assignee")
    owned_projects = relationship("Project", back_populates="owner")
    project_memberships = relationship("ProjectMember", back_populates="person")
    
    # 数据库约束
    __table_args__ = (
        CheckConstraint(relationship_type.in_([r.value for r in RelationshipType]), name='check_relationship_type'),
        CheckConstraint(importance_level.between(1, 5), name='check_importance_level'),
    )

# 关系表
class ProjectMember(Base):
    """项目成员关系表"""
    __tablename__ = "project_members"
    
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    person_id = Column(Integer, ForeignKey('persons.id'), nullable=False)
    role = Column(String, default="member")
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系定义
    project = relationship("Project", back_populates="members")
    person = relationship("Person", back_populates="project_memberships")

class TaskDependency(Base):
    """任务依赖关系表"""
    __tablename__ = "task_dependencies"
    
    id = Column(Integer, primary_key=True)
    predecessor_task_id = Column(Integer, ForeignKey('tasks.id'), nullable=False)
    successor_task_id = Column(Integer, ForeignKey('tasks.id'), nullable=False)
    dependency_type = Column(String, default="finish_to_start")
    lag_time = Column(Integer, default=0)  # 延迟时间(分钟)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系定义
    predecessor = relationship("Task", foreign_keys=[predecessor_task_id])
    successor = relationship("Task", foreign_keys=[successor_task_id])
```

### 3. Pydantic 数据验证模型

```python
# backend/ontology/schemas.py
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, validator, Field
from .enums import TaskStatus, TaskDomain, TaskPriority, TimeBlockType, ProjectStatus, RelationshipType

class BaseSchema(BaseModel):
    """基础Schema类"""
    class Config:
        from_attributes = True  # 支持从SQLAlchemy模型创建

class TaskBase(BaseModel):
    """任务基础Schema"""
    title: str = Field(..., min_length=1, max_length=200, description="任务标题")
    description: Optional[str] = Field(None, max_length=2000, description="任务描述")
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    domain: TaskDomain = Field(..., description="任务所属域")
    category: Optional[str] = Field(None, max_length=100)
    tags: Optional[List[str]] = Field(default_factory=list)
    
    # 时间相关
    estimated_duration: Optional[int] = Field(None, ge=1, description="预估时长(分钟)")
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    
    # 关联关系
    project_id: Optional[int] = None
    parent_task_id: Optional[int] = None
    assigned_to: Optional[int] = None
    
    @validator('estimated_duration')
    def validate_duration(cls, v):
        if v is not None and v <= 0:
            raise ValueError('预估时长必须大于0')
        return v
    
    @validator('due_date', 'start_date')
    def validate_dates(cls, v):
        if v is not None and v < datetime.now():
            raise ValueError('日期不能早于当前时间')
        return v

class TaskCreate(TaskBase):
    """创建任务Schema"""
    pass

class TaskUpdate(BaseModel):
    """更新任务Schema"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    estimated_duration: Optional[int] = Field(None, ge=1)
    actual_duration: Optional[int] = Field(None, ge=0)
    due_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    
class TaskResponse(TaskBase):
    """任务响应Schema"""
    id: int
    uuid: str
    created_at: datetime
    updated_at: datetime
    version: int
    actual_duration: Optional[int] = None
    completion_date: Optional[datetime] = None
    ai_priority_score: Optional[float] = None
    ai_complexity_score: Optional[float] = None

class TimeBlockBase(BaseModel):
    """时间块基础Schema"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    start_time: datetime
    end_time: datetime
    domain: TaskDomain
    block_type: TimeBlockType = TimeBlockType.FOCUSED
    location: Optional[str] = None
    linked_task_id: Optional[int] = None
    
    @validator('end_time')
    def validate_time_range(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('结束时间必须晚于开始时间')
        return v
    
    @property
    def duration(self) -> int:
        """计算时长（分钟）"""
        return int((self.end_time - self.start_time).total_seconds() / 60)

class TimeBlockCreate(TimeBlockBase):
    """创建时间块Schema"""
    pass

class TimeBlockResponse(TimeBlockBase):
    """时间块响应Schema"""
    id: int
    uuid: str
    status: str
    duration: int
    productivity_rating: Optional[int] = None
    actual_work_time: Optional[int] = None
    interruption_count: int = 0
    created_at: datetime
    updated_at: datetime

class ProjectBase(BaseModel):
    """项目基础Schema"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    domain: TaskDomain
    status: ProjectStatus = ProjectStatus.ACTIVE
    priority: TaskPriority = TaskPriority.MEDIUM
    category: Optional[str] = None
    
    # 时间相关
    start_date: Optional[date] = None
    target_end_date: Optional[date] = None
    
    # 估算
    total_estimated_hours: Optional[float] = Field(None, ge=0)
    
    # 设置
    color_code: Optional[str] = Field(None, regex=r'^#[0-9A-Fa-f]{6}$')
    parent_project_id: Optional[int] = None

class ProjectCreate(ProjectBase):
    """创建项目Schema"""
    pass

class ProjectResponse(ProjectBase):
    """项目响应Schema"""
    id: int
    uuid: str
    progress_percentage: float = 0.0
    total_actual_hours: Optional[float] = None
    actual_end_date: Optional[date] = None
    is_archived: bool = False
    task_count: Optional[int] = None  # 通过计算得出
    created_at: datetime
    updated_at: datetime

class PersonBase(BaseModel):
    """人员基础Schema"""
    name: str = Field(..., min_length=1, max_length=100)
    email: Optional[str] = Field(None, regex=r'^[^@]+@[^@]+\.[^@]+$')
    phone: Optional[str] = None
    relationship_type: RelationshipType = RelationshipType.OTHER
    interaction_frequency: Optional[str] = None
    importance_level: int = Field(3, ge=1, le=5)
    notes: Optional[str] = Field(None, max_length=2000)

class PersonCreate(PersonBase):
    """创建人员Schema"""
    pass

class PersonResponse(PersonBase):
    """人员响应Schema"""
    id: int
    uuid: str
    last_interaction_date: Optional[date] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

# 分析和统计相关的Schema
class DomainStatistics(BaseModel):
    """域统计Schema"""
    domain: TaskDomain
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    total_estimated_hours: float
    total_actual_hours: float
    completion_rate: float

class ProductivitySummary(BaseModel):
    """生产力摘要Schema"""
    date: date
    total_planned_time: int  # 分钟
    total_actual_work_time: int
    productivity_score: float
    domain_breakdown: List[DomainStatistics]
    interruption_count: int
    completed_task_count: int
```

## 核心设计特点

1. **类型安全**: 使用Pydantic确保数据验证和类型安全
2. **关系清晰**: 通过SQLAlchemy定义明确的实体关系
3. **版本控制**: 内置版本跟踪支持数据历史
4. **AI就绪**: 预留AI算法所需的字段和结构
5. **时间感知**: 支持复杂的时间计算和查询
6. **领域驱动**: 基于生活管理的四个核心域建模
7. **扩展性**: 模块化设计支持未来功能添加

这个本体层设计为整个系统提供了坚实的数据基础，支持复杂的生活管理场景和智能分析功能。