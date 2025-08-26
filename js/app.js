// 生活管理系统主应用 v4.0 - 模块化重构版
// 统一管理所有功能模块和应用生命周期

import { apiClient } from './modules/api.js';
import { themeManager } from './modules/theme-manager.js';
import { notificationManager } from './modules/notification-manager.js';
import { taskProcessor } from './modules/task-processor.js';
import { taskManager } from './modules/task-manager.js';

class LifeManagementApp {
    constructor() {
        this.version = '4.0.0';
        this.buildTime = new Date().toISOString();
        this.isInitialized = false;
        this.modules = {};
        this.analytics = null;
        this.pwaInstallPrompt = null;
        
        console.log(`🚀 生活管理系统 v${this.version} 启动中...`);
        console.log(`📦 构建时间: ${this.buildTime}`);
        
        this._initializeApp();
    }

    // 初始化应用
    async _initializeApp() {
        try {
            // 注册所有模块
            this._registerModules();
            
            // 等待DOM就绪
            await this._waitForDOM();
            
            // 初始化核心功能
            await this._initializeCore();
            
            // 设置事件监听器
            this._setupGlobalEventListeners();
            
            // 初始化PWA功能
            this._initializePWA();
            
            // 执行健康检查
            await this._performHealthCheck();
            
            // 加载初始数据
            await this._loadInitialData();
            
            // 标记初始化完成
            this.isInitialized = true;
            
            // 显示启动完成通知
            this._showStartupComplete();
            
            console.log('🎉 应用初始化完成!');
            
        } catch (error) {
            console.error('❌ 应用初始化失败:', error);
            this._showStartupError(error);
        }
    }

    // 注册所有模块
    _registerModules() {
        this.modules = {
            api: apiClient,
            theme: themeManager,
            notification: notificationManager,
            taskProcessor: taskProcessor,
            taskManager: taskManager
        };
        
        // 全局暴露模块（兼容性）
        window.app = this;
        
        console.log('📦 模块注册完成:', Object.keys(this.modules));
    }

    // 等待DOM就绪
    _waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    // 初始化核心功能
    async _initializeCore() {
        console.log('⚙️ 初始化核心功能...');
        
        // 预加载主题资源
        this.modules.theme.preloadThemes();
        
        // 初始化快捷键
        this._setupKeyboardShortcuts();
        
        // 初始化性能监控
        this._setupPerformanceMonitoring();
        
        // 初始化错误处理
        this._setupErrorHandling();
        
        console.log('✅ 核心功能初始化完成');
    }

