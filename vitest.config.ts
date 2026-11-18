import { defineConfig } from "vitest/config";

export default defineConfig({
  // Mirror tsconfig "paths" so components using "@/..." can be rendered in node tests.
  resolve: { alias: { "@/": `${import.meta.dirname.replace(/\\/g, "/")}/src/` } },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "worker/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
    restoreMocks: true,
  },
});
