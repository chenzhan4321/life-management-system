#!/bin/bash

# Railway 本地部署测试脚本
# 用于调试Railway部署问题

set -e  # 遇到错误就退出

TOKEN="ef894814-f4f3-443c-b1b4-a6e90c327c57"

echo "🚀 Railway Deployment Test"
echo "=========================="

# 检查Node.js
echo "📋 Checking Node.js..."
node --version
npm --version

# 安装Railway CLI
echo "📦 Installing Railway CLI..."
npm install -g @railway/cli

# 检查安装
echo "✅ Railway CLI version:"
railway --version

# 登录测试
echo "🔐 Testing Railway login..."
export RAILWAY_TOKEN="$TOKEN"
railway login --token $TOKEN

# 验证登录
echo "👤 Checking login status..."
railway whoami

# 列出项目
echo "📋 Listing projects..."
railway projects || echo "No projects found (this is normal)"

# 初始化项目（如果需要）
echo "🎯 Initializing project..."
railway init --name life-management-system || echo "Project initialization completed or already exists"

# 检查当前项目状态
echo "📊 Project status..."
railway status || echo "No active project selected"

echo "✅ Railway setup test completed!"
echo "If all steps passed, GitHub Actions should work too."