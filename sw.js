// 離線快取：沒網路時也能打開 App 打卡，連上網路後 Firebase 會自動補同步。
// 也負責顯示推播通知(沒有另外的 firebase-messaging-sw.js)。
const CACHE = "habit-grid-v2";
const SHELL = ["./", "index.html", "firebase-config.js", "fitness-plan.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
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

// 推播：scripts/send-reminders.mjs 送的是 data-only 訊息({data:{title, body, tag, url}}),由這裡顯示通知。
// iOS 規定每則推播都要顯示通知，所以解析失敗也要顯示一則預設通知。
self.addEventListener("push", e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (err) { p = {data: {body: e.data ? e.data.text() : ""}}; }
  const d = p.data || {}, n = p.notification || {};
  e.waitUntil(self.registration.showNotification(d.title || n.title || "自律打卡表", {
    body: d.body || n.body || "",
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: d.tag || "habit-grid",
    renotify: true,
    data: {url: d.url || "./?view=today"}
  }));
});
// 點通知：App 已經開著就切到「今日打卡」,沒開就打開 App
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./?view=today", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type: "window", includeUncontrolled: true}).then(list => {
    for (const c of list) {
      if (c.url.startsWith(self.registration.scope) && "focus" in c) { c.postMessage({type: "open-today"}); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
