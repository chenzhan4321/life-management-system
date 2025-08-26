"""
简化的FastAPI主应用 - 用于测试
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# 创建 FastAPI 应用
app = FastAPI(
    title="生活管理系统 API（简化版）",
    description="基于 Palantir 架构理念的个人生活管理系统",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发环境允许所有来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """后端API根路径"""
    return {
        "name": "生活管理系统 API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/tasks")
async def get_tasks_old():
    """获取任务列表（兼容旧路径）"""
    return {
        "tasks": [
            {
                "id": "task_1",
                "title": "测试任务1",
                "domain": "academic",
                "status": "pending",
                "priority": 3,
                "estimated_minutes": 30
            },
            {
                "id": "task_2", 
                "title": "测试任务2",
                "domain": "income",
                "status": "completed",
                "priority": 2,
                "estimated_minutes": 60
            }
        ],
        "total": 2
    }

@app.get("/api/tasks")
async def get_tasks():
    """获取任务列表（新路径）"""
    return await get_tasks_old()

@app.get("/analytics/daily")
async def get_analytics():
    """获取每日分析数据"""
    return {
        "date": "2025-08-27",
        "summary": {
            "total_tasks": 2,
            "completed_tasks": 1,
            "completion_rate": 0.5,
            "total_hours_planned": 1.5,
            "productivity_score": 50
        },
        "domain_usage": {
            "academic": {
                "allocated_hours": 4,
                "used_hours": 0.5,
                "task_count": 1,
                "completion_rate": 0
            },
            "income": {
                "allocated_hours": 4,
                "used_hours": 1,
                "task_count": 1,
                "completion_rate": 1
            },
            "growth": {
                "allocated_hours": 4,
                "used_hours": 0,
                "task_count": 0,
                "completion_rate": 0
            },
            "life": {
                "allocated_hours": 4,
                "used_hours": 0,
                "task_count": 0,
                "completion_rate": 0
            }
        },
        "recommendations": []
    }

@app.get("/api/analytics/daily")
async def get_analytics_api():
    """获取每日分析数据（API路径）"""
    return await get_analytics()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)