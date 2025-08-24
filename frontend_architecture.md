# 前端组件结构和用户界面设计

## 设计理念

基于现代 Web 设计原则和 macOS 原生 UI 风格，创建一个简洁、高效、直观的生活管理界面：

1. **macOS 原生风格**: 遵循 Apple Human Interface Guidelines
2. **响应式设计**: 适配不同屏幕尺寸
3. **组件化架构**: 可复用的 UI 组件
4. **数据驱动**: 基于 API 的动态内容
5. **无框架依赖**: 使用原生 HTML/CSS/JavaScript

## 整体 UI 架构

### 1. 基础模板系统

```html
<!-- frontend/templates/base.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}macOS 生活管理系统{% endblock %}</title>
    
    <!-- CSS 样式 -->
    <link rel="stylesheet" href="/static/css/main.css">
    <link rel="stylesheet" href="/static/css/components.css">
    
    <!-- macOS 风格图标 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    
    <style>
        /* macOS 风格的全局样式 */
        :root {
            --macos-blue: #007AFF;
            --macos-gray: #8E8E93;
            --macos-light-gray: #F2F2F7;
            --macos-dark-gray: #1C1C1E;
            --macos-green: #34C759;
            --macos-red: #FF3B30;
            --macos-orange: #FF9500;
            --macos-purple: #AF52DE;
            
            --shadow-light: 0 2px 8px rgba(0, 0, 0, 0.1);
            --shadow-medium: 0 4px 16px rgba(0, 0, 0, 0.15);
            --border-radius: 8px;
            --transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            color: #1d1d1f;
        }
    </style>
    
    {% block extra_css %}{% endblock %}
</head>
<body>
    <!-- 主导航栏 -->
    <nav class="main-navbar">
        <div class="navbar-container">
            <div class="navbar-brand">
                <i class="bi bi-apple"></i>
                <span>生活管理</span>
            </div>
            
            <ul class="navbar-nav">
                <li class="nav-item">
                    <a href="/" class="nav-link" data-page="dashboard">
                        <i class="bi bi-house"></i>
                        <span>仪表板</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="/tasks" class="nav-link" data-page="tasks">
                        <i class="bi bi-check-square"></i>
                        <span>任务管理</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="/schedule" class="nav-link" data-page="schedule">
                        <i class="bi bi-calendar3"></i>
                        <span>时间管理</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="/analytics" class="nav-link" data-page="analytics">
                        <i class="bi bi-graph-up"></i>
                        <span>数据分析</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="/settings" class="nav-link" data-page="settings">
                        <i class="bi bi-gear"></i>
                        <span>设置</span>
                    </a>
                </li>
            </ul>
            
            <!-- 用户信息和快速操作 -->
            <div class="navbar-actions">
                <button class="action-btn" id="quick-add-task" title="快速添加任务">
                    <i class="bi bi-plus-circle"></i>
                </button>
                <button class="action-btn" id="notifications" title="通知">
                    <i class="bi bi-bell"></i>
                    <span class="notification-badge">3</span>
                </button>
                <div class="user-profile">
                    <img src="/static/images/avatar.png" alt="用户头像" class="avatar">
                </div>
            </div>
        </div>
    </nav>
    
    <!-- 主内容区域 -->
    <main class="main-content">
        <div class="content-container">
            {% block content %}{% endblock %}
        </div>
    </main>
    
    <!-- 通用模态框 -->
    <div id="modal-overlay" class="modal-overlay">
        <div class="modal-container">
            <div class="modal-header">
                <h3 class="modal-title"></h3>
                <button class="modal-close">
                    <i class="bi bi-x"></i>
                </button>
            </div>
            <div class="modal-body"></div>
            <div class="modal-footer"></div>
        </div>
    </div>
    
    <!-- 通知系统 -->
    <div id="notification-container" class="notification-container"></div>
    
    <!-- JavaScript -->
    <script src="/static/js/main.js"></script>
    <script src="/static/js/api.js"></script>
    {% block extra_js %}{% endblock %}
</body>
</html>
```

### 2. 主页面 - 仪表板

