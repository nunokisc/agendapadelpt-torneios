import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Padel Torneios",
    short_name: "Padel",
    description: "Cria e gere torneios de padel com brackets em tempo real",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#059669",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
