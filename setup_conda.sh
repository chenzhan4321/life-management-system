#!/bin/bash

# 生活管理系统 Conda 环境安装脚本

echo "================================================"
echo "   🎯 生活管理系统 - Conda 环境配置"
echo "================================================"
echo ""

# 设置环境名称
ENV_NAME="life_management"

# 检查 conda 是否安装
echo "📋 检查 Conda..."
if ! command -v conda &> /dev/null; then
    echo "❌ 错误: 未找到 Conda，请先安装 Anaconda 或 Miniconda"
    exit 1
fi

echo "✅ Conda 已安装"
conda --version

# 创建 conda 环境
echo ""
echo "🔧 创建 Conda 环境 ($ENV_NAME)..."
conda create -n $ENV_NAME python=3.9 -y

# 激活环境
echo ""
echo "🔄 激活 Conda 环境..."
source $(conda info --base)/etc/profile.d/conda.sh
conda activate $ENV_NAME

# 安装依赖
echo ""
echo "📦 安装项目依赖..."
pip install --upgrade pip
pip install -r requirements.txt

# 创建必要的目录
echo ""
echo "📁 创建项目目录..."
mkdir -p data
mkdir -p logs

# 配置环境变量
echo ""
echo "⚙️ 配置环境变量..."
if [ ! -f .env ]; then
    echo "创建 .env 文件..."
    echo "# DeepSeek API 配置
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# 数据库配置
DATABASE_URL=sqlite:///./data/life_management.db

# 服务器配置
HOST=0.0.0.0
PORT=8000

# 日志级别
LOG_LEVEL=INFO" > .env
fi

echo ""
echo "================================================"
echo "   ✅ Conda 环境配置完成！"
echo "================================================"
echo ""
echo "📝 使用说明："
echo ""
echo "1. 激活环境:"
echo "   conda activate $ENV_NAME"
echo ""
echo "2. 配置 DeepSeek API Key:"
echo "   编辑 .env 文件，填入您的 API Key"
echo "   nano .env  或  vim .env"
echo ""
echo "3. 启动系统:"
echo "   python run.py"
echo ""
echo "4. 访问系统:"
echo "   打开浏览器访问 http://localhost:8000"
echo ""
echo "5. 退出环境:"
echo "   conda deactivate"
echo ""
echo "================================================"
echo ""
echo "💡 提示: 请先配置 DeepSeek API Key"
echo "   获取 API Key: https://platform.deepseek.com/"
echo ""
echo "当前 .env 文件位置:"
echo "   $(pwd)/.env"
echo ""