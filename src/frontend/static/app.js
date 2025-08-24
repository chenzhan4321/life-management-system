// 生活管理系统前端应用
const API_BASE = 'http://localhost:8000/api';

// 显示 Toast 提示
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 清空输入
function clearInput() {
    document.getElementById('aiTaskInput').value = '';
    const resultDiv = document.getElementById('processResult');
    resultDiv.classList.add('hidden');
}

// AI 智能处理任务
async function aiProcessTasks() {
    const textarea = document.getElementById('aiTaskInput');
    const input = textarea.value.trim();
    
    if (!input) {
        showToast('请输入任务描述', 'error');
        return;
    }
    
    // 显示处理中状态
    const processingDiv = document.getElementById('aiProcessing');
    const resultDiv = document.getElementById('processResult');
    processingDiv.classList.remove('hidden');
    resultDiv.classList.add('hidden');
    
    try {
        const response = await fetch(`${API_BASE}/tasks/ai-process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input: input })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 显示处理结果
            showProcessResult(data);
            showToast(data.message, 'success');
            
            // 清空输入框
            textarea.value = '';
            
            // 刷新任务列表和仪表板
            await loadTasks();
            await updateDashboard();
        } else {
            showToast(data.detail || '处理失败', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('网络错误，请稍后重试', 'error');
    } finally {
        processingDiv.classList.add('hidden');
    }
}

// 显示处理结果
function showProcessResult(data) {
    const resultDiv = document.getElementById('processResult');
    
    if (!data.tasks || data.tasks.length === 0) {
        resultDiv.classList.add('hidden');
        return;
    }
    
    // 按域分组
    const tasksByDomain = {
        academic: [],
        income: [],
        growth: [],
        life: []
    };
    
    data.tasks.forEach(task => {
        if (tasksByDomain[task.domain]) {
            tasksByDomain[task.domain].push(task);
        }
    });
    
    // 生成结果 HTML
    let html = `
        <div class="result-header">
            ✅ 成功处理 ${data.count} 个任务
        </div>
        <div class="result-tasks">
    `;
    
    const domainNames = {
        academic: '🎓 学术',
        income: '💰 收入',
        growth: '🌱 成长',
        life: '🏠 生活'
    };
    
    for (const [domain, tasks] of Object.entries(tasksByDomain)) {
        if (tasks.length > 0) {
            html += `<div class="domain-group">
                <div class="domain-title">${domainNames[domain]} (${tasks.length})</div>`;
            
            tasks.forEach(task => {
                const scheduleInfo = task.scheduled_start 
                    ? `📅 ${new Date(task.scheduled_start).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}`
                    : '待安排';
                
                html += `
                    <div class="result-task-item">
                        <span class="task-name">${task.title}</span>
                        <span class="task-info">
                            ⏱ ${task.estimated_minutes}分钟 | 
                            ${scheduleInfo} | 
                            🤖 ${Math.round(task.ai_confidence * 100)}%
                        </span>
                    </div>
                `;
            });
            
            html += `</div>`;
        }
    }
    
    html += `</div>`;
    
    resultDiv.innerHTML = html;
    resultDiv.classList.remove('hidden');
    
    // 5秒后自动隐藏
    setTimeout(() => {
        resultDiv.classList.add('hidden');
    }, 8000);
}

// 加载任务列表
async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE}/tasks`);
        const data = await response.json();
        
        const tasksList = document.getElementById('tasksList');
        
        if (data.tasks.length === 0) {
            tasksList.innerHTML = '<div class="no-tasks">暂无任务，请添加新任务</div>';
            return;
        }
        
        // 分离已完成和未完成任务
        const pendingTasks = data.tasks.filter(t => t.status !== 'completed');
        const completedTasks = data.tasks.filter(t => t.status === 'completed');
        
        // 按优先级排序（优先级高的在前），优先级相同则按时间排序
        pendingTasks.sort((a, b) => {
            // 先按优先级排序（数字越大优先级越高，所以用 b - a）
            if (a.priority !== b.priority) {
                return (b.priority || 3) - (a.priority || 3);
            }
            // 优先级相同，按计划时间排序
            if (a.scheduled_start && b.scheduled_start) {
                return new Date(a.scheduled_start) - new Date(b.scheduled_start);
            }
            return 0;
        });
        
        // 构建HTML
        let html = '';
        
        // 未完成任务
        if (pendingTasks.length > 0) {
            html += '<div class="tasks-pending"><h3>待完成任务</h3>';
            html += pendingTasks.map(task => renderTaskItem(task)).join('');
            html += '</div>';
        }
        
        // 已完成任务
        if (completedTasks.length > 0) {
            html += '<div class="tasks-completed"><h3>今日已完成</h3>';
            html += completedTasks.map(task => renderTaskItem(task)).join('');
            html += '</div>';
        }
        
        tasksList.innerHTML = html;
        
        // 更新各域的任务列表和进度圆环
        updateDomainDisplay(data.tasks);
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        showToast('加载任务失败', 'error');
    }
}

