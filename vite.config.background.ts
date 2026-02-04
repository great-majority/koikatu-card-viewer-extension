import { defineConfig } from "vite";
import { resolve } from "path";

// Service worker build (ESM)
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/background/service-worker.ts"),
      formats: ["es"],
      fileName: () => "background/service-worker.js",
    },
    rollupOptions: {
      output: {
        entryFileNames: "background/service-worker.js",
      },
    },
  },
  publicDir: false,
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
