// 生活管理系统 Service Worker v4.0
// 提供离线功能、缓存管理和后台同步

const CACHE_NAME = 'life-management-v4.0.0';
const CACHE_STATIC_NAME = 'life-management-static-v4.0.0';
const CACHE_DYNAMIC_NAME = 'life-management-dynamic-v4.0.0';

// 需要预缓存的静态资源
const STATIC_FILES = [
    '/',
    '/index.html',
    '/js/app.js',
    '/js/modules/api.js',
    '/js/modules/theme-manager.js',
    '/js/modules/notification-manager.js',
    '/js/modules/task-processor.js',
    '/js/modules/task-manager.js',
    '/styles/theme-default.css',
    '/styles/theme-dark.css',
    '/styles/mobile.css',
    '/manifest.json',
    '/static/icons/icon-192x192.png',
    '/static/icons/icon-512x512.png'
];

// 动态缓存的资源模式
const DYNAMIC_CACHE_PATTERNS = [
    /^https:\/\/fonts\.googleapis\.com\//,
    /^https:\/\/fonts\.gstatic\.com\//,
    /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    /\.(?:css|js)$/
];

// API缓存策略配置
const API_CACHE_CONFIG = {
    '/api/tasks': { strategy: 'networkFirst', ttl: 5 * 60 * 1000 }, // 5分钟
    '/api/analytics/daily': { strategy: 'cacheFirst', ttl: 30 * 60 * 1000 }, // 30分钟
    '/api/health': { strategy: 'networkOnly', ttl: 0 }
};

// Service Worker 安装事件
self.addEventListener('install', event => {
    console.log('🔧 Service Worker 安装中...');
    
    event.waitUntil(
        caches.open(CACHE_STATIC_NAME)
            .then(cache => {
                console.log('📦 预缓存静态资源...');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('✅ Service Worker 安装完成');
                return self.skipWaiting(); // 立即激活新版本
            })
            .catch(error => {
                console.error('❌ Service Worker 安装失败:', error);
            })
    );
});

// Service Worker 激活事件
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker 激活中...');
    
    event.waitUntil(
        Promise.all([
            // 清理旧缓存
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => 
                            cacheName !== CACHE_STATIC_NAME && 
                            cacheName !== CACHE_DYNAMIC_NAME &&
                            cacheName.startsWith('life-management-')
                        )
                        .map(cacheName => {
                            console.log('🗑️ 删除旧缓存:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            }),
            // 立即控制所有页面
            self.clients.claim()
        ]).then(() => {
            console.log('✅ Service Worker 激活完成');
        })
    );
});

// 网络请求拦截
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // 跳过非 GET 请求和 Chrome 扩展请求
    if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
        return;
    }
    
    // API 请求处理
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }
    
    // 静态资源处理
    if (STATIC_FILES.includes(url.pathname) || url.pathname === '/') {
        event.respondWith(handleStaticRequest(request));
        return;
    }
    
    // 动态资源处理
    if (shouldCacheDynamic(url)) {
        event.respondWith(handleDynamicRequest(request));
        return;
    }
    
    // 其他请求直接通过网络
    event.respondWith(fetch(request));
});

