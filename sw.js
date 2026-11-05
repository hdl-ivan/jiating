/* 家庭記帳 Service Worker
   策略：network-first（確保 iOS 主畫面 App 一定拿得到最新版），離線時退回快取

   v6.25.0 r2（F07）：
   ・核心頁面（CORE）一定要完整存進新快取，否則安裝失敗 —— 舊版 worker 與舊快取原封不動，離線照樣能開。
     以前 addAll 的失敗被吞掉，新版照樣啟用、再把舊快取刪光，結果離線時什麼都沒有。
   ・圖示、manifest、拖曳元件是選用資源：各自盡量存，缺一個不影響安裝。
   ・啟用時只刪「本 App 自己的舊快取」（jiating- 開頭），同網域其他程式的快取不碰。
   ・安裝成功後才 skipWaiting。 */
const CACHE_PREFIX = 'jiating-';
const CACHE = CACHE_PREFIX + 'v6-26-0';
const CORE = ['./', './index.html'];
const OPTIONAL = ['./manifest.json', './icon-192.png', './icon-512.png', './sortable.min.js'];

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE).then(() => c))          // 任一核心資源失敗 → reject → 安裝失敗、保留舊版
      .then(c => Promise.all(OPTIONAL.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k.indexOf(CACHE_PREFIX) === 0 && k !== CACHE).map(k => caches.delete(k)))
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