// 渲染单个任务项
function renderTaskItem(task) {
    const domainColors = {
        academic: '#4285F4',
        income: '#34A853',
        growth: '#FBBC04',
        life: '#EA4335'
    };
    
    return `
        <div class="task-item ${task.domain} ${task.status}" data-task-id="${task.id}">
            <input type="checkbox" class="task-checkbox" 
                   ${task.status === 'completed' ? 'checked' : ''}
                   onchange="toggleTaskStatus('${task.id}', this.checked)">
            <div class="task-content">
                <div class="task-title" contenteditable="true" 
                     onblur="updateTaskTitle('${task.id}', this.innerText)"
                     onkeypress="if(event.key==='Enter'){event.preventDefault();this.blur();}">${task.title}</div>
                <div class="task-meta">
                    <select class="domain-selector ${task.domain}" 
                            onchange="changeTaskDomain('${task.id}', this.value)"
                            data-current="${task.domain}">
                        <option value="academic" ${task.domain === 'academic' ? 'selected' : ''}>🎓 学术</option>
                        <option value="income" ${task.domain === 'income' ? 'selected' : ''}>💰 收入</option>
                        <option value="growth" ${task.domain === 'growth' ? 'selected' : ''}>🌱 成长</option>
                        <option value="life" ${task.domain === 'life' ? 'selected' : ''}>🏠 生活</option>
                    </select>
                    <span>⏱ <input type="number" class="inline-edit-number" value="${task.estimated_minutes || 30}" 
                            onchange="updateTaskField('${task.id}', 'estimated_minutes', this.value)" min="5" max="480"> 分钟</span>
                    <span>🎯 优先级 <select class="inline-edit-select" 
                            onchange="updateTaskField('${task.id}', 'priority', this.value)">
                        ${[1,2,3,4,5].map(p => `<option value="${p}" ${task.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select></span>
                    <span>📅 <input type="time" class="inline-edit-time" 
                            value="${task.scheduled_start ? new Date(task.scheduled_start).toTimeString().slice(0,5) : ''}"
                            onchange="updateTaskTime('${task.id}', this.value)"></span>
                </div>
            </div>
            <div class="task-actions">
                <input type="checkbox" class="task-select-checkbox" 
                       data-task-id="${task.id}"
                       onchange="toggleTaskSelection('${task.id}')">
                <button onclick="deleteTask('${task.id}')" class="btn-small btn-danger">删除</button>
            </div>
        </div>
    `;
}

// 更新域显示和进度圆环
function updateDomainDisplay(tasks) {
    const domains = ['academic', 'income', 'growth', 'life'];
    domains.forEach(domain => {
        const domainTasks = tasks.filter(t => t.domain === domain);
        const domainElement = document.getElementById(`${domain}Tasks`);
        
        // 更新任务列表
        if (domainTasks.length > 0) {
            domainElement.innerHTML = domainTasks.slice(0, 3).map(task => `
                <div class="mini-task ${task.status}">
                    ${task.status === 'completed' ? '✓ ' : ''}${task.title.substring(0, 20)}${task.title.length > 20 ? '...' : ''}
                </div>
            `).join('');
        } else {
            domainElement.innerHTML = '<div class="no-tasks-mini">暂无任务</div>';
        }
        
        // 更新进度圆环（只计算已完成的任务）
        const completedMinutes = domainTasks
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
        const plannedMinutes = domainTasks
            .filter(t => t.status !== 'completed')
            .reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
        
        updateDomainProgress(domain, completedMinutes, plannedMinutes);
    });
}

// 更新仪表板
async function updateDashboard() {
    try {
        const response = await fetch(`${API_BASE}/analytics/daily`);
        const data = await response.json();
        
        // 更新统计数据
        document.getElementById('todayCompleted').textContent = 
            `${data.summary.completed_tasks}/${data.summary.total_tasks}`;
        document.getElementById('productivityScore').textContent = 
            `${data.summary.productivity_score}%`;
        
        // 更新各域进度
        Object.entries(data.domain_usage).forEach(([domain, usage]) => {
            const progress = (usage.used_hours / usage.allocated_hours) * 100;
            const circle = document.getElementById(`${domain}Progress`);
            
            if (circle) {
                const circumference = 2 * Math.PI * 54;
                const offset = circumference - (progress / 100) * circumference;
                circle.style.strokeDashoffset = offset;
                
                // 更新文字
                const card = document.querySelector(`.domain-card.${domain}`);
                if (card) {
                    const hoursText = card.querySelector('.hours');
                    hoursText.textContent = `${usage.used_hours}/${usage.allocated_hours}`;
                }
            }
        });
        
        // 更新 AI 洞察
        if (data.recommendations && data.recommendations.length > 0) {
            const insightsDiv = document.getElementById('aiInsights');
            insightsDiv.innerHTML = data.recommendations.map(rec => `
                <div class="insight-item">${rec}</div>
            `).join('');
        }
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

// 优化日程
async function optimizeSchedule() {
    showToast('正在优化日程...', 'info');
    
    try {
        const response = await fetch(`${API_BASE}/tasks`);
        const tasksData = await response.json();
        
        if (tasksData.tasks.length === 0) {
            showToast('没有任务需要优化', 'info');
            return;
        }
        
        const taskIds = tasksData.tasks
            .filter(t => t.status !== 'completed')
            .map(t => t.id);
        
        const optimizeResponse = await fetch(`${API_BASE}/schedule/optimize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                task_ids: taskIds,
                date_range_start: new Date().toISOString(),
                date_range_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                respect_energy_levels: true,
                allow_domain_overflow: false
            })
        });
        
        const result = await optimizeResponse.json();
        
        if (result.success) {
            showToast(result.message, 'success');
            await loadTasks();
            await updateDashboard();
        }
    } catch (error) {
        console.error('Error optimizing schedule:', error);
        showToast('优化失败', 'error');
    }
}

