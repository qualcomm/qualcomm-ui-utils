import {defineConfig} from "vite"

import {packagesToExternal} from "@qualcomm-ui/vite"

import pkg from "./package.json"

export default defineConfig({
  build: {
    lib: {
      entry: {
        "changelog-formatter": "./src/changelog-formatter.ts",
        cli: "./src/cli.ts",
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
