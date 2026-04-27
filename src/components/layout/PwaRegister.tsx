"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // 1. Nuke all stale SW caches left by previous versions (padel-v2/v3/v4).
    //    This runs on every load so even users who somehow got here with stale
    //    HTML will have their cache cleaned up.
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }

    // 2. Register the new push-only SW, bypassing the HTTP cache for update checks.
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        // Force an immediate update check so the new SW is picked up on the
        // very next page load, without waiting for the browser's own timing.
        reg.update().catch(() => {});
      })
      .catch(() => {});

    // 3. When the SW takes over (controllerchange), reload to get fresh HTML.
    //    This covers users whose new SW activates mid-session.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }, []);
  return null;
}

