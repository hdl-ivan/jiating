/* 家庭記帳 Service Worker
   策略：network-first（確保 iOS 主畫面 App 一定拿得到最新版），離線時退回快取 */
const CACHE = 'jiating-v6-10-0';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './sortable.min.js'];

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // API 請求絕不快取
  if (e.request.method !== 'GET' || url.hostname.includes('google.com')) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.status === 200 && url.origin === location.origin) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
