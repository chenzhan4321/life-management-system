"""
简化版FastAPI应用 - 用于Railway部署测试
"""
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import os
import uuid

# 创建 FastAPI 应用
app = FastAPI(
    title="生活管理系统 API - 简化版",
    description="Railway部署测试版本",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """健康检查端点"""
    return JSONResponse({
        "status": "success",
        "message": "生活管理系统API正在运行",
        "version": "1.0.0",
        "environment": os.getenv("RAILWAY_ENVIRONMENT", "development")
    })

@app.get("/health")
async def health_check():
    """健康检查"""
    return JSONResponse({
        "status": "healthy",
        "railway_service": os.getenv("RAILWAY_SERVICE_NAME", "unknown"),
        "domain": os.getenv("RAILWAY_PUBLIC_DOMAIN", "localhost")
    })

# 内存中存储任务（临时方案）
tasks_db = {}

# 数据模型
class Task(BaseModel):
    title: str
    domain: str
    status: str = "pending"
    priority: int = 3
    estimated_minutes: int = 30
    
@app.get("/api/tasks")
async def get_tasks():
    """获取任务列表"""
    tasks_list = list(tasks_db.values())
    return JSONResponse({
        "tasks": tasks_list,
        "total": len(tasks_list),
        "message": "API端点正常工作"
    })

@app.post("/api/tasks")
async def create_task(task: Task):
    """创建新任务"""
    task_id = f"task_{uuid.uuid4().hex[:8]}"
    task_data = task.model_dump()
    task_data["id"] = task_id
    task_data["created_at"] = datetime.now().isoformat()
    tasks_db[task_id] = task_data
    return JSONResponse({"status": "success", "task": task_data})

@app.put("/api/tasks/{task_id}")
async def update_task(task_id: str, task_data: Dict[str, Any] = Body(...)):
    """更新任务 (PUT)"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="任务不存在")
    tasks_db[task_id].update(task_data)
    return JSONResponse({"status": "success", "task": tasks_db[task_id]})

@app.patch("/api/tasks/{task_id}")
async def patch_task(task_id: str, task_data: Dict[str, Any] = Body(...)):
    """部分更新任务 (PATCH)"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="任务不存在")
    tasks_db[task_id].update(task_data)
    return JSONResponse({"status": "success", "task": tasks_db[task_id]})

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    """删除任务"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="任务不存在")
    del tasks_db[task_id]
    return JSONResponse({"status": "success", "message": "任务已删除"})

@app.get("/api/analytics/daily")
async def get_daily_analytics():
    """获取每日统计数据"""
    completed = len([t for t in tasks_db.values() if t.get("status") == "completed"])
    pending = len([t for t in tasks_db.values() if t.get("status") == "pending"])
    total = len(tasks_db)
    productivity_score = int((completed / total * 100) if total > 0 else 0)
    
    return JSONResponse({
        "summary": {
            "completed_tasks": completed,
            "pending_tasks": pending,
            "total_tasks": total,
            "productivity_score": productivity_score,
            "date": datetime.now().strftime("%Y-%m-%d")
        }
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)