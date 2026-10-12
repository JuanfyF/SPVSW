import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // argon2 (hash de PINs) es lento por diseño; en suite completa con
    // paralelismo el default de 5s genera flakes.
    testTimeout: 15000,
    include: ["**/*.test.ts", "**/*.spec.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "packages/*/src/**/*.ts",
        "apps/local-server/src/**/*.ts",
        "apps/desktop/electron/**/*.ts",
      ],
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
    },
  },
});
