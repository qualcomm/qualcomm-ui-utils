// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {type FSWatcher, watch} from "chokidar"
import {existsSync, mkdirSync, writeFileSync} from "node:fs"
import {readdir} from "node:fs/promises"
import path from "node:path"
import {gzipSync} from "node:zlib"
import type {Plugin} from "vite"

export interface DiscoveredLibraryEntriesOptions {
  /**
   * File name to use as each folder's entry point.
   * @default "index.ts"
   */
  entryFile?: string
  /**
   * Maps an entry folder name to its output entry name.
   * @default (folderName) => `${folderName}/index`
   */
  name?: (folderName: string) => string
  /**
   * Directory containing entry folders.
   * @default "./src"
   */
  root?: string
}

export interface CustomLibraryEntriesOptions {
  /**
   * Async function that returns the entry map: output name → input path.
   * Use this for nested, generated, or otherwise non-standard entry layouts.
   */
  collect: () => Promise<Record<string, string>>
  /**
   * Optional watch configuration for custom discovery.
   * When omitted, custom entries are collected for initial and non-watch builds
   * but new/removed entry files will not trigger watch rebuilds automatically.
   */
  watch?: {
    /** Directories or files for chokidar to watch. */
    paths: string[]
    /**
     * Returns true when a changed file should refresh the entry map.
     * @default () => true
     */
    shouldRefresh?: (file: string) => boolean
  }
}

export type LibraryEntriesOptions =
  | DiscoveredLibraryEntriesOptions
  | CustomLibraryEntriesOptions

export interface LibraryEntriesPluginOptions {
  /**
   * Entry discovery configuration.
   * Defaults to top-level index entries under `./src`.
   */
  entries?: LibraryEntriesOptions
  /**
   * Path for the sentinel file used to signal Vite when a new entry folder appears.
   * Must be inside `node_modules` or another location Vite excludes from its own
   * watcher to avoid double-triggering.
   * @default "node_modules/.cache/qui-vite-sentinel"
   */
  sentinelFile?: string
}

interface ResolvedLibraryEntriesOptions {
  collect: () => Promise<Record<string, string>>
  watch?: {
    paths: string[]
    shouldRefresh: (file: string) => boolean
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024
    return `${kb < 1 ? `0${kb.toFixed(2).slice(1)}` : kb.toFixed(2)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function isCustomEntriesOptions(
  entries: LibraryEntriesOptions,
): entries is CustomLibraryEntriesOptions {
  return "collect" in entries
}

export async function collectLibraryEntries({
  entryFile = "index.ts",
  name = (folderName) => `${folderName}/index`,
  root = "./src",
}: DiscoveredLibraryEntriesOptions = {}): Promise<Record<string, string>> {
  const folders = await readdir(root, {withFileTypes: true})
  const input: Record<string, string> = {}

  for (const folder of folders) {
    if (!folder.isDirectory()) {
      continue
    }

    const entryPath = path.join(root, folder.name, entryFile)
    if (existsSync(entryPath)) {
      input[name(folder.name)] = entryPath
    }
  }

  return input
}

function resolveEntriesOptions(
  entries: LibraryEntriesOptions = {},
): ResolvedLibraryEntriesOptions {
  if (isCustomEntriesOptions(entries)) {
    return {
      collect: entries.collect,
      watch: entries.watch && {
        paths: entries.watch.paths.map((p) => path.resolve(p)),
        shouldRefresh: entries.watch.shouldRefresh ?? (() => true),
      },
    }
  }

  const {entryFile = "index.ts", root = "./src"} = entries
  return {
    collect: () => collectLibraryEntries(entries),
    watch: {
      paths: [path.resolve(root)],
      shouldRefresh: (file) =>
        path.basename(file) === entryFile && !file.includes("node_modules"),
    },
  }
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
  entries,
  sentinelFile = "node_modules/.cache/qui-vite-sentinel",
}: LibraryEntriesPluginOptions = {}): Plugin {
  const resolvedEntries = resolveEntriesOptions(entries)
  const resolvedSentinel = path.resolve(sentinelFile)
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

  let pendingLog: string | undefined

  return {
    async buildStart(this) {
      if (this.meta.watchMode && resolvedEntries.watch) {
        const input = await resolvedEntries.collect()
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
          fsWatcher = watch(resolvedEntries.watch.paths, {ignoreInitial: true})
          fsWatcher.on("add", (file) => {
            if (resolvedEntries.watch?.shouldRefresh(file)) {
              bumpSentinel()
            }
          })
          fsWatcher.on("unlink", (file) => {
            if (resolvedEntries.watch?.shouldRefresh(file)) {
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
      const input = await resolvedEntries.collect()
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
