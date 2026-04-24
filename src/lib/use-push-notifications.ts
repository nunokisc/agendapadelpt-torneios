"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook to manage push notification subscription for a tournament.
 * Returns { supported, subscribed, subscribe, unsubscribe }
 */
export function usePushNotifications(slug: string) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    setSupported("Notification" in window && "serviceWorker" in navigator);
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
    // Check if already subscribed via localStorage
    const key = `push_sub_${slug}`;
    setSubscribed(!!localStorage.getItem(key));
  }, [slug]);

  const subscribe = useCallback(async () => {
    if (!supported) return false;

    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== "granted") return false;

    try {
      const reg = await navigator.serviceWorker.ready;
      // Check for existing subscription
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        // For demo/self-hosted, use applicationServerKey from env or generate one
        // In production, you'd use VAPID keys and a push server.
        // For now, we just store locally that the user wants notifications
        // and the SSE events will trigger local notification display.
      }
      localStorage.setItem(`push_sub_${slug}`, "1");
      setSubscribed(true);
      return true;
    } catch {
      return false;
    }
  }, [supported, slug]);

  const unsubscribe = useCallback(() => {
    localStorage.removeItem(`push_sub_${slug}`);
    setSubscribed(false);
  }, [slug]);

  return { supported, permission, subscribed, subscribe, unsubscribe };
}
