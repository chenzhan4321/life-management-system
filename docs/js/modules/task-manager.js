// 任务管理器模块 - 统一管理任务显示、操作和状态
// 版本: v4.0

import { apiClient } from './api.js';

class TaskManager {
    constructor() {
        this.tasks = [];
        this.selectedTasks = new Set();
        this.isLoading = false;
        this.lastRefresh = null;
        this.refreshInterval = null;
        
        this.domainConfig = {
            academic: { name: '学术', icon: '🎓', color: '#3b82f6' },
            income: { name: '收入', icon: '💰', color: '#10b981' },
            growth: { name: '成长', icon: '🌱', color: '#f59e0b' },
            life: { name: '生活', icon: '🏠', color: '#ef4444' }
        };

        this.statusConfig = {
            pending: { name: '待处理', icon: '⏳', color: '#6b7280' },
            in_progress: { name: '进行中', icon: '▶️', color: '#3b82f6' },
            completed: { name: '已完成', icon: '✅', color: '#10b981' },
            cancelled: { name: '已取消', icon: '❌', color: '#ef4444' }
        };

        this._initializeElements();
        this._setupEventListeners();
        this._startAutoRefresh();
        
        console.log('📋 任务管理器初始化完成');
    }

    // 初始化DOM元素
    _initializeElements() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this._bindDOMElements();
                this.loadTasks();
            });
        } else {
            this._bindDOMElements();
            this.loadTasks();
        }
    }

    // 绑定DOM元素
    _bindDOMElements() {
        this.tasksContainer = document.getElementById('tasksList');
        this.emptyState = document.getElementById('emptyState');
        this.deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        this.domainsGrid = document.getElementById('domainsGrid');
        
        console.log('📋 任务管理器DOM元素绑定完成');
    }

    // 设置事件监听器
    _setupEventListeners() {
        // 监听任务变化事件
        window.addEventListener('tasksChanged', () => {
            this.loadTasks();
        });

        // 监听主题变化，更新任务卡片样式
        window.addEventListener('themeChanged', () => {
            this._updateTasksTheme();
        });
    }

    // 加载任务列表
    async loadTasks() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this._showLoadingState();
            
            console.log('📥 开始加载任务...');
            
            const response = await apiClient.getTasks();
            
            if (response.success) {
                this.tasks = response.tasks || [];
                this.lastRefresh = new Date();
                
                this._renderTasks();
                this._updateStats();
                this._updateDomainDashboard();
                
                console.log(`✅ 任务加载完成: ${this.tasks.length}个任务`);
            } else {
                throw new Error(response.message || '加载任务失败');
            }
            
        } catch (error) {
            console.error('❌ 任务加载失败:', error);
            this._showErrorState(error.message);
            
            window.notificationManager?.showToast(
                `任务加载失败: ${error.message}`, 
                'error'
            );
        } finally {
            this.isLoading = false;
            this._hideLoadingState();
        }
    }

    // 渲染任务列表
    _renderTasks() {
        if (!this.tasksContainer) return;

        if (this.tasks.length === 0) {
            this._showEmptyState();
            return;
        }

        this._hideEmptyState();

        // 按优先级和状态排序
        const sortedTasks = this._sortTasks(this.tasks);
        
        const tasksHtml = sortedTasks.map(task => this._generateTaskHTML(task)).join('');
        
        this.tasksContainer.innerHTML = tasksHtml;
        
        // 添加事件监听器
        this._attachTaskEventListeners();
    }

    // 生成单个任务的HTML
    _generateTaskHTML(task) {
        const domainInfo = this.domainConfig[task.domain] || this.domainConfig.life;
        const statusInfo = this.statusConfig[task.status] || this.statusConfig.pending;
        
        const isSelected = this.selectedTasks.has(task.id);
        const isCompleted = task.status === 'completed';
        const isOverdue = this._isTaskOverdue(task);
        
        return `
            <div class="task-item ${isCompleted ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" 
                 data-task-id="${task.id}" 
                 data-domain="${task.domain}"
                 data-status="${task.status}">
                
                <div class="task-header">
                    <label class="task-checkbox">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} 
                               onchange="taskManager.toggleTaskSelection('${task.id}')">
                        <span class="checkmark"></span>
                    </label>
                    
                    <div class="task-priority priority-${task.priority}">
                        ${'★'.repeat(task.priority)}
                    </div>
                    
                    <div class="task-domain" style="color: ${domainInfo.color}">
                        ${domainInfo.icon} ${domainInfo.name}
                    </div>
                    
                    <div class="task-status status-${task.status}" style="color: ${statusInfo.color}">
                        ${statusInfo.icon} ${statusInfo.name}
                    </div>
                    
                    <div class="task-actions">
                        <button class="btn-icon" onclick="taskManager.editTask('${task.id}')" title="编辑任务">
                            ✏️
                        </button>
                        <button class="btn-icon" onclick="taskManager.deleteTask('${task.id}')" title="删除任务">
                            🗑️
                        </button>
                    </div>
                </div>
                
                <div class="task-content">
                    <h3 class="task-title">${this._escapeHtml(task.title)}</h3>
                    
                    <div class="task-meta">
                        <span class="task-time">
                            ⏱️ 预估 ${task.estimated_minutes}分钟
                            ${task.actual_minutes ? ` | 实际 ${task.actual_minutes}分钟` : ''}
                        </span>
                        
                        <span class="task-created">
                            📅 ${this._formatDate(task.created_at)}
                        </span>
                        
                        ${task.completed_at ? `
                            <span class="task-completed">
                                ✅ ${this._formatDate(task.completed_at)}
                            </span>
                        ` : ''}
                    </div>
                    
                    ${task.tags && task.tags.length > 0 ? `
                        <div class="task-tags">
                            ${task.tags.map(tag => `<span class="task-tag">#${this._escapeHtml(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="task-controls">
                    ${!isCompleted ? `
                        <button class="btn btn-primary btn-small" 
                                onclick="taskManager.updateTaskStatus('${task.id}', 'completed')">
                            ✅ 完成
                        </button>
                        <button class="btn btn-secondary btn-small" 
                                onclick="taskManager.updateTaskStatus('${task.id}', '${task.status === 'in_progress' ? 'pending' : 'in_progress'}')">
                            ${task.status === 'in_progress' ? '⏸️ 暂停' : '▶️ 开始'}
                        </button>
                    ` : `
                        <button class="btn btn-ghost btn-small" 
                                onclick="taskManager.updateTaskStatus('${task.id}', 'pending')">
                            🔄 重新激活
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    // 附加任务事件监听器
    _attachTaskEventListeners() {
        // 任务卡片点击事件（展开/收起详情）
        this.tasksContainer.querySelectorAll('.task-item').forEach(taskElement => {
            taskElement.addEventListener('click', (e) => {
                // 避免点击按钮时触发
                if (!e.target.matches('button, input, .btn-icon, .task-checkbox *')) {
                    taskElement.classList.toggle('expanded');
                }
            });
        });
    }

    // 更新任务状态
    async updateTaskStatus(taskId, newStatus) {
        try {
            console.log(`🔄 更新任务状态: ${taskId} -> ${newStatus}`);
            
            const updateData = { status: newStatus };
            
            // 如果是完成状态，记录实际时间（简化处理）
            if (newStatus === 'completed') {
                const task = this.tasks.find(t => t.id === taskId);
                if (task) {
                    updateData.actual_minutes = task.estimated_minutes;
                }
            }
            
            const response = await apiClient.updateTask(taskId, updateData);
            
            if (response.success) {
                // 更新本地任务数据
                const taskIndex = this.tasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    this.tasks[taskIndex] = response.task;
                }
                
                // 重新渲染
                this._renderTasks();
                this._updateStats();
                this._updateDomainDashboard();
                
                // 显示成功通知
                const statusInfo = this.statusConfig[newStatus];
                window.notificationManager?.showToast(
                    `${statusInfo.icon} 任务状态已更新为${statusInfo.name}`,
                    'success'
                );
                
                console.log('✅ 任务状态更新成功');
            } else {
                throw new Error(response.message || '状态更新失败');
            }
            
        } catch (error) {
            console.error('❌ 任务状态更新失败:', error);
            window.notificationManager?.showToast(
                `状态更新失败: ${error.message}`,
                'error'
            );
        }
    }

    // 删除任务
    async deleteTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const confirmed = await window.notificationManager?.showConfirm(
            `确定删除任务"${task.title}"吗？`,
            { confirmText: '删除', cancelText: '取消' }
        );
        
        if (!confirmed) return;
        
        try {
            console.log(`🗑️ 删除任务: ${taskId}`);
            
            const response = await apiClient.deleteTask(taskId);
            
            if (response.success) {
                // 从本地数据中移除
                this.tasks = this.tasks.filter(t => t.id !== taskId);
                this.selectedTasks.delete(taskId);
                
                // 重新渲染
                this._renderTasks();
                this._updateStats();
                this._updateDomainDashboard();
                this._updateSelectedTasksUI();
                
                window.notificationManager?.showToast('🗑️ 任务删除成功', 'success');
                
                console.log('✅ 任务删除成功');
            } else {
                throw new Error(response.message || '删除失败');
            }
            
        } catch (error) {
            console.error('❌ 任务删除失败:', error);
            window.notificationManager?.showToast(
                `删除失败: ${error.message}`,
                'error'
            );
        }
    }

    // 编辑任务（简化实现）
    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        // 这里可以实现任务编辑对话框
        // 目前简化为显示任务信息
        const taskInfo = `
任务: ${task.title}
领域: ${this.domainConfig[task.domain]?.name}
优先级: ${task.priority}
预估时间: ${task.estimated_minutes}分钟
状态: ${this.statusConfig[task.status]?.name}
        `.trim();
        
        window.notificationManager?.showToast(taskInfo, 'info', { duration: 8000 });
        
        console.log('✏️ 编辑任务:', task);
    }

    // 切换任务选择状态
    toggleTaskSelection(taskId) {
        if (this.selectedTasks.has(taskId)) {
            this.selectedTasks.delete(taskId);
        } else {
            this.selectedTasks.add(taskId);
        }
        
        this._updateSelectedTasksUI();
        console.log(`☑️ 任务选择状态切换: ${taskId}, 已选择: ${this.selectedTasks.size}`);
    }

    // 全选/取消全选
    toggleSelectAll() {
        const visibleTasks = this.tasks.filter(t => t.status !== 'completed');
        
        if (this.selectedTasks.size === visibleTasks.length) {
            // 全部取消选择
            this.selectedTasks.clear();
        } else {
            // 全部选择
            visibleTasks.forEach(task => {
                this.selectedTasks.add(task.id);
            });
        }
        
        this._renderTasks();
        this._updateSelectedTasksUI();
        
        console.log(`☑️ 全选切换完成, 已选择: ${this.selectedTasks.size}`);
    }

    // 删除选中的任务
    async deleteSelectedTasks() {
        if (this.selectedTasks.size === 0) return;
        
        const confirmed = await window.notificationManager?.showConfirm(
            `确定删除选中的 ${this.selectedTasks.size} 个任务吗？`,
            { confirmText: '删除', cancelText: '取消' }
        );
        
        if (!confirmed) return;
        
        const taskIds = Array.from(this.selectedTasks);
        let successCount = 0;
        let errorCount = 0;
        
        const loading = window.notificationManager?.showLoading(`删除任务中 (0/${taskIds.length})`);
        
        try {
            for (let i = 0; i < taskIds.length; i++) {
                const taskId = taskIds[i];
                try {
                    await apiClient.deleteTask(taskId);
                    this.tasks = this.tasks.filter(t => t.id !== taskId);
                    successCount++;
                } catch (error) {
                    console.error(`删除任务失败: ${taskId}`, error);
                    errorCount++;
                }
                
                // 更新进度
                loading?.update(`删除任务中 (${i + 1}/${taskIds.length})`);
            }
            
            // 清空选择
            this.selectedTasks.clear();
            
            // 刷新界面
            this._renderTasks();
            this._updateStats();
            this._updateDomainDashboard();
            this._updateSelectedTasksUI();
            
            // 显示结果
            const message = errorCount > 0 
                ? `🗑️ 删除完成: ${successCount}个成功, ${errorCount}个失败`
                : `🗑️ 成功删除 ${successCount} 个任务`;
            
            window.notificationManager?.showToast(message, errorCount > 0 ? 'warning' : 'success');
            
            console.log(`🗑️ 批量删除完成: 成功${successCount}, 失败${errorCount}`);
            
        } finally {
            loading?.hide();
        }
    }

    // 优化任务排序
    optimizeSchedule() {
        if (this.tasks.length === 0) return;
        
        // 简单的优化逻辑：按优先级和预估时间排序
        this.tasks.sort((a, b) => {
            // 已完成的任务排在最后
            if (a.status === 'completed' && b.status !== 'completed') return 1;
            if (b.status === 'completed' && a.status !== 'completed') return -1;
            
            // 按优先级排序（数字越小优先级越高）
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            
            // 按预估时间排序（短任务优先）
            return a.estimated_minutes - b.estimated_minutes;
        });
        
        this._renderTasks();
        
        window.notificationManager?.showToast('🔄 任务排序已优化', 'success');
        
        console.log('🔄 任务排序优化完成');
    }

    // 更新统计信息
    _updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.status === 'completed').length;
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100) : 0;
        
        // 更新顶部统计
        const todayCompletedEl = document.getElementById('todayCompleted');
        const productivityScoreEl = document.getElementById('productivityScore');
        
        if (todayCompletedEl) {
            todayCompletedEl.textContent = `${completedTasks}/${totalTasks}`;
        }
        
        if (productivityScoreEl) {
            productivityScoreEl.textContent = `${Math.round(completionRate)}%`;
        }
        
        console.log(`📊 统计更新: ${completedTasks}/${totalTasks} (${Math.round(completionRate)}%)`);
    }

    // 更新时间域仪表板
    _updateDomainDashboard() {
        if (!this.domainsGrid) return;
        
        const domainStats = this._calculateDomainStats();
        
        const domainsHtml = Object.entries(this.domainConfig).map(([domainKey, config]) => {
            const stats = domainStats[domainKey] || { taskCount: 0, completedCount: 0, totalMinutes: 0, completionRate: 0 };
            
            return `
                <div class="domain-card" data-domain="${domainKey}" style="border-color: ${config.color}">
                    <div class="domain-header" style="color: ${config.color}">
                        <span class="domain-icon">${config.icon}</span>
                        <h3 class="domain-title">${config.name}</h3>
                    </div>
                    
                    <div class="domain-progress">
                        <div class="progress-circle">
                            <svg viewBox="0 0 36 36">
                                <path class="progress-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                                <path class="progress-bar" style="stroke: ${config.color}; stroke-dasharray: ${stats.completionRate * 100}, 100" 
                                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                            </svg>
                            <div class="progress-text">
                                <span class="progress-percentage">${Math.round(stats.completionRate * 100)}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="domain-stats">
                        <div class="stat-row">
                            <span class="stat-label">任务数</span>
                            <span class="stat-value">${stats.taskCount}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">已完成</span>
                            <span class="stat-value">${stats.completedCount}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">总时长</span>
                            <span class="stat-value">${Math.round(stats.totalMinutes / 60 * 10) / 10}h</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        this.domainsGrid.innerHTML = domainsHtml;
    }

    // 计算时间域统计
    _calculateDomainStats() {
        const stats = {};
        
        Object.keys(this.domainConfig).forEach(domain => {
            const domainTasks = this.tasks.filter(t => t.domain === domain);
            const completedTasks = domainTasks.filter(t => t.status === 'completed');
            const totalMinutes = domainTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
            
            stats[domain] = {
                taskCount: domainTasks.length,
                completedCount: completedTasks.length,
                totalMinutes: totalMinutes,
                completionRate: domainTasks.length > 0 ? completedTasks.length / domainTasks.length : 0
            };
        });
        
        return stats;
    }

    // 排序任务
    _sortTasks(tasks) {
        return [...tasks].sort((a, b) => {
            // 已完成任务排在最后
            if (a.status === 'completed' && b.status !== 'completed') return 1;
            if (b.status === 'completed' && a.status !== 'completed') return -1;
            
            // 进行中的任务排在前面
            if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
            if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
            
            // 按优先级排序
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            
            // 按创建时间排序（新的在前）
            return new Date(b.created_at) - new Date(a.created_at);
        });
    }

    // 判断任务是否过期（简单实现）
    _isTaskOverdue(task) {
        // 这里可以实现更复杂的过期逻辑
        return false; // 暂时禁用过期检查
    }

    // 更新选中任务的UI
    _updateSelectedTasksUI() {
        if (this.deleteSelectedBtn) {
            if (this.selectedTasks.size > 0) {
                this.deleteSelectedBtn.classList.remove('hidden');
                this.deleteSelectedBtn.querySelector('.btn-text').textContent = `删除选中 (${this.selectedTasks.size})`;
            } else {
                this.deleteSelectedBtn.classList.add('hidden');
            }
        }
    }

    // 显示加载状态
    _showLoadingState() {
        if (this.tasksContainer) {
            this.tasksContainer.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <span>加载任务中...</span>
                </div>
            `;
        }
    }

    // 隐藏加载状态
    _hideLoadingState() {
        // 加载状态会被实际内容覆盖，这里不需要特殊处理
    }

    // 显示空状态
    _showEmptyState() {
        if (this.emptyState) {
            this.emptyState.classList.remove('hidden');
        }
        if (this.tasksContainer) {
            this.tasksContainer.innerHTML = '';
        }
    }

    // 隐藏空状态
    _hideEmptyState() {
        if (this.emptyState) {
            this.emptyState.classList.add('hidden');
        }
    }

    // 显示错误状态
    _showErrorState(errorMessage) {
        if (this.tasksContainer) {
            this.tasksContainer.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">❌</div>
                    <h3>加载失败</h3>
                    <p>${this._escapeHtml(errorMessage)}</p>
                    <button class="btn btn-primary" onclick="taskManager.loadTasks()">
                        🔄 重试
                    </button>
                </div>
            `;
        }
    }

    // 更新任务主题
    _updateTasksTheme() {
        // 主题变化时，任务卡片会通过CSS自动适配
        console.log('🎨 任务主题已更新');
    }

    // 开始自动刷新
    _startAutoRefresh() {
        // 每5分钟自动刷新任务
        this.refreshInterval = setInterval(() => {
            if (!this.isLoading) {
                this.loadTasks();
            }
        }, 5 * 60 * 1000);
    }

    // 停止自动刷新
    _stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // 格式化日期
    _formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return '昨天';
        } else if (days < 7) {
            return `${days}天前`;
        } else {
            return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
        }
    }

    // HTML转义
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 获取统计信息
    getStats() {
        return {
            totalTasks: this.tasks.length,
            completedTasks: this.tasks.filter(t => t.status === 'completed').length,
            selectedTasks: this.selectedTasks.size,
            isLoading: this.isLoading,
            lastRefresh: this.lastRefresh
        };
    }

    // 清理资源
    destroy() {
        this._stopAutoRefresh();
        this.selectedTasks.clear();
        this.tasks = [];
        
        console.log('🧹 任务管理器资源清理完成');
    }
}

// 导出任务管理器实例
export const taskManager = new TaskManager();

// 全局暴露（兼容HTML内联调用）
window.taskManager = taskManager;

console.log('📋 任务管理器模块加载完成');