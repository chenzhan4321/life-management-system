#!/bin/bash

# 本地运行脚本
# 同时启动前端和后端服务

echo "🚀 启动本地开发环境..."

# 确保在项目根目录
cd "$(dirname "$0")/.."

# 安装Python依赖
echo "📦 安装后端依赖..."
pip install -r backend/requirements.txt

# 启动后端服务
echo "🔧 启动后端API服务..."
cd backend
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 启动前端服务
echo "🌐 启动前端服务..."
# 使用 Python 的简单 HTTP 服务器
cd frontend
python3 -m http.server 8080 &
FRONTEND_PID=$!
cd ..

echo "✅ 服务已启动！"
echo "📍 前端地址: http://localhost:8080"
echo "📍 后端API: http://localhost:8000"
echo "📍 API文档: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止所有服务..."

# 等待中断信号
trap "echo '🛑 停止服务...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait