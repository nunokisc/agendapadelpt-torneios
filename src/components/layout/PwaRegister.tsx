"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // updateViaCache:'none' tells the browser to always bypass the HTTP cache
      // when fetching sw.js for update checks — critical for fast SW rollouts.
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
    }
  }, []);
  return null;
}
