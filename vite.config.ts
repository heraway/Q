import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// PWA config means customers can "install" Q from the browser with no app store,
// while it's still just a website under the hood. Native app comes later via Expo,
// reusing the same Firebase project.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Q — Skip the Line",
        short_name: "Q",
        description: "Take a digital ticket and get notified when it's your turn.",
        theme_color: "#F7F3EC",
        background_color: "#F7F3EC",
        display: "standalone",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ]
});
