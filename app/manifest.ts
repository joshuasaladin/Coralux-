import type { MetadataRoute } from "next";

/**
 * PWA manifest — mainly for Android/Chrome "Add to Home Screen". iOS Safari
 * ignores this for its home-screen icon (it uses app/apple-icon.png
 * instead) but reads name/theme_color when the app is launched standalone.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coralux HQ",
    short_name: "Coralux",
    description: "The operating system for Coralux — tasks, calendar, ideas, vendors and more.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f4f2",
    theme_color: "#f6f4f2",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
