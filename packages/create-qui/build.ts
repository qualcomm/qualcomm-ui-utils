import esbuild, {type BuildOptions} from "esbuild"

function getArg(argv: any[], key: string) {
  const index = argv.indexOf(key)
  if (index !== -1) {
    return argv[index + 1]
  }
}

function hasArg(argv: any[], key: string) {
  return argv.includes(key)
}

async function buildOrWatch(options: BuildOptions, watch: boolean) {
  if (watch) {
    await esbuild.context(options).then((ctx) => ctx.watch())
  } else {
    await esbuild.build(options)
  }
}

async function main(argv: string[]) {
  const IS_WATCH = hasArg(argv, "--watch")
  const BUILD_MODE = getArg(argv, "--mode") || "production"

  const buildOpts: BuildOptions = {
    banner: {js: "#!/usr/bin/env node"},
    bundle: true,
    define: {
      "process.env.BUILD_MODE": JSON.stringify(BUILD_MODE),
    },
    entryPoints: ["./src/index.ts"],
    format: "cjs",
    outfile: "./dist/index.cjs",
    platform: "node",
    sourcemap: true,
    target: "es2020",
    tsconfig: "tsconfig.lib.json",
  }

  console.log("[build.ts] build")
  await buildOrWatch(buildOpts, IS_WATCH)
}

main(process.argv)
