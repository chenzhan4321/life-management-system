const { app, BrowserWindow, Menu, shell, ipcMain, dialog, Tray, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const windowStateKeeper = require('electron-window-state');
const Store = require('electron-store');
const path = require('path');
const { spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;

// 配置存储
const store = new Store();

// 全局变量
let mainWindow;
let pythonProcess;
let tray;
let isQuitting = false;

// 开发模式检测
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const serverURL = isDev ? 'http://localhost:8000' : 'http://localhost:8000';

class LifeManagementApp {
    constructor() {
        this.setupApp();
    }

    setupApp() {
        // 设置应用名称
        app.setName('生活管理系统');
        
        // 单例模式 - 防止多开
        const gotTheLock = app.requestSingleInstanceLock();
        if (!gotTheLock) {
            app.quit();
            return;
        }

        // 事件监听
        this.setupEventListeners();
        
        // 自动更新
        this.setupAutoUpdater();
    }

    setupEventListeners() {
        app.whenReady().then(() => {
            this.createWindow();
            this.createTray();
            this.setupMenu();
            this.startPythonServer();
        });

        app.on('second-instance', () => {
            // 当试图打开第二个实例时，聚焦到主窗口
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
            }
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                this.cleanup();
                app.quit();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });

        app.on('before-quit', () => {
            isQuitting = true;
            this.cleanup();
        });
    }

    async createWindow() {
        // 窗口状态管理
        let mainWindowState = windowStateKeeper({
            defaultWidth: 1200,
            defaultHeight: 800
        });

        // 创建浏览器窗口
        mainWindow = new BrowserWindow({
            x: mainWindowState.x,
            y: mainWindowState.y,
            width: mainWindowState.width,
            height: mainWindowState.height,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, 'preload.js')
            },
            icon: this.getIconPath(),
            show: false,
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        });

        // 管理窗口状态
        mainWindowState.manage(mainWindow);

        // 窗口事件
        mainWindow.once('ready-to-show', () => {
            mainWindow.show();
            
            if (isDev) {
                mainWindow.webContents.openDevTools();
            }
        });

        mainWindow.on('close', (event) => {
            if (!isQuitting && process.platform === 'darwin') {
                event.preventDefault();
                mainWindow.hide();
            }
        });

        // 加载应用
        await this.loadApplication();
    }

    async loadApplication() {
        try {
            // 等待Python服务器启动
            await this.waitForServer();
            
            // 加载应用
            await mainWindow.loadURL(serverURL);
            
            console.log('应用加载成功');
        } catch (error) {
            console.error('加载应用失败:', error);
            
            // 显示错误页面
            await mainWindow.loadFile(path.join(__dirname, 'error.html'));
        }
    }

    async startPythonServer() {
        if (pythonProcess) return;

        try {
            const pythonPath = await this.findPython();
            const scriptPath = path.join(__dirname, '..', 'run.py');
            
            console.log('启动Python服务器...', { pythonPath, scriptPath });
            
            pythonProcess = spawn(pythonPath, [scriptPath], {
                stdio: isDev ? 'pipe' : 'ignore',
                cwd: path.join(__dirname, '..')
            });

            if (isDev) {
                pythonProcess.stdout.on('data', (data) => {
                    console.log(`Python stdout: ${data}`);
                });

                pythonProcess.stderr.on('data', (data) => {
                    console.error(`Python stderr: ${data}`);
                });
            }

            pythonProcess.on('close', (code) => {
                console.log(`Python进程退出，代码: ${code}`);
                pythonProcess = null;
            });

            // 等待服务器启动
            await new Promise(resolve => setTimeout(resolve, 3000));
            
        } catch (error) {
            console.error('启动Python服务器失败:', error);
            this.showErrorDialog('服务器启动失败', error.message);
        }
    }

    async findPython() {
        // Python路径优先级
        const pythonPaths = [
            'python3',
            'python',
            '/usr/local/bin/python3',
            '/usr/bin/python3',
            '/opt/homebrew/bin/python3'
        ];

        for (const pythonPath of pythonPaths) {
            try {
                await promisify(require('child_process').exec)(`${pythonPath} --version`);
                return pythonPath;
            } catch (error) {
                continue;
            }
        }

        throw new Error('未找到Python解释器');
    }

    async waitForServer(maxWait = 30000) {
        const checkServer = async () => {
            try {
                const response = await fetch(serverURL);
                return response.ok;
            } catch {
                return false;
            }
        };

        const startTime = Date.now();
        while (Date.now() - startTime < maxWait) {
            if (await checkServer()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        throw new Error('服务器启动超时');
    }

    createTray() {
        const trayIcon = nativeImage.createFromPath(this.getIconPath());
        tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
        
        const contextMenu = Menu.buildFromTemplate([
            {
                label: '显示窗口',
                click: () => {
                    mainWindow.show();
                }
            },
            {
                label: '新建任务',
                accelerator: 'CmdOrCtrl+N',
                click: () => {
                    mainWindow.show();
                    mainWindow.webContents.executeJavaScript(`
                        document.getElementById('quickTaskInput')?.focus();
                    `);
                }
            },
            { type: 'separator' },
            {
                label: '设置',
                click: () => {
                    this.openSettings();
                }
            },
            {
                label: '关于',
                click: () => {
                    this.showAbout();
                }
            },
            { type: 'separator' },
            {
                label: '退出',
                accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                click: () => {
                    isQuitting = true;
                    app.quit();
                }
            }
        ]);

        tray.setContextMenu(contextMenu);
        tray.setToolTip('生活管理系统');
        
        tray.on('click', () => {
            mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        });
    }

    setupMenu() {
        const template = [
            {
                label: '文件',
                submenu: [
                    {
                        label: '新建任务',
                        accelerator: 'CmdOrCtrl+N',
                        click: () => {
                            mainWindow.webContents.executeJavaScript(`
                                document.getElementById('quickTaskInput')?.focus();
                            `);
                        }
                    },
                    { type: 'separator' },
                    {
                        label: '导出数据',
                        click: () => this.exportData()
                    },
                    {
                        label: '导入数据',
                        click: () => this.importData()
                    },
                    { type: 'separator' },
                    {
                        label: '退出',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => {
                            isQuitting = true;
                            app.quit();
                        }
                    }
                ]
            },
            {
                label: '编辑',
                submenu: [
                    { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                    { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
                    { type: 'separator' },
                    { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
                    { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                    { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
                    { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
                ]
            },
            {
                label: '视图',
                submenu: [
                    { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
                    { label: '强制重载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
                    { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
                    { type: 'separator' },
                    { label: '实际尺寸', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
                    { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
                    { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
                    { type: 'separator' },
                    { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' }
                ]
            },
            {
                label: '窗口',
                submenu: [
                    { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
                    { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' }
                ]
            },
            {
                label: '帮助',
                submenu: [
                    {
                        label: '快捷键帮助',
                        accelerator: 'F1',
                        click: () => {
                            mainWindow.webContents.executeJavaScript(`
                                if (window.shortcutManager) {
                                    window.shortcutManager.showHelp();
                                }
                            `);
                        }
                    },
                    {
                        label: '关于',
                        click: () => this.showAbout()
                    }
                ]
            }
        ];

        // macOS特殊菜单
        if (process.platform === 'darwin') {
            template.unshift({
                label: app.getName(),
                submenu: [
                    { label: '关于 ' + app.getName(), role: 'about' },
                    { type: 'separator' },
                    { label: '服务', role: 'services', submenu: [] },
                    { type: 'separator' },
                    { label: '隐藏 ' + app.getName(), accelerator: 'Command+H', role: 'hide' },
                    { label: '隐藏其他', accelerator: 'Command+Shift+H', role: 'hideothers' },
                    { label: '显示全部', role: 'unhide' },
                    { type: 'separator' },
                    { label: '退出', accelerator: 'Command+Q', click: () => app.quit() }
                ]
            });
        }

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    setupAutoUpdater() {
        if (isDev) return;

        autoUpdater.checkForUpdatesAndNotify();

        autoUpdater.on('update-available', () => {
            dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: '更新可用',
                message: '发现新版本，正在下载...',
                buttons: ['确定']
            });
        });

        autoUpdater.on('update-downloaded', () => {
            dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: '更新已下载',
                message: '更新已下载完成，将在重启后应用。',
                buttons: ['立即重启', '稍后重启']
            }).then((result) => {
                if (result.response === 0) {
                    autoUpdater.quitAndInstall();
                }
            });
        });
    }

    getIconPath() {
        if (process.platform === 'darwin') {
            return path.join(__dirname, 'assets', 'icon.icns');
        } else if (process.platform === 'win32') {
            return path.join(__dirname, 'assets', 'icon.ico');
        } else {
            return path.join(__dirname, 'assets', 'icon.png');
        }
    }

    showAbout() {
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: '关于生活管理系统',
            message: '生活管理系统',
            detail: `版本: ${app.getVersion()}\n基于AI的智能任务管理和时间优化系统\nPalantir架构设计\n\n© 2024 Life Management Team`,
            buttons: ['确定']
        });
    }

    showErrorDialog(title, message) {
        dialog.showErrorBox(title, message);
    }

    async exportData() {
        try {
            const result = await dialog.showSaveDialog(mainWindow, {
                title: '导出数据',
                defaultPath: `life-management-data-${new Date().toISOString().split('T')[0]}.json`,
                filters: [
                    { name: 'JSON Files', extensions: ['json'] }
                ]
            });

            if (!result.canceled) {
                // 这里可以实现数据导出逻辑
                mainWindow.webContents.executeJavaScript(`
                    // 导出数据的前端逻辑
                    console.log('导出数据到: ${result.filePath}');
                `);
            }
        } catch (error) {
            this.showErrorDialog('导出失败', error.message);
        }
    }

    async importData() {
        try {
            const result = await dialog.showOpenDialog(mainWindow, {
                title: '导入数据',
                filters: [
                    { name: 'JSON Files', extensions: ['json'] }
                ]
            });

            if (!result.canceled) {
                // 这里可以实现数据导入逻辑
                mainWindow.webContents.executeJavaScript(`
                    // 导入数据的前端逻辑
                    console.log('从文件导入数据: ${result.filePaths[0]}');
                `);
            }
        } catch (error) {
            this.showErrorDialog('导入失败', error.message);
        }
    }

    openSettings() {
        // 创建设置窗口或在主窗口中显示设置页面
        mainWindow.show();
        mainWindow.webContents.executeJavaScript(`
            // 显示设置界面
            console.log('打开设置');
        `);
    }

    cleanup() {
        if (pythonProcess) {
            console.log('终止Python进程...');
            pythonProcess.kill('SIGTERM');
            pythonProcess = null;
        }

        if (tray) {
            tray.destroy();
            tray = null;
        }
    }
}

// 启动应用
new LifeManagementApp();

// 处理协议链接
app.setAsDefaultProtocolClient('life-management');

// IPC通信处理
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-app-path', () => app.getAppPath());

// 全局异常处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    dialog.showErrorBox('应用错误', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
});