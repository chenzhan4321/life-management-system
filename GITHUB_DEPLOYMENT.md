# 🚀 GitHub Pages 部署指南

## 📋 部署架构说明

本项目支持前后端分离部署：
- **前端**：部署到 GitHub Pages（静态托管）
- **后端**：部署到云服务器或使用 Serverless 服务

## 🔐 安全配置

### 1. API认证配置

#### 环境变量设置
```bash
# .env 文件（不要提交到Git）
SECRET_KEY=your-secret-key-here  # JWT密钥
API_KEY=your-api-key-here        # API访问密钥
PRODUCTION=true                   # 生产环境标识
```

#### 前端配置
```javascript
// 在 app.js 中配置API端点和认证
const API_CONFIG = {
    // 开发环境
    development: {
        baseURL: 'http://localhost:8000',
        apiKey: null
    },
    // 生产环境
    production: {
        baseURL: 'https://your-api-server.com',  // 你的API服务器地址
        apiKey: 'your-api-key-here'              // 与后端一致的API密钥
    }
};

// 自动选择环境
const config = window.location.hostname === 'localhost' 
    ? API_CONFIG.development 
    : API_CONFIG.production;
```

## 📦 GitHub Pages 部署步骤

### 1. 准备静态文件

创建 `docs` 文件夹用于GitHub Pages：
```bash
# 创建部署目录
mkdir -p docs

# 复制前端文件
cp -r src/frontend/templates/index.html docs/
cp -r src/frontend/static/* docs/

# 修改路径（去掉/static前缀）
sed -i '' 's|/static/|./|g' docs/index.html
sed -i '' 's|/api/|https://your-api-server.com/api/|g' docs/*.js
```

### 2. 配置 GitHub Pages

1. 将代码推送到 GitHub：
```bash
git add .
git commit -m "准备GitHub Pages部署"
git push origin main
```

2. 在 GitHub 仓库设置中：
   - 进入 Settings → Pages
   - Source: Deploy from a branch
   - Branch: main
   - Folder: /docs
   - 点击 Save

3. 等待几分钟后访问：
   - `https://[你的用户名].github.io/[仓库名]/`

### 3. 配置自定义域名（可选）

1. 在 `docs` 文件夹创建 `CNAME` 文件：
```
your-domain.com
```

2. 在域名服务商配置：
   - A记录：指向 GitHub Pages IP
     - 185.199.108.153
     - 185.199.109.153
     - 185.199.110.153
     - 185.199.111.153
   - 或 CNAME记录：指向 `[你的用户名].github.io`

## 🌐 后端部署选项

### 选项1：使用 Vercel（推荐）

1. 安装 Vercel CLI：
```bash
npm i -g vercel
```

2. 创建 `vercel.json`：
```json
{
  "builds": [
    {
      "src": "run.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "run.py"
    }
  ]
}
```

3. 部署：
```bash
vercel --prod
```

### 选项2：使用 Heroku

1. 创建 `Procfile`：
```
web: uvicorn src.api.main:app --host 0.0.0.0 --port $PORT
```

2. 创建 `runtime.txt`：
```
python-3.11.0
```

3. 部署：
```bash
heroku create your-app-name
git push heroku main
```

### 选项3：使用 Railway

1. 连接 GitHub 仓库
2. 设置环境变量
3. 自动部署

### 选项4：自建服务器

1. 使用 Nginx 反向代理：
```nginx
server {
    listen 80;
    server_name api.your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-API-Key $http_x_api_key;
    }
}
```

2. 使用 systemd 管理服务：
```ini
[Unit]
Description=Life Management API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/project
Environment="PATH=/path/to/venv/bin"
Environment="API_KEY=your-api-key"
Environment="SECRET_KEY=your-secret-key"
Environment="PRODUCTION=true"
ExecStart=/path/to/venv/bin/uvicorn src.api.main:app --host 0.0.0.0 --port 8000

[Install]
WantedBy=multi-user.target
```

