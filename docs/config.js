// GitHub Pages 配置文件
const API_CONFIG = {
    // 后端API服务器地址
    // 你需要将后端部署到一个云服务器，然后在这里填写地址
    // 例如：https://your-api-server.herokuapp.com
    // 或者：https://your-api.vercel.app
    // 或者：https://api.yourdomain.com
    
    // 临时使用本地服务器（仅用于本地测试）
    baseURL: window.location.hostname === 'localhost' 
        ? 'http://localhost:8000' 
        : 'https://life-api.vercel.app',  // 请替换为你的实际API地址
    
    // API密钥（如果设置了的话）
    apiKey: '',  // 在生产环境中设置你的API密钥
    
    // 是否启用调试模式
    debug: window.location.hostname === 'localhost'
};

// 导出配置
window.API_CONFIG = API_CONFIG;