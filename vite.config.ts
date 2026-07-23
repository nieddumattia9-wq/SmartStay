import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const releaseSha =
  String(
    process.env.RELEASE_SHA ??
    "development"
  ).trim() ||
  "development";

export default defineConfig({
  define: {
    "import.meta.env.VITE_RELEASE_SHA":
      JSON.stringify(
        releaseSha
      ),
  },

  plugins: [
    react(),
  ],

  server: {
    port: 5173,
    strictPort: true,
  },

  preview: {
    port: 4173,
    strictPort: true,
  },
});