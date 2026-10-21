// 離線快取：沒網路時也能打開 App 打卡，連上網路後 Firebase 會自動補同步。
const CACHE = "habit-grid-v1";
const SHELL = ["./", "index.html", "firebase-config.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Firebase 的登入與資料庫連線一律走網路，不快取
  if (/googleapis\.com$|firebaseapp\.com$/.test(url.hostname) && !url.hostname.startsWith("fonts.")) return;
  // 自己的檔案：先拿網路最新版，失敗再用快取
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
    return;
  }
  // 字型與 Firebase SDK:快取優先
  if (/fonts\.(googleapis|gstatic)\.com|www\.gstatic\.com/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })));
  }
});
