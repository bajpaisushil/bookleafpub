import { defineConfig } from "vitest/config";
import { TEST_ENV } from "./tests/test-env.ts";

export default defineConfig({
  test: {
    environment: "node",
    env: TEST_ENV,
    globalSetup: ["tests/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 120_000,
  },
});
