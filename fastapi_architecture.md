# FastAPI 后端架构和 API 端点设计

## 整体架构设计

基于 Palantir 的分层架构原理，FastAPI 后端采用以下设计模式：

1. **控制器层 (Controller)**: API路由和请求处理
2. **服务层 (Service)**: 业务逻辑封装
3. **仓储层 (Repository)**: 数据访问抽象
4. **管道层 (Pipeline)**: 数据处理和转换
5. **集成层 (Integration)**: 外部系统集成

## 核心模块设计

### 1. 主应用配置

```python
# backend/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
import os
from pathlib import Path

from .config import get_settings
from .database import engine, get_db
from .ontology.models import Base
from .api import tasks, timeblocks, projects, persons, analytics
from .apollo.health_monitor import HealthMonitor
from .pipeline.processors.task_processor import TaskProcessor

# 创建FastAPI应用实例
app = FastAPI(
    title="macOS 生活管理系统",
    description="基于 Palantir 架构原理的本地生活管理平台",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS配置 - 允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # 前端开发服务器
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

# 模板引擎
templates = Jinja2Templates(directory="frontend/templates")

# 注册API路由
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["任务管理"])
app.include_router(timeblocks.router, prefix="/api/v1/timeblocks", tags=["时间块管理"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["项目管理"])
app.include_router(persons.router, prefix="/api/v1/persons", tags=["人员管理"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["数据分析"])

# 健康检查端点
@app.get("/health")
async def health_check():
    """系统健康检查"""
    health_monitor = HealthMonitor()
    return await health_monitor.get_system_health()

# 应用启动事件
@app.on_event("startup")
async def startup_event():
    """应用启动时的初始化"""
    # 创建数据库表
    Base.metadata.create_all(bind=engine)
    
    # 初始化系统配置
    from .apollo.config_manager import ConfigManager
    config_manager = ConfigManager()
    await config_manager.initialize_default_config()
    
    # 启动后台任务处理器
    task_processor = TaskProcessor()
    await task_processor.start_background_processing()
    
    print("🚀 macOS 生活管理系统启动成功")

# 应用关闭事件
@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时的清理"""
    print("📴 系统正在关闭...")

# 根路径 - 返回主页面
@app.get("/")
async def root(request: Request):
    """返回主页面"""
    return templates.TemplateResponse("index.html", {"request": request})

if __name__ == "__main__":
    # 开发环境启动配置
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,  # 开发模式自动重载
        log_level="info"
    )
```

### 2. 配置管理

```python
# backend/config.py
from pydantic import BaseSettings, Field
from typing import Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    """应用配置"""
    
    # 基础配置
    app_name: str = "macOS Life Management System"
    app_version: str = "1.0.0"
    debug: bool = Field(default=False, env="DEBUG")
    
    # 数据库配置
    database_url: str = Field(
        default="sqlite:///./data/database/life_management.db",
        env="DATABASE_URL"
    )
    
    # API配置
    api_v1_prefix: str = "/api/v1"
    access_token_expire_minutes: int = 30
    
    # macOS集成配置
    macos_integration_enabled: bool = Field(default=True, env="MACOS_INTEGRATION_ENABLED")
    calendar_sync_enabled: bool = Field(default=False, env="CALENDAR_SYNC_ENABLED")
    reminders_sync_enabled: bool = Field(default=False, env="REMINDERS_SYNC_ENABLED")
    
    # AI功能配置
    ai_features_enabled: bool = Field(default=True, env="AI_FEATURES_ENABLED")
    ai_priority_weight: float = Field(default=0.7, env="AI_PRIORITY_WEIGHT")
    
    # 时间配置
    default_time_block_duration: int = 240  # 4小时默认时间块
    work_start_hour: int = 9
    work_end_hour: int = 17
    
    # 文件路径配置
    base_dir: Path = Path(__file__).parent.parent
    data_dir: Path = base_dir / "data"
    logs_dir: Path = data_dir / "logs"
    exports_dir: Path = data_dir / "exports"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # 确保必要的目录存在
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir.mkdir(parents=True, exist_ok=True)

# 全局配置实例
_settings: Optional[Settings] = None

def get_settings() -> Settings:
    """获取应用配置（单例模式）"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
```

### 3. API 路由设计

#### 任务管理 API

