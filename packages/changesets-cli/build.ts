import type {BuildOptions} from "esbuild"

import {buildOrWatch, getArg, hasArg, logPlugin} from "@qualcomm-ui/esbuild"

import pkgJson from "./package.json"

async function main(argv: string[]) {
  const IS_WATCH = hasArg(argv, "--watch")
  const BUILD_MODE = getArg(argv, "--mode") || "production"

  const buildOpts: BuildOptions = {
    banner: {js: "#!/usr/bin/env node"},
    bundle: true,
    define: {
      "process.env.BUILD_MODE": JSON.stringify(BUILD_MODE),
    },
    entryPoints: ["./src/cli.ts", "./src/changelog-formatter.ts"],
    external: [...Object.keys(pkgJson.dependencies)],
    format: "cjs",
    loader: {
      ".node": "copy",
    },
    metafile: true,
    outdir: "./dist",
    outExtension: {".js": ".cjs"},
    platform: "node",
    plugins: [logPlugin({bundleSizeOptions: {logMode: "all"}})],
    sourcemap: true,
    target: "es2020",
    tsconfig: "tsconfig.lib.json",
  }

  await buildOrWatch(buildOpts, IS_WATCH)
}

void main(process.argv)
