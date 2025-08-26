"""
FastAPI 主应用 - 生活管理系统 API
"""
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import asyncio
from contextlib import asynccontextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from core.models import Base, Task, TaskCreate, TaskResponse, TimeSlot, ScheduleRequest
from ai.deepseek_agent import DeepSeekAgent, TaskProcessor
from pipeline.scheduler import TimeSlotFinder, ScheduleOptimizer
from utils.database import get_db, init_db
from api.auth import get_current_user, ALLOWED_ORIGINS, create_access_token

# 应用生命周期管理
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化
    print("🚀 正在启动生活管理系统...")
    init_db()
    
    # 初始化 AI 代理
    app.state.ai_agent = DeepSeekAgent()
    app.state.task_processor = TaskProcessor(app.state.ai_agent)
    app.state.scheduler = ScheduleOptimizer()
    
    print("✅ 系统启动完成！")
    yield
    
    # 关闭时清理
    print("🔄 正在关闭系统...")

# 创建 FastAPI 应用
app = FastAPI(
    title="生活管理系统 API",
    description="基于 Palantir 架构理念的个人生活管理系统",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 配置（支持GitHub Pages）
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if os.getenv("PRODUCTION") else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-API-Key", "Authorization"],
)

# API 路由

# 认证端点
@app.post("/api/auth/token")
async def login(api_key: str):
    """获取访问令牌（用于GitHub Pages部署）"""
    # 在生产环境验证API密钥
    if os.getenv("API_KEY") and api_key != os.getenv("API_KEY"):
        raise HTTPException(status_code=401, detail="无效的API密钥")
    
    # 创建访问令牌
    access_token = create_access_token(data={"sub": "user"})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/")
