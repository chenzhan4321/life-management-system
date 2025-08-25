const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 应用信息
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    
    // 系统信息
    getPlatform: () => process.platform,
    isElectron: () => true,
    
    // 窗口控制
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    
    // 文件系统
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    
    // 通知
    showNotification: (title, options) => ipcRenderer.invoke('show-notification', title, options),
    
    // 主题
    getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
    onThemeChanged: (callback) => {
        ipcRenderer.on('theme-changed', callback);
        return () => ipcRenderer.removeListener('theme-changed', callback);
    },
    
    // 快捷键
    registerGlobalShortcut: (shortcut, callback) => ipcRenderer.invoke('register-global-shortcut', shortcut),
    unregisterGlobalShortcut: (shortcut) => ipcRenderer.invoke('unregister-global-shortcut', shortcut),
    
    // 应用更新
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    onUpdateAvailable: (callback) => {
        ipcRenderer.on('update-available', callback);
        return () => ipcRenderer.removeListener('update-available', callback);
    },
    onUpdateDownloaded: (callback) => {
        ipcRenderer.on('update-downloaded', callback);
        return () => ipcRenderer.removeListener('update-downloaded', callback);
    },
    installUpdate: () => ipcRenderer.invoke('install-update'),
    
    // 数据导入导出
    exportData: (data) => ipcRenderer.invoke('export-data', data),
    importData: () => ipcRenderer.invoke('import-data'),
    
    // 日志
    log: (level, message) => ipcRenderer.invoke('log', level, message),
    
    // 开发者工具
    openDevTools: () => ipcRenderer.invoke('open-dev-tools'),
    
    // 剪贴板
    writeClipboard: (text) => ipcRenderer.invoke('write-clipboard', text),
    readClipboard: () => ipcRenderer.invoke('read-clipboard'),
});

// 增强的错误处理
window.addEventListener('error', (event) => {
    console.error('渲染进程错误:', event.error);
    // 可以发送错误到主进程进行日志记录
    ipcRenderer.invoke('log', 'error', {
        message: event.error.message,
        stack: event.error.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
    ipcRenderer.invoke('log', 'error', {
        message: '未处理的Promise拒绝',
        reason: event.reason
    });
});

// DOM加载完成后的初始化
document.addEventListener('DOMContentLoaded', () => {
    // 为Electron环境添加特殊标识
    document.body.classList.add('electron-app');
    
    // 设置快捷键提示文本（针对不同平台）
    const isMac = process.platform === 'darwin';
    const shortcutTexts = document.querySelectorAll('.shortcut-text');
    shortcutTexts.forEach(element => {
        const text = element.textContent;
        if (isMac) {
            element.textContent = text.replace(/Ctrl/g, 'Cmd');
        }
    });
    
    // 禁用右键菜单（可选）
    if (process.env.NODE_ENV !== 'development') {
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
    
    // 防止拖拽文件到窗口
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('drop', (e) => {
        e.preventDefault();
    });
});

// 键盘事件增强
document.addEventListener('keydown', (event) => {
    // Electron特定的快捷键处理
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? event.metaKey : event.ctrlKey;
    
    // 禁用一些可能干扰的快捷键
    if (modifier) {
        switch (event.key) {
            case 'r':
                // 防止意外刷新
                if (process.env.NODE_ENV !== 'development') {
                    event.preventDefault();
                }
                break;
            case 'w':
                // 防止意外关闭窗口
                event.preventDefault();
                break;
        }
    }
});

// 控制台增强
const originalConsoleLog = console.log;
console.log = function(...args) {
    originalConsoleLog.apply(console, args);
    // 可以发送日志到主进程
    ipcRenderer.invoke('log', 'info', args.join(' '));
};

console.log('Preload script loaded successfully');
console.log('Platform:', process.platform);
console.log('Electron version:', process.versions.electron);
console.log('Node version:', process.versions.node);
console.log('Chrome version:', process.versions.chrome);