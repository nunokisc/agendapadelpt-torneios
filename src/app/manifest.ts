import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Torneios — AgendaPadel.pt",
    short_name: "Torneios",
    description: "Cria e gere torneios de padel com brackets em tempo real",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F3F4F6",
    theme_color: "#0E7C66",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
