#!/bin/bash

# GitHub Pages 部署脚本
# 用于将前端代码部署到 GitHub Pages

echo "🚀 开始部署前端到 GitHub Pages..."

# 确保在项目根目录
cd "$(dirname "$0")/.."

# 检查是否在正确的分支
CURRENT_BRANCH=$(git branch --show-current)
echo "当前分支: $CURRENT_BRANCH"

# 确保所有更改已提交
if [[ -n $(git status -s) ]]; then
    echo "⚠️  检测到未提交的更改，请先提交"
    exit 1
fi

# 创建临时部署分支
echo "📦 准备部署文件..."
git checkout -B gh-pages

# 清理不需要的文件
echo "🧹 清理文件..."
find . -maxdepth 1 ! -name 'frontend' ! -name '.git' ! -name '.gitignore' -exec rm -rf {} +

# 将frontend内容移到根目录
echo "📂 移动前端文件..."
mv frontend/* .
mv frontend/.nojekyll . 2>/dev/null || true
rmdir frontend

# 提交更改
echo "💾 提交部署文件..."
git add -A
git commit -m "Deploy to GitHub Pages - $(date '+%Y-%m-%d %H:%M:%S')"

# 推送到远程
echo "📤 推送到 GitHub..."
git push origin gh-pages --force

# 切换回原分支
echo "↩️  切换回原分支..."
git checkout $CURRENT_BRANCH

echo "✅ 部署完成！"
echo "🌐 您的网站将在几分钟后可访问："
echo "   https://[your-username].github.io/[repo-name]/"
echo ""
echo "📝 注意事项："
echo "1. 确保在仓库设置中启用了 GitHub Pages"
echo "2. 选择 gh-pages 分支作为源"
echo "3. 第一次部署可能需要等待几分钟"