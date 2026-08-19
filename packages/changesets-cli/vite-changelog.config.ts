import {defineConfig} from "vite"

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
      output: {
        entryFileNames: "[name].cjs",
      },
      platform: "node",
    },
    sourcemap: true,
    ssr: true,
  },
})
