#!/bin/bash
# 生活管理系统 - 本地服务器启动脚本

# 获取脚本所在目录
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "🎯 启动生活管理系统..."
echo "📍 工作目录: $DIR"
echo ""

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到Python3，请先安装Python"
    read -p "按任意键退出..."
    exit 1
fi

# 检查依赖
echo "🔍 检查依赖..."
python3 -c "import fastapi, uvicorn" 2>/dev/null || {
    echo "📦 正在安装依赖..."
    python3 -m pip install fastapi uvicorn sqlalchemy python-jose passlib python-multipart python-dotenv
}

echo ""
echo "🚀 启动服务器..."
echo "📱 网页地址: http://127.0.0.1:8000/"
echo "🛑 停止服务: 按 Ctrl+C"
echo ""

# 启动服务器
python3 -m uvicorn src.api.main:app --reload --host 127.0.0.1 --port 8000

echo ""
echo "👋 服务器已停止"
read -p "按任意键关闭窗口..."