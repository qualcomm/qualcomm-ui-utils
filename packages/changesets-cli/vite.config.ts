import {defineConfig} from "vite"

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: {
        cli: "./src/cli.ts",
      },
      formats: ["es"],
    },
    rolldownOptions: {
      external: [/^node/],
      output: {
        entryFileNames: "[name].js",
      },
      platform: "node",
    },
    sourcemap: true,
    ssr: true,
  },
})
