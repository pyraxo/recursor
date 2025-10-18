import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "agent-engine",
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "**/*.config.ts"],
    },
  },
});
