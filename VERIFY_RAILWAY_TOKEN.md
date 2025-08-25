# Railway Token 验证指南

如果仍然遇到 "Project Token not found" 错误，请按以下步骤检查：

## 1. 验证GitHub Secrets设置

1. 访问: https://github.com/chenzhan4321/life-management-system/settings/secrets/actions
2. 确认存在名为 `RAILWAY_TOKEN` 的secret
3. 确认token值不为空

## 2. 重新生成Railway Token

1. 访问 [Railway Dashboard](https://railway.app/account/tokens)
2. 删除现有的token
3. 点击 "New Token"
4. 命名为 "GitHub Actions"
5. 复制新生成的token

## 3. 更新GitHub Secret

1. 在GitHub仓库 → Settings → Secrets and variables → Actions
2. 编辑 `RAILWAY_TOKEN`
3. 粘贴新的token值
4. 保存

## 4. 检查Railway项目设置

在Railway Dashboard中:
1. 确认项目存在
2. 确认项目名称（应该能自动检测）
3. 如果有多个项目，记下正确的项目ID

## 5. 手动测试Token

在本地测试token是否有效:

```bash
# 安装Railway CLI
npm install -g @railway/cli

# 测试登录
railway login --token YOUR_TOKEN_HERE

# 查看项目列表
railway projects
```

## 6. Alternative: 手动部署

如果GitHub Actions持续失败，可以手动部署:

```bash
# 克隆仓库
git clone https://github.com/chenzhan4321/life-management-system.git
cd life-management-system

# 登录Railway
railway login

# 初始化项目
railway init

# 部署
railway up
```

## 7. 检查Token权限

确保token有以下权限:
- ✅ Read projects
- ✅ Deploy services
- ✅ Manage environment variables

## 常见问题

**Q: Token正确但仍然失败？**
A: 检查项目是否在正确的Railway团队/账户下

**Q: 需要指定项目ID？**
A: 如果自动检测失败，在railway.json中指定项目ID

**Q: 部署到错误的服务？**  
A: 在railway.json中指定service名称