```html
<!-- frontend/templates/index.html -->
{% extends "base.html" %}

{% block title %}仪表板 - macOS 生活管理系统{% endblock %}

{% block content %}
<div class="dashboard-container">
    <!-- 快速统计卡片 -->
    <section class="dashboard-stats">
        <div class="stats-grid">
            <div class="stat-card academic">
                <div class="stat-icon">
                    <i class="bi bi-book"></i>
                </div>
                <div class="stat-content">
                    <h3 class="stat-number" id="academic-tasks">0</h3>
                    <p class="stat-label">学术任务</p>
                    <div class="stat-progress">
                        <div class="progress-bar" style="width: 0%"></div>
                    </div>
                </div>
            </div>
            
            <div class="stat-card income">
                <div class="stat-icon">
                    <i class="bi bi-currency-dollar"></i>
                </div>
                <div class="stat-content">
                    <h3 class="stat-number" id="income-tasks">0</h3>
                    <p class="stat-label">收入任务</p>
                    <div class="stat-progress">
                        <div class="progress-bar" style="width: 0%"></div>
                    </div>
                </div>
            </div>
            
            <div class="stat-card growth">
                <div class="stat-icon">
                    <i class="bi bi-arrow-up-circle"></i>
                </div>
                <div class="stat-content">
                    <h3 class="stat-number" id="growth-tasks">0</h3>
                    <p class="stat-label">成长任务</p>
                    <div class="stat-progress">
                        <div class="progress-bar" style="width: 0%"></div>
                    </div>
                </div>
            </div>
            
            <div class="stat-card life">
                <div class="stat-icon">
                    <i class="bi bi-heart"></i>
                </div>
                <div class="stat-content">
                    <h3 class="stat-number" id="life-tasks">0</h3>
                    <p class="stat-label">生活任务</p>
                    <div class="stat-progress">
                        <div class="progress-bar" style="width: 0%"></div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    
    <!-- 今日概览 -->
    <section class="today-overview">
        <div class="section-header">
            <h2>今日概览</h2>
            <div class="section-actions">
                <button class="btn-secondary" id="refresh-today">
                    <i class="bi bi-arrow-clockwise"></i>
                    刷新
                </button>
            </div>
        </div>
        
        <div class="today-grid">
            <!-- 时间轴视图 -->
            <div class="timeline-container">
                <h3>时间安排</h3>
                <div class="timeline" id="today-timeline">
                    <!-- 动态加载时间块 -->
                </div>
            </div>
            
            <!-- 紧急任务列表 -->
            <div class="urgent-tasks-container">
                <h3>紧急任务</h3>
                <div class="task-list" id="urgent-tasks">
                    <!-- 动态加载紧急任务 -->
                </div>
            </div>
        </div>
    </section>
    
    <!-- 最近活动 -->
    <section class="recent-activity">
        <div class="section-header">
            <h2>最近活动</h2>
            <a href="/analytics" class="view-all-link">查看全部</a>
        </div>
        
        <div class="activity-feed" id="recent-activity">
            <!-- 动态加载最近活动 -->
        </div>
    </section>
</div>

<!-- 快速添加任务模态框 -->
<div id="quick-add-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>快速添加任务</h3>
            <button class="modal-close">&times;</button>
        </div>
        <form id="quick-add-form" class="modal-body">
            <div class="form-group">
                <label for="quick-title">任务标题</label>
                <input type="text" id="quick-title" name="title" placeholder="输入任务标题" required>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="quick-domain">领域</label>
                    <select id="quick-domain" name="domain" required>
                        <option value="academic">学术</option>
                        <option value="income">收入</option>
                        <option value="growth">成长</option>
                        <option value="life">生活</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="quick-priority">优先级</label>
                    <select id="quick-priority" name="priority">
                        <option value="1">关键</option>
                        <option value="2">高</option>
                        <option value="3" selected>中</option>
                        <option value="4">低</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="quick-due-date">截止日期</label>
                <input type="datetime-local" id="quick-due-date" name="due_date">
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn-secondary" data-dismiss="modal">取消</button>
                <button type="submit" class="btn-primary">添加任务</button>
            </div>
        </form>
    </div>
</div>
{% endblock %}

{% block extra_js %}
<script src="/static/js/components/dashboard.js"></script>
{% endblock %}
```

