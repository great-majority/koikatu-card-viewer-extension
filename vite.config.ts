import { defineConfig } from "vite";
import { resolve } from "path";

// Options page build (runs last)
export default defineConfig({
  base: "./",
  root: resolve(__dirname, "src/options"),
  build: {
    outDir: resolve(__dirname, "dist/options"),
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, "src/options/options.html"),
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
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
