// ─── Cache version ────────────────────────────────────────────────────────────
// Bump this on every deploy that changes caching strategy.
// Keep the name in sync with the version so old caches are evicted on activate.
const CACHE = "padel-v5";

// ─── Install ───────────────────────────────────────────────────────────────────
// No HTML precaching — HTML bakes in content-hash chunk filenames that go stale
// after every deploy. Only cache things that are truly static.
self.addEventListener("install", () => {
  self.skipWaiting();
});

// ─── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        // Delete every cache that isn't the current one
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
      .then(() =>
        // Navigate all controlled windows to their current URL so they load fresh
        // HTML from the network. Works even on old pages with no controllerchange
        // listener — the SW forces the reload itself.
        self.clients.matchAll({ type: "window", includeUncontrolled: false })
          .then((clients) => Promise.all(clients.map((c) => c.navigate(c.url))))
      )
  );
});

// ─── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Ignore non-HTTP schemes (chrome-extension://, etc.)
  if (!url.protocol.startsWith("http")) return;

  // Only intercept GET
  if (request.method !== "GET") return;

  // Never intercept SSE
  if (url.pathname.includes("/stream")) return;

  // ── HTML navigation — always network-only ────────────────────────────────────
  // HTML is NEVER cached because it contains content-hash chunk filenames that
  // become stale the moment a new build is deployed.
  if (request.mode === "navigate") {
    e.respondWith(fetch(request));
    return;
  }

  // ── Next.js static assets — cache-first, immutable ──────────────────────────
  // These URLs contain their own content hash so they are safe to cache forever.
  // A new deploy produces new URLs; old ones are simply never requested again.
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // ── API calls — network-first, cache as offline fallback ─────────────────────
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // ── Everything else — network only (no caching) ───────────────────────────────
  // Public assets (icons, manifest, sw.js itself) are handled by nginx/Cloudflare
  // caching and don't need SW caching.
});

// ── Push Notifications ──────────────────────────────────────────────────────
const PRECACHE = ["/", "/torneios"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
      .then(() =>
        // Navigate all existing clients to their current URL so they load fresh
        // HTML with the correct content-hash chunk filenames. This works even when
        // the old page has no controllerchange listener (i.e. old HTML from old SW).
        self.clients.matchAll({ type: "window", includeUncontrolled: false }).then((clients) =>
          Promise.all(
            clients.map((client) => client.navigate(client.url))
          )
        )
      )
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Only handle http/https — chrome-extension:// and other schemes must be ignored
  if (!url.protocol.startsWith("http")) return;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // SSE streams should not be cached
  if (url.pathname.includes("/stream")) return;

  // Navigation requests (HTML pages) — always network-first to avoid serving stale
  // HTML after a new deploy (old HTML references old content-hash chunk filenames → 404)
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Network-first for API calls — cache successful responses as offline fallback
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Always network-first for Next.js internals
  if (url.pathname.startsWith("/_next/")) {
    e.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Stale-while-revalidate for tournament pages (show cached, update in background)
  if (url.pathname.startsWith("/tournament/")) {
    e.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        });
        return cached || fetchPromise;
      })
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

// ── Push Notifications ──────────────────────────────────────────────────────

self.addEventListener("push", (e) => {
  if (!e.data) return;

  let data;
  try {
    data = e.data.json();
  } catch {
    data = { title: "Padel Torneios", body: e.data.text() };
  }

  const options = {
    body: data.body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: data.url ? { url: data.url } : undefined,
    vibrate: [200, 100, 200],
    tag: data.tag ?? "padel-notification",
    renotify: true,
  };

  e.waitUntil(self.registration.showNotification(data.title ?? "Padel Torneios", options));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
