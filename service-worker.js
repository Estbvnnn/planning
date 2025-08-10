// service-worker.js
const CACHE_NAME = "planis-cache-v18";
const ASSETS = [
  "./","./index.html","./styles.css","./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png","./icons/icon-512.png","./icons/apple-touch-icon.png",
];
self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE_NAME?null:caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e=>{
  if(e.request.method!=="GET") return;
  e.respondWith(
    caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{
      caches.open(CACHE_NAME).then(cache=>cache.put(e.request, r.clone())).catch(()=>{});
      return r;
    }).catch(()=>c))
  );
});
