// 主题管理器模块 - 统一管理浅色和深色主题
// 版本: v4.0

class ThemeManager {
    constructor() {
        this.themes = {
            default: {
                name: '浅色模式',
                file: './styles/theme-default.css',
                icon: '☀️',
                description: '清爽明亮的白天模式'
            },
            dark: {
                name: '深色模式', 
                file: './styles/theme-dark.css',
                icon: '🌙',
                description: '护眼舒适的夜间模式'
            }
        };

        this.currentTheme = this._loadSavedTheme();
        this.themeStylesheet = document.getElementById('theme-stylesheet');
        this.themeSelect = null;

        // 初始化
        this._initializeTheme();
        this._setupSystemThemeListener();
        
        console.log('🎨 主题管理器初始化完成:', {
            currentTheme: this.currentTheme,
            availableThemes: Object.keys(this.themes)
        });
    }

    // 初始化主题
    _initializeTheme() {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this._setupThemeUI();
                this.applyTheme(this.currentTheme);
            });
        } else {
            this._setupThemeUI();
            this.applyTheme(this.currentTheme);
        }
    }

    // 设置主题UI
    _setupThemeUI() {
        this.themeSelect = document.getElementById('theme-select');
        if (this.themeSelect) {
            this.themeSelect.value = this.currentTheme;
            
            // 添加主题图标到选项
            Array.from(this.themeSelect.options).forEach(option => {
                const theme = this.themes[option.value];
                if (theme) {
                    option.textContent = `${theme.icon} ${theme.name}`;
                }
            });
        }
    }

    // 加载保存的主题设置
    _loadSavedTheme() {
        const saved = localStorage.getItem('selectedTheme');
        if (saved && this.themes[saved]) {
            return saved;
        }
        
        // 如果没有保存的主题，检查系统主题偏好
        return this._detectSystemTheme();
    }

    // 检测系统主题偏好
    _detectSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'default';
    }

    // 监听系统主题变化
    _setupSystemThemeListener() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            // 现代浏览器使用addEventListener
            if (mediaQuery.addEventListener) {
                mediaQuery.addEventListener('change', (e) => {
                    // 只在用户没有手动设置主题时跟随系统
                    if (!localStorage.getItem('selectedTheme')) {
                        const newTheme = e.matches ? 'dark' : 'default';
                        this.changeTheme(newTheme, false); // false表示不保存设置
                    }
                });
            }
            // 兼容旧版本浏览器
            else if (mediaQuery.addListener) {
                mediaQuery.addListener((e) => {
                    if (!localStorage.getItem('selectedTheme')) {
                        const newTheme = e.matches ? 'dark' : 'default';
                        this.changeTheme(newTheme, false);
                    }
                });
            }
        }
    }

    // 应用主题
    applyTheme(themeName, showNotification = false) {
        if (!this.themes[themeName]) {
            console.warn(`❌ 主题不存在: ${themeName}`);
            return false;
        }

        const theme = this.themes[themeName];
        
        // 更新样式表
        if (this.themeStylesheet) {
            this.themeStylesheet.href = `${theme.file}?v=4.0&t=${Date.now()}`;
        }

        // 更新选择器
        if (this.themeSelect) {
            this.themeSelect.value = themeName;
        }

        // 更新meta主题颜色
        this._updateMetaThemeColor(themeName);

        // 更新body类名用于特殊样式
        document.body.className = document.body.className
            .replace(/theme-\w+/g, '')
            .trim();
        document.body.classList.add(`theme-${themeName}`);

        this.currentTheme = themeName;

        // 显示通知
        if (showNotification && window.notificationManager) {
            window.notificationManager.showToast(
                `${theme.icon} 已切换到${theme.name}`,
                'success'
            );
        }

        console.log(`🎨 主题已切换为: ${theme.name}`);
        return true;
    }

    // 更新meta主题颜色
    _updateMetaThemeColor(themeName) {
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        const colors = {
            default: '#2563eb',  // 蓝色
            dark: '#1f1f24'      // 深灰色
        };

        if (themeColorMeta) {
            themeColorMeta.setAttribute('content', colors[themeName] || colors.default);
        }
    }

    // 切换主题（公开方法）
    changeTheme(themeName, saveToStorage = true) {
        if (this.applyTheme(themeName, true)) {
            // 保存到本地存储
            if (saveToStorage) {
                localStorage.setItem('selectedTheme', themeName);
                console.log(`💾 主题设置已保存: ${themeName}`);
            }

            // 触发自定义事件
            this._dispatchThemeChangeEvent(themeName);
            
            return true;
        }
        return false;
    }

    // 触发主题变化事件
    _dispatchThemeChangeEvent(themeName) {
        const event = new CustomEvent('themeChanged', {
            detail: {
                theme: themeName,
                themeData: this.themes[themeName]
            }
        });
        window.dispatchEvent(event);
    }

    // 切换到下一个主题
    toggleTheme() {
        const themeNames = Object.keys(this.themes);
        const currentIndex = themeNames.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themeNames.length;
        const nextTheme = themeNames[nextIndex];
        
        this.changeTheme(nextTheme);
    }

    // 获取当前主题信息
    getCurrentTheme() {
        return {
            name: this.currentTheme,
            ...this.themes[this.currentTheme]
        };
    }

    // 获取所有主题信息
    getAllThemes() {
        return { ...this.themes };
    }

    // 检查是否为深色主题
    isDarkTheme() {
        return this.currentTheme === 'dark';
    }

    // 重置主题设置
    resetTheme() {
        localStorage.removeItem('selectedTheme');
        const systemTheme = this._detectSystemTheme();
        this.changeTheme(systemTheme, false);
        
        if (window.notificationManager) {
            window.notificationManager.showToast(
                '🔄 主题设置已重置为系统默认',
                'info'
            );
        }
    }

    // 预加载主题资源
    preloadThemes() {
        Object.values(this.themes).forEach(theme => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = `${theme.file}?v=4.0`;
            document.head.appendChild(link);
        });
        
        console.log('🚀 主题资源预加载完成');
    }
}

// 导出主题管理器实例
export const themeManager = new ThemeManager();

// 全局暴露（兼容HTML内联调用）
window.themeManager = themeManager;

// 监听主题变化事件
window.addEventListener('themeChanged', (event) => {
    console.log('🎨 主题变化事件:', event.detail);
});

console.log('🎨 主题管理器模块加载完成');