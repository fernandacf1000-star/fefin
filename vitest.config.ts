import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", include: ["norte-src/**/*.test.{ts,tsx}"] },
});
