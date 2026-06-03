// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {type FSWatcher, watch} from "chokidar"
import {mkdirSync, writeFileSync} from "node:fs"
import path from "node:path"
import {gzipSync} from "node:zlib"
import type {Plugin} from "vite"

export interface LibraryEntriesPluginOptions {
  /**
   * Async function that returns the entry map: output name → input path.
   * Called on every rebuild so new/removed folders are picked up automatically.
   */
  collectEntryPoints: () => Promise<Record<string, string>>
  /**
   * Filename pattern that identifies an entry point within a watched directory.
   * Matched against `path.basename(file)`, not as a suffix.
   * @default "index.ts"
   */
  entryPointPattern?: string
  /**
   * Path for the sentinel file used to signal Vite when a new entry folder appears.
   * Must be inside `node_modules` or another location Vite excludes from its own
   * watcher to avoid double-triggering.
   * @default "node_modules/.cache/qui-vite-sentinel"
   */
  sentinelFile?: string
  /**
   * Directories for chokidar to watch for new/removed entry points.
   * Paths are resolved relative to `process.cwd()` at plugin creation time.
   * When omitted, new entry folders will not trigger a rebuild automatically.
   */
  watchGlob?: string[]
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024
    return `${kb < 1 ? `0${kb.toFixed(2).slice(1)}` : kb.toFixed(2)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Creates a Vite library-mode plugin that resolves entry points from the current
 * file system state and keeps watch builds aware of newly added or removed entry
 * files. Initial entries are passed through Vite's normal input option, while
 * entries discovered after watch mode starts are emitted as named chunks so they
 * produce stable output paths like `dist/button/index.js` instead of hashed
 * dynamic chunk names.
 */
export function libraryEntriesPlugin({
  collectEntryPoints,
  entryPointPattern = "index.ts",
  sentinelFile = "node_modules/.cache/qui-vite-sentinel",
  watchGlob,
}: LibraryEntriesPluginOptions): Plugin {
  const resolvedSentinel = path.resolve(sentinelFile)
  const resolvedWatchGlob = watchGlob?.map((p) => path.resolve(p))
  let fsWatcher: FSWatcher | null = null
  let sentinelCreated = false
  let bumpTimer: ReturnType<typeof setTimeout> | undefined
  const initialEntryNames = new Set<string>()

  function bumpSentinel(): void {
    clearTimeout(bumpTimer)
    bumpTimer = setTimeout(() => {
      writeFileSync(resolvedSentinel, Date.now().toString())
    }, 100)
  }

  function isEntryPoint(file: string): boolean {
    return (
      path.basename(file) === entryPointPattern &&
      !file.includes("node_modules")
    )
  }

  let pendingLog: string | undefined

  return {
    async buildStart(this) {
      if (this.meta.watchMode && resolvedWatchGlob) {
        const input = await collectEntryPoints()
        for (const [name, id] of Object.entries(input)) {
          if (!initialEntryNames.has(name)) {
            this.emitFile({fileName: `${name}.js`, id, name, type: "chunk"})
          }
        }

        // Ensure sentinel exists before registering it — Vite can't watch a
        // nonexistent file. Only create once per process start to avoid triggering
        // an immediate extra rebuild.
        if (!sentinelCreated) {
          mkdirSync(path.dirname(resolvedSentinel), {recursive: true})
          writeFileSync(resolvedSentinel, "")
          sentinelCreated = true
        }
        this.addWatchFile(resolvedSentinel)

        if (!fsWatcher) {
          // chokidar 4 dropped glob support — watch dirs and filter in the callback.
          fsWatcher = watch(resolvedWatchGlob, {ignoreInitial: true})
          fsWatcher.on("add", (file) => {
            if (isEntryPoint(file)) {
              bumpSentinel()
            }
          })
          fsWatcher.on("unlink", (file) => {
            if (isEntryPoint(file)) {
              bumpSentinel()
            }
          })
        }
      }
    },

    closeBundle() {
      if (pendingLog) {
        console.log(pendingLog)
        pendingLog = undefined
      }
    },

    closeWatcher() {
      clearTimeout(bumpTimer)
      fsWatcher?.close()
      fsWatcher = null
    },

    name: "qui-library-entries",

    async options(opts) {
      const input = await collectEntryPoints()
      for (const name of Object.keys(input)) {
        initialEntryNames.add(name)
      }
      opts.input = input
      return opts
    },

    writeBundle(_, bundle) {
      let totalBytes = 0
      let totalGzipBytes = 0
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") {
          continue
        }
        const bytes = Buffer.byteLength(chunk.code)
        totalBytes += bytes
        totalGzipBytes += gzipSync(chunk.code).byteLength
      }
      pendingLog = `\x1b[2mTotal: ${formatBytes(totalBytes)} | gzip: \x1b[1m${formatBytes(totalGzipBytes)}\x1b[0m`
    },
  }
}
