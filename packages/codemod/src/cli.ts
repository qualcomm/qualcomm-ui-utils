// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {Option, program} from "@commander-js/extra-typings"
import {writeFile} from "node:fs/promises"

import {
  allTailwindTransforms,
  ExportAnalyzer,
  mdxDocs,
  reactRouterUtils,
} from "./modules"
import {processDirs} from "./process-dirs"
import {processClassTransforms} from "./transformers"

const logModeOpt = new Option("--log-mode <logMode>", "Log mode")
  .choices(["info", "verbose"])
  .default("info")

const directoryOption = new Option(
  "-d, --dir <directory>",
  "Directory to process (supports file globs)",
).makeOptionMandatory()

const dryRunOption = new Option(
  "--dry-run",
  "Preview changes without writing files",
)

interface MigrateOptions {
  dir: string
  dryRun: boolean
  logMode: "info" | "verbose"
}

const migrations: Record<string, (opts: MigrateOptions) => Promise<void>> = {
  "@qui/mdx-docs": async (opts) => {
    await processDirs(mdxDocs, opts)
  },
  "@qui/react-router-utils": async (opts) => {
    await processDirs(reactRouterUtils, opts)
  },
  "@qui/tailwind-plugin": async (opts) => {
    console.log(
      opts.dryRun
        ? "Running in dry-run mode (no files will be modified)...\n"
        : "Migrating Tailwind classes...\n",
    )

    const result = await processClassTransforms(
      [opts.dir],
      allTailwindTransforms,
      {dryRun: opts.dryRun, logMode: opts.logMode},
    )

    console.log("\n---")
    console.log(
      `Summary: ${result.totalChanges} changes in ${result.filesChanged} file(s)`,
    )
    if (opts.dryRun) {
      console.log("(dry-run, no files modified)")
    }
  },
}

const moduleNames = Object.keys(migrations) as [string, ...string[]]

const moduleOption = new Option("-m, --module <module>", "Module to migrate")
  .choices(moduleNames)
  .makeOptionMandatory()

program
  .command("migrate")
  .addOption(moduleOption)
  .addOption(directoryOption)
  .addOption(logModeOpt)
  .addOption(dryRunOption)
  .summary("Run migrations for QUI packages")
  .description(
    `Migrate QUI package imports and classes to the latest version.

Available modules:
  @qui/mdx-docs            Update imports to @qualcomm-ui/react-mdx subpaths
  @qui/react-router-utils  Update imports to @qualcomm-ui/react-router-utils
  @qui/tailwind-plugin     Migrate Tailwind classes to QDS tokens (requires Tailwind v4)

Examples:
  qui-codemod migrate -m @qui/mdx-docs -d "src/**"
  qui-codemod migrate -m @qui/react-router-utils -d "src/**"
  qui-codemod migrate -m @qui/tailwind-plugin -d "src/**" --dry-run`,
  )
  .action(async (opts) => {
    const migration = migrations[opts.module]
    await migration({
      dir: opts.dir,
      dryRun: opts.dryRun ?? false,
      logMode: opts.logMode,
    })
  })

program
  .command("analyze-exports")
  .description(
    "A dev utility that analyzes exports in a directory and prints a report. Useful for generating migration configs from legacy libraries.",
  )
  .addOption(directoryOption)
  .option(
    "-p, --package-name <packageName>",
    "Package name, used to generate migration config",
  )
  .action(async (opts) => {
    const analyzer = new ExportAnalyzer().analyzeDirectory(opts.dir)
    if (opts.packageName) {
      const config = analyzer.createMigrationConfig(opts.packageName)
      await writeFile(
        "./migration-config.json",
        JSON.stringify(config, null, 2),
        "utf-8",
      )
    } else {
      analyzer.printReport()
    }
  })

program.parse(process.argv)
