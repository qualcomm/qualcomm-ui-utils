// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause-Clear

import {readdir} from "node:fs/promises"
import {pathToFileURL} from "node:url"

export async function collectFolders(filePath: string): Promise<string[]> {
  const entries = await readdir(filePath, {withFileTypes: true})
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
}

export function getArg(argv: string[], key: string): string | undefined {
  const index = argv.indexOf(key)
  if (index === -1 || index === argv.length - 1) {
    return undefined
  }
  return argv[index + 1]
}

export function hasArg(argv: string[], key: string): boolean {
  return argv.includes(key)
}

/**
 * Converts package names into regular expressions that match the package root
 * or any of its subpath imports.
 *
 * Special regular expression characters in package names are escaped so scoped
 * packages and package names with punctuation are matched literally.
 */
export function packagesToExternal(packages: string[]): RegExp[] {
  return packages.map((pkg) => {
    const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return new RegExp(`^${escaped}(/|$)`)
  })
}

interface DependenciesToExternalOptions {
  packageJson:
    | {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }
    | string
}

type PackageJson = Exclude<DependenciesToExternalOptions["packageJson"], string>

function packageJsonToExternal(pkg: PackageJson): RegExp[] {
  return packagesToExternal([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ])
}

/**
 * Reads dependencies and devDependencies from the adjacent package.json. Each
 * dependency is converted into regular expressions that match the package root or
 * any of its subpath imports.
 */
export async function dependenciesToExternal(
  opts: DependenciesToExternalOptions = {
    packageJson: pathToFileURL("package.json").href,
  },
): Promise<RegExp[]> {
  const fs = await import("node:fs/promises")
  try {
    if (typeof opts.packageJson !== "string") {
      return packageJsonToExternal(opts.packageJson)
    }

    const packageJsonUrl = new URL(opts.packageJson)
    if (
      await fs
        .access(packageJsonUrl)
        .then(() => true)
        .catch(() => false)
    ) {
      const packageJson = await fs.readFile(packageJsonUrl, "utf-8")
      return packageJsonToExternal(JSON.parse(packageJson))
    }
  } catch (error) {
    console.error("Failed to read package.json:", error)
  }
  return []
}
