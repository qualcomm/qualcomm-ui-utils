// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {program} from "@commander-js/extra-typings"
import type {
  Package,
  getPackagesSync as getPackagesSyncType,
} from "@manypkg/get-packages"
import {execa} from "execa"
import {readFile} from "node:fs/promises"
import {relative, sep} from "node:path"
import {extname} from "node:path/posix"

const DEFAULT_LINTABLE_FILE_EXTENSIONS = [
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]

const DEFAULT_CONCURRENCY = 3

enum Commands {
  LINT_CHANGED = "lint-changed",
}

export interface LintChangedFilesOptions {
  /** Base branch or ref to diff against. */
  base?: string
  /** Maximum number of package lint commands to run at once. */
  concurrency?: number
  /** Whether to continue running commands after a failure. */
  continueOnError?: boolean
  /** Directory used to discover the repo and run git commands. */
  cwd?: string
  /** Print commands without running them. */
  dryRun?: boolean
  /** Lintable file extensions. */
  extensions?: string[]
  /** Whether to fetch the base ref before diffing. */
  fetch?: boolean
  /** Package manager command used to run scripts. */
  packageManager?: string
  /** Script name passed to the package manager. */
  script?: string
  /** Run the script once at the workspace root. */
  workspaceRoot?: boolean
}

interface LintChangedCommandOptions {
  /** Base branch or ref to diff against. */
  base?: string
  /** Maximum number of package lint commands to run at once. */
  concurrency: string
  /** Whether to continue running commands after a failure. */
  continue: boolean
  /** Directory used to discover the repo and run git commands. */
  cwd: string
  /** Print commands without running them. */
  dryRun?: boolean
  /** Comma-separated list of lintable file extensions. */
  extensions: string
  /** Whether to fetch the base ref before diffing. */
  fetch: boolean
  /** Package manager command used to run scripts. */
  packageManager?: string
  /** Script name passed to the package manager. */
  script: string
  /** Run the script once at the workspace root. */
  workspaceRoot?: boolean
}

interface LintCommand {
  args: string[]
  cwd: string
  displayPath: string
  files: string[]
  packageManager: string
}

interface LintError {
  command: LintCommand
  files: string[]
  message: string
  packagePath: string
}

export async function lintChangedFiles({
  base = process.env.GITHUB_BASE_REF ?? "main",
  concurrency = DEFAULT_CONCURRENCY,
  continueOnError = true,
  cwd = process.cwd(),
  dryRun = false,
  extensions = DEFAULT_LINTABLE_FILE_EXTENSIONS,
  fetch = true,
  packageManager,
  script = "lint",
  workspaceRoot = false,
}: LintChangedFilesOptions = {}): Promise<void> {
  const getPackagesSync = await loadGetPackagesSync()
  const repo = getPackagesSync(cwd)
  const repoRoot = repo.rootDir
  const selectedPackageManager = await getPackageManager({
    packageManager,
    repoRoot,
  })
  const baseRef = normalizeBaseRef(base)
  const changedFiles = await getChangedFiles({baseRef, cwd: repoRoot, fetch})
  const lintableFiles = changedFiles.filter((file) =>
    isLintableFile(file, new Set(extensions)),
  )
  const commands = workspaceRoot
    ? getWorkspaceRootCommands({
        files: lintableFiles,
        packageManager: selectedPackageManager,
        repoRoot,
        script,
      })
    : getPackageCommands({
        files: lintableFiles,
        packageManager: selectedPackageManager,
        packages: repo.packages,
        script,
      })

  if (commands.length === 0) {
    console.info("No changed files to lint")
    return
  }

  if (dryRun) {
    logCommands(commands)
    return
  }

  const errors = await runLintCommands({
    commands,
    concurrency: normalizeConcurrency(concurrency),
    continueOnError,
  })

  if (errors.length > 0) {
    throw new Error(`Lint failed in ${errors.length} package(s)`)
  }
}

async function loadGetPackagesSync(): Promise<typeof getPackagesSyncType> {
  const {getPackagesSync} = await import("@manypkg/get-packages")

  return getPackagesSync
}

async function getPackageManager({
  packageManager,
  repoRoot,
}: {
  packageManager?: string
  repoRoot: string
}) {
  if (packageManager) {
    return packageManager
  }

  const rootPackageJson = JSON.parse(
    await readFile(`${repoRoot}/package.json`, "utf-8"),
  ) as {packageManager?: string}

  return rootPackageJson.packageManager?.split("@").at(0) || "npm"
}

function normalizeBaseRef(base: string) {
  if (base.includes("/") || base.includes("...") || base === "HEAD") {
    return base
  }

  return `origin/${base}`
}

function normalizeConcurrency(concurrency: number) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("--concurrency must be a positive integer")
  }

  return concurrency
}

function parseConcurrency(value: string) {
  const concurrency = Number.parseInt(value, 10)

  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("--concurrency must be a positive integer")
  }

  return concurrency
}

function parseExtensions(value: string) {
  return value
    .split(",")
    .map((extension) => extension.trim())
    .filter(Boolean)
    .map((extension) =>
      extension.startsWith(".") ? extension : `.${extension}`,
    )
}