// 更新本体论
async function updateOntology() {
    showToast('AI 正在学习您的使用模式...', 'info');
    
    try {
        const response = await fetch(`${API_BASE}/ontology/update`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('AI 学习完成！', 'success');
            
            // 显示学习结果
            if (data.insights && data.insights.length > 0) {
                const insightsDiv = document.getElementById('aiInsights');
                insightsDiv.innerHTML = `
                    <div class="insight-item">
                        <strong>🧠 AI 学习结果：</strong><br>
                        ${data.insights.join('<br>')}
                    </div>
                    ${data.recommendations.map(rec => `
                        <div class="insight-item">${rec}</div>
                    `).join('')}
                `;
            }
        } else {
            showToast(data.message || 'AI 学习失败', 'info');
        }
    } catch (error) {
        console.error('Error updating ontology:', error);
        showToast('AI 学习失败', 'error');
    }
}

// 切换任务状态
async function toggleTask(taskId) {
    // 这里应该调用 API 更新任务状态
    console.log('Toggle task:', taskId);
    showToast('任务状态已更新', 'success');
}

// 删除任务
async function deleteTask(taskId) {
    if (!confirm('确定要删除这个任务吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showToast(data.message || '任务已删除', 'success');
            await loadTasks();
            await updateDashboard();
        } else {
            showToast(data.detail || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除任务失败:', error);
        showToast('删除任务失败', 'error');
    }
}

// 全选/取消全选
let allSelected = false;
let selectedTasks = new Set();

function toggleSelectAll() {
    allSelected = !allSelected;
    const checkboxes = document.querySelectorAll('.task-select-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = allSelected;
        const taskId = checkbox.dataset.taskId;
        if (allSelected) {
            selectedTasks.add(taskId);
        } else {
            selectedTasks.delete(taskId);
        }
    });
    
    updateSelectionUI();
}

// 切换单个任务选择
function toggleTaskSelection(taskId) {
    const checkbox = document.querySelector(`.task-select-checkbox[data-task-id="${taskId}"]`);
    
    if (checkbox.checked) {
        selectedTasks.add(taskId);
    } else {
        selectedTasks.delete(taskId);
    }
    
    updateSelectionUI();
}

// 更新选择UI
function updateSelectionUI() {
    const deleteBtn = document.querySelector('.btn-delete-selected');
    const selectAllBtn = document.querySelector('.btn-select-all');
    
    if (selectedTasks.size > 0) {
        deleteBtn.style.display = 'inline-block';
        deleteBtn.innerHTML = `<span class="btn-icon">🗑️</span> 删除选中 (${selectedTasks.size})`;
    } else {
        deleteBtn.style.display = 'none';
    }
    
    // 更新任务项的选中样式
    document.querySelectorAll('.task-item').forEach(item => {
        const taskId = item.dataset.taskId;
        if (selectedTasks.has(taskId)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

// 批量删除选中的任务
async function deleteSelectedTasks() {
    if (selectedTasks.size === 0) {
        showToast('请先选择要删除的任务', 'warning');
        return;
    }
    
    if (!confirm(`确定要删除选中的 ${selectedTasks.size} 个任务吗？`)) {
        return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const taskId of selectedTasks) {
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                successCount++;
            } else {
                failCount++;
            }
        } catch (error) {
            console.error(`删除任务 ${taskId} 失败:`, error);
            failCount++;
        }
    }
    
    if (successCount > 0) {
        showToast(`成功删除 ${successCount} 个任务`, 'success');
    }
    if (failCount > 0) {
        showToast(`${failCount} 个任务删除失败`, 'error');
    }
    
    selectedTasks.clear();
    allSelected = false;
    await loadTasks();
    await updateDashboard();
}

// 更新圆环进度显示
function updateDomainProgress(domain, completedMinutes, plannedMinutes) {
    const progressCircle = document.getElementById(`${domain}Progress`);
    const progressText = document.querySelector(`#${domain}Tasks`).parentElement.querySelector('.progress-text .hours');
    
    if (progressCircle && progressText) {
        const totalMinutes = completedMinutes + plannedMinutes;
        const hours = totalMinutes / 60;
        const maxHours = 4; // 每个域分配4小时
        
        // 计算完成和计划的百分比
        const completedPercent = Math.min((completedMinutes / 60) / maxHours, 1);
        const plannedPercent = Math.min((totalMinutes / 60) / maxHours, 1);
        
        // 圆环周长
        const circumference = 2 * Math.PI * 54;
        
        // 设置实心部分（已完成）
        progressCircle.style.strokeDasharray = `${completedPercent * circumference} ${circumference}`;
        progressCircle.style.strokeDashoffset = '0';
        
        // 创建或更新透明圆环（计划但未完成）
        let plannedCircle = progressCircle.parentElement.querySelector('.planned-progress');
        if (!plannedCircle && plannedMinutes > 0) {
            plannedCircle = progressCircle.cloneNode();
            plannedCircle.classList.add('planned-progress');
            plannedCircle.style.opacity = '0.3';
            progressCircle.parentElement.appendChild(plannedCircle);
        }
        
        if (plannedCircle) {
            plannedCircle.style.strokeDasharray = `${plannedPercent * circumference} ${circumference}`;
            plannedCircle.style.strokeDashoffset = `${-completedPercent * circumference}`;
        }
        
        // 更新文本
        progressText.textContent = `${(completedMinutes / 60).toFixed(1)}/${maxHours}`;
    }
}

// 更新任务标题
async function updateTaskTitle(taskId, newTitle) {
    if (!newTitle.trim()) return;
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: newTitle.trim()
            })
        });
        
        if (response.ok) {
            showToast('任务标题已更新', 'success');
        } else {
            showToast('更新失败', 'error');
            await loadTasks();
        }
    } catch (error) {
        console.error('更新任务标题失败:', error);
        showToast('更新失败', 'error');
        await loadTasks();
    }
}

