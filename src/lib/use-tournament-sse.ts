"use client";

import { useEffect, useRef, useCallback } from "react";

function showLocalNotification(title: string, body: string, slug: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!localStorage.getItem(`push_sub_${slug}`)) return;

  // Use service worker notification if available, fallback to Notification API
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, {
        body,
        icon: "/icon-192.png",
        tag: `padel-${slug}`,
        data: { url: `/tournament/${slug}` },
      });
    }).catch(() => {
      new Notification(title, { body, icon: "/icon-192.png" });
    });
  }
}

/**
 * Hook to subscribe to SSE updates for a tournament.
 * Calls `onUpdate` whenever the server broadcasts a change.
 * Optionally sends local push notifications.
 */
export function useTournamentSSE(
  slug: string,
  onUpdate: () => void,
  enabled = true
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const reconnect = useCallback(() => {
    if (!enabled || !slug) return undefined;

    const eventSource = new EventSource(`/api/tournament/${slug}/stream`);
    let closed = false;

    eventSource.addEventListener("match_completed", () => {
      onUpdateRef.current();
      showLocalNotification("Resultado registado", "Um resultado foi submetido no torneio.", slug);
    });

    eventSource.addEventListener("match_started", () => {
      onUpdateRef.current();
      showLocalNotification("Jogo iniciado", "Um jogo foi marcado como em curso.", slug);
    });

    eventSource.addEventListener("match_reset", () => {
      onUpdateRef.current();
      showLocalNotification("Resultado reposto", "Um resultado foi anulado.", slug);
    });

    // fallback: legacy event name (clients connected during a deploy)
    eventSource.addEventListener("match_updated", () => {
      onUpdateRef.current();
    });

    eventSource.addEventListener("bracket_generated", () => {
      onUpdateRef.current();
      showLocalNotification("Bracket gerado", "O bracket do torneio foi gerado!", slug);
    });

    eventSource.addEventListener("tournament_updated", () => {
      onUpdateRef.current();
    });

    eventSource.onerror = () => {
      if (closed) return;
      eventSource.close();
      // Reconnect after 5s on error
      setTimeout(() => {
        if (!closed) reconnect();
      }, 5_000);
    };

    return () => {
      closed = true;
      eventSource.close();
    };
  }, [slug, enabled]);

  useEffect(() => {
    if (typeof window === "undefined" || !("EventSource" in window)) return;
    const cleanup = reconnect();
    return cleanup;
  }, [reconnect]);
}
