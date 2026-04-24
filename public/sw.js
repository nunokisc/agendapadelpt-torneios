const CACHE = "padel-v1";
const PRECACHE = ["/", "/torneios"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Always network-first for API and Next.js internals
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && url.pathname.startsWith("/api/")) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for everything else (pages, assets)
  e.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
    )
  );
});
