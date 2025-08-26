"""
Railway部署入口文件 - 增强版
包含基础API功能，确保在Railway上稳定运行
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from typing import Dict
import os
from datetime import datetime

app = FastAPI(
    title="生活管理系统API",
    description="基于Railway部署的生活管理系统后端API",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 模拟任务存储
tasks_storage = []

@app.get("/", response_class=HTMLResponse)
async def root():
    """返回HTML主页"""
    return HTMLResponse(content="""
    <!DOCTYPE html>
    <html lang="zh">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>生活管理系统 API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { color: #333; text-align: center; }
            .status { background: #4CAF50; color: white; padding: 10px; border-radius: 5px; text-align: center; margin: 20px 0; }
            .info { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 10px 0; }
            .endpoint { background: #f8f9fa; padding: 10px; border-left: 4px solid #007bff; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎯 生活管理系统 API</h1>
            <div class="status">✅ API 服务正常运行</div>
            
            <div class="info">
                <h3>部署信息</h3>
                <p><strong>环境:</strong> """ + os.getenv("RAILWAY_ENVIRONMENT", "development") + """</p>
                <p><strong>服务:</strong> """ + os.getenv("RAILWAY_SERVICE_NAME", "unknown") + """</p>
                <p><strong>域名:</strong> """ + os.getenv("RAILWAY_PUBLIC_DOMAIN", "localhost") + """</p>
                <p><strong>启动时间:</strong> """ + datetime.now().strftime("%Y-%m-%d %H:%M:%S") + """</p>
            </div>
            
            <div class="info">
                <h3>可用的API端点</h3>
                <div class="endpoint">GET /health - 健康检查</div>
                <div class="endpoint">GET /api/tasks - 获取任务列表</div>
                <div class="endpoint">POST /api/tasks/quick-add - 快速添加任务</div>
                <div class="endpoint">GET /docs - API文档</div>
            </div>
        </div>
    </body>
    </html>
    """)

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "environment": os.getenv("RAILWAY_ENVIRONMENT", "development"),
        "service": os.getenv("RAILWAY_SERVICE_NAME", "unknown"),
        "domain": os.getenv("RAILWAY_PUBLIC_DOMAIN", "localhost")
    }

@app.get("/api/tasks")
async def get_tasks():
    """获取任务列表"""
    return {
        "tasks": tasks_storage,
        "total": len(tasks_storage),
        "message": "任务列表获取成功"
    }

@app.post("/api/tasks/quick-add")
async def quick_add_task(request: Dict):
    """快速添加任务"""
    try:
        task_input = request.get("task_input", "")
        if not task_input:
            raise HTTPException(status_code=400, detail="任务描述不能为空")
        
        # 创建简单任务对象
        task = {
            "id": f"task_{len(tasks_storage) + 1}",
            "title": task_input,
            "domain": "life",  # 默认域
            "status": "pending",
            "estimated_minutes": 30,  # 默认30分钟
            "created_at": datetime.now().isoformat(),
            "priority": 3
        }
        
        tasks_storage.append(task)
        
        return {
            "success": True,
            "task": task,
            "message": f"任务已成功添加！当前共有 {len(tasks_storage)} 个任务"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    """删除指定任务"""
    global tasks_storage
    original_count = len(tasks_storage)
    tasks_storage = [t for t in tasks_storage if t["id"] != task_id]
    
    if len(tasks_storage) == original_count:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    return {
        "success": True,
        "message": f"任务 {task_id} 已删除，剩余 {len(tasks_storage)} 个任务"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)