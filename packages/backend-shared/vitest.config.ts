import swc from "unplugin-swc";
import { defineConfig, mergeConfig } from "vitest/config";

import sharedConfig from "../../vitest.shared";

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: "backend-shared",
      include: ["src/**/*.spec.ts", "src/**/*.test.ts"],
      root: "./",
    },
    plugins: [
      swc.vite({
        module: { type: "es6" },
      }),
    ],
  }),
);
