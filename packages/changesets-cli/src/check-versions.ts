// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import * as core from "@actions/core"
import {getPackages} from "@manypkg/get-packages"
import {execFile} from "node:child_process"

import {getPublishablePackages} from "./publishable-packages.js"

const NPM_INFO_CONCURRENCY = 10

export interface ExecResult {
  exitCode: number
  stderr: string
  stdout: string
}

/**
 * Runs a command and resolves with its exit code and output. Never rejects on a
 * non-zero exit code.
 */
export type ExecFn = (
  command: string,
  args: string[],
  options: {cwd: string},
) => Promise<ExecResult>

interface PackageJsonLike {
  name: string
  publishConfig?: Record<string, unknown>
}

const defaultExec: ExecFn = (command, args, {cwd}) =>
  new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        cwd,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        // npm is a .cmd shim on Windows, which can't be spawned without a shell
        shell: process.platform === "win32",
      },
      (error, stdout, stderr) => {
        if (error && typeof error.code !== "number") {
          // spawn failure (e.g. npm not on PATH)
          reject(new Error(`Failed to run ${command}`, {cause: error}))
          return
        }
        resolve({
          exitCode: error ? (error.code as number) : 0,
          stderr,
          stdout,
        })
      },
    )
  })

/**
 * Returns the npm CLI flags that apply a package's `publishConfig` registry
 * settings. Mirrors the resolution used by `changeset publish`, so the check
 * queries the same registry that the package will be published to. Registry
 * settings from `.npmrc` and the environment are resolved by npm itself.
 */
export function getRegistryOverrides(packageJson: PackageJsonLike): string[] {
  const {name, publishConfig} = packageJson
  const overrides: string[] = []

  if (name.startsWith("@")) {
    const scope = name.split("/")[0]
    const scopedRegistry = publishConfig?.[`${scope}:registry`]
    if (typeof scopedRegistry === "string" && scopedRegistry) {
      overrides.push(`--${scope}:registry=${scopedRegistry}`)
    }
  }

  const registry = publishConfig?.registry
  if (typeof registry === "string" && registry) {
    overrides.push(`--registry=${registry}`)
  }

  return overrides
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

function getNpmErrorMessage(result: ExecResult): string {
  const parsed = parseJson(result.stdout) as
    | {error?: {code?: unknown; detail?: unknown; summary?: unknown}}
    | undefined
  const error = parsed?.error
  if (error) {
    return [error.code, error.summary, error.detail]
      .filter((part) => typeof part === "string" && part)
      .join(": ")
  }
  return (result.stderr || result.stdout).trim() || "Unknown error"
}

/**
 * Interprets the output of `npm info <name> dist-tags --json`.
 *
 * @returns the `latest` dist-tag, or `null` if the package is not published.
 * @throws if npm reports any error other than a 404.
 */
export function parseNpmInfoResult(
  packageName: string,
  result: ExecResult,
): string | null {
  if (result.exitCode !== 0) {
    const parsed = parseJson(result.stdout) as
      | {error?: {code?: unknown}}
      | undefined
    if (parsed?.error?.code === "E404") {
      return null
    }
    throw new Error(
      `Failed to check ${packageName}: ${getNpmErrorMessage(result)}`,
    )
  }

  const stdout = result.stdout.trim()
  if (!stdout) {
    return null
  }

  const parsed = parseJson(stdout)
  if (parsed === undefined) {
    throw new Error(
      `Failed to check ${packageName}: unexpected npm output: ${stdout}`,
    )
  }
  // npm wraps the result in an array in some workspace contexts
  const distTags = (Array.isArray(parsed) ? parsed[0] : parsed) as
    | Record<string, unknown>
    | undefined
  const latest = distTags?.latest
  return typeof latest === "string" && latest ? latest : null
}

async function getPublishedVersion(
  packageJson: PackageJsonLike,
  cwd: string,
  exec: ExecFn,
): Promise<string | null> {
  const result = await exec(
    "npm",
    [
      "info",
      packageJson.name,
      "dist-tags",
      ...getRegistryOverrides(packageJson),
      "--json",
    ],
    {cwd},
  )
  return parseNpmInfoResult(packageJson.name, result)
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(
    Array.from({length: Math.min(concurrency, items.length)}, worker),
  )
  return results
}

function compareVersions(current: string, published: string) {
  const [cMajor, cMinor, cPatch] = current.split(".").map(Number)
  const [pMajor, pMinor, pPatch] = published.split(".").map(Number)

  if (cMajor !== pMajor) {
    return cMajor - pMajor
  }
  if (cMinor !== pMinor) {
    return cMinor - pMinor
  }
  return cPatch - pPatch
}

export async function checkVersions(options?: {
  configPath?: string
  cwd?: string
  /** @internal for testing */
  exec?: ExecFn
}) {
  const cwd = options?.cwd ?? process.cwd()
  const exec = options?.exec ?? defaultExec
  const [packages, {rootDir}] = await Promise.all([
    getPublishablePackages(options?.configPath, cwd),
    getPackages(cwd),
  ])

  const results = await mapWithConcurrency(
    packages,
    NPM_INFO_CONCURRENCY,
    async (pkg) => {
      const {packageJson} = pkg
      const {name, version} = packageJson

      const published = await getPublishedVersion(packageJson, rootDir, exec)

      if (!published) {
        return {name, unpublished: true, version}
      }

      const comparison = compareVersions(version, published)

      return {
        current: version,
        isNewer: comparison > 0,
        isOlder: comparison < 0,
        isSame: comparison === 0,
        name,
        published,
        registryOverrides: getRegistryOverrides(packageJson),
      }
    },
  )

  const newer = results.filter(
    (r): r is Extract<(typeof results)[number], {isNewer: boolean}> =>
      "isNewer" in r && r.isNewer === true,
  )

  if (newer.length > 0) {
    console.log("The following packages will be published:")
    for (const r of newer) {
      const registry = r.registryOverrides.length
        ? ` (${r.registryOverrides.join(" ")})`
        : ""
      console.log(`  ${r.name}: ${r.published} -> ${r.current}${registry}`)
    }

    core.setOutput("should-publish", true)
  } else {
    console.log("No packages need publishing.")
    core.setOutput("should-publish", false)
  }
}
