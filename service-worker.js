// Planis SW v27 — network-first for HTML/CSS/JS
const CACHE_NAME = "planis-cache-v27";
const ASSETS = [
  "./","./index.html?v=27","./styles.css?v=27","./app.js?v=27",
  "./manifest.webmanifest",
  "./icons/icon-192.png","./icons/icon-512.png","./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE_NAME?null:caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const ext = url.pathname.split(".").pop();

  // HTML/JS/CSS => network-first
  if (["html","js","css"].includes(ext) || url.pathname === "/" ) {
    event.respondWith(
      fetch(event.request).then(r=>{
        caches.open(CACHE_NAME).then(c=>c.put(event.request, r.clone()));
        return r;
      }).catch(()=> caches.match(event.request))
    );
    return;
  }

  // Others => cache-first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(r=>{
      caches.open(CACHE_NAME).then(c=>c.put(event.request, r.clone()));
      return r;
    }))
  );
});
