// API模块 - 统一处理所有后端通信
// 版本: v4.0

class APIClient {
    constructor() {
        this.baseURL = this._detectAPIBase();
        this.isOnline = navigator.onLine;
        this.retryCount = 3;
        this.retryDelay = 1000; // ms
        this.requestTimeout = 10000; // 10s
        
        // 监听网络状态
        this._setupNetworkListeners();
        
        console.log('🔗 API客户端初始化完成:', {
            baseURL: this.baseURL,
            isOnline: this.isOnline
        });
    }

    // 自动检测API基础URL
    _detectAPIBase() {
        const hostname = window.location.hostname;
        
        // GitHub Pages - 使用Vercel后端
        if (hostname.includes('github.io')) {
            return 'https://your-vercel-app.vercel.app';
        }
        
        // Vercel部署
        if (hostname.includes('vercel.app')) {
            return '';  // 同域API
        }
        
        // 本地开发
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:8000';
        }
        
        // 默认使用Vercel
        return 'https://your-vercel-app.vercel.app';
    }

    // 设置网络监听器
    _setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 网络已连接');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📱 网络已断开');
        });
    }

    // 通用请求方法，包含错误处理和重试机制
    async request(endpoint, options = {}) {
        const url = this.baseURL + endpoint;
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'LifeManagementSystem/4.0'
            },
            timeout: this.requestTimeout
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        // 离线状态检查
        if (!this.isOnline) {
            throw new Error('网络连接不可用');
        }

        // 重试机制
        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                console.log(`🚀 API请求 [${attempt}/${this.retryCount}]:`, {
                    url,
                    method: finalOptions.method
                });

                // 创建带超时的fetch请求
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), finalOptions.timeout);

                const response = await fetch(url, {
                    ...finalOptions,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                // 处理响应
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('✅ API响应成功:', endpoint);
                return data;

            } catch (error) {
                console.warn(`❌ API请求失败 [${attempt}/${this.retryCount}]:`, error.message);
                
                // 最后一次尝试失败
                if (attempt === this.retryCount) {
                    throw new APIError(error.message, endpoint, finalOptions.method);
                }
                
                // 等待后重试
                await this._delay(this.retryDelay * attempt);
            }
        }
    }

    // 延时工具方法
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ========== 任务相关API ==========

    // 获取所有任务
    async getTasks() {
        return await this.request('/tasks');
    }

    // 创建任务
    async createTask(taskData) {
        return await this.request('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    }

    // 更新任务
    async updateTask(taskId, taskData) {
        return await this.request(`/tasks/${taskId}`, {
            method: 'PATCH',
            body: JSON.stringify(taskData)
        });
    }

    // 删除任务
    async deleteTask(taskId) {
        return await this.request(`/tasks/${taskId}`, {
            method: 'DELETE'
        });
    }

    // AI处理任务
    async aiProcessTasks(inputText) {
        return await this.request('/tasks/ai-process', {
            method: 'POST',
            body: JSON.stringify({ input: inputText })
        });
    }

    // ========== 分析相关API ==========

    // 获取每日分析数据
    async getDailyAnalytics(date = null) {
        const params = date ? `?date=${date}` : '';
        return await this.request(`/analytics/daily${params}`);
    }

    // 更新本体论
    async updateOntology() {
        return await this.request('/ontology/update', {
            method: 'POST'
        });
    }

    // ========== 健康检查 ==========

    // 检查API健康状态
    async healthCheck() {
        try {
            const response = await this.request('/health');
            return {
                isHealthy: true,
                version: response.version,
                timestamp: response.timestamp
            };
        } catch (error) {
            return {
                isHealthy: false,
                error: error.message
            };
        }
    }
}

// 自定义API错误类
class APIError extends Error {
    constructor(message, endpoint, method) {
        super(message);
        this.name = 'APIError';
        this.endpoint = endpoint;
        this.method = method;
        this.timestamp = new Date().toISOString();
    }
}

// 导出API客户端实例
export const apiClient = new APIClient();
export { APIError };

// 全局错误处理
window.addEventListener('unhandledrejection', event => {
    if (event.reason instanceof APIError) {
        console.error('🚨 未处理的API错误:', {
            message: event.reason.message,
            endpoint: event.reason.endpoint,
            method: event.reason.method,
            timestamp: event.reason.timestamp
        });
        
        // 显示用户友好的错误信息
        if (window.notificationManager) {
            window.notificationManager.showToast(
                '网络请求失败，请检查网络连接',
                'error'
            );
        }
    }
});

console.log('📦 API模块加载完成');