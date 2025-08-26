// 任务处理器模块 - 处理AI任务分析和快速添加任务
// 版本: v4.0

import { apiClient } from './api.js';

class TaskProcessor {
    constructor() {
        this.isProcessing = false;
        this.processingUI = null;
        this.resultUI = null;
        this.inputElement = null;
        this.quickInputs = {};
        
        this.domainConfig = {
            academic: { name: '学术', icon: '🎓', color: '#3b82f6' },
            income: { name: '收入', icon: '💰', color: '#10b981' },
            growth: { name: '成长', icon: '🌱', color: '#f59e0b' },
            life: { name: '生活', icon: '🏠', color: '#ef4444' }
        };

        this._initializeDOMElements();
        this._setupEventListeners();
        
        console.log('⚡ 任务处理器初始化完成');
    }

    // 初始化DOM元素
    _initializeDOMElements() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this._bindDOMElements();
            });
        } else {
            this._bindDOMElements();
        }
    }

    // 绑定DOM元素
    _bindDOMElements() {
        this.inputElement = document.getElementById('aiTaskInput');
        this.processingUI = document.getElementById('aiProcessing');
        this.resultUI = document.getElementById('processResult');
        
        // 快速添加相关元素
        this.quickInputs = {
            title: document.getElementById('quickTaskInput'),
            domain: document.getElementById('quickTaskDomain'),
            minutes: document.getElementById('quickTaskMinutes')
        };

        console.log('📋 任务处理器DOM元素绑定完成');
    }

    // 设置事件监听器
    _setupEventListeners() {
        // 监听任务创建成功事件，用于刷新界面
        window.addEventListener('taskCreated', (event) => {
            this._handleTaskCreated(event.detail);
        });

        // 监听Ctrl+Enter快捷键进行AI处理
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                if (document.activeElement === this.inputElement) {
                    event.preventDefault();
                    this.aiProcessTasks();
                }
            }
        });
    }

    // AI智能处理任务
    async aiProcessTasks() {
        if (this.isProcessing) {
            console.warn('⚠️ 任务正在处理中，请稍候');
            return;
        }

        const inputText = this.inputElement?.value.trim();
        if (!inputText) {
            window.notificationManager?.showToast('请输入任务内容', 'warning');
            this.inputElement?.focus();
            return;
        }

        try {
            this.isProcessing = true;
            this._showProcessingUI();
            
            console.log('🤖 开始AI任务处理:', inputText);
            
            // 调用API进行AI处理
            const response = await apiClient.aiProcessTasks(inputText);
            
            if (response.success) {
                this._handleProcessSuccess(response);
            } else {
                this._handleProcessError(response.message || 'AI处理失败');
            }
            
        } catch (error) {
            console.error('❌ AI任务处理失败:', error);
            this._handleProcessError(`处理失败: ${error.message}`);
        } finally {
            this.isProcessing = false;
            this._hideProcessingUI();
        }
    }

    // 显示处理中UI
    _showProcessingUI() {
        if (this.processingUI) {
            this.processingUI.classList.remove('hidden');
        }
        
        // 禁用处理按钮
        const processBtn = document.getElementById('aiProcessBtn');
        if (processBtn) {
            processBtn.disabled = true;
            processBtn.querySelector('.btn-text').textContent = '处理中...';
        }
    }

    // 隐藏处理中UI
    _hideProcessingUI() {
        if (this.processingUI) {
            this.processingUI.classList.add('hidden');
        }
        
        // 启用处理按钮
        const processBtn = document.getElementById('aiProcessBtn');
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.querySelector('.btn-text').textContent = 'AI 智能处理';
        }
    }

    // 处理AI处理成功结果
    _handleProcessSuccess(response) {
        const { tasks, insights, message } = response;
        
        console.log('✅ AI处理成功:', { 
            tasksCount: tasks.length, 
            insights: insights.length 
        });

        // 显示结果
        this._displayProcessResult({
            success: true,
            message,
            tasks,
            insights
        });

        // 清空输入框
        if (this.inputElement) {
            this.inputElement.value = '';
        }

        // 显示成功通知
        window.notificationManager?.showToast(message, 'success');

        // 触发任务列表刷新事件
        this._triggerTasksRefresh();

        // 更新洞察面板
        this._updateInsightsPanel(insights);
    }

    // 处理AI处理失败
    _handleProcessError(errorMessage) {
        console.error('❌ AI处理失败:', errorMessage);
        
        // 显示错误结果
        this._displayProcessResult({
            success: false,
            message: errorMessage,
            tasks: [],
            insights: ['❌ 处理过程中出现错误，请检查网络连接或重试']
        });

        // 显示错误通知
        window.notificationManager?.showToast(errorMessage, 'error');
    }

    // 显示处理结果
    _displayProcessResult(result) {
        if (!this.resultUI) return;

        const resultHtml = `
            <div class="process-result-content ${result.success ? 'success' : 'error'}">
                <div class="result-header">
                    <span class="result-icon">${result.success ? '✅' : '❌'}</span>
                    <span class="result-message">${result.message}</span>
                </div>
                
                ${result.tasks.length > 0 ? `
                    <div class="result-tasks">
                        <h4>📋 处理的任务 (${result.tasks.length}个):</h4>
                        <ul class="task-preview-list">
                            ${result.tasks.map(task => `
                                <li class="task-preview-item">
                                    <span class="task-domain-icon">${this.domainConfig[task.domain]?.icon || '📝'}</span>
                                    <span class="task-title">${this._escapeHtml(task.title)}</span>
                                    <span class="task-time">${task.estimated_minutes}分钟</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${result.insights.length > 0 ? `
                    <div class="result-insights">
                        <h4>💡 AI洞察:</h4>
                        <ul class="insights-list">
                            ${result.insights.map(insight => `
                                <li class="insight-item">${this._escapeHtml(insight)}</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;

        this.resultUI.innerHTML = resultHtml;
        this.resultUI.classList.remove('hidden');

        // 3秒后自动隐藏成功结果
        if (result.success) {
            setTimeout(() => {
                this.hideProcessResult();
            }, 5000);
        }
    }

    // 快速添加任务
    async addQuickTask() {
        const titleInput = this.quickInputs.title;
        const domainSelect = this.quickInputs.domain;
        const minutesInput = this.quickInputs.minutes;

        const title = titleInput?.value.trim();
        if (!title) {
            window.notificationManager?.showToast('请输入任务标题', 'warning');
            titleInput?.focus();
            return;
        }

        const taskData = {
            title,
            domain: domainSelect?.value || 'life',
            priority: 3,
            estimated_minutes: parseInt(minutesInput?.value) || 30,
            tags: []
        };

        try {
            console.log('⚡ 快速添加任务:', taskData);
            
            const response = await apiClient.createTask(taskData);
            
            if (response.success) {
                // 清空输入
                if (titleInput) titleInput.value = '';
                if (minutesInput) minutesInput.value = '30';
                
                // 显示成功通知
                const domainInfo = this.domainConfig[taskData.domain];
                const message = `${domainInfo?.icon || '📝'} 任务已添加到${domainInfo?.name || '其他'}领域`;
                window.notificationManager?.showToast(message, 'success');
                
                // 触发刷新
                this._triggerTasksRefresh();
                
                console.log('✅ 快速任务添加成功');
            } else {
                throw new Error(response.message || '任务添加失败');
            }
            
        } catch (error) {
            console.error('❌ 快速任务添加失败:', error);
            window.notificationManager?.showToast(`添加失败: ${error.message}`, 'error');
        }
    }

    // 清空AI输入
    clearInput() {
        if (this.inputElement) {
            this.inputElement.value = '';
            this.inputElement.focus();
        }
        this.hideProcessResult();
        
        console.log('🗑️ AI输入已清空');
    }

    // 隐藏处理结果
    hideProcessResult() {
        if (this.resultUI) {
            this.resultUI.classList.add('hidden');
            this.resultUI.innerHTML = '';
        }
    }

    // 更新洞察面板
    _updateInsightsPanel(insights) {
        const insightsContainer = document.getElementById('aiInsights');
        if (!insightsContainer || !insights.length) return;

        const insightsHtml = insights.map(insight => `
            <div class="insight-item fresh">
                <div class="insight-icon">💡</div>
                <div class="insight-text">${this._escapeHtml(insight)}</div>
            </div>
        `).join('');

        insightsContainer.innerHTML = insightsHtml;

        // 添加新鲜标记动画
        setTimeout(() => {
            const freshItems = insightsContainer.querySelectorAll('.insight-item.fresh');
            freshItems.forEach(item => item.classList.remove('fresh'));
        }, 2000);
    }

    // 触发任务刷新事件
    _triggerTasksRefresh() {
        const event = new CustomEvent('tasksChanged', {
            detail: { source: 'task-processor', timestamp: Date.now() }
        });
        window.dispatchEvent(event);
    }

    // 处理任务创建成功事件
    _handleTaskCreated(taskData) {
        console.log('📝 接收到任务创建事件:', taskData);
        // 这里可以添加任务创建后的UI更新逻辑
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
            isProcessing: this.isProcessing,
            hasInput: Boolean(this.inputElement?.value.trim()),
            quickInputsReady: Object.values(this.quickInputs).every(el => el !== null)
        };
    }

    // 设置输入内容（外部调用）
    setInput(text) {
        if (this.inputElement) {
            this.inputElement.value = text;
            this.inputElement.focus();
        }
    }
}

// 导出任务处理器实例
export const taskProcessor = new TaskProcessor();

// 全局暴露（兼容HTML内联调用）
window.taskProcessor = taskProcessor;

console.log('⚡ 任务处理器模块加载完成');