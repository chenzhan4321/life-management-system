// GitHub Pages 配置文件
const API_CONFIG = {
    // 后端API服务器地址
    // 你需要将后端部署到一个云服务器，然后在这里填写地址
    // 例如：https://your-api-server.herokuapp.com
    // 或者：https://your-api.vercel.app
    // 或者：https://api.yourdomain.com
    
    // 后端API地址配置
    // 注：如果Railway服务不可用，请使用本地API或其他云服务
    baseURL: window.location.hostname === 'localhost' 
        ? 'http://localhost:8000' 
        : 'https://api-production-70ed.up.railway.app',  // Railway后端API（需要配置）
    
    // API密钥（如果设置了的话）
    apiKey: '',  // 在生产环境中设置你的API密钥
    
    // 是否启用调试模式
    debug: window.location.hostname === 'localhost'
};

// 导出配置
window.API_CONFIG = API_CONFIG;