```python
# backend/api/tasks.py
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date

from ..database import get_db
from ..ontology.schemas import TaskCreate, TaskUpdate, TaskResponse, TaskStatus, TaskDomain, TaskPriority
from ..foundry.storage.repository import TaskRepository
from ..ai.prioritizer import TaskPrioritizer
from ..pipeline.processors.task_processor import TaskProcessor

router = APIRouter()

# 依赖注入
def get_task_repository(db: Session = Depends(get_db)) -> TaskRepository:
    return TaskRepository(db)

def get_task_processor() -> TaskProcessor:
    return TaskProcessor()

def get_task_prioritizer() -> TaskPrioritizer:
    return TaskPrioritizer()

@router.get("/", response_model=List[TaskResponse])
async def get_tasks(
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回的记录数"),
    status: Optional[TaskStatus] = Query(None, description="按状态过滤"),
    domain: Optional[TaskDomain] = Query(None, description="按域过滤"),
    priority: Optional[TaskPriority] = Query(None, description="按优先级过滤"),
    project_id: Optional[int] = Query(None, description="按项目过滤"),
    due_before: Optional[datetime] = Query(None, description="截止日期之前"),
    search: Optional[str] = Query(None, min_length=2, description="搜索关键词"),
    repository: TaskRepository = Depends(get_task_repository)
):
    """获取任务列表"""
    filters = {}
    if status:
        filters['status'] = status.value
    if domain:
        filters['domain'] = domain.value
    if priority:
        filters['priority'] = priority.value
    if project_id:
        filters['project_id'] = project_id
    if due_before:
        filters['due_before'] = due_before
    
    tasks = await repository.get_tasks(
        skip=skip, 
        limit=limit, 
        filters=filters,
        search=search
    )
    return tasks

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int = Path(..., description="任务ID"),
    repository: TaskRepository = Depends(get_task_repository)
):
    """获取单个任务详情"""
    task = await repository.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )
    return task

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    repository: TaskRepository = Depends(get_task_repository),
    processor: TaskProcessor = Depends(get_task_processor),
    prioritizer: TaskPrioritizer = Depends(get_task_prioritizer)
):
    """创建新任务"""
    # 创建任务
    task = await repository.create_task(task_data)
    
    # AI优先级计算
    if task:
        ai_priority = await prioritizer.calculate_priority(task)
        await repository.update_task(task.id, {"ai_priority_score": ai_priority})
    
    # 触发后台处理
    await processor.process_new_task(task)
    
    return task

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int = Path(..., description="任务ID"),
    task_data: TaskUpdate,
    repository: TaskRepository = Depends(get_task_repository),
    processor: TaskProcessor = Depends(get_task_processor)
):
    """更新任务"""
    # 检查任务是否存在
    existing_task = await repository.get_task(task_id)
    if not existing_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )
    
    # 更新任务
    updated_task = await repository.update_task(task_id, task_data.dict(exclude_unset=True))
    
    # 触发后台处理
    await processor.process_task_update(existing_task, updated_task)
    
    return updated_task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int = Path(..., description="任务ID"),
    repository: TaskRepository = Depends(get_task_repository)
):
    """删除任务"""
    success = await repository.delete_task(task_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )

@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: int = Path(..., description="任务ID"),
    actual_duration: Optional[int] = Query(None, description="实际用时(分钟)"),
    repository: TaskRepository = Depends(get_task_repository),
    processor: TaskProcessor = Depends(get_task_processor)
):
    """标记任务为已完成"""
    task = await repository.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )
    
    # 更新任务状态
    update_data = {
        "status": TaskStatus.COMPLETED.value,
        "completion_date": datetime.utcnow()
    }
    if actual_duration:
        update_data["actual_duration"] = actual_duration
    
    updated_task = await repository.update_task(task_id, update_data)
    
    # 触发完成后处理
    await processor.process_task_completion(updated_task)
    
    return updated_task

@router.get("/{task_id}/similar", response_model=List[TaskResponse])
async def get_similar_tasks(
    task_id: int = Path(..., description="任务ID"),
    limit: int = Query(5, ge=1, le=20, description="返回数量"),
    repository: TaskRepository = Depends(get_task_repository),
    prioritizer: TaskPrioritizer = Depends(get_task_prioritizer)
):
    """获取相似任务"""
    task = await repository.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )
    
    similar_tasks = await prioritizer.find_similar_tasks(task, limit)
    return similar_tasks

@router.get("/analytics/summary")
async def get_tasks_summary(
    domain: Optional[TaskDomain] = Query(None, description="按域过滤"),
    date_from: Optional[date] = Query(None, description="开始日期"),
    date_to: Optional[date] = Query(None, description="结束日期"),
    repository: TaskRepository = Depends(get_task_repository)
):
    """获取任务统计摘要"""
    summary = await repository.get_tasks_summary(
        domain=domain.value if domain else None,
        date_from=date_from,
        date_to=date_to
    )
    return summary
```

