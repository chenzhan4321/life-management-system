// 通知管理器模块 - 统一管理所有通知和提示
// 版本: v4.0

class NotificationManager {
    constructor() {
        this.toastContainer = null;
        this.notifications = new Map(); // 存储活动通知
        this.notificationQueue = [];    // 通知队列
        this.isProcessingQueue = false; // 队列处理状态
        this.maxToasts = 5;            // 最大同时显示的toast数量
        this.defaultDuration = 4000;   // 默认显示时间
        
        this.toastTypes = {
            success: { icon: '✅', color: '#10b981', sound: 'success' },
            error: { icon: '❌', color: '#ef4444', sound: 'error' },
            warning: { icon: '⚠️', color: '#f59e0b', sound: 'warning' },
            info: { icon: 'ℹ️', color: '#3b82f6', sound: 'info' },
            loading: { icon: '⏳', color: '#6b7280', sound: null }
        };

        this._initializeToastContainer();
        this._requestNotificationPermission();
        
        console.log('🔔 通知管理器初始化完成');
    }

    // 初始化Toast容器
    _initializeToastContainer() {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this._createToastContainer();
            });
        } else {
            this._createToastContainer();
        }
    }

    // 创建Toast容器
    _createToastContainer() {
        this.toastContainer = document.getElementById('toast');
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toast';
            this.toastContainer.className = 'toast-container';
            document.body.appendChild(this.toastContainer);
        }
    }

    // 请求浏览器通知权限
    async _requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.warn('⚠️ 浏览器不支持通知功能');
            return false;
        }

        if (Notification.permission === 'granted') {
            console.log('✅ 通知权限已授予');
            return true;
        }

        if (Notification.permission !== 'denied') {
            try {
                const permission = await Notification.requestPermission();
                const granted = permission === 'granted';
                console.log(granted ? '✅ 通知权限已授予' : '❌ 通知权限被拒绝');
                return granted;
            } catch (error) {
                console.warn('❌ 请求通知权限失败:', error);
                return false;
            }
        }

        return false;
    }

    // 显示Toast通知
    showToast(message, type = 'info', options = {}) {
        const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const toastConfig = {
            id: toastId,
            message: String(message),
            type: type in this.toastTypes ? type : 'info',
            duration: options.duration || this.defaultDuration,
            persistent: options.persistent || false,
            action: options.action || null,
            ...options
        };

        // 添加到队列
        this.notificationQueue.push(toastConfig);
        
        // 处理队列
        this._processToastQueue();
        
        return toastId;
    }

    // 处理Toast队列
    async _processToastQueue() {
        if (this.isProcessingQueue || this.notificationQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.notificationQueue.length > 0 && this.notifications.size < this.maxToasts) {
            const config = this.notificationQueue.shift();
            await this._displayToast(config);
            
            // 稍微延迟避免动画冲突
            await this._delay(100);
        }

        this.isProcessingQueue = false;
    }

    // 显示单个Toast
    async _displayToast(config) {
        const typeConfig = this.toastTypes[config.type];
        
        // 创建Toast元素
        const toastElement = document.createElement('div');
        toastElement.className = `toast-item toast-${config.type}`;
        toastElement.setAttribute('data-toast-id', config.id);
        
        // Toast内容
        const contentHtml = `
            <div class="toast-content">
                <span class="toast-icon">${typeConfig.icon}</span>
                <span class="toast-message">${this._escapeHtml(config.message)}</span>
                ${config.action ? `<button class="toast-action" onclick="this.closest('.toast-item').dispatchEvent(new CustomEvent('action'))">${config.action.text}</button>` : ''}
                <button class="toast-close" onclick="notificationManager.hideToast('${config.id}')" title="关闭">×</button>
            </div>
        `;
        
        toastElement.innerHTML = contentHtml;
        
        // 设置样式
        toastElement.style.setProperty('--toast-color', typeConfig.color);
        
        // 添加事件监听
        if (config.action && config.action.callback) {
            toastElement.addEventListener('action', config.action.callback);
        }
        
        // 添加到容器
        this.toastContainer.appendChild(toastElement);
        this.notifications.set(config.id, { element: toastElement, config });
        
        // 触发动画
        await this._delay(50);
        toastElement.classList.add('show');
        
        // 播放声音
        this._playNotificationSound(typeConfig.sound);
        
        // 设置自动消失
        if (!config.persistent && config.duration > 0) {
            setTimeout(() => {
                this.hideToast(config.id);
            }, config.duration);
        }
        
        console.log(`🔔 Toast显示: ${config.message} (${config.type})`);
    }

    // 隐藏Toast
    hideToast(toastId) {
        const notification = this.notifications.get(toastId);
        if (!notification) return;

        const { element } = notification;
        
        // 移除显示类触发退出动画
        element.classList.remove('show');
        
        // 等待动画完成后移除元素
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.notifications.delete(toastId);
            
            // 处理待显示的队列
            this._processToastQueue();
        }, 300);
        
        console.log(`🔔 Toast隐藏: ${toastId}`);
    }

    // 显示浏览器系统通知
    showSystemNotification(title, options = {}) {
        if (Notification.permission !== 'granted') {
            console.warn('❌ 没有通知权限，显示Toast代替');
            this.showToast(title, 'info', { duration: 6000 });
            return null;
        }

        const notificationOptions = {
            body: options.body || '',
            icon: options.icon || './static/icons/favicon-32x32.png',
            badge: options.badge || './static/icons/favicon-32x32.png',
            tag: options.tag || 'life-management-notification',
            requireInteraction: options.requireInteraction || false,
            silent: options.silent || false,
            data: options.data || {},
            ...options
        };

        try {
            const notification = new Notification(title, notificationOptions);
            
            // 添加点击事件
            notification.onclick = (event) => {
                event.preventDefault();
                window.focus();
                
                if (options.onClick) {
                    options.onClick(event);
                }
                
                notification.close();
            };
            
            // 自动关闭
            if (options.duration) {
                setTimeout(() => notification.close(), options.duration);
            }
            
            console.log('🔔 系统通知已发送:', title);
            return notification;
            
        } catch (error) {
            console.error('❌ 系统通知发送失败:', error);
            this.showToast(title, 'info', { duration: 6000 });
            return null;
        }
    }

    // 显示确认对话框
    showConfirm(message, options = {}) {
        return new Promise((resolve) => {
            const confirmId = this.showToast(message, 'warning', {
                persistent: true,
                action: {
                    text: options.confirmText || '确认',
                    callback: () => {
                        this.hideToast(confirmId);
                        resolve(true);
                    }
                }
            });

            // 添加取消按钮逻辑
            const toastElement = this.notifications.get(confirmId)?.element;
            if (toastElement) {
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'toast-action secondary';
                cancelBtn.textContent = options.cancelText || '取消';
                cancelBtn.onclick = () => {
                    this.hideToast(confirmId);
                    resolve(false);
                };
                
                const actionBtn = toastElement.querySelector('.toast-action');
                if (actionBtn) {
                    actionBtn.parentNode.insertBefore(cancelBtn, actionBtn);
                }
            }
        });
    }

    // 显示加载通知
    showLoading(message = '加载中...', options = {}) {
        const loadingId = this.showToast(message, 'loading', {
            persistent: true,
            ...options
        });
        
        return {
            id: loadingId,
            update: (newMessage) => {
                const notification = this.notifications.get(loadingId);
                if (notification) {
                    const messageEl = notification.element.querySelector('.toast-message');
                    if (messageEl) {
                        messageEl.textContent = newMessage;
                    }
                }
            },
            hide: () => this.hideToast(loadingId)
        };
    }

    // 清除所有Toast
    clearAllToasts() {
        this.notifications.forEach((_, toastId) => {
            this.hideToast(toastId);
        });
        this.notificationQueue.length = 0;
        
        console.log('🔔 所有Toast已清除');
    }

    // 播放通知声音（可选功能）
    _playNotificationSound(soundType) {
        if (!soundType) return;
        
        // 这里可以实现声音播放逻辑
        // 考虑到浏览器策略，需要用户交互后才能播放声音
        
        console.log(`🔊 播放通知声音: ${soundType}`);
    }

    // HTML转义
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 延时工具方法
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 获取统计信息
    getStats() {
        return {
            activeToasts: this.notifications.size,
            queuedToasts: this.notificationQueue.length,
            hasPermission: Notification.permission === 'granted',
            maxToasts: this.maxToasts
        };
    }
}

// 导出通知管理器实例
export const notificationManager = new NotificationManager();

// 全局暴露（兼容其他模块调用）
window.notificationManager = notificationManager;

console.log('🔔 通知管理器模块加载完成');