// 处理API请求
async function handleApiRequest(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const config = API_CACHE_CONFIG[pathname] || { strategy: 'networkFirst', ttl: 5 * 60 * 1000 };
    
    try {
        switch (config.strategy) {
            case 'networkFirst':
                return await networkFirstStrategy(request, config.ttl);
            case 'cacheFirst':
                return await cacheFirstStrategy(request, config.ttl);
            case 'networkOnly':
                return await fetch(request);
            default:
                return await networkFirstStrategy(request, config.ttl);
        }
    } catch (error) {
        console.error('❌ API请求处理失败:', error);
        
        // 尝试返回缓存或离线页面
        const cachedResponse = await getCachedResponse(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 返回离线响应
        return new Response(JSON.stringify({
            success: false,
            message: '网络连接不可用，请检查网络设置',
            offline: true
        }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 处理静态资源请求
async function handleStaticRequest(request) {
    try {
        // 先从缓存获取
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 缓存未命中，从网络获取并缓存
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_STATIC_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('❌ 静态资源请求失败:', error);
        
        // 返回缓存中的资源
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 如果是页面请求，返回离线页面
        if (request.destination === 'document') {
            return caches.match('/index.html');
        }
        
        throw error;
    }
}

// 处理动态资源请求
async function handleDynamicRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_DYNAMIC_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.warn('⚠️ 动态资源网络请求失败，尝试缓存:', error);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

// 网络优先策略
async function networkFirstStrategy(request, ttl) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_DYNAMIC_NAME);
            
            // 添加时间戳
            const responseToCache = new Response(networkResponse.body, {
                status: networkResponse.status,
                statusText: networkResponse.statusText,
                headers: {
                    ...networkResponse.headers,
                    'sw-cache-time': Date.now().toString()
                }
            });
            
            cache.put(request, responseToCache);
        }
        
        return networkResponse;
    } catch (error) {
        // 网络失败，尝试缓存
        const cachedResponse = await getCachedResponse(request, ttl);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

// 缓存优先策略
async function cacheFirstStrategy(request, ttl) {
    const cachedResponse = await getCachedResponse(request, ttl);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // 缓存未命中或过期，从网络获取
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
        const cache = await caches.open(CACHE_DYNAMIC_NAME);
        
        const responseToCache = new Response(networkResponse.body, {
            status: networkResponse.status,
            statusText: networkResponse.statusText,
            headers: {
                ...networkResponse.headers,
                'sw-cache-time': Date.now().toString()
            }
        });
        
        cache.put(request, responseToCache);
    }
    
    return networkResponse;
}

// 获取缓存响应（带TTL检查）
async function getCachedResponse(request, ttl = 0) {
    const cachedResponse = await caches.match(request);
    
    if (!cachedResponse) {
        return null;
    }
    
    // 检查TTL
    if (ttl > 0) {
        const cacheTime = cachedResponse.headers.get('sw-cache-time');
        if (cacheTime) {
            const age = Date.now() - parseInt(cacheTime);
            if (age > ttl) {
                console.log('⏰ 缓存已过期:', request.url);
                return null;
            }
        }
    }
    
    return cachedResponse;
}

// 检查是否应该缓存动态资源
function shouldCacheDynamic(url) {
    return DYNAMIC_CACHE_PATTERNS.some(pattern => pattern.test(url.href));
}

// 后台同步
self.addEventListener('sync', event => {
    console.log('🔄 后台同步事件:', event.tag);
    
    if (event.tag === 'background-sync-tasks') {
        event.waitUntil(syncTasks());
    }
});

// 同步任务数据
async function syncTasks() {
    try {
        console.log('🔄 开始同步任务数据...');
        
        // 这里可以实现离线任务的同步逻辑
        // 从 IndexedDB 读取离线创建的任务，同步到服务器
        
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                message: '任务数据同步完成'
            });
        });
        
        console.log('✅ 任务数据同步完成');
    } catch (error) {
        console.error('❌ 任务数据同步失败:', error);
    }
}

// 推送通知
self.addEventListener('push', event => {
    console.log('📱 收到推送通知:', event);
    
    const data = event.data ? event.data.json() : {};
    const title = data.title || '生活管理系统';
    const options = {
        body: data.body || '您有新的任务提醒',
        icon: '/static/icons/icon-192x192.png',
        badge: '/static/icons/icon-96x96.png',
        tag: data.tag || 'task-reminder',
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || [
            {
                action: 'view',
                title: '查看',
                icon: '/static/icons/icon-72x72.png'
            },
            {
                action: 'dismiss',
                title: '忽略',
                icon: '/static/icons/icon-72x72.png'
            }
        ],
        data: data.data || {}
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// 通知点击事件
self.addEventListener('notificationclick', event => {
    console.log('📱 通知被点击:', event);
    
    event.notification.close();
    
    if (event.action === 'view') {
        // 打开应用
        event.waitUntil(
            self.clients.openWindow('/')
        );
    } else if (event.action === 'dismiss') {
        // 忽略通知
        console.log('📱 通知被忽略');
    } else {
        // 默认行为：打开应用
        event.waitUntil(
            self.clients.openWindow('/')
        );
    }
});

// 消息处理
self.addEventListener('message', event => {
    console.log('📨 收到消息:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_NAME,
            timestamp: new Date().toISOString()
        });
    }
});

// 错误处理
self.addEventListener('error', event => {
    console.error('❌ Service Worker 错误:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('❌ Service Worker 未处理的Promise拒绝:', event.reason);
});

// 工具函数：清理过期缓存
async function cleanupExpiredCache() {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
        if (cacheName.startsWith('life-management-dynamic-')) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            
            for (const request of requests) {
                const response = await cache.match(request);
                const cacheTime = response?.headers.get('sw-cache-time');
                
                if (cacheTime) {
                    const age = Date.now() - parseInt(cacheTime);
                    // 清理超过1小时的动态缓存
                    if (age > 60 * 60 * 1000) {
                        await cache.delete(request);
                        console.log('🗑️ 清理过期缓存:', request.url);
                    }
                }
            }
        }
    }
}

// 定期清理缓存（每30分钟）
setInterval(cleanupExpiredCache, 30 * 60 * 1000);

console.log('🚀 Service Worker 脚本加载完成 - v4.0.0');