### 3. JavaScript 组件系统

```javascript
// frontend/static/js/main.js
/**
 * 主应用程序类
 * 负责应用的初始化和全局状态管理
 */
class LifeManagementApp {
    constructor() {
        this.currentPage = null;
        this.apiClient = new APIClient();
        this.notificationManager = new NotificationManager();
        this.modalManager = new ModalManager();
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupRouting();
        this.loadCurrentPage();
    }
    
    setupEventListeners() {
        // 导航事件
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.dataset.page;
                this.navigateTo(page);
            });
        });
        
        // 快速添加任务
        document.getElementById('quick-add-task')?.addEventListener('click', () => {
            this.modalManager.showModal('quick-add-modal');
        });
        
        // 通知点击
        document.getElementById('notifications')?.addEventListener('click', () => {
            this.toggleNotifications();
        });
    }
    
    setupRouting() {
        // 简单的客户端路由
        window.addEventListener('popstate', (e) => {
            this.loadCurrentPage();
        });
    }
    
    navigateTo(page) {
        // 更新 URL
        const url = page === 'dashboard' ? '/' : `/${page}`;
        history.pushState({page}, '', url);
        
        // 更新导航状态
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
        
        // 加载页面内容
        this.loadPage(page);
    }
    
    async loadPage(page) {
        try {
            // 显示加载状态
            this.showLoading();
            
            // 根据页面加载相应的组件
            switch(page) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'tasks':
                    await this.loadTaskManager();
                    break;
                case 'schedule':
                    await this.loadScheduleManager();
                    break;
                case 'analytics':
                    await this.loadAnalytics();
                    break;
                case 'settings':
                    await this.loadSettings();
                    break;
                default:
                    await this.loadDashboard();
            }
            
            this.hideLoading();
        } catch (error) {
            console.error('加载页面失败:', error);
            this.notificationManager.showError('页面加载失败');
            this.hideLoading();
        }
    }
    
    async loadDashboard() {
        if (typeof DashboardComponent !== 'undefined') {
            const dashboard = new DashboardComponent(this.apiClient);
            await dashboard.render();
        }
    }
    
    async loadTaskManager() {
        if (typeof TaskManagerComponent !== 'undefined') {
            const taskManager = new TaskManagerComponent(this.apiClient);
            await taskManager.render();
        }
    }
    
    showLoading() {
        // 显示全局加载指示器
        const loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.className = 'loading-overlay';
        loader.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>加载中...</p>
            </div>
        `;
        document.body.appendChild(loader);
    }
    
    hideLoading() {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.remove();
        }
    }
    
    toggleNotifications() {
        // 切换通知面板
        const panel = document.getElementById('notification-panel');
        if (panel) {
            panel.classList.toggle('show');
        }
    }
}

/**
 * API 客户端类
 * 负责与后端 API 的通信
 */