    // 设置全局事件监听器
    _setupGlobalEventListeners() {
        // 主题变化事件
        window.addEventListener('themeChanged', (event) => {
            console.log('🎨 主题已变化:', event.detail.theme);
            this._updateAppearance(event.detail.theme);
        });

        // 任务变化事件
        window.addEventListener('tasksChanged', (event) => {
            console.log('📋 任务数据已变化:', event.detail.source);
            this._onTasksChanged();
        });

        // 窗口焦点事件
        window.addEventListener('focus', () => {
            // 窗口获得焦点时刷新数据
            if (this.isInitialized) {
                this._refreshOnFocus();
            }
        });

        // 窗口失去焦点时保存状态
        window.addEventListener('blur', () => {
            this._saveState();
        });

        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isInitialized) {
                this._onPageVisible();
            }
        });

        // 网络状态变化
        window.addEventListener('online', () => {
            this._onNetworkStatusChange(true);
        });
        
        window.addEventListener('offline', () => {
            this._onNetworkStatusChange(false);
        });

        console.log('🔗 全局事件监听器设置完成');
    }

    // 设置键盘快捷键
    _setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + K: 快速聚焦到AI输入框
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                const aiInput = document.getElementById('aiTaskInput');
                if (aiInput) {
                    aiInput.focus();
                    this.modules.notification.showToast('💡 快捷键提示: Ctrl+Enter 执行AI处理', 'info', { duration: 2000 });
                }
            }
            
            // Ctrl/Cmd + /: 显示快捷键帮助
            if ((event.ctrlKey || event.metaKey) && event.key === '/') {
                event.preventDefault();
                this._showKeyboardShortcuts();
            }
            
            // Ctrl/Cmd + Shift + T: 切换主题
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
                event.preventDefault();
                this.modules.theme.toggleTheme();
            }
            
            // Escape: 清除所有通知
            if (event.key === 'Escape') {
                this.modules.notification.clearAllToasts();
            }
        });
        
        console.log('⌨️ 键盘快捷键设置完成');
    }

    // 设置性能监控
    _setupPerformanceMonitoring() {
        // 监控长任务
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) { // 超过50ms的长任务
                            console.warn('⚠️ 检测到长任务:', {
                                duration: entry.duration,
                                startTime: entry.startTime,
                                name: entry.name
                            });
                        }
                    }
                });
                
                observer.observe({ entryTypes: ['longtask'] });
            } catch (error) {
                console.log('⚠️ 性能监控不可用:', error.message);
            }
        }
        
        // 内存监控（如果可用）
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
                    console.warn('⚠️ 内存使用率过高:', {
                        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
                        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
                        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
                    });
                }
            }, 30000); // 每30秒检查一次
        }
        
        console.log('📊 性能监控设置完成');
    }

    // 设置错误处理
    _setupErrorHandling() {
        // 全局错误捕获
        window.addEventListener('error', (event) => {
            console.error('🚨 JavaScript错误:', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
            
            this._handleGlobalError(event.error);
        });
        
        // Promise拒绝捕获
        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 未处理的Promise拒绝:', event.reason);
            this._handleGlobalError(event.reason);
        });
        
        console.log('🛡️ 错误处理设置完成');
    }

    // 初始化PWA功能
    _initializePWA() {
        // PWA安装提示已在HTML中处理
        
        // 监听安装提示事件
        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            this.pwaInstallPrompt = event;
            this._showPWAInstallBanner();
        });
        
        // 监听安装完成事件
        window.addEventListener('appinstalled', () => {
            this.modules.notification.showToast('🎉 应用已安装到主屏幕!', 'success');
            this.pwaInstallPrompt = null;
        });
        
        console.log('📱 PWA功能初始化完成');
    }

    // 执行健康检查
    async _performHealthCheck() {
        console.log('🏥 执行系统健康检查...');
        
        try {
            const health = await this.modules.api.healthCheck();
            
            if (health.isHealthy) {
                console.log('✅ 后端服务健康:', health.version);
            } else {
                console.warn('⚠️ 后端服务异常:', health.error);
                this.modules.notification.showToast(
                    '⚠️ 后端服务连接异常，部分功能可能受限',
                    'warning',
                    { duration: 8000 }
                );
            }
        } catch (error) {
            console.warn('❌ 健康检查失败:', error.message);
        }
        
        console.log('🏥 健康检查完成');
    }

    // 加载初始数据
    async _loadInitialData() {
        console.log('📊 加载初始数据...');
        
        try {
            // 加载分析数据
            await this._loadAnalytics();
            
            // 更新洞察面板
            this._updateInsights();
            
        } catch (error) {
            console.warn('⚠️ 初始数据加载失败:', error.message);
        }
        
        console.log('📊 初始数据加载完成');
    }

    // 加载分析数据
    async _loadAnalytics() {
        try {
            const analytics = await this.modules.api.getDailyAnalytics();
            this.analytics = analytics;
            console.log('📈 分析数据加载完成');
        } catch (error) {
            console.warn('⚠️ 分析数据加载失败:', error.message);
        }
    }

    // 更新洞察面板
    _updateInsights() {
        const insightsContainer = document.getElementById('aiInsights');
        if (!insightsContainer || !this.analytics?.insights) return;
        
        const insights = this.analytics.insights.length > 0 
            ? this.analytics.insights 
            : ['💡 开始添加任务来获得个性化洞察'];
        
        const insightsHtml = insights.map(insight => `
            <div class="insight-item">
                <div class="insight-icon">💡</div>
                <div class="insight-text">${this._escapeHtml(insight)}</div>
            </div>
        `).join('');
        
        insightsContainer.innerHTML = insightsHtml;
    }

    // 显示启动完成通知
    _showStartupComplete() {
        const messages = [
            '🎯 生活管理系统已就绪!',
            '✨ 准备好管理您的生活了!',
            '🚀 所有功能已加载完成!',
            '💡 开始您的高效生活之旅!'
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        this.modules.notification.showToast(randomMessage, 'success', {
            duration: 3000
        });
    }

    // 显示启动错误
    _showStartupError(error) {
        const errorMessage = `应用启动失败: ${error.message || '未知错误'}`;
        
        // 显示错误通知
        if (this.modules.notification) {
            this.modules.notification.showToast(errorMessage, 'error', {
                persistent: true,
                action: {
                    text: '重新加载',
                    callback: () => location.reload()
                }
            });
        } else {
            // 如果通知模块不可用，使用原生alert
            alert(errorMessage + '\n\n点击确定重新加载页面。');
            location.reload();
        }
    }

    // 处理主题变化
    _updateAppearance(theme) {
        // 更新meta标签
        document.body.setAttribute('data-theme', theme);
        
        // 触发自定义事件给其他组件
        window.dispatchEvent(new CustomEvent('appThemeChanged', {
            detail: { theme }
        }));
    }

    // 任务变化处理
    _onTasksChanged() {
        // 重新加载分析数据
        this._loadAnalytics().then(() => {
            this._updateInsights();
        });
    }

    // 窗口获得焦点时刷新
    _refreshOnFocus() {
        // 检查是否需要刷新数据（避免频繁刷新）
        const lastRefresh = this.modules.taskManager.lastRefresh;
        if (!lastRefresh || (Date.now() - lastRefresh.getTime()) > 60000) { // 超过1分钟
            this.modules.taskManager.loadTasks();
        }
    }

    // 保存应用状态
    _saveState() {
        const state = {
            theme: this.modules.theme.currentTheme,
            timestamp: Date.now(),
            selectedTasks: Array.from(this.modules.taskManager.selectedTasks)
        };
        
        try {
            localStorage.setItem('app-state', JSON.stringify(state));
        } catch (error) {
            console.warn('⚠️ 状态保存失败:', error.message);
        }
    }

    // 页面可见时的处理
    _onPageVisible() {
        console.log('👁️ 页面变为可见，检查数据更新...');
        this._refreshOnFocus();
    }

    // 网络状态变化处理
    _onNetworkStatusChange(isOnline) {
        if (isOnline) {
            console.log('🌐 网络已连接，恢复功能...');
            // 重新加载数据
            this.modules.taskManager.loadTasks();
            this._loadAnalytics();
        } else {
            console.log('📱 网络已断开，进入离线模式...');
        }
    }

    // 显示PWA安装横幅
    _showPWAInstallBanner() {
        const banner = document.getElementById('pwaInstallBanner');
        const installBtn = document.getElementById('pwaInstallBtn');
        const dismissBtn = document.getElementById('pwaDismissBtn');
        
        if (!banner || !installBtn || !dismissBtn) return;
        
        // 检查是否已经拒绝过
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) return;
        
        banner.classList.remove('hidden');
        
        // 安装按钮
        installBtn.onclick = async () => {
            if (this.pwaInstallPrompt) {
                this.pwaInstallPrompt.prompt();
                const { outcome } = await this.pwaInstallPrompt.userChoice;
                
                if (outcome === 'accepted') {
                    this.modules.notification.showToast('🎉 应用安装中...', 'success');
                } else {
                    localStorage.setItem('pwa-install-dismissed', 'true');
                }
                
                this.pwaInstallPrompt = null;
                banner.classList.add('hidden');
            }
        };
        
        // 拒绝按钮
        dismissBtn.onclick = () => {
            banner.classList.add('hidden');
            localStorage.setItem('pwa-install-dismissed', 'true');
            
            // 7天后重新显示
            setTimeout(() => {
                localStorage.removeItem('pwa-install-dismissed');
            }, 7 * 24 * 60 * 60 * 1000);
        };
    }

    // 显示键盘快捷键帮助
    _showKeyboardShortcuts() {
        const shortcuts = [
            'Ctrl+K: 聚焦AI输入框',
            'Ctrl+Enter: 执行AI处理',
            'Ctrl+Shift+T: 切换主题',
            'Ctrl+/: 显示快捷键帮助',
            'Escape: 清除所有通知'
        ];
        
        const shortcutsText = shortcuts.join('\n');
        
        this.modules.notification.showToast(
            `⌨️ 键盘快捷键:\n\n${shortcutsText}`,
            'info',
            { duration: 8000 }
        );
    }

    // 处理全局错误
    _handleGlobalError(error) {
        // 显示用户友好的错误提示
        if (error?.name !== 'AbortError') { // 忽略取消的请求
            this.modules.notification?.showToast(
                '😔 系统出现了一些问题，请刷新页面重试',
                'error',
                {
                    duration: 8000,
                    action: {
                        text: '刷新',
                        callback: () => location.reload()
                    }
                }
            );
        }
        
        // 发送错误报告（如果需要）
        this._sendErrorReport(error);
    }

    // 发送错误报告（占位符）
    _sendErrorReport(error) {
        // 这里可以实现错误报告功能
        console.log('📤 错误报告已记录:', error);
    }

    // HTML转义工具方法
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 获取应用统计信息
    getStats() {
        return {
            version: this.version,
            buildTime: this.buildTime,
            isInitialized: this.isInitialized,
            modules: Object.keys(this.modules),
            tasks: this.modules.taskManager?.getStats(),
            notifications: this.modules.notification?.getStats(),
            uptime: Date.now() - new Date(this.buildTime).getTime()
        };
    }

    // 重启应用
    restart() {
        console.log('🔄 重启应用...');
        
        // 清理资源
        this.modules.taskManager?.destroy();
        
        // 重新加载页面
        location.reload();
    }

    // 导出数据（功能占位符）
    async exportData() {
        try {
            const data = {
                tasks: this.modules.taskManager.tasks,
                analytics: this.analytics,
                settings: {
                    theme: this.modules.theme.currentTheme
                },
                exportTime: new Date().toISOString()
            };
            
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `life-management-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            this.modules.notification.showToast('📊 数据导出成功', 'success');
            
        } catch (error) {
            console.error('❌ 数据导出失败:', error);
            this.modules.notification.showToast(`导出失败: ${error.message}`, 'error');
        }
    }
}

// 启动应用
const app = new LifeManagementApp();

// 全局暴露应用实例
window.app = app;

// 开发模式下的调试工具
if (process?.env?.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
    window.debug = {
        app,
        modules: app.modules,
        stats: () => app.getStats(),
        exportData: () => app.exportData(),
        restart: () => app.restart()
    };
    
    console.log('🛠️ 开发模式: debug工具已挂载到window.debug');
}

console.log('🎉 生活管理系统 v4.0 加载完成!');