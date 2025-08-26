// API模块 - 统一处理所有后端通信
// 版本: v4.0

class APIClient {
    constructor() {
        // 使用全局配置的 API 地址
        this.baseURL = window.API_CONFIG ? window.API_CONFIG.getApiUrl() : 'https://lifemanagement.vercel.app';
        this.isOnline = navigator.onLine;
        
        // 监听网络状态
        this._setupNetworkListeners();
        
        console.log('🔗 API客户端初始化完成:', {
            baseURL: this.baseURL,
            isOnline: this.isOnline
        });
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

    // 通用请求方法
    async request(endpoint, options = {}) {
        const url = this.baseURL + endpoint;
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
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

        try {
            console.log(`🚀 API请求:`, {
                url,
                method: finalOptions.method
            });

            const response = await fetch(url, finalOptions);

            // 处理响应
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ API响应成功:', endpoint);
            return data;

        } catch (error) {
            console.error('❌ API请求失败:', error.message);
            throw error;
        }
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

    // ========== 健康检查 ==========

    // 检查API健康状态
    async healthCheck() {
        try {
            const response = await this.request('/');
            return {
                isHealthy: true,
                version: response.version,
                message: response.message
            };
        } catch (error) {
            return {
                isHealthy: false,
                error: error.message
            };
        }
    }
}

// 导出API客户端实例
export const apiClient = new APIClient();

console.log('📦 API模块加载完成');