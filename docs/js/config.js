// API 配置文件
const API_CONFIG = {
    // Railway 后端 API 地址
    // 这是你部署在Railway的后端服务
    API_BASE_URL: 'https://api-production-70ed.up.railway.app',
    
    // 本地开发环境
    LOCAL_API_URL: 'http://localhost:8000',
    
    // 自动检测环境
    getApiUrl: function() {
        const hostname = window.location.hostname;
        
        // 本地开发环境
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return this.LOCAL_API_URL;
        }
        
        // 生产环境（GitHub Pages）
        return this.API_BASE_URL;
    }
};

// 导出配置
window.API_CONFIG = API_CONFIG;