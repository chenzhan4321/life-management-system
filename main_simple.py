"""
简化版FastAPI应用 - 用于Railway部署测试
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os

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

@app.get("/api/tasks")
async def get_tasks():
    """获取任务列表 - 测试端点"""
    return JSONResponse({
        "tasks": [],
        "total": 0,
        "message": "API端点正常工作 - 简化测试版本"
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)