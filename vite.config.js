import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite necesita rutas relativas para que Electron pueda cargar el index.html
// directamente desde el disco (file://) en vez de desde un servidor.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
