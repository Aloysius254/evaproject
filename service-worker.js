const CACHE = "aloeva-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./favicon.png",
  "./images/love-banner.jpg",
  "./images/icon.png"
  // Note: music/love.mp3 excluded — audio uses range requests (206) which can't be cached
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const url = e.request.url;

  // Skip non-GET requests — POST, PUT etc. cannot be cached
  if(e.request.method !== "GET") return;

  // Skip Firebase, Google APIs, CDN scripts — always network
  if(
    url.includes("firebaseio.com") ||
    url.includes("firebasestorage") ||
    url.includes("googleapis.com") ||
    url.includes("gstatic.com") ||
    url.includes("cdnjs.cloudflare.com") ||
    url.includes("googletagmanager.com")
  ) return;

  // Skip audio/video — they use range requests (206) which can't be cached
  if(url.match(/\.(mp3|mp4|webm|ogg|wav)$/i)) return;

  // Cache-first for everything else (HTML, CSS, JS, images)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        // Only cache valid full responses
        if(!res || res.status !== 200 || res.type === "opaque") return res;
        const clone = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
