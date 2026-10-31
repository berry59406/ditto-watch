// 百變軟泥離線快取版本號（日後若有修改程式碼，只要把 v1 改成 v2 就會自動更新快取）
const CACHE_NAME = 'squishy-ditto-pwa-v3';

// 需要永久快取在手錶/手機裡的檔案清單
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// 1. 安裝階段：第一次打開網頁時，立即將所有遊戲檔案寫入快取
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. 啟用階段：自動清理舊版本的快取空間
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. 攔截請求階段：採用「快取優先 + 背景更新 (Stale-While-Revalidate)」策略
// 即使在 Apple Watch 網路極慢或完全斷網時，也能瞬間從本地快取秒開畫面！
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // 完全離線時，直接退回快取中的 index.html
          return cachedResponse || caches.match('./index.html');
        });

      // 有快取就直接秒給快取，同時在背景靜默更新
      return cachedResponse || fetchPromise;
    })
  );
});
