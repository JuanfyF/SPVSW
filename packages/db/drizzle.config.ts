import { defineConfig } from "drizzle-kit";

/**
 * Apunta al archivo SQLite en la carpeta de datos de la app (ver AGENT.md,
 * sección de almacenamiento: app.getPath('userData') en Electron).
 * DATABASE_PATH se define en apps/desktop al inicializar, con un valor por
 * defecto local para desarrollo.
 */
export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? "./dev.sqlite",
  },
  verbose: true,
  strict: true,
});
