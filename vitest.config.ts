import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "worker/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
    restoreMocks: true,
  },
});
