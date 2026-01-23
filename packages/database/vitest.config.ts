import { defineConfig, mergeConfig } from "vitest/config";

import sharedConfig from "../../vitest.shared";

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: "database",
      include: ["src/**/*.spec.ts", "src/**/*.test.ts"],
      root: "./",
      setupFiles: ["./vitest.setup.ts"],
    },
  }),
);
