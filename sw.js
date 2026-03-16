// Service Worker - 离线缓存支持
const CACHE_NAME = 'wallpaper-gallery-v3'; // 更新版本号
const urlsToCache = [
  './',
  './index.html',
  './app-indexeddb.js',
  './indexeddb-storage.js',
  './supabase-sync.js'
];

// 安装 Service Worker 时缓存资源
self.addEventListener('install', event => {
  console.log('[Service Worker] 正在安装...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] 正在缓存文件');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] 安装完成');
        return self.skipWaiting(); // 立即激活新的 Service Worker
      })
      .catch(error => {
        console.error('[Service Worker] 缓存失败:', error);
      })
  );
});

// 激活 Service Worker 时清理旧缓存
self.addEventListener('activate', event => {
  console.log('[Service Worker] 正在激活...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] 激活完成');
      return self.clients.claim(); // 立即控制所有页面
    })
  );
});

// 拦截网络请求，优先使用缓存
self.addEventListener('fetch', event => {
  const url = event.request.url;
  const isOrigin = url.startsWith(self.location.origin);
  const isSupabaseMedia = url.includes('supabase.co/storage/v1/object/public');

  // 只处理网页文件和 Supabase 媒体文件
  if (!isOrigin && !isSupabaseMedia) {
    return; // 跳过其他外部请求（如 API 调用）
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 缓存命中，返回缓存
        if (response) {
          console.log('[Service Worker] 从缓存加载:', event.request.url);
          return response;
        }

        // 缓存未命中，发起网络请求
        console.log('[Service Worker] 从网络加载:', event.request.url);
        return fetch(event.request).then(response => {
          // 检查是否是有效响应
          if (!response || response.status !== 200) {
            return response;
          }

          // 只缓存成功的响应
          // 对于跨域请求（Supabase），response.type 是 'opaque' 或 'cors'
          if (response.type === 'basic' || response.type === 'cors') {
            // 克隆响应并缓存
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
              console.log('[Service Worker] 已缓存:', event.request.url);
            });
          }

          return response;
        });
      })
      .catch(error => {
        console.error('[Service Worker] 请求失败:', error);
        // 返回离线提示
        return new Response('离线状态，无法加载资源', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});