#### 时间块管理 API

```python
# backend/api/timeblocks.py
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta

from ..database import get_db
from ..ontology.schemas import TimeBlockCreate, TimeBlockResponse, TaskDomain
from ..foundry.storage.repository import TimeBlockRepository
from ..ai.optimizer import ScheduleOptimizer

router = APIRouter()

def get_timeblock_repository(db: Session = Depends(get_db)) -> TimeBlockRepository:
    return TimeBlockRepository(db)

def get_schedule_optimizer() -> ScheduleOptimizer:
    return ScheduleOptimizer()

@router.get("/", response_model=List[TimeBlockResponse])
async def get_time_blocks(
    date_from: Optional[date] = Query(None, description="开始日期"),
    date_to: Optional[date] = Query(None, description="结束日期"),
    domain: Optional[TaskDomain] = Query(None, description="按域过滤"),
    repository: TimeBlockRepository = Depends(get_timeblock_repository)
):
    """获取时间块列表"""
    if not date_from:
        date_from = date.today()
    if not date_to:
        date_to = date_from + timedelta(days=7)
    
    time_blocks = await repository.get_time_blocks_by_date_range(
        date_from, date_to, domain.value if domain else None
    )
    return time_blocks

@router.post("/", response_model=TimeBlockResponse, status_code=status.HTTP_201_CREATED)
async def create_time_block(
    timeblock_data: TimeBlockCreate,
    repository: TimeBlockRepository = Depends(get_timeblock_repository)
):
    """创建时间块"""
    # 检查时间冲突
    conflicts = await repository.check_time_conflicts(
        timeblock_data.start_time, 
        timeblock_data.end_time
    )
    if conflicts:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="时间块与现有安排冲突"
        )
    
    time_block = await repository.create_time_block(timeblock_data)
    return time_block

@router.get("/optimize")
async def optimize_schedule(
    target_date: date = Query(..., description="目标日期"),
    optimizer: ScheduleOptimizer = Depends(get_schedule_optimizer),
    repository: TimeBlockRepository = Depends(get_timeblock_repository)
):
    """优化指定日期的日程安排"""
    current_blocks = await repository.get_time_blocks_by_date_range(target_date, target_date)
    optimized_schedule = await optimizer.optimize_daily_schedule(target_date, current_blocks)
    return optimized_schedule

@router.get("/analytics/productivity")
async def get_productivity_analytics(
    date_from: date = Query(..., description="开始日期"),
    date_to: date = Query(..., description="结束日期"),
    repository: TimeBlockRepository = Depends(get_timeblock_repository)
):
    """获取生产力分析"""
    analytics = await repository.get_productivity_analytics(date_from, date_to)
    return analytics
```

### 4. 服务层设计

```python
# backend/foundry/storage/repository.py
from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from typing import List, Optional, Dict, Any
from datetime import datetime, date

from ...ontology.models import Task, Project, TimeBlock, Person
from ...ontology.schemas import TaskCreate, TaskUpdate, ProjectCreate

class BaseRepository(ABC):
    """基础仓储类"""
    
    def __init__(self, db: Session):
        self.db = db

class TaskRepository(BaseRepository):
    """任务仓储"""
    
    async def get_tasks(
        self, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        search: Optional[str] = None
    ) -> List[Task]:
        """获取任务列表"""
        query = self.db.query(Task)
        
        # 应用过滤器
        if filters:
            for key, value in filters.items():
                if key == 'due_before':
                    query = query.filter(Task.due_date <= value)
                elif hasattr(Task, key):
                    query = query.filter(getattr(Task, key) == value)
        
        # 搜索
        if search:
            query = query.filter(
                or_(
                    Task.title.contains(search),
                    Task.description.contains(search)
                )
            )
        
        # 排序和分页
        query = query.order_by(desc(Task.priority), asc(Task.due_date))
        return query.offset(skip).limit(limit).all()
    
    async def get_task(self, task_id: int) -> Optional[Task]:
        """获取单个任务"""
        return self.db.query(Task).filter(Task.id == task_id).first()
    
    async def create_task(self, task_data: TaskCreate) -> Task:
        """创建任务"""
        task = Task(**task_data.dict())
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task
    
    async def update_task(self, task_id: int, update_data: Dict[str, Any]) -> Optional[Task]:
        """更新任务"""
        task = await self.get_task(task_id)
        if not task:
            return None
        
        for key, value in update_data.items():
            if hasattr(task, key):
                setattr(task, key, value)
        
        task.version += 1
        task.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(task)
        return task
    
    async def delete_task(self, task_id: int) -> bool:
        """删除任务"""
        task = await self.get_task(task_id)
        if not task:
            return False
        
        self.db.delete(task)
        self.db.commit()
        return True
    
    async def get_tasks_summary(
        self,
        domain: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> Dict[str, Any]:
        """获取任务统计摘要"""
        query = self.db.query(Task)
        
        if domain:
            query = query.filter(Task.domain == domain)
        if date_from:
            query = query.filter(Task.created_at >= date_from)
        if date_to:
            query = query.filter(Task.created_at <= date_to)
        
        total_tasks = query.count()
        completed_tasks = query.filter(Task.status == 'completed').count()
        pending_tasks = query.filter(Task.status == 'pending').count()
        
        return {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "pending_tasks": pending_tasks,
            "completion_rate": completed_tasks / total_tasks if total_tasks > 0 else 0
        }

class TimeBlockRepository(BaseRepository):
    """时间块仓储"""
    
    async def get_time_blocks_by_date_range(
        self, 
        date_from: date, 
        date_to: date,
        domain: Optional[str] = None
    ) -> List[TimeBlock]:
        """按日期范围获取时间块"""
        query = self.db.query(TimeBlock).filter(
            and_(
                TimeBlock.start_time >= datetime.combine(date_from, datetime.min.time()),
                TimeBlock.end_time <= datetime.combine(date_to, datetime.max.time())
            )
        )
        
        if domain:
            query = query.filter(TimeBlock.domain == domain)
        
        return query.order_by(TimeBlock.start_time).all()
    
    async def check_time_conflicts(
        self, 
        start_time: datetime, 
        end_time: datetime
    ) -> List[TimeBlock]:
        """检查时间冲突"""
        return self.db.query(TimeBlock).filter(
            or_(
                and_(TimeBlock.start_time <= start_time, TimeBlock.end_time > start_time),
                and_(TimeBlock.start_time < end_time, TimeBlock.end_time >= end_time),
                and_(TimeBlock.start_time >= start_time, TimeBlock.end_time <= end_time)
            )
        ).all()
    
    async def create_time_block(self, timeblock_data: TimeBlockCreate) -> TimeBlock:
        """创建时间块"""
        time_block = TimeBlock(**timeblock_data.dict())
        self.db.add(time_block)
        self.db.commit()
        self.db.refresh(time_block)
        return time_block
    
    async def get_productivity_analytics(
        self, 
        date_from: date, 
        date_to: date
    ) -> Dict[str, Any]:
        """获取生产力分析"""
        # 这里实现复杂的生产力分析逻辑
        # 包括域分布、效率评分、中断统计等
        pass
```

### 5. 错误处理和中间件

```python
# backend/utils/exceptions.py
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

class LifeManagementException(Exception):
    """自定义业务异常基类"""
    def __init__(self, message: str, error_code: str = "BUSINESS_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)

class TaskNotFoundException(LifeManagementException):
    def __init__(self, task_id: int):
        super().__init__(f"任务 {task_id} 不存在", "TASK_NOT_FOUND")

class TimeConflictException(LifeManagementException):
    def __init__(self, message: str = "时间安排冲突"):
        super().__init__(message, "TIME_CONFLICT")

async def life_management_exception_handler(request: Request, exc: LifeManagementException):
    """自定义异常处理器"""
    logger.error(f"业务异常: {exc.error_code} - {exc.message}")
    return JSONResponse(
        status_code=400,
        content={
            "error_code": exc.error_code,
            "message": exc.message,
            "detail": "请检查输入数据或联系系统管理员"
        }
    )
```

这个 FastAPI 后端架构设计具有以下特点：

1. **RESTful API设计**: 遵循REST原则，提供清晰的API接口
2. **分层架构**: 控制器、服务、仓储层次分明
3. **依赖注入**: 使用FastAPI的依赖注入系统
4. **数据验证**: Pydantic模型确保数据质量
5. **错误处理**: 统一的异常处理机制
6. **API文档**: 自动生成的交互式API文档
7. **性能优化**: 合理的查询和缓存策略
8. **扩展性**: 模块化设计支持功能扩展