// 更新任务字段
async function updateTaskField(taskId, field, value) {
    try {
        const updateData = {};
        updateData[field] = field === 'estimated_minutes' || field === 'priority' ? parseInt(value) : value;
        
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
            showToast(`${field === 'estimated_minutes' ? '预计时间' : '优先级'}已更新`, 'success');
            await loadTasks();
            await updateDashboard();
        } else {
            showToast('更新失败', 'error');
            await loadTasks();
        }
    } catch (error) {
        console.error(`更新任务${field}失败:`, error);
        showToast('更新失败', 'error');
        await loadTasks();
    }
}

// 更新任务时间
async function updateTaskTime(taskId, timeValue) {
    if (!timeValue) return;
    
    try {
        // 获取今天的日期并设置时间
        const today = new Date();
        const [hours, minutes] = timeValue.split(':');
        today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                scheduled_start: today.toISOString()
            })
        });
        
        if (response.ok) {
            showToast('计划时间已更新', 'success');
            await loadTasks();
        } else {
            showToast('更新失败', 'error');
            await loadTasks();
        }
    } catch (error) {
        console.error('更新任务时间失败:', error);
        showToast('更新失败', 'error');
        await loadTasks();
    }
}

// 更新任务状态
async function toggleTaskStatus(taskId, isCompleted) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: isCompleted ? 'completed' : 'pending'
            })
        });
        
        if (response.ok) {
            showToast(isCompleted ? '任务已完成' : '任务已恢复', 'success');
            await loadTasks();
            await updateDashboard();
        } else {
            showToast('更新失败', 'error');
            await loadTasks();
        }
    } catch (error) {
        console.error('更新任务状态失败:', error);
        showToast('更新失败', 'error');
        await loadTasks();
    }
}

