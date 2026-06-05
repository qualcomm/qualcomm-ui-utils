import {defineConfig} from "vitest/config"

export default defineConfig({
  test: {
    css: false,
    include: ["test/**/*.spec.ts"],
  },
})