## 🔧 前端API集成

修改 `docs/app.js` 添加API认证：

```javascript
class APIClient {
    constructor() {
        this.baseURL = config.baseURL;
        this.apiKey = config.apiKey;
        this.token = localStorage.getItem('access_token');
    }
    
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // 添加认证头
        if (this.apiKey) {
            headers['X-API-Key'] = this.apiKey;
        }
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            ...options,
            headers,
            mode: 'cors',
            credentials: 'include'
        });
        
        if (response.status === 401) {
            // 认证失败，尝试刷新token
            await this.refreshToken();
        }
        
        return response;
    }
    
    async refreshToken() {
        if (!this.apiKey) return;
        
        const response = await fetch(`${this.baseURL}/api/auth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ api_key: this.apiKey })
        });
        
        if (response.ok) {
            const data = await response.json();
            this.token = data.access_token;
            localStorage.setItem('access_token', this.token);
        }
    }
}

// 使用示例
const api = new APIClient();

// 获取任务
async function getTasks() {
    const response = await api.request('/api/tasks');
    return response.json();
}
```

## 📱 PWA 配置

确保 `docs/manifest.json` 正确配置：
```json
{
    "name": "生活管理系统",
    "short_name": "生活管理",
    "description": "基于Palantir架构的个人生活管理系统",
    "start_url": "./",
    "display": "standalone",
    "theme_color": "#007AFF",
    "background_color": "#ffffff",
    "icons": [
        {
            "src": "./icon-192x192.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "./icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ]
}
```

## 🚨 安全注意事项

1. **永远不要**将以下内容提交到Git：
   - `.env` 文件
   - API密钥
   - 数据库密码
   - JWT密钥

2. **使用 `.gitignore`**：
```gitignore
.env
*.db
__pycache__/
venv/
.DS_Store
config.json
secrets.json
```

3. **CORS配置**：
   - 只允许你的GitHub Pages域名访问
   - 在生产环境严格限制允许的源

4. **HTTPS**：
   - GitHub Pages自动提供HTTPS
   - 确保API服务器也使用HTTPS

## 🔄 持续集成

### GitHub Actions 自动部署

创建 `.github/workflows/deploy.yml`：
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      
      - name: Build frontend
        run: |
          mkdir -p docs
          cp -r src/frontend/templates/index.html docs/
          cp -r src/frontend/static/* docs/
          
          # 替换API端点
          sed -i 's|http://localhost:8000|${{ secrets.API_URL }}|g' docs/*.js
          
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

## 🎯 测试部署

1. **本地测试**：
```bash
cd docs
python -m http.server 8080
# 访问 http://localhost:8080
```

2. **API连接测试**：
   - 打开浏览器开发者工具
   - 检查Network标签
   - 确认API请求正确发送
   - 验证认证头是否包含

3. **移动端测试**：
   - 使用手机访问GitHub Pages URL
   - 测试响应式布局
   - 测试PWA安装

## 📈 监控和分析

### 添加 Google Analytics（可选）
```html
<!-- 在 index.html 的 </head> 前添加 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🔗 相关资源

- [GitHub Pages 文档](https://docs.github.com/pages)
- [Vercel 文档](https://vercel.com/docs)
- [PWA 最佳实践](https://web.dev/progressive-web-apps/)
- [CORS 详解](https://developer.mozilla.org/docs/Web/HTTP/CORS)

## 💡 常见问题

### Q: API请求被CORS阻止？
A: 检查后端CORS配置，确保允许你的GitHub Pages域名。

### Q: PWA无法安装？
A: 确保使用HTTPS，manifest.json正确配置，Service Worker正常注册。

### Q: API认证失败？
A: 检查API密钥是否正确，环境变量是否设置。

### Q: 页面404错误？
A: 确保GitHub Pages设置正确，文件路径正确。

---

**提示**：部署前先在本地充分测试，确保所有功能正常工作！