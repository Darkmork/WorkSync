const CACHE_NAME = "worksync-v1";
const urlsToCache = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request).then((r) => {
        if (r.status !== 200) return r;
        const clone = r.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return r;
      });
    })
  );
});