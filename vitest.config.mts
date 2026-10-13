import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" throws outside Next's server build; it's a no-op in tests.
      "server-only": fileURLToPath(new URL("./src/lib/__tests__/empty.ts", import.meta.url)),
    },
  },
});
