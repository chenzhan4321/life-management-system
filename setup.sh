#!/bin/bash

# 生活管理系统一键安装脚本

echo "================================================"
echo "   🎯 生活管理系统 - 一键安装脚本"
echo "================================================"
echo ""

# 检查 Python 版本
echo "📋 检查 Python 版本..."
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 Python 3，请先安装 Python 3.9+"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✅ Python 版本: $PYTHON_VERSION"

# 创建虚拟环境
echo ""
echo "🔧 创建虚拟环境..."
python3 -m venv venv

# 激活虚拟环境
echo "🔄 激活虚拟环境..."
source venv/bin/activate

# 升级 pip
echo ""
echo "📦 升级 pip..."
pip install --upgrade pip

# 安装依赖
echo ""
echo "📚 安装项目依赖..."
pip install -r requirements.txt

# 创建必要的目录
echo ""
echo "📁 创建项目目录..."
mkdir -p data
mkdir -p logs

# 复制环境变量文件
echo ""
echo "⚙️ 配置环境变量..."
if [ ! -f .env ]; then
    cp .env.example .env 2>/dev/null || echo "# 请配置您的 DeepSeek API Key
DEEPSEEK_API_KEY=your_api_key_here
DATABASE_URL=sqlite:///./data/life_management.db
HOST=0.0.0.0
PORT=8000" > .env
fi

echo ""
echo "================================================"
echo "   ✅ 安装完成！"
echo "================================================"
echo ""
echo "📝 使用说明："
echo ""
echo "1. 配置 DeepSeek API Key:"
echo "   编辑 .env 文件，填入您的 API Key"
echo ""
echo "2. 启动系统:"
echo "   python run.py"
echo ""
echo "3. 访问系统:"
echo "   打开浏览器访问 http://localhost:8000"
echo ""
echo "4. 查看 API 文档:"
echo "   访问 http://localhost:8000/docs"
echo ""
echo "================================================"
echo ""
echo "💡 提示: 首次使用请先设置 DeepSeek API Key"
echo "   获取 API Key: https://platform.deepseek.com/"
echo ""