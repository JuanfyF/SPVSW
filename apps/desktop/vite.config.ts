import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * En dev, @vitejs/plugin-react inyecta un preamble <script> inline
 * (react-refresh) que el meta CSP estricto de index.html bloquea con
 * script-src 'self' (app en blanco). El build de producción NO incluye
 * ese inline, así que el CSP estricto se queda intacto donde importa.
 */
function cspDevInline(): Plugin {
  let esDev = false;
  return {
    name: "csp-dev-inline",
    configResolved(config) {
      esDev = config.command === "serve";
    },
    transformIndexHtml(html) {
      if (!esDev) return html;
      return html.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'");
    },
  };
}

export default defineConfig({
  root: "src/renderer",
  publicDir: "../../public",
  base: "./",
  plugins: [react(), cspDevInline()],
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer"),
    },
  },
  server: {
    port: 5173,
    host: true,
    strictPort: true,
  },
});
