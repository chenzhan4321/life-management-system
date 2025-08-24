"""
数据模型定义 - 基于 Palantir Ontology 概念
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

Base = declarative_base()

# 枚举类型定义
class TaskStatus(str, Enum):
    """任务状态"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    BLOCKED = "blocked"

class TimeDomain(str, Enum):
    """时间域 - 4x4小时模型"""
    ACADEMIC = "academic"      # 学术/论文
    INCOME = "income"          # 收入/挣钱
    GROWTH = "growth"          # 个人成长
    LIFE = "life"             # 生活琐事
    SLEEP = "sleep"           # 睡眠

class Priority(int, Enum):
    """优先级"""
    URGENT = 5
    HIGH = 4
    MEDIUM = 3
    LOW = 2
    MINIMAL = 1

# SQLAlchemy 模型
class Task(Base):
    """任务实体 - Ontology 核心对象"""
    __tablename__ = 'tasks'
    
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    domain = Column(String, nullable=False)  # TimeDomain
    status = Column(String, default=TaskStatus.PENDING)
    priority = Column(Integer, default=Priority.MEDIUM)
    
    # 时间属性
    estimated_minutes = Column(Integer)  # AI 预测的所需时间
    actual_minutes = Column(Integer)     # 实际花费时间
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    scheduled_start = Column(DateTime)   # 计划开始时间
    scheduled_end = Column(DateTime)     # 计划结束时间
    completed_at = Column(DateTime)      # 完成时间
    
    # 关系
    project_id = Column(String, ForeignKey('projects.id'))
    person_id = Column(String, ForeignKey('persons.id'))
    
    # AI 生成的元数据
    ai_category = Column(String)         # AI 自动分类
    ai_confidence = Column(Float)        # AI 预测置信度
    ai_suggested_slot = Column(DateTime) # AI 建议的时间槽
    
    # 版本控制
    version = Column(Integer, default=1)
    
    # 关系定义
    project = relationship("Project", back_populates="tasks")
    person = relationship("Person", back_populates="tasks")
    history = relationship("TaskHistory", back_populates="task")

class Project(Base):
    """项目实体 - 任务分组"""
    __tablename__ = 'projects'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    domain = Column(String)  # 主要时间域
    created_at = Column(DateTime, default=datetime.utcnow)
    deadline = Column(DateTime)
    
    tasks = relationship("Task", back_populates="project")

class Person(Base):
    """人员实体 - 关系管理"""
    __tablename__ = 'persons'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String)
    relationship_type = Column(String)  # 同事、朋友、家人等
    interaction_frequency = Column(Integer)  # 交互频率评分
    
    tasks = relationship("Task", back_populates="person")

class TimeBlock(Base):
    """时间块 - 日程管理单元"""
    __tablename__ = 'time_blocks'
    
    id = Column(String, primary_key=True)
    date = Column(DateTime, nullable=False)
    domain = Column(String, nullable=False)  # TimeDomain
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    allocated_hours = Column(Float, default=4.0)
    used_hours = Column(Float, default=0.0)
    
    # 效率指标
    productivity_score = Column(Float)
    energy_level = Column(Integer)  # 1-10 能量水平

class TaskHistory(Base):
    """任务历史 - 版本控制"""
    __tablename__ = 'task_history'
    
    id = Column(Integer, primary_key=True)
    task_id = Column(String, ForeignKey('tasks.id'))
    field_name = Column(String)
    old_value = Column(Text)
    new_value = Column(Text)
    changed_at = Column(DateTime, default=datetime.utcnow)
    changed_by = Column(String, default='system')
    
    task = relationship("Task", back_populates="history")

class OntologyUpdate(Base):
    """本体论更新记录 - AI 学习记录"""
    __tablename__ = 'ontology_updates'
    
    id = Column(Integer, primary_key=True)
    update_type = Column(String)  # 分类规则、时间预测、优先级调整
    old_rule = Column(Text)
    new_rule = Column(Text)
    confidence = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    applied = Column(Boolean, default=False)

# Pydantic 模型 - API 交互
class TaskCreate(BaseModel):
    """创建任务请求"""
    title: str
    description: Optional[str] = None
    domain: Optional[TimeDomain] = None  # 可由 AI 推断
    priority: Optional[Priority] = Priority.MEDIUM
    estimated_minutes: Optional[int] = None  # 可由 AI 预测
    scheduled_start: Optional[datetime] = None
    project_id: Optional[str] = None
    person_id: Optional[str] = None

class TaskResponse(BaseModel):
    """任务响应"""
    id: str
    title: str
    description: Optional[str]
    domain: TimeDomain
    status: TaskStatus
    priority: Priority
    estimated_minutes: Optional[int]
    actual_minutes: Optional[int]
    scheduled_start: Optional[datetime]
    scheduled_end: Optional[datetime]
    ai_category: Optional[str]
    ai_confidence: Optional[float]
    ai_suggested_slot: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

class TimeSlot(BaseModel):
    """可用时间槽"""
    start: datetime
    end: datetime
    domain: TimeDomain
    available_minutes: int
    energy_level: int = 5

class ScheduleRequest(BaseModel):
    """调度请求"""
    task_ids: List[str]
    date_range_start: datetime
    date_range_end: datetime
    respect_energy_levels: bool = True
    allow_domain_overflow: bool = False

class OntologyUpdateRequest(BaseModel):
    """本体论更新请求"""
    learning_data: Dict[str, Any]
    update_type: str
    confidence_threshold: float = 0.7