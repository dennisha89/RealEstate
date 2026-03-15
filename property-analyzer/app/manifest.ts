import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Xuan",
    short_name: "Xuan",
    description: "Read the forces that shape where wealth gathers.",
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
