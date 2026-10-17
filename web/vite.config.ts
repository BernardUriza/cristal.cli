import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  // Large FBX/GLB assets live in /public/models (synced from ../Mixamo)
  assetsInclude: ["**/*.fbx", "**/*.glb", "**/*.gltf"],
  build: {
    rollupOptions: {
      input: { main: "index.html", laberinto: "laberinto.html", building: "building.html", memorama: "memorama.html", atelier: "atelier.html" },
    },
  },
});
