import { defineConfig } from "vitest/config"
import { fileURLToPath } from "url"
import path from "path"

const rootDir = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  test: {
    environment: "jsdom",
    alias: {
      "@": path.join(rootDir, "."),
    },
    coverage: {
      provider: "v8",
    },
    setupFiles: [path.join(rootDir, "vitest.setup.ts")],
  },
})
