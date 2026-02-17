// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {glob} from "glob"
import {readdir, stat} from "node:fs/promises"
import {join} from "node:path"
import ora from "ora"

import {
  type ImportTransformEntry,
  transformMdx,
  transformTs,
} from "./transformers" // Adjust import path as needed

interface ProcessDirectoryContext {
  changedFiles: Set<string>
  dryRun: boolean
  processedFiles: Set<string>
}

/**
 * Process all TypeScript/TSX files in a directory
 */
export async function processDirectory(
  directoryPath: string,
  options: ImportTransformEntry | ImportTransformEntry[],
  recursive: boolean,
  ctx: ProcessDirectoryContext,
): Promise<void> {
  const files = await readdir(directoryPath)
  const optionsArray = Array.isArray(options) ? options : [options]

  await Promise.all(
    files.map(async (file) => {
      const filePath = join(directoryPath, file)
      const stats = await stat(filePath)

      if (stats.isDirectory() && recursive) {
        await processDirectory(filePath, options, recursive, ctx)
      } else if (stats.isFile()) {
        const isTypeScriptFile =
          filePath.endsWith(".ts") || filePath.endsWith(".tsx")
        const isMdxFile = filePath.endsWith(".mdx")

        if (isTypeScriptFile || isMdxFile) {
          ctx.processedFiles.add(filePath)
          const transformed = isTypeScriptFile
            ? transformTs(filePath, optionsArray, {dryRun: ctx.dryRun})
            : await transformMdx(filePath, optionsArray, {dryRun: ctx.dryRun})

          if (transformed) {
            ctx.changedFiles.add(filePath)
          }
        }
      }
    }),
  )
}

function groupEntriesBySource(
  entries: ImportTransformEntry[],
): Map<string, ImportTransformEntry[]> {
  const grouped = new Map<string, ImportTransformEntry[]>()

  for (const entry of entries) {
    const existing = grouped.get(entry.sourcePackage) || []
    existing.push(entry)
    grouped.set(entry.sourcePackage, existing)
  }

  return grouped
}

export interface ImportTransformConfig {
  /**
   * The filepath to process. Supports {@link https://www.npmjs.com/package/glob glob}
   * patterns.
   */
  dir: string
  /**
   * Preview changes without writing files.
   * @default false
   */
  dryRun?: boolean
  /**
   * @default "info"
   */
  logMode?: "info" | "verbose"
}

export async function processDirs(
  entries: ImportTransformEntry[],
  config: ImportTransformConfig,
): Promise<void> {
  const directories = await Promise.all(
    config.dir
      .split(",")
      .map((dir) => dir.trim())
      .map((dir) => glob(dir.endsWith("/") ? dir : `${dir}/`)),
  ).then((dirs) => dirs.flat())

  const logMode = config.logMode || "info"
  const dryRun = config.dryRun ?? false

  if (dryRun) {
    console.log("Running in dry-run mode (no files will be modified)...\n")
  }

  if (logMode === "verbose") {
    console.log(
      `Recursively processing directories:\n${directories.join("\n")}`,
    )
  }

  const spinner = ora("Processing files").start()
  const changedFiles: Set<string> = new Set<string>()
  const processedFiles: Set<string> = new Set<string>()

  // Group entries by source package to handle multiple targets
  const entriesBySource = groupEntriesBySource(entries).values()

  // Process entries sequentially to avoid race conditions
  for (const sourceEntries of entriesBySource) {
    await Promise.all(
      directories.map((dir) =>
        processDirectory(dir, sourceEntries, true, {
          changedFiles,
          dryRun,
          processedFiles,
        }),
      ),
    )
  }

  if (logMode === "verbose") {
    processedFiles.forEach((file) => console.log(`Processed: ${file}`))
  }

  if (changedFiles.size) {
    console.log(Array.from(changedFiles).sort().join("\n"))
  }

  const suffix = dryRun ? " (dry-run, no files modified)" : ""
  spinner.succeed(
    `Processed ${processedFiles.size} files (${changedFiles.size} updates)${suffix}`,
  )
}

export function createImportModEntries(
  sourcePackage: string,
  options: Omit<ImportTransformEntry, "sourcePackage">[],
): ImportTransformEntry[] {
  return options.map((opt) => ({...opt, sourcePackage}))
}