// 修改任务域
async function changeTaskDomain(taskId, newDomain) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                domain: newDomain
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showToast(`任务已移动到 ${newDomain} 域`, 'success');
            await loadTasks();
            await updateDashboard();
        } else {
            showToast(data.detail || '修改失败', 'error');
            // 恢复原值
            await loadTasks();
        }
    } catch (error) {
        console.error('修改任务域失败:', error);
        showToast('修改任务域失败', 'error');
        await loadTasks();
    }
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + Enter 快速添加任务
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const textarea = document.getElementById('aiTaskInput');
        if (document.activeElement === textarea) {
            aiProcessTasks();
        }
    }
    
    // Cmd/Ctrl + O 优化日程
    if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        optimizeSchedule();
    }
    
    // Cmd/Ctrl + A 全选任务
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        const textarea = document.getElementById('aiTaskInput');
        if (document.activeElement !== textarea) {
            e.preventDefault();
            allSelected = false; // 重置状态以确保切换
            toggleSelectAll();
        }
    }
    
    // Delete 键删除选中任务
    if (e.key === 'Delete' && selectedTasks.size > 0) {
        deleteSelectedTasks();
    }
    
    // Cmd/Ctrl + L AI 学习
    if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        updateOntology();
    }
});

// 页面加载完成后初始化
// 主题切换功能
function changeTheme(themeName) {
    const themeLink = document.getElementById('theme-stylesheet');
    themeLink.href = `/static/theme-${themeName}.css`;
    
    // 保存到 localStorage
    localStorage.setItem('selectedTheme', themeName);
    
    showToast(`已切换到 ${getThemeName(themeName)} 主题`, 'success');
}

function getThemeName(theme) {
    const names = {
        'default': '默认 macOS',
        'modernist': '极简主义',
        'dark': '深色模式'
    };
    return names[theme] || theme;
}

// 页面加载时恢复主题设置
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('selectedTheme') || 'default';
    const themeLink = document.getElementById('theme-stylesheet');
    themeLink.href = `/static/theme-${savedTheme}.css`;
    
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = savedTheme;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadSavedTheme();
    loadTasks();
    updateDashboard();
    
    // 每分钟更新一次仪表板
    setInterval(() => {
        updateDashboard();
    }, 60000);
    
    // 输入框支持 Cmd+Enter 提交
    document.getElementById('aiTaskInput').addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            aiProcessTasks();
        }
    });
});