class APIClient {
    constructor() {
        this.baseURL = '/api/v1';
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {...this.defaultHeaders, ...options.headers},
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API 请求失败:', error);
            throw error;
        }
    }
    
    // 任务相关 API
    async getTasks(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`/tasks?${params}`);
    }
    
    async createTask(taskData) {
        return this.request('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    }
    
    async updateTask(taskId, updateData) {
        return this.request(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    }
    
    async deleteTask(taskId) {
        return this.request(`/tasks/${taskId}`, {
            method: 'DELETE'
        });
    }
    
    // 时间块相关 API
    async getTimeBlocks(dateFrom, dateTo, domain = null) {
        const params = new URLSearchParams({
            date_from: dateFrom,
            date_to: dateTo
        });
        if (domain) params.append('domain', domain);
        
        return this.request(`/timeblocks?${params}`);
    }
    
    async createTimeBlock(timeBlockData) {
        return this.request('/timeblocks', {
            method: 'POST',
            body: JSON.stringify(timeBlockData)
        });
    }
    
    // 分析相关 API
    async getTasksSummary(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`/tasks/analytics/summary?${params}`);
    }
    
    async getProductivityAnalytics(dateFrom, dateTo) {
        const params = new URLSearchParams({
            date_from: dateFrom,
            date_to: dateTo
        });
        return this.request(`/timeblocks/analytics/productivity?${params}`);
    }
}

/**
 * 通知管理器
 */
class NotificationManager {
    constructor() {
        this.container = document.getElementById('notification-container');
        this.notifications = [];
    }
    
    show(message, type = 'info', duration = 3000) {
        const notification = this.createNotification(message, type);
        this.container.appendChild(notification);
        this.notifications.push(notification);
        
        // 自动移除
        setTimeout(() => {
            this.remove(notification);
        }, duration);
        
        return notification;
    }
    
    showSuccess(message, duration) {
        return this.show(message, 'success', duration);
    }
    
    showError(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }
    
    showWarning(message, duration) {
        return this.show(message, 'warning', duration);
    }
    
    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            success: 'bi-check-circle',
            error: 'bi-exclamation-circle',
            warning: 'bi-exclamation-triangle',
            info: 'bi-info-circle'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="bi ${icons[type]}"></i>
                <span class="notification-message">${message}</span>
                <button class="notification-close">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;
        
        // 点击关闭
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.remove(notification);
        });
        
        return notification;
    }
    
    remove(notification) {
        if (notification && notification.parentNode) {
            notification.classList.add('notification-exit');
            setTimeout(() => {
                notification.remove();
                const index = this.notifications.indexOf(notification);
                if (index > -1) {
                    this.notifications.splice(index, 1);
                }
            }, 300);
        }
    }
    
    clear() {
        this.notifications.forEach(notification => {
            this.remove(notification);
        });
    }
}

/**
 * 模态框管理器
 */
class ModalManager {
    constructor() {
        this.overlay = document.getElementById('modal-overlay');
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // 点击遮罩层关闭
        this.overlay?.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hideModal();
            }
        });
        
        // ESC 键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay?.classList.contains('show')) {
                this.hideModal();
            }
        });
    }
    
    showModal(modalId, data = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        // 将模态框内容移动到通用容器中
        const container = this.overlay.querySelector('.modal-container');
        const modalContent = modal.querySelector('.modal-content');
        
        container.innerHTML = modalContent.innerHTML;
        
        // 显示遮罩层
        this.overlay.classList.add('show');
        
        // 处理数据填充
        if (Object.keys(data).length > 0) {
            this.populateModal(data);
        }
        
        // 设置关闭事件
        container.querySelectorAll('.modal-close, [data-dismiss="modal"]').forEach(btn => {
            btn.addEventListener('click', () => this.hideModal());
        });
    }
    
    hideModal() {
        this.overlay.classList.remove('show');
    }
    
    populateModal(data) {
        // 根据数据填充模态框表单
        Object.keys(data).forEach(key => {
            const input = this.overlay.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = data[key];
            }
        });
    }
}

// 工具函数
const Utils = {
    // 格式化日期
    formatDate(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes);
    },
    
    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    },
    
    // 生成域对应的颜色
    getDomainColor(domain) {
        const colors = {
            academic: '#007AFF',
            income: '#34C759', 
            growth: '#AF52DE',
            life: '#FF9500'
        };
        return colors[domain] || '#8E8E93';
    },
    
    // 获取优先级标签
    getPriorityLabel(priority) {
        const labels = {
            1: '关键',
            2: '高',
            3: '中',
            4: '低',
            5: '未来'
        };
        return labels[priority] || '未知';
    }
};

// 应用初始化
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LifeManagementApp();
});
```

### 4. CSS 样式系统

```css
/* frontend/static/css/main.css */

/* macOS 风格的全局样式 */
* {
    box-sizing: border-box;
}

body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    color: #1d1d1f;
    line-height: 1.6;
}

/* 导航栏样式 */
.main-navbar {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    position: sticky;
    top: 0;
    z-index: 1000;
    padding: 0 24px;
}

.navbar-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1200px;
    margin: 0 auto;
    height: 64px;
}

.navbar-brand {
    display: flex;
    align-items: center;
    font-size: 18px;
    font-weight: 600;
    color: var(--macos-blue);
}

.navbar-brand i {
    font-size: 24px;
    margin-right: 8px;
}

.navbar-nav {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 8px;
}

.nav-link {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    text-decoration: none;
    color: #666;
    border-radius: var(--border-radius);
    transition: var(--transition);
    font-size: 14px;
}

