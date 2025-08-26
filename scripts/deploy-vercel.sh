#!/bin/bash

# Vercel 部署脚本
# 用于将后端API部署到 Vercel

echo "🚀 开始部署后端到 Vercel..."

# 确保在项目根目录
cd "$(dirname "$0")/.."

# 检查是否安装了 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI 未安装"
    echo "请运行: npm i -g vercel"
    exit 1
fi

# 部署到 Vercel
echo "📦 部署后端API..."
vercel --prod

echo "✅ 部署完成！"
echo ""
echo "📝 部署后请记得："
echo "1. 更新 frontend/js/config.js 中的 Vercel 后端地址"
echo "2. 确保 Vercel 环境变量配置正确"
echo "3. 检查 CORS 设置是否允许 GitHub Pages 域名"