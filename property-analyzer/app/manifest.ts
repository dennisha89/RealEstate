import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LootVue",
    short_name: "LootVue",
    description: "See what the institutions see. Before you bid.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0b0f",
    theme_color: "#10b981",
    orientation: "portrait-primary",
    categories: ["finance", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