async function runLintCommands({
  commands,
  concurrency,
  continueOnError,
}: {
  commands: LintCommand[]
  concurrency: number
  continueOnError: boolean
}) {
  const errors: LintError[] = []
  let shouldStop = false

  const commandConcurrency = continueOnError ? concurrency : 1

  await runQueue(
    commands,
    commandConcurrency,
    () => shouldStop,
    async (command) => {
      console.info(
        `Linting ${command.files.length} changed file(s) in ${command.displayPath}`,
      )

      const result = await execa(command.packageManager, command.args, {
        all: true,
        cwd: command.cwd,
        reject: false,
      })

      if (result.failed) {
        const error = {
          command,
          files: command.files,
          message: result.all.trim(),
          packagePath: command.displayPath,
        }

        errors.push(error)
        logLintErrors([error])

        if (!continueOnError) {
          shouldStop = true
        }
      }
    },
  )

  return errors
}

async function runQueue<T>(
  items: T[],
  concurrency: number,
  shouldStop: () => boolean,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0

  async function runNext() {
    while (nextIndex < items.length && !shouldStop()) {
      const item = items[nextIndex]
      nextIndex += 1
      await worker(item)
    }
  }

  await Promise.all(
    Array.from({length: Math.min(concurrency, items.length)}, () => runNext()),
  )
}

function logLintErrors(errors: LintError[]): void {
  for (const error of errors) {
    console.error(`\n${error.packagePath}`)
    console.error(error.message)
  }
}

function logCommands(commands: LintCommand[]) {
  for (const command of commands) {
    console.info(
      `cd ${command.displayPath} && ${command.packageManager} ${command.args.join(" ")}`,
    )
  }
}

async function getChangedFiles({
  baseRef,
  cwd,
  fetch,
}: {
  baseRef: string
  cwd: string
  fetch: boolean
}): Promise<string[]> {
  if (fetch) {
    const targetBranch = baseRef.replace("origin/", "")

    await execa(
      "git",
      [
        "fetch",
        "origin",
        `${targetBranch}:refs/remotes/origin/${targetBranch}`,
      ],
      {cwd},
    )
  }

  const {stdout} = await execa(
    "git",
    ["diff", "--name-only", "--diff-filter=ACMRTUXB", `${baseRef}...HEAD`],
    {cwd},
  )

  return stdout.split("\n").filter(Boolean)
}

function getWorkspaceRootCommands({
  files,
  packageManager,
  repoRoot,
  script,
}: {
  files: string[]
  packageManager: string
  repoRoot: string
  script: string
}): LintCommand[] {
  if (files.length === 0) {
    return []
  }

  return [
    {
      args: ["run", script, "--", ...files],
      cwd: repoRoot,
      displayPath: "workspace root",
      files,
      packageManager,
    },
  ]
}

function getPackageCommands({
  files,
  packageManager,
  packages,
  script,
}: {
  files: string[]
  packageManager: string
  packages: Package[]
  script: string
}) {
  const filesByPackage = new Map<Package, string[]>()

  for (const file of files) {
    const pkg = getContainingPackage(file, packages)

    if (pkg === undefined) {
      continue
    }

    const packageFiles = filesByPackage.get(pkg) ?? []
    packageFiles.push(relativePath(pkg.relativeDir, file))
    filesByPackage.set(pkg, packageFiles)
  }

  return Array.from(filesByPackage, ([pkg, packageFiles]) => ({
    args: ["run", script, "--", ...packageFiles],
    cwd: pkg.dir,
    displayPath: pkg.relativeDir,
    files: packageFiles,
    packageManager,
  }))
}

function getContainingPackage(file: string, packages: Package[]) {
  return packages
    .filter((pkg) => isWithinDirectory(pkg.relativeDir, file))
    .sort(
      (a, b) =>
        normalizePath(b.relativeDir).length -
        normalizePath(a.relativeDir).length,
    )
    .at(0)
}

function relativePath(from: string, to: string) {
  if (from === ".") {
    return to
  }

  return normalizePath(relative(from, to))
}

function isWithinDirectory(parent: string, child: string) {
  const normalizedParent = normalizePath(parent)
  const normalizedChild = normalizePath(child)

  return (
    normalizedParent === "." ||
    normalizedChild === normalizedParent ||
    normalizedChild.startsWith(`${normalizedParent}/`)
  )
}

function normalizePath(path: string) {
  return path.split(sep).join("/")
}

function isLintableFile(file: string, extensions: Set<string>) {
  return extensions.has(extname(file))
}

export function addLintChangedCommand() {
  program
    .command(Commands.LINT_CHANGED)
    .option(
      "--base <ref>",
      "Base branch/ref to diff against",
      process.env.GITHUB_BASE_REF ?? "main",
    )
    .option(
      "--concurrency <count>",
      "Maximum number of package lint commands to run at once",
      String(DEFAULT_CONCURRENCY),
    )
    .option("--no-continue", "Stop after the first command failure")
    .option("--cwd <dir>", "Repo start directory", process.cwd())
    .option("--dry-run", "Print commands without running them")
    .option(
      "--extensions <list>",
      "Comma-separated lintable file extensions",
      DEFAULT_LINTABLE_FILE_EXTENSIONS.join(","),
    )
    .option("--no-fetch", "Skip fetching the base ref")
    .option(
      "--package-manager <command>",
      "Package manager command used to run scripts",
    )
    .option("--script <name>", "Script to run", "lint")
    .option("-w, --workspace-root", "Run the script once at the workspace root")
    .summary("Run a script against changed lintable files.")
    .action(async (options: LintChangedCommandOptions) => {
      await lintChangedFiles({
        base: options.base,
        concurrency: parseConcurrency(options.concurrency),
        continueOnError: options.continue,
        cwd: options.cwd,
        dryRun: options.dryRun,
        extensions: parseExtensions(options.extensions),
        fetch: options.fetch,
        packageManager: options.packageManager,
        script: options.script,
        workspaceRoot: options.workspaceRoot,
      })
    })
}
