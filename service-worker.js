// service-worker.js - PWA支持

// 缓存名称及版本号，更新版本号可以强制刷新缓存
const CACHE_NAME = 'agents-platform-cache-v1';

// 需要缓存的资源列表
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/storage.js',
  '/agents.js',
  '/chat.js',
  '/api.js',
  '/word-export.js',
  '/settings.js',
  '/ui.js',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://cdn.jsdelivr.net/npm/highlight.js@11.7.0/styles/github.min.css',
  'https://cdn.jsdelivr.net/npm/highlight.js@11.7.0/lib/highlight.min.js'
];

// 安装Service Worker并缓存核心资源
self.addEventListener('install', event => {
  console.log('Service Worker 正在安装...');
  
  // 跳过等待，直接激活
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('缓存已打开');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('所有资源已缓存');
      })
      .catch(error => {
        console.error('预缓存失败:', error);
      })
  );
});

// 激活后清理旧缓存
self.addEventListener('activate', event => {
  console.log('Service Worker 已激活');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('清理旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // 确保激活后立即控制所有客户端
  return self.clients.claim();
});

// 拦截请求并从缓存提供资源
self.addEventListener('fetch', event => {
  // 对于API请求，直接通过网络获取，不走缓存
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('openai.com') ||
      event.request.url.includes('aihubmix.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果在缓存中找到响应，则返回缓存的版本
        if (response) {
          return response;
        }
        
        // 否则发起网络请求
        return fetch(event.request)
          .then(response => {
            // 检查是否收到有效响应
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 复制响应以便我们可以同时返回它并添加到缓存
            const responseToCache = response.clone();
            
            // 非HTML资源添加到缓存
            if (!event.request.url.endsWith('.html')) {
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            
            return response;
          })
          .catch(error => {
            console.error('获取资源失败:', error);
            
            // 如果是导航请求（HTML页面），返回缓存的首页
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            // 其他请求失败返回错误
            return new Response(
              JSON.stringify({
                error: 'Network error occurred',
                message: error.message
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
      })
  );
});

// 当后台同步事件触发时，尝试发送失败的消息
self.addEventListener('sync', event => {
  if (event.tag === 'send-message-retry') {
    console.log('尝试重发失败的消息');
    event.waitUntil(
      // 这里可以添加恢复失败消息的逻辑
      Promise.resolve()
    );
  }
});

// 推送通知处理
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || '收到新消息',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || '智能体平台', options)
  );
});

// 通知点击事件处理
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then(clientList => {
        // 如果已有打开的窗口，则聚焦到该窗口
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        // 否则打开新窗口
        return clients.openWindow(event.notification.data.url || '/');
      })
  );
}); 