import { defineConfig } from "vite";
import { resolve } from "path";

// Content script build (IIFE)
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/content/content-script.ts"),
      name: "KoikatuContentScript",
      formats: ["iife"],
      fileName: () => "content/content-script.js",
    },
    rollupOptions: {
      output: {
        extend: true,
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