.nav-link:hover, .nav-link.active {
    background: rgba(0, 122, 255, 0.1);
    color: var(--macos-blue);
}

.nav-link i {
    margin-right: 6px;
    font-size: 16px;
}

.navbar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.action-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    border-radius: 50%;
    cursor: pointer;
    transition: var(--transition);
    font-size: 18px;
    color: #666;
}

.action-btn:hover {
    background: rgba(0, 0, 0, 0.1);
    color: var(--macos-blue);
}

.notification-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    background: var(--macos-red);
    color: white;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 10px;
    min-width: 16px;
    text-align: center;
}

.avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
}

/* 主内容区域 */
.main-content {
    padding: 24px;
    min-height: calc(100vh - 64px);
}

.content-container {
    max-width: 1200px;
    margin: 0 auto;
}

/* 卡片样式 */
.card {
    background: rgba(255, 255, 255, 0.9);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-light);
    border: 1px solid rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.card-header {
    padding: 16px 20px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(247, 247, 247, 0.5);
}

.card-body {
    padding: 20px;
}

/* 按钮样式 */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    border: none;
    border-radius: var(--border-radius);
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: var(--transition);
    gap: 6px;
}

.btn-primary {
    background: var(--macos-blue);
    color: white;
}

.btn-primary:hover {
    background: #0056b3;
}

.btn-secondary {
    background: rgba(142, 142, 147, 0.1);
    color: var(--macos-gray);
    border: 1px solid rgba(142, 142, 147, 0.2);
}

.btn-secondary:hover {
    background: rgba(142, 142, 147, 0.2);
}

.btn-success {
    background: var(--macos-green);
    color: white;
}

.btn-danger {
    background: var(--macos-red);
    color: white;
}

/* 表单样式 */
.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: #333;
}

.form-control {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid rgba(142, 142, 147, 0.3);
    border-radius: var(--border-radius);
    font-size: 14px;
    background: white;
    transition: var(--transition);
}

.form-control:focus {
    outline: none;
    border-color: var(--macos-blue);
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.form-row {
    display: flex;
    gap: 16px;
}

.form-row .form-group {
    flex: 1;
}

/* 加载动画 */
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.loading-spinner {
    text-align: center;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(0, 122, 255, 0.2);
    border-top: 3px solid var(--macos-blue);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* 通知样式 */
.notification-container {
    position: fixed;
    top: 80px;
    right: 24px;
    z-index: 9999;
    max-width: 400px;
}

.notification {
    background: white;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-medium);
    margin-bottom: 12px;
    border-left: 4px solid var(--macos-blue);
    animation: slideIn 0.3s ease-out;
}

.notification-success {
    border-left-color: var(--macos-green);
}

.notification-error {
    border-left-color: var(--macos-red);
}

.notification-warning {
    border-left-color: var(--macos-orange);
}

.notification-content {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    gap: 10px;
}

.notification-message {
    flex: 1;
    font-size: 14px;
}

.notification-close {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    color: #999;
}

.notification-close:hover {
    background: rgba(0, 0, 0, 0.1);
}

.notification-exit {
    animation: slideOut 0.3s ease-in;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOut {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

/* 响应式设计 */
@media (max-width: 768px) {
    .main-navbar {
        padding: 0 16px;
    }
    
    .navbar-nav {
        display: none;
    }
    
    .main-content {
        padding: 16px;
    }
    
    .form-row {
        flex-direction: column;
        gap: 0;
    }
    
    .notification-container {
        right: 16px;
        left: 16px;
        max-width: none;
    }
}
```

这个前端架构设计具有以下特点：

1. **macOS 原生风格**: 采用苹果设计语言的视觉风格
2. **组件化架构**: 可复用的 JavaScript 组件
3. **响应式布局**: 适配各种屏幕尺寸
4. **无框架依赖**: 使用原生技术，轻量级
5. **API 驱动**: 完全基于后端 API 的数据交互
6. **用户体验优化**: 流畅的动画和交互效果
7. **可访问性**: 遵循 Web 可访问性标准

这个设计为用户提供了直观、高效的生活管理界面，同时保持了良好的可维护性和扩展性。