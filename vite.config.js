import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Smaller, faster production bundle
    target: "es2018",
    cssMinify: true,
    minify: "esbuild",
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Split React and icons into their own cacheable chunks so the app shell
        // loads fast and updates don't re-download vendor code.
        manualChunks: {
          react: ["react", "react-dom"],
          icons: ["lucide-react"],
        },
      },
    },
  },
});
