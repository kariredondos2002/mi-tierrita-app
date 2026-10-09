import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        // Librerías en paquetes aparte: cambian poco y el navegador las conserva en caché entre versiones.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          data: ["@tanstack/react-query", "axios", "zustand"],
          motion: ["motion/react"],
          realtime: ["socket.io-client"],
        },
      },
    },
  },
});
