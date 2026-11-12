/* ── Cache version — bump this string any time you deploy changes ── */
const CACHE = "aloeva-v21";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./favicon.png",
  "./images/love-banner.jpg",
  "./images/icon.png"
];

/* Install — cache core assets */
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  /* Activate immediately — don't wait for old tabs to close */
  self.skipWaiting();
});

/* Activate — delete every old cache version */
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  /* Take control of all open tabs straight away */
  self.clients.claim();
});

/* Fetch — network first for HTML/JS/CSS so updates are always fresh,
           cache first only for images */
self.addEventListener("fetch", e => {
  const url = e.request.url;

  /* Skip non-GET */
  if (e.request.method !== "GET") return;

  /* Always go to network for Firebase, Google APIs, CDNs */
  if (
    url.includes("firebaseio.com")       ||
    url.includes("firebasestorage")      ||
    url.includes("googleapis.com")       ||
    url.includes("gstatic.com")          ||
    url.includes("cdnjs.cloudflare.com") ||
    url.includes("googletagmanager.com")
  ) return;

  /* Skip audio/video — range requests can't be cached */
  if (/\.(mp3|mp4|webm|ogg|wav)$/i.test(url)) return;

  /* HTML, CSS, JS — network first so updates land immediately */
  if (/\.(html|css|js)$/i.test(url) || url.endsWith("/")) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  /* Images — cache first (they don't change often) */
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== "opaque") {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