async def root():
    """后端API根路径"""
    return {
        "name": "生活管理系统 API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.post("/api/tasks/quick-add")
async def quick_add_task(
    request: Dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    快速添加任务 - AI 自动分类、预测时间、分配时间槽
    """
    try:
        task_input = request.get("task_input", "")
        if not task_input:
            raise HTTPException(status_code=400, detail="任务描述不能为空")
        
        # 使用 AI 处理任务
        processed = await app.state.task_processor.process_new_task(task_input)
        
        # 创建任务对象
        task = Task(
            id=f"task_{datetime.now().timestamp()}",
            title=processed["title"],
            domain=processed["domain"],
            estimated_minutes=processed["estimated_minutes"],
            ai_category=processed["domain"],
            ai_confidence=processed["ai_confidence"],
            priority=3  # 默认中等优先级
        )
        
        # 查找最佳时间槽
        available_slots = await app.state.scheduler.find_free_slots(
            datetime.now(),
            datetime.now() + timedelta(days=7)
        )
        
        if available_slots:
            optimal_slot = await app.state.ai_agent.find_optimal_slot(
                {
                    "title": task.title,
                    "domain": task.domain,
                    "estimated_minutes": task.estimated_minutes,
                    "priority": task.priority
                },
                available_slots
            )
            
            if optimal_slot["start_time"]:
                task.scheduled_start = datetime.fromisoformat(optimal_slot["start_time"])
                task.scheduled_end = task.scheduled_start + timedelta(minutes=task.estimated_minutes)
                task.ai_suggested_slot = task.scheduled_start
        
        # 保存到数据库
        db.add(task)
        db.commit()
        db.refresh(task)
        
        # 后台更新本体论
        background_tasks.add_task(update_ontology_background, task.id)
        
        return {
            "success": True,
            "task": {
                "id": task.id,
                "title": task.title,
                "domain": task.domain,
                "estimated_minutes": task.estimated_minutes,
                "scheduled_start": task.scheduled_start.isoformat() if task.scheduled_start else None,
                "ai_confidence": task.ai_confidence,
                "reasoning": processed.get("classification_reasoning", "")
            },
            "message": f"任务已添加到 {task.domain} 域，预计需要 {task.estimated_minutes} 分钟"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tasks/ai-process")
async def ai_process_tasks(
    request: Dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    AI 智能批量处理任务 - 支持单个或多个任务
    自动识别输入格式：单行为单任务，多行为批量任务
    """
    try:
        task_input = request.get("input", "").strip()
        if not task_input:
            raise HTTPException(status_code=400, detail="请输入任务描述")
        
        # 智能识别：如果包含换行符则按批量处理，否则单任务处理
        if "\n" in task_input or "；" in task_input or ";" in task_input:
            # 批量任务处理
            # 支持换行、中英文分号分隔
            tasks = []
            for line in task_input.replace("；", "\n").replace(";", "\n").split("\n"):
                line = line.strip()
                if line:
                    tasks.append(line)
            
            if not tasks:
                raise HTTPException(status_code=400, detail="未找到有效任务")
            
            # 批量处理
            processed_tasks = await app.state.ai_agent.batch_process_tasks(tasks)
            
            created_tasks = []
            for task_data in processed_tasks:
                task = Task(
                    id=f"task_{datetime.now().timestamp()}_{task_data['index']}",
                    title=task_data["title"],
                    domain=task_data["domain"],
                    status="pool",  # AI处理的任务默认进入任务池
                    estimated_minutes=task_data["estimated_minutes"],
                    priority=task_data["priority"],
                    ai_category=task_data["domain"],
                    ai_confidence=task_data["confidence"]
                )
                
                # 查找时间槽
                available_slots = await app.state.scheduler.find_free_slots(
                    datetime.now(),
                    datetime.now() + timedelta(days=7)
                )
                
                if available_slots:
                    optimal_slot = await app.state.ai_agent.find_optimal_slot(
                        {
                            "title": task.title,
                            "domain": task.domain,
                            "estimated_minutes": task.estimated_minutes,
                            "priority": task.priority
                        },
                        available_slots[:5]  # 只看前5个槽位
                    )
                    
                    if optimal_slot.get("start_time"):
                        task.scheduled_start = datetime.fromisoformat(optimal_slot["start_time"])
                        task.scheduled_end = task.scheduled_start + timedelta(minutes=task.estimated_minutes)
                        task.ai_suggested_slot = task.scheduled_start
                
                db.add(task)
                created_tasks.append(task)
            
            db.commit()
            
            # 后台优化日程
            background_tasks.add_task(optimize_schedule_background, [t.id for t in created_tasks])
            
            return {
                "success": True,
                "count": len(created_tasks),
                "tasks": [
                    {
                        "id": t.id,
                        "title": t.title,
                        "domain": t.domain,
                        "estimated_minutes": t.estimated_minutes,
                        "priority": t.priority,
                        "scheduled_start": t.scheduled_start.isoformat() if t.scheduled_start else None,
                        "ai_confidence": t.ai_confidence
                    }
                    for t in created_tasks
                ],
                "message": f"成功添加 {len(created_tasks)} 个任务"
            }
        else:
            # 单个任务处理
            processed = await app.state.task_processor.process_new_task(task_input)
            
            task = Task(
                id=f"task_{datetime.now().timestamp()}",
                title=processed["title"],
                domain=processed["domain"],
                estimated_minutes=processed["estimated_minutes"],
                ai_category=processed["domain"],
                ai_confidence=processed["ai_confidence"],
                priority=3
            )
            
            # 查找最佳时间槽
            available_slots = await app.state.scheduler.find_free_slots(
                datetime.now(),
                datetime.now() + timedelta(days=7)
            )
            
            if available_slots:
                optimal_slot = await app.state.ai_agent.find_optimal_slot(
                    {
                        "title": task.title,
                        "domain": task.domain,
                        "estimated_minutes": task.estimated_minutes,
                        "priority": task.priority
                    },
                    available_slots[:5]
                )
                
                if optimal_slot.get("start_time"):
                    task.scheduled_start = datetime.fromisoformat(optimal_slot["start_time"])
                    task.scheduled_end = task.scheduled_start + timedelta(minutes=task.estimated_minutes)
                    task.ai_suggested_slot = task.scheduled_start
            
            db.add(task)
            db.commit()
            db.refresh(task)
            
            # 后台更新本体论
            background_tasks.add_task(update_ontology_background, task.id)
            
            return {
                "success": True,
                "count": 1,
                "tasks": [{
                    "id": task.id,
                    "title": task.title,
                    "domain": task.domain,
                    "estimated_minutes": task.estimated_minutes,
                    "priority": task.priority,
                    "scheduled_start": task.scheduled_start.isoformat() if task.scheduled_start else None,
                    "ai_confidence": task.ai_confidence
                }],
                "message": f"任务已添加到 {task.domain} 域，预计需要 {task.estimated_minutes} 分钟"
            }
            
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tasks/batch-add")
async def batch_add_tasks(
    request: Dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    批量添加任务
    """
    try:
        tasks = request.get("tasks", [])
        if not tasks:
            raise HTTPException(status_code=400, detail="任务列表不能为空")
        
        # 批量处理任务
        processed_tasks = await app.state.ai_agent.batch_process_tasks(tasks)
        
        created_tasks = []
        for task_data in processed_tasks:
            task = Task(
                id=f"task_{datetime.now().timestamp()}_{task_data['index']}",
                title=task_data["title"],
                domain=task_data["domain"],
                status="pool",  # AI处理的任务默认进入任务池
                estimated_minutes=task_data["estimated_minutes"],
                priority=task_data["priority"],
                ai_category=task_data["domain"],
                ai_confidence=task_data["confidence"]
            )
            db.add(task)
            created_tasks.append(task)
        
        db.commit()
        
        # 后台优化日程
        background_tasks.add_task(optimize_schedule_background, [t.id for t in created_tasks])
        
        return {
            "success": True,
            "created": len(created_tasks),
            "tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "domain": t.domain,
                    "estimated_minutes": t.estimated_minutes
                }
                for t in created_tasks
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tasks")
async def create_task(
    task_data: Dict,
    db: Session = Depends(get_db)
):
    """
    创建单个任务（手工添加）
    """
    try:
        # 创建任务对象
        task = Task(
            id=f"task_{datetime.now().timestamp()}",
            title=task_data.get("title", ""),
            domain=task_data.get("domain", "life"),
            status=task_data.get("status", "pending"),
            priority=task_data.get("priority", 3),
            estimated_minutes=task_data.get("estimated_minutes", 30),
            scheduled_start=datetime.fromisoformat(task_data["scheduled_start"]) if task_data.get("scheduled_start") else None,
            scheduled_end=datetime.fromisoformat(task_data["scheduled_end"]) if task_data.get("scheduled_end") else None
        )
        
        # 保存到数据库
        db.add(task)
        db.commit()
        db.refresh(task)
        
        return {
            "success": True,
            "task": {
                "id": task.id,
                "title": task.title,
                "domain": task.domain,
                "status": task.status,
                "priority": task.priority,
                "estimated_minutes": task.estimated_minutes,
                "scheduled_start": task.scheduled_start.isoformat() if task.scheduled_start else None,
                "scheduled_end": task.scheduled_end.isoformat() if task.scheduled_end else None
            },
            "message": f"任务已添加到 {task.domain} 域"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tasks")
async def get_tasks(
    domain: Optional[str] = None,
    status: Optional[str] = None,
    date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    获取任务列表
    """
    query = db.query(Task)
    
    if domain:
        query = query.filter(Task.domain == domain)
    if status:
        query = query.filter(Task.status == status)
    if date:
        target_date = datetime.fromisoformat(date)
        query = query.filter(
            Task.scheduled_start >= target_date,
            Task.scheduled_start < target_date + timedelta(days=1)
        )
    
    tasks = query.all()
    
    return {
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "domain": t.domain,
                "status": t.status,
                "priority": t.priority,
                "estimated_minutes": t.estimated_minutes,
                "scheduled_start": t.scheduled_start.isoformat() if t.scheduled_start else None,
                "actual_start": t.actual_start.isoformat() if t.actual_start else None,
                "completed_at": t.completed_at.isoformat() if t.completed_at else None,
                "actual_minutes": t.actual_minutes,
                "ai_confidence": t.ai_confidence
            }
            for t in tasks
        ],
        "total": len(tasks)
    }

@app.delete("/api/tasks/{task_id}")
async def delete_task(
    task_id: str,
    db: Session = Depends(get_db)
):
    """
    删除指定任务
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    db.delete(task)
    db.commit()
    
    return {
        "success": True,
        "message": f"任务 {task.title} 已删除"
    }

@app.patch("/api/tasks/{task_id}")
async def update_task(
    task_id: str,
    request: Dict,
    db: Session = Depends(get_db)
):
    """
    更新任务信息
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    # 更新允许的字段
    allowed_fields = ["title", "domain", "status", "priority", "estimated_minutes", 
                     "scheduled_start", "scheduled_end", "actual_minutes", "completed_at", 
                     "actual_start"]
    
    for field, value in request.items():
        if field in allowed_fields:
            if field in ["scheduled_start", "scheduled_end", "completed_at", "actual_start"] and value:
                # 处理 ISO 字符串，支持带 'Z' 的格式
                if isinstance(value, str):
                    value = value.replace('Z', '+00:00')
                    value = datetime.fromisoformat(value)
            setattr(task, field, value)
    
    db.commit()
    db.refresh(task)
    
    return {
        "success": True,
        "message": f"任务已更新",
        "task": {
            "id": task.id,
            "title": task.title,
            "domain": task.domain,
            "status": task.status,
            "priority": task.priority,
            "estimated_minutes": task.estimated_minutes,
            "scheduled_start": task.scheduled_start.isoformat() if task.scheduled_start else None,
            "scheduled_end": task.scheduled_end.isoformat() if task.scheduled_end else None
        }
    }

@app.post("/api/schedule/optimize")
async def optimize_schedule(
    request: ScheduleRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    优化日程安排
    """
    try:
        # 获取指定的任务
        tasks = db.query(Task).filter(Task.id.in_(request.task_ids)).all()
        
        if not tasks:
            raise HTTPException(status_code=404, detail="未找到任务")
        
        # 转换为 AI 可处理的格式
        task_data = [
            {
                "id": t.id,
                "title": t.title,
                "domain": t.domain,
                "priority": t.priority,
                "estimated_minutes": t.estimated_minutes,
                "deadline": t.scheduled_end.isoformat() if t.scheduled_end else None
            }
            for t in tasks
        ]
        
        # 生成优化的日程
        schedule = await app.state.ai_agent.generate_daily_schedule(
            task_data,
            {
                "start_date": request.date_range_start.isoformat(),
                "end_date": request.date_range_end.isoformat(),
                "respect_energy": request.respect_energy_levels,
                "allow_overflow": request.allow_domain_overflow
            }
        )
        
        # 更新任务的调度时间
        for item in schedule.get("schedule", []):
            task = next((t for t in tasks if t.id == item["task_id"]), None)
            if task:
                task.scheduled_start = datetime.fromisoformat(item["start_time"])
                task.scheduled_end = datetime.fromisoformat(item["end_time"])
        
        db.commit()
        
        return {
            "success": True,
            "schedule": schedule,
            "message": f"已优化 {len(tasks)} 个任务的日程安排"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ontology/update")
async def trigger_ontology_update(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    触发本体论更新 - 基于历史数据学习
    """
    try:
        # 收集最近7天的数据
        week_ago = datetime.now() - timedelta(days=7)
        tasks = db.query(Task).filter(Task.created_at >= week_ago).all()
        
        if not tasks:
            return {"message": "没有足够的历史数据进行学习"}
        
        # 准备学习数据
        learning_data = {
            "total_tasks": len(tasks),
            "completed_tasks": len([t for t in tasks if t.status == "completed"]),
            "domain_distribution": {},
            "time_accuracy": [],
            "completion_patterns": []
        }
        
        # 分析域分布
        for domain in ["academic", "income", "growth", "life"]:
            domain_tasks = [t for t in tasks if t.domain == domain]
            learning_data["domain_distribution"][domain] = {
                "count": len(domain_tasks),
                "avg_duration": sum(t.actual_minutes or t.estimated_minutes or 0 for t in domain_tasks) / max(len(domain_tasks), 1)
            }
        
        # 分析时间准确性
        for task in tasks:
            if task.actual_minutes and task.estimated_minutes:
                learning_data["time_accuracy"].append({
                    "domain": task.domain,
                    "estimated": task.estimated_minutes,
                    "actual": task.actual_minutes,
                    "accuracy": 1 - abs(task.actual_minutes - task.estimated_minutes) / task.estimated_minutes
                })
        
        # 调用 AI 更新本体论
        updates = await app.state.ai_agent.update_ontology(learning_data)
        
        # 后台应用更新
        background_tasks.add_task(apply_ontology_updates, updates)
        
        return {
            "success": True,
            "updates": updates.get("updates", []),
            "insights": updates.get("insights", []),
            "recommendations": updates.get("recommendations", []),
            "message": "本体论更新已触发"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/daily")
async def get_daily_analytics(
    date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    获取每日分析数据
    """
    target_date = datetime.fromisoformat(date) if date else datetime.now()
    start = target_date.replace(hour=0, minute=0, second=0)
    end = start + timedelta(days=1)
    
    tasks = db.query(Task).filter(
        Task.scheduled_start >= start,
        Task.scheduled_start < end
    ).all()
    
    # 计算各域使用时间
    domain_usage = {}
    for domain in ["academic", "income", "growth", "life"]:
        domain_tasks = [t for t in tasks if t.domain == domain]
        total_minutes = sum(t.actual_minutes or t.estimated_minutes or 0 for t in domain_tasks)
        domain_usage[domain] = {
            "allocated_hours": 4,
            "used_hours": round(total_minutes / 60, 2),
            "task_count": len(domain_tasks),
            "completion_rate": len([t for t in domain_tasks if t.status == "completed"]) / max(len(domain_tasks), 1)
        }
    
    # 计算整体统计
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.status == "completed"])
    
    return {
        "date": target_date.isoformat(),
        "summary": {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "completion_rate": completed_tasks / max(total_tasks, 1),
            "total_hours_planned": sum(d["used_hours"] for d in domain_usage.values()),
            "productivity_score": calculate_productivity_score(tasks)
        },
        "domain_usage": domain_usage,
        "recommendations": generate_daily_recommendations(domain_usage)
    }

# 后台任务函数
async def update_ontology_background(task_id: str):
    """后台更新本体论"""
    await asyncio.sleep(1)  # 模拟处理
    print(f"✅ 本体论已基于任务 {task_id} 更新")

async def optimize_schedule_background(task_ids: List[str]):
    """后台优化日程"""
    await asyncio.sleep(2)  # 模拟处理
    print(f"✅ 已优化 {len(task_ids)} 个任务的日程")

async def apply_ontology_updates(updates: Dict):
    """应用本体论更新"""
    await asyncio.sleep(1)  # 模拟处理
    print(f"✅ 已应用 {len(updates.get('updates', []))} 个本体论更新")

def calculate_productivity_score(tasks: List[Task]) -> float:
    """计算生产力分数"""
    if not tasks:
        return 0.0
    
    completed = len([t for t in tasks if t.status == "completed"])
    on_time = len([t for t in tasks if t.status == "completed" and t.completed_at and t.scheduled_end and t.completed_at <= t.scheduled_end])
    
    completion_score = completed / len(tasks)
    timeliness_score = on_time / max(completed, 1)
    
    return round((completion_score * 0.7 + timeliness_score * 0.3) * 100, 2)

def generate_daily_recommendations(domain_usage: Dict) -> List[str]:
    """生成每日建议"""
    recommendations = []
    
    for domain, usage in domain_usage.items():
        if usage["used_hours"] > usage["allocated_hours"] * 1.2:
            recommendations.append(f"⚠️ {domain} 域超时使用，建议调整任务优先级")
        elif usage["used_hours"] < usage["allocated_hours"] * 0.5:
            recommendations.append(f"💡 {domain} 域使用不足，可以安排更多相关任务")
        
        if usage["completion_rate"] < 0.5:
            recommendations.append(f"📊 {domain} 域完成率较低，考虑减少任务量或延长时间")
    
    return recommendations

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)