"use client";

// global-error.tsx catches errors that bubble past all nested error.tsx boundaries,
// including the root layout. This is the last line of defence for ChunkLoadErrors
// that happen when the browser has stale HTML (from the old SW cache) referencing
// content-hash chunk filenames from a previous deploy.
//
// What happens:
//  1. Old SW serves old cached HTML → old HTML references old chunk hashes
//  2. Server only has new chunk hashes → 404 → React throws ChunkLoadError
//  3. This boundary catches it and redirects to the same URL with a timestamp
//     query param, which is a cache-miss in the SW → network fetch → fresh HTML
//     with the correct chunk filenames → page loads normally.
//
// The sessionStorage guard prevents an infinite redirect loop if the fresh load
// also fails for some unrelated reason.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const isChunkError =
      error?.name === "ChunkLoadError" ||
      error?.message?.includes("Loading chunk") ||
      error?.message?.includes("Failed to fetch dynamically imported module");

    if (!isChunkError) return;

    const key = "_sw_bust_attempted";
    if (sessionStorage.getItem(key)) {
      // Already tried once — don't loop. Let the user see the error UI.
      return;
    }

    sessionStorage.setItem(key, "1");

    // Add a timestamp param so the SW (if still the old caching one) gets a
    // cache miss and fetches fresh HTML from the network.
    const url = new URL(window.location.href);
    url.searchParams.set("_v", Date.now().toString());
    window.location.replace(url.toString());
  }, [error]);

  return (
    <html lang="pt">
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "sans-serif",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
          Erro ao carregar a página
        </h2>
        <p style={{ color: "#555", maxWidth: "360px" }}>
          Ocorreu um problema ao carregar os recursos da aplicação. Tenta
          recarregar a página.
        </p>
        <button
          onClick={() => {
            sessionStorage.removeItem("_sw_bust_attempted");
            reset();
          }}
          style={{
            padding: "0.5rem 1.5rem",
            background: "#0E7C66",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Recarregar
        </button>
      </body>
    </html>
  );
}
