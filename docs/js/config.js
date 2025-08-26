// API 配置文件
const API_CONFIG = {
    // Vercel 后端 API 地址
    // 注意：这是你的实际 Vercel 部署地址
    API_BASE_URL: 'https://lifemanagement.vercel.app',
    
    // 备用配置
    LOCAL_API_URL: 'http://localhost:8000',
    
    // 自动检测环境
    getApiUrl: function() {
        const hostname = window.location.hostname;
        
        // 本地开发环境
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return this.LOCAL_API_URL;
        }
        
        // 生产环境（GitHub Pages 或其他）
        return this.API_BASE_URL;
    }
};

// 导出配置
window.API_CONFIG = API_CONFIG;