"""
简化的生活管理系统API - Railway部署版本
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
import os

# 创建FastAPI应用
app = FastAPI(
    title="生活管理系统API",
    description="简化的任务管理后端服务",
    version="4.0.0"
)

# CORS配置 - 允许GitHub Pages访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://chenzhan4321.github.io",
        "http://localhost:8000",
        "http://localhost:3000",
        "http://127.0.0.1:8000",
        "*"  # 开发阶段允许所有
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据模型
class Task(BaseModel):
    id: Optional[str] = None
    title: str
    domain: str = "life"  # academic, income, growth, life
    status: str = "pending"  # pending, in_progress, completed
    estimated_minutes: int = 30
    priority: int = 3
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
class TaskCreate(BaseModel):
    title: str
    domain: str = "life"
    estimated_minutes: int = 30
    priority: int = 3

# 内存存储（简化版本）
tasks_db = {}

@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "生活管理系统API v4.0",
        "status": "running",
        "endpoints": {
            "health": "/api/health",
            "tasks": "/api/tasks",
            "analytics": "/api/analytics/daily"
        }
    }

@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "4.0.0"
    }

@app.get("/api/tasks")
async def get_tasks():
    """获取所有任务"""
    return {
        "status": "success",
        "tasks": list(tasks_db.values())
    }

@app.post("/api/tasks")
async def create_task(task: TaskCreate):
    """创建新任务"""
    task_id = str(uuid.uuid4())
    new_task = Task(
        id=task_id,
        title=task.title,
        domain=task.domain,
        estimated_minutes=task.estimated_minutes,
        priority=task.priority,
        created_at=datetime.now()
    )
    tasks_db[task_id] = new_task.dict()
    return {
        "status": "success",
        "task": new_task
    }

@app.patch("/api/tasks/{task_id}")
async def update_task(task_id: str, updates: dict):
    """更新任务"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    task = tasks_db[task_id]
    
    # 更新字段
    for key, value in updates.items():
        if key in task:
            task[key] = value
    
    # 如果标记为完成，设置完成时间
    if updates.get("status") == "completed":
        task["completed_at"] = datetime.now().isoformat()
    
    tasks_db[task_id] = task
    return {
        "status": "success",
        "task": task
    }

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    """删除任务"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    del tasks_db[task_id]
    return {
        "status": "success",
        "message": "任务已删除"
    }

@app.get("/api/analytics/daily")
async def get_daily_analytics():
    """获取每日统计"""
    total_tasks = len(tasks_db)
    completed_tasks = sum(1 for task in tasks_db.values() if task.get("status") == "completed")
    
    # 按域统计
    domain_stats = {
        "academic": {"total": 0, "completed": 0, "minutes": 0},
        "income": {"total": 0, "completed": 0, "minutes": 0},
        "growth": {"total": 0, "completed": 0, "minutes": 0},
        "life": {"total": 0, "completed": 0, "minutes": 0}
    }
    
    for task in tasks_db.values():
        domain = task.get("domain", "life")
        if domain in domain_stats:
            domain_stats[domain]["total"] += 1
            domain_stats[domain]["minutes"] += task.get("estimated_minutes", 0)
            if task.get("status") == "completed":
                domain_stats[domain]["completed"] += 1
    
    return {
        "status": "success",
        "analytics": {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "completion_rate": completed_tasks / total_tasks if total_tasks > 0 else 0,
            "domains": domain_stats
        }
    }

@app.post("/api/tasks/ai-process")
async def ai_process_tasks(data: dict):
    """AI处理任务（模拟）"""
    text = data.get("text", "")
    
    # 简单的任务解析（模拟AI）
    lines = text.strip().split('\n')
    tasks = []
    
    for line in lines:
        line = line.strip()
        if line:
            # 简单的域分类
            domain = "life"
            if any(word in line.lower() for word in ["学习", "研究", "论文", "考试"]):
                domain = "academic"
            elif any(word in line.lower() for word in ["工作", "项目", "客户", "收入"]):
                domain = "income"
            elif any(word in line.lower() for word in ["运动", "健身", "阅读", "技能"]):
                domain = "growth"
            
            # 创建任务
            task_id = str(uuid.uuid4())
            task = {
                "id": task_id,
                "title": line,
                "domain": domain,
                "status": "pending",
                "estimated_minutes": 30,
                "priority": 3,
                "created_at": datetime.now().isoformat()
            }
            tasks_db[task_id] = task
            tasks.append(task)
    
    return {
        "status": "success",
        "message": f"成功处理 {len(tasks)} 个任务",
        "tasks": tasks
    }

@app.post("/api/tasks/quick-add")
async def quick_add_task(data: dict):
    """快速添加任务"""
    task = TaskCreate(
        title=data.get("title", "新任务"),
        domain=data.get("domain", "life"),
        estimated_minutes=data.get("estimated_minutes", 30),
        priority=data.get("priority", 3)
    )
    return await create_task(task)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)