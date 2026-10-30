import {defineConfig} from "vite"

import {dependenciesToExternal} from "./src/utils.js"

export default defineConfig({
  build: {
    lib: {
      entry: "./src/index.ts",
      fileName: "index",
      formats: ["es"],
    },
    rolldownOptions: {
      external: [...(await dependenciesToExternal()), /^node/],
      platform: "node",
    },
    sourcemap: true,
  },
})
