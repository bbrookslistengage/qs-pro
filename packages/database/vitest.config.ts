import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.spec.ts", "src/**/*.test.ts"],
    // Load .env from monorepo root
    env: {
      // dotenv will be loaded via setupFiles
    },
    setupFiles: ["./vitest.setup.ts"],
  },
});
