import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const dashboardOut = fileURLToPath(new URL("../voice-agent-platform/legacy/public/pitch", import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "dashboard" ? "/pitch/" : "/",
  build: {
    outDir: mode === "dashboard" ? dashboardOut : "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4100",
        changeOrigin: true,
      },
    },
  },
}));
