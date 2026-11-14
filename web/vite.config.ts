import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./", // relative asset paths: the static build works from any folder or host
  server: { fs: { allow: [".."] } }, // stories/ and contracts/ live one level up
  test: {
    environment: "node", // DOM tests opt in with: // @vitest-environment jsdom
    include: ["src/**/*.test.ts"],
  },
});
