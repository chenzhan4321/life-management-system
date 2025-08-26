# 部署指南 - 生活管理系统

## 部署架构

- **前端**: GitHub Pages (静态文件托管)
- **后端**: Vercel (Python FastAPI)

## 部署步骤

### 1. 部署后端到 Vercel

1. **安装 Vercel CLI**（如果还没安装）
   ```bash
   npm i -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **部署后端**
   ```bash
   vercel --prod
   ```
   
   部署时的配置选项：
   - Project Name: `life-management-api`
   - Framework: Other
   - Build Command: （留空）
   - Output Directory: （留空）
   - Install Command: `pip install -r requirements.txt`

4. **记录你的 API URL**
   部署成功后，会得到类似这样的URL：
   ```
   https://life-management-api.vercel.app
   ```

### 2. 更新前端配置

如果你的 Vercel 后端 URL 与默认的不同，需要更新 `js/modules/api.js`：

```javascript
// 将 'life-management-api.vercel.app' 替换为你的实际 Vercel URL
return 'https://your-actual-api.vercel.app';
```

### 3. 部署前端到 GitHub Pages

1. **提交所有更改**
   ```bash
   git add .
   git commit -m "配置部署设置"
   git push origin main
   ```

2. **启用 GitHub Pages**
   - 访问你的 GitHub 仓库：https://github.com/chenzhan4321/life-management-system
   - 进入 Settings → Pages
   - Source: 选择 "GitHub Actions"
   - 保存设置

3. **等待部署完成**
   - GitHub Actions 会自动运行部署工作流
   - 可以在 Actions 标签页查看部署进度

4. **访问你的应用**
   - 前端地址：https://chenzhan4321.github.io/life-management-system
   - 后端地址：https://life-management-api.vercel.app

## 验证部署

### 检查前端
1. 访问 GitHub Pages URL
2. 检查页面是否正常加载
3. 查看浏览器控制台是否有错误

### 检查后端
1. 访问 API 健康检查端点：
   ```
   https://life-management-api.vercel.app/health
   ```
2. 应该返回类似：
   ```json
   {
     "status": "ok",
     "version": "4.0.0",
     "timestamp": "2024-xx-xx..."
   }
   ```

### 测试完整功能
1. 在前端创建一个新任务
2. 刷新页面，确认任务仍然存在
3. 测试 AI 处理功能

## 常见问题

### CORS 错误
如果遇到 CORS 错误，确保：
- Vercel 后端的 CORS 配置允许 GitHub Pages 域名
- API URL 配置正确

### API 连接失败
1. 检查 Vercel 部署是否成功
2. 确认 API URL 正确
3. 测试 API 健康检查端点

### GitHub Pages 404 错误
1. 确保 GitHub Actions 工作流成功运行
2. 检查 GitHub Pages 设置是否正确
3. 等待几分钟让 CDN 更新

## 本地开发

```bash
# 启动后端
python main.py

# 直接打开 index.html 或使用简单服务器
python -m http.server 8080
```

## 更新部署

### 更新后端
```bash
vercel --prod
```

### 更新前端
```bash
git add .
git commit -m "更新内容"
git push origin main
```

GitHub Actions 会自动重新部署前端。

## 监控

- **GitHub Actions**: 查看部署历史和日志
- **Vercel Dashboard**: 监控 API 使用情况和日志
- **浏览器开发工具**: 调试前端问题

## 安全注意事项

1. 不要在代码中硬编码敏感信息
2. 使用环境变量存储 API 密钥（如需要）
3. 定期更新依赖包
4. 监控异常流量

## 支持

如有问题，请查看：
- [GitHub Issues](https://github.com/chenzhan4321/life-management-system/issues)
- [Vercel 文档](https://vercel.com/docs)
- [GitHub Pages 文档](https://docs.github.com/en/pages)