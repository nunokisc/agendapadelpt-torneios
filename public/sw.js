// Service Worker — push notifications only.
// No fetch interception, no caching. Caching is handled by nginx + Cloudflare.
// Removing the fetch handler eliminates the stale-asset-after-deploy problem entirely.

// ─── Install / Activate ────────────────────────────────────────────────────────
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    // Delete ALL caches left by previous versions
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() =>
        // Force all open windows to reload so they get fresh HTML.
        // This runs even when the old page has no controllerchange listener.
        self.clients
          .matchAll({ type: "window", includeUncontrolled: false })
          .then((clients) => Promise.all(clients.map((c) => c.navigate(c.url))))
      )
  );
});

// ─── Push Notifications ────────────────────────────────────────────────────────
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
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
