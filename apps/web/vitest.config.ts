import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    include: ["app/**/*.test.ts", "app/**/*.test.tsx"]
  }
});
