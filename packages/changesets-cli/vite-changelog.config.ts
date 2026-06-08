import {defineConfig} from "vite"

import {packagesToExternal} from "@qualcomm-ui/vite"

import pkg from "./package.json"

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: {
        "changelog-formatter": "./src/changelog-formatter.ts",
      },
      formats: ["cjs"],
    },
    rolldownOptions: {
      external: [...packagesToExternal(Object.keys(pkg.dependencies)), /^node/],
      output: {
        entryFileNames: "[name].cjs",
      },
      platform: "node",
    },
    sourcemap: true,
    ssr: true,
  },
})
