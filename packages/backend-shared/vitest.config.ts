import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.spec.ts", "src/**/*.test.ts"],
  },
  plugins: [
    swc.vite({
      module: { type: "es6" },
    }),
